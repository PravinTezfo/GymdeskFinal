
'use client';

import { doc, updateDoc, setDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { toast } from 'sonner';
import { reportError } from '@/lib/errors';

export async function updateSuperAdmin(firestore: Firestore, uid: string, data: any) {
    if (!uid) {
        throw new Error("User ID is required to update settings.");
    }
    try {
        await updateDoc(doc(firestore, 'superadmins', uid), { ...data, updatedAt: serverTimestamp() });
        // The login screen needs the brand logo while logged out. superadmins/* is private, so the
        // logo is mirrored to a tiny public document.
        if (data?.theme) {
            await setDoc(doc(firestore, 'public', 'branding'), { logoUrl: data.theme.logoUrl || '' }, { merge: true });
        }
        toast.success('Settings updated successfully!');
        return true;
    } catch (e) {
        return reportError(e);
    }
}
