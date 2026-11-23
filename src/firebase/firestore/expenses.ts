
'use client';

import { addDoc, collection, doc, updateDoc, deleteDoc, Firestore, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { reportError } from '@/lib/errors';

/** All three return true on success; on failure they show a toast and return false (nothing crashes). */
export async function addExpense(firestore: Firestore, gymId: string, data: any) {
  if (!gymId) {
      throw new Error("Gym ID is required to add an expense.");
  }
  try {
    await addDoc(collection(firestore, 'gyms', gymId, 'expenses'), { ...data, gymId, createdAt: serverTimestamp() });
    toast.success('Expense added successfully!');
    return true;
  } catch (e) {
    return reportError(e);
  }
}

export async function updateExpense(firestore: Firestore, gymId: string, expenseId: string, data: any) {
    if (!gymId || !expenseId) {
        throw new Error("Gym ID and Expense ID are required.");
    }
    try {
        await updateDoc(doc(firestore, 'gyms', gymId, 'expenses', expenseId), { ...data, updatedAt: serverTimestamp() });
        toast.success('Expense updated successfully!');
        return true;
    } catch (e) {
        return reportError(e);
    }
}

export async function deleteExpense(firestore: Firestore, gymId: string, expenseId: string) {
    if (!gymId || !expenseId) {
        throw new Error("Gym ID and Expense ID are required.");
    }
    try {
        await deleteDoc(doc(firestore, 'gyms', gymId, 'expenses', expenseId));
        toast.success('Expense deleted successfully!');
        return true;
    } catch (e) {
        return reportError(e);
    }
}
