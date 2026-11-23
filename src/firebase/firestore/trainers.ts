
'use client';

import { doc, setDoc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { toast } from 'sonner';
import { createAdminUser } from '@/ai/flows/create-admin-user';
import { authCreateMessage, friendlyError, reportError } from '@/lib/errors';
import { normalizePhone } from '@/lib/phone';

/** Throws an Error with a user-readable message (the form shows it inline). */
export async function addTrainer(firestore: Firestore, gymId: string, data: any) {
  if (!gymId) {
    throw new Error("Gym ID is required to add a trainer.");
  }

  const idToken = await getAuth().currentUser?.getIdToken();
  if (!idToken) throw new Error(authCreateMessage('UNAUTHENTICATED'));

  // Step 1: create the sign-in account on the server (verifies the caller, never throws).
  const result = await createAdminUser({
    email: data.email,
    password: data.password,
    displayName: `${data.firstname} ${data.lastname}`,
    idToken,
    purpose: 'trainer',
  });
  if (!result.ok) throw new Error(authCreateMessage(result.error));

  // Step 2: the trainer profile.
  try {
    await setDoc(doc(firestore, 'trainers', result.uid), {
      uid: result.uid,
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      phone: normalizePhone(data.phone),
      address: data.address,
      role: 'trainer',
      assignedGymId: gymId,
    });
  } catch (e) {
    console.error('Trainer profile write failed after the account was created:', e);
    throw new Error(`${friendlyError(e)} (The sign-in account for ${data.email} was created; ask a super admin to finish the setup.)`);
  }

  toast.success('Trainer added successfully!');
  return { trainerUid: result.uid };
}

export async function updateTrainer(firestore: Firestore, trainerId: string, data: any) {
    if (!trainerId) {
        throw new Error("Trainer ID is required.");
    }
    const payload = data?.phone !== undefined ? { ...data, phone: normalizePhone(data.phone) } : data;
    try {
        await updateDoc(doc(firestore, 'trainers', trainerId), payload);
        toast.success('Trainer updated successfully!');
        return true;
    } catch (e) {
        return reportError(e);
    }
}

export async function deleteTrainer(firestore: Firestore, trainerId: string) {
    if (!trainerId) {
        throw new Error("Trainer ID is required.");
    }
    try {
        await deleteDoc(doc(firestore, 'trainers', trainerId));
        toast.success('Trainer deleted successfully!');
        return true;
    } catch (e) {
        return reportError(e);
    }
}
