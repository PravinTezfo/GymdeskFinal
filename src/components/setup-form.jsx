
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createSuperAdmin } from "@/firebase/firestore/client-users";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";

const setupSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});


const FormInput = ({ register, errors, name, label, type = "text", placeholder }) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={name} className="font-medium text-sm">{label}</label>
    <input
      id={name}
      type={type}
      {...register(name)}
      className="p-2 border rounded-md bg-transparent"
      placeholder={placeholder}
    />
    {errors[name] && <p className="text-red-500 text-xs">{errors[name]?.message}</p>}
  </div>
);

export function SetupForm() {
  const [serverError, setServerError] = useState(null);
  const auth = useAuth();
  const firestore = useFirestore();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(setupSchema),
  });

  const onSubmit = async (data) => {
    setServerError(null);
    if (!auth || !firestore) {
      setServerError("Firebase is not initialized. Please wait a moment and try again.");
      return;
    }
    try {
      await createSuperAdmin(auth, firestore, data);
      // After successful creation, automatically sign in
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // The onAuthStateChanged listener will handle the redirect
    } catch (error) {
      console.error(error);
      setServerError(error.message || "An unexpected error occurred.");
    }
  };


  return (
    <div className="mx-auto max-w-md w-full">
        <div className="bg-card text-card-foreground p-8 rounded-lg shadow-md border">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Welcome to Tezfo GymDesk</h1>
                <p className="text-muted-foreground">Create the first Super Admin account to get started.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {serverError && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                        <h4 className="font-bold">Setup Failed</h4>
                        <p>{serverError}</p>
                    </div>
                )}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput register={register} errors={errors} name="firstname" label="First Name" placeholder="John" />
                    <FormInput register={register} errors={errors} name="lastname" label="Last Name" placeholder="Doe" />
                </div>
                <FormInput register={register} errors={errors} name="email" label="Email Address" type="email" placeholder="admin@example.com" />
                <FormInput register={register} errors={errors} name="password" label="Password" type="password" placeholder="••••••••" />
                 <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                    "w-full bg-primary text-primary-foreground py-2 px-4 rounded-md",
                    "hover:bg-primary/90 disabled:opacity-50"
                    )}
                >
                    {isSubmitting ? "Creating Account..." : "Create Super Admin"}
                </button>
            </form>
        </div>
    </div>
  );
}
