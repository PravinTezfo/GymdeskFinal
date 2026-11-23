
"use client";

import { doc, setDoc, Firestore } from 'firebase/firestore';
import { Auth, createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'sonner';

export async function createSuperAdmin(auth: Auth, firestore: Firestore, data: any) {
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('The email address is already in use by another account.');
    }
    throw new Error('Failed to create superadmin auth user: ' + error.message);
  }
  
  const superAdminUid = userCredential.user.uid;
  const userDocRef = doc(firestore, 'superadmins', superAdminUid);
  const userData = {
    uid: superAdminUid,
    email: data.email,
    firstname: data.firstname,
    lastname: data.lastname,
    role: 'superadmin',
    assignedGymId: null,
  };
  
  await setDoc(userDocRef, userData).then(() => {
    toast.success('Super admin account created successfully!');
  });
  return { superAdminUid };
}
