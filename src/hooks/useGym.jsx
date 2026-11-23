
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRole } from './useRole';

const GymContext = createContext(undefined);

export function GymProvider({ children }) {
  const { data: adminData, isRoleLoading: isAdminLoading } = useRole();
  const firestore = useFirestore();

  const gymId = adminData?.assignedGymId;
  
  const gymDocRef = useMemoFirebase(() => {
      if (!gymId || !firestore) return null;
      return doc(firestore, 'gyms', gymId);
  }, [gymId, firestore]);
  
  const { data: gymData, isLoading: isGymDataLoading } = useDoc(gymDocRef);

  const value = { 
      gymId, 
      gymData, 
      isGymLoading: isAdminLoading || isGymDataLoading 
  };

  return (
    <GymContext.Provider value={value}>
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  const context = useContext(GymContext);
  if (context === undefined) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
}
