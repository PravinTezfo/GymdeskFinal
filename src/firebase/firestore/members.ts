
'use client';

import { collection, doc, getDoc, writeBatch, Firestore, serverTimestamp, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'sonner';
import { friendlyError, reportError } from '@/lib/errors';
import { MEMBER_ID_PATTERN } from '@/lib/membership';

/**
 * Creates a member and their first membership log atomically.
 * THROWS an Error with a user-readable message (the form shows it inline), e.g. when the ID is taken.
 */
export async function addMember(firestore: Firestore, gymId: string, memberData: any, memberId: string | undefined, logDetails: any) {
  if (!gymId) {
    throw new Error("Gym ID is required to add a member.");
  }
  if (memberId && !MEMBER_ID_PATTERN.test(memberId)) {
    throw new Error('Member ID can only contain letters, numbers, "-" and "_".');
  }

  const membersCollection = collection(firestore, 'gyms', gymId, 'members');
  const newMemberRef = memberId ? doc(membersCollection, memberId) : doc(membersCollection);

  // Never overwrite an existing member (that would orphan their whole payment history).
  if (memberId) {
    let existing;
    try {
      existing = await getDoc(newMemberRef);
    } catch (e) {
      throw new Error(friendlyError(e));
    }
    if (existing.exists()) {
      throw new Error(`Member ID "${memberId}" is already in use. Deleted members keep their ID.`);
    }
  }

  const newLogRef = doc(collection(firestore, 'gyms', gymId, 'members_log'));

  const finalMemberData = {
    activeLogId: newLogRef.id,
    allLogId: [newLogRef.id],
    createdAt: serverTimestamp()
  };

  const logData = {
    id: newLogRef.id,
    memberId: newMemberRef.id,
    createdAt: serverTimestamp(),
    isDeleted: false,
    ...logDetails
  };

  const batch = writeBatch(firestore);
  batch.set(newMemberRef, finalMemberData);
  batch.set(newLogRef, logData);

  try {
    await batch.commit();
  } catch (e) {
    throw new Error(friendlyError(e));
  }
  toast.success('New member added successfully!');
}

/**
 * Soft delete: the member's active log is flagged isDeleted, so the "Deleted" filter works,
 * payment history is preserved and the dashboard can exclude them.
 * (Falls back to removing the member document only when there is no active log to flag.)
 */
export async function deleteMember(firestore: Firestore, gymId: string, memberId: string, activeLogId?: string) {
  if (!gymId || !memberId) {
    throw new Error("Gym ID and Member ID are required.");
  }
  try {
    if (activeLogId) {
      await updateDoc(doc(firestore, 'gyms', gymId, 'members_log', activeLogId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(doc(firestore, 'gyms', gymId, 'members', memberId));
    }
    toast.success('Member deleted successfully.');
    return true;
  } catch (e) {
    return reportError(e);
  }
}

export async function createNewMemberLogAndUpdateMember(firestore: Firestore, gymId: string, memberId: string, _existingLogIds: string[] | undefined, newLogDetails: any) {
  if (!gymId || !memberId) {
    throw new Error("Gym ID and Member ID are required.");
  }

  const batch = writeBatch(firestore);
  const newLogRef = doc(collection(firestore, 'gyms', gymId, 'members_log'));

  const finalLogData = {
    ...newLogDetails,
    id: newLogRef.id,
    memberId: memberId,
    createdAt: serverTimestamp(),
    isDeleted: false,
  };
  batch.set(newLogRef, finalLogData);

  // arrayUnion instead of rewriting a possibly stale array from the client.
  batch.update(doc(firestore, 'gyms', gymId, 'members', memberId), {
    activeLogId: newLogRef.id,
    allLogId: arrayUnion(newLogRef.id),
  });

  try {
    await batch.commit();
    toast.success('Member plan updated successfully!');
    return true;
  } catch (e) {
    return reportError(e);
  }
}
