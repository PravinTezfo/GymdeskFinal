
'use client';

import { addDoc, collection, doc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import { toast } from 'sonner';
import { reportError } from '@/lib/errors';

export async function addScheme(firestore: Firestore, gymId: string, data: any) {
  if (!gymId) {
      throw new Error("Gym ID is required to add a scheme.");
  }
  const schemeData = {
    name: data.name,
    price: data.price,
    durationValue: data.durationValue,
    durationType: data.durationType,
  };
  try {
    await addDoc(collection(firestore, 'gyms', gymId, 'schemes'), schemeData);
    toast.success('Scheme added successfully!');
    return true;
  } catch (e) {
    return reportError(e);
  }
}

export async function updateScheme(firestore: Firestore, gymId: string, schemeId: string, data: any) {
    if (!gymId || !schemeId) {
        throw new Error("Gym ID and Scheme ID are required.");
    }
    try {
        await updateDoc(doc(firestore, 'gyms', gymId, 'schemes', schemeId), data);
        toast.success('Scheme updated successfully!');
        return true;
    } catch (e) {
        return reportError(e);
    }
}

export async function deleteScheme(firestore: Firestore, gymId: string, schemeId: string) {
    if (!gymId || !schemeId) {
        throw new Error("Gym ID and Scheme ID are required.");
    }
    try {
        await deleteDoc(doc(firestore, 'gyms', gymId, 'schemes', schemeId));
        toast.success('Scheme deleted successfully!');
        return true;
    } catch (e) {
        return reportError(e);
    }
}
