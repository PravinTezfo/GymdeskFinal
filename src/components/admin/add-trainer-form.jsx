'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhone } from "@/lib/phone";
import * as z from "zod";
import { addTrainer } from "@/firebase/firestore/trainers";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFirestore } from "@/firebase";

const addTrainerSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required").refine((v) => isValidPhone(v), "Enter a valid 10-digit mobile number"),
  address: z.string().min(1, "Address is required"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});


export function AddTrainerForm({ gymId, onSuccess }) {
  const [serverError, setServerError] = useState(null);
  const firestore = useFirestore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addTrainerSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data) => {
    setServerError(null);
    if (!firestore) {
        setServerError("Firestore is not available.");
        return;
    }
    try {
      await addTrainer(firestore, gymId, data);
      reset();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      setServerError(error.message || "An unexpected error occurred.");
    }
  };

  return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {serverError && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                    <p>{serverError}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="firstname" className="block text-sm font-medium text-card-foreground mb-1">First Name</label>
                    <input id="firstname" {...register("firstname")} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground" />
                    {errors.firstname && <p className="text-red-500 text-xs mt-1">{errors.firstname.message}</p>}
                </div>
                <div>
                    <label htmlFor="lastname" className="block text-sm font-medium text-card-foreground mb-1">Last Name</label>
                    <input id="lastname" {...register("lastname")} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground" />
                    {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-1">Email</label>
                    <input id="email" type="email" {...register("email")} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground"/>
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-card-foreground mb-1">Phone Number</label>
                    <input id="phone" type="tel" {...register("phone")} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-1">Password</label>
                    <input id="password" type="password" {...register("password")} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground"/>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-card-foreground mb-1">Confirm Password</label>
                    <input id="confirmPassword" type="password" {...register("confirmPassword")} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground"/>
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                </div>
            </div>
            
             <div>
                <label htmlFor="address" className="block text-sm font-medium text-card-foreground mb-1">Address</label>
                <textarea id="address" {...register("address")} rows={3} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground" />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>


            <div className="flex justify-end pt-4">
              <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                  "bg-primary text-primary-foreground py-2 px-4 rounded-md",
                  "hover:bg-primary/90 disabled:opacity-50"
                  )}
              >
                  {isSubmitting ? 'Adding Trainer...' : 'Add Trainer'}
              </button>
            </div>
        </form>
  );
}
