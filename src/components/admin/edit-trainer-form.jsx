
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhone } from "@/lib/phone";
import * as z from "zod";
import { updateTrainer } from "@/firebase/firestore/trainers";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useFirestore } from "@/firebase";

const editTrainerSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required").refine((v) => isValidPhone(v), "Enter a valid 10-digit mobile number"),
  address: z.string().min(1, "Address is required"),
});


export function EditTrainerForm({ gymId, trainer, onSuccess }) {
  const [serverError, setServerError] = useState(null);
  const firestore = useFirestore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editTrainerSchema)
  });
  
  useEffect(() => {
    if (trainer) {
        reset({
            firstname: trainer.firstname || '',
            lastname: trainer.lastname || '',
            email: trainer.email || '',
            phone: trainer.phone || '',
            address: trainer.address || '',
        });
    }
  }, [trainer, reset]);

  const onSubmit = async (data) => {
    setServerError(null);
    if (!firestore || !trainer) {
        setServerError("Firestore or trainer data is not available.");
        return;
    }
    try {
      const ok = await updateTrainer(firestore, trainer.uid, data);
      if (ok && onSuccess) onSuccess();
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

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-1">Email</label>
                <input id="email" type="email" {...register("email")} readOnly className="w-full p-2 border rounded-md bg-muted/50 border-border text-card-foreground cursor-not-allowed"/>
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-card-foreground mb-1">Phone Number</label>
                <input id="phone" type="tel" {...register("phone")} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
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
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
        </form>
  );
}
