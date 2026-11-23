
'use client';

import { doc, updateDoc, Firestore } from 'firebase/firestore';
import { toast } from 'sonner';
import { reportError } from '@/lib/errors';

export async function updateMemberLog(firestore: Firestore, gymId: string, logId: string, data: any) {
    if (!gymId || !logId) {
        throw new Error("Gym ID and Log ID are required.");
    }
    try {
        await updateDoc(doc(firestore, 'gyms', gymId, 'members_log', logId), data);
        toast.success('Member details updated successfully!');
        return true;
    } catch (e) {
        return reportError(e);
    }
}
