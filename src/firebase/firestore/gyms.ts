
'use client';

import { collection, doc, updateDoc, writeBatch, Firestore, serverTimestamp } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { toast } from 'sonner';
import { createAdminUser } from '@/ai/flows/create-admin-user';
import { authCreateMessage, friendlyError, reportError } from '@/lib/errors';

/** Throws an Error with a user-readable message (the form shows it inline). */
export async function createGymWithAdmin(auth: Auth, firestore: Firestore, gymData: any, themeData: any) {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error(authCreateMessage('UNAUTHENTICATED'));

  const gymDetails = {
    name: gymData.gymName,
    active: gymData.active,
    createdAt: serverTimestamp(),
    ...themeData,
  };

  // Step 1: create the admin's sign-in account on the server (superadmin only; never throws).
  const result = await createAdminUser({
    email: gymData.adminEmail,
    password: gymData.adminPassword,
    displayName: `${gymData.adminFirstname} ${gymData.adminLastname}`,
    idToken,
    purpose: 'gym-admin',
  });
  if (!result.ok) throw new Error(authCreateMessage(result.error));
  const adminUid = result.uid;

  // Step 2: gym + admin profile in one atomic batch.
  try {
    const batch = writeBatch(firestore);
    const newGymRef = doc(collection(firestore, 'gyms'));
    batch.set(newGymRef, { ...gymDetails, id: newGymRef.id, adminId: adminUid });
    batch.set(doc(firestore, 'admins', adminUid), {
      uid: adminUid,
      email: gymData.adminEmail,
      firstname: gymData.adminFirstname,
      lastname: gymData.adminLastname,
      role: 'admin',
      assignedGymId: newGymRef.id,
    });
    await batch.commit();
    toast.success('Gym and admin created successfully!');
    return { gymId: newGymRef.id, adminUid };
  } catch (e) {
    console.error('Gym write failed after the admin account was created:', e);
    throw new Error(`${friendlyError(e)} (The sign-in account for ${gymData.adminEmail} was created; retry with a different e-mail or finish the setup manually.)`);
  }
}

export async function updateGym(firestore: Firestore, gymId: string, data: any) {
    try {
        await updateDoc(doc(firestore, 'gyms', gymId), data);
        toast.success('Gym details updated successfully!');
        return true;
    } catch (e) {
        return reportError(e);
    }
}
