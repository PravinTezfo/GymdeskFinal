'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';

interface RoleData {
    role: 'superadmin' | 'admin' | 'trainer' | null;
    data: DocumentData | null;
}

interface RoleContextType extends RoleData {
  isRoleLoading: boolean;
  needsSetup: boolean;
  isSetupCheckLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Only a last-resort guard (e.g. fully offline with an empty cache). Normal resolution is event-driven:
// we decide "no role" as soon as all three role collections have answered, however long that takes.
const ROLE_LOOKUP_GIVE_UP_MS = 15000;

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const [roleData, setRoleData] = useState<RoleData>({ role: null, data: null });
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  // The first-run "create super admin" screen is disabled (it used to be commented out), and the old
  // check needed an unauthenticated read of `superadmins`, which the security rules (rightly) deny.
  const needsSetup = false;
  const isSetupCheckLoading = false;

  // Determine the role of a logged-in user.
  useEffect(() => {
    if (isAuthLoading) {
      setIsRoleLoading(true);
      return;
    }

    if (!user || !firestore) {
      setRoleData({ role: null, data: null });
      setIsRoleLoading(false);
      return;
    }

    setIsRoleLoading(true);

    const roleChecks: { col: 'superadmins' | 'admins' | 'trainers'; role: 'superadmin' | 'admin' | 'trainer' }[] = [
        { col: 'superadmins', role: 'superadmin' },
        { col: 'admins', role: 'admin' },
        { col: 'trainers', role: 'trainer' },
    ];

    let roleFound = false;
    let cancelled = false;
    const answered = new Set<string>();
    const unsubscribers: (() => void)[] = [];

    const settle = () => {
      if (cancelled || roleFound) return;
      if (answered.size >= roleChecks.length) {
        setRoleData({ role: null, data: null });
        setIsRoleLoading(false);
      }
    };

    roleChecks.forEach(({ col, role }) => {
        const unsub = onSnapshot(
          doc(firestore, col, user.uid),
          (docSnap) => {
            if (cancelled) return;
            if (docSnap.exists() && !roleFound) {
                roleFound = true;
                setRoleData({ role, data: docSnap.data() });
                setIsRoleLoading(false);
                unsubscribers.forEach(u => u()); // role found: stop listening on all three
                return;
            }
            answered.add(col);
            settle();
          },
          () => { // permission/network error on this collection => it cannot be our role
            answered.add(col);
            settle();
          },
        );
        unsubscribers.push(unsub);
    });

    const giveUp = setTimeout(() => {
        if (!roleFound && !cancelled) {
            setRoleData({ role: null, data: null });
            setIsRoleLoading(false);
        }
    }, ROLE_LOOKUP_GIVE_UP_MS);

    return () => {
        cancelled = true;
        unsubscribers.forEach(u => u());
        clearTimeout(giveUp);
    };
  }, [user, isAuthLoading, firestore]);

  // Clear role data on logout
  useEffect(() => {
    if (!isAuthLoading && !user) {
      setRoleData({ role: null, data: null });
    }
  }, [user, isAuthLoading]);

  const value = useMemo(() => ({
      ...roleData,
      isRoleLoading,
      needsSetup,
      isSetupCheckLoading
    }), [roleData, isRoleLoading, needsSetup, isSetupCheckLoading]);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
