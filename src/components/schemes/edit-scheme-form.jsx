
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateScheme } from "@/firebase/firestore/schemes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useFirestore } from "@/firebase";
import { X } from "lucide-react";

const editSchemeSchema = z.object({
  name: z.string().min(1, "Scheme name is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  durationValue: z.coerce.number().min(1, "Duration must be at least 1"),
  durationType: z.enum(["months", "year"]),
});


export function EditSchemeForm({ gymId, scheme, onClose }) {
  const [serverError, setServerError] = useState(null);
  const firestore = useFirestore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editSchemeSchema),
    defaultValues: {
      name: scheme?.name || '',
      price: scheme?.price || undefined,
      durationValue: scheme?.durationValue || 1,
      durationType: scheme?.durationType || 'months',
    }
  });

  useEffect(() => {
    reset({
      name: scheme?.name || '',
      price: scheme?.price || undefined,
      durationValue: scheme?.durationValue || 1,
      durationType: scheme?.durationType || 'months',
    });
  }, [scheme, reset]);

  const onSubmit = async (data) => {
    setServerError(null);
    if (!firestore) {
        setServerError("Firestore is not available.");
        return;
    }
    try {
      const ok = await updateScheme(firestore, gymId, scheme.id, data);
      if (ok) onClose();
    } catch (error) {
      console.error(error);
      setServerError(error.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border w-full max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-card-foreground">{'Edit Scheme'.replace(/ /g, " ")}</h3>
                <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted text-card-foreground">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                {serverError && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                        <p>{serverError}</p>
                    </div>
                )}

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-card-foreground mb-1">{'Scheme Name'.replace(/ /g, " ")}</label>
                    <input id="name" {...register("name")} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-card-foreground mb-1">{'Price (₹)'.replace(/ /g, " ")}</label>
                    <input id="price" type="number" step="0.01" {...register("price")} className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground" />
                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">{'Duration'.replace(/ /g, " ")}</label>
                    <div className="flex items-center gap-2">
                        <input id="durationValue" type="number" {...register("durationValue")} className="w-1/2 p-2 border rounded-md bg-transparent border-border text-card-foreground" />
                        <select id="durationType" {...register("durationType")} className="w-1/2 p-2 border rounded-md bg-card border-border text-card-foreground h-[42px]">
                            <option value="months">{'Months'.replace(/ /g, " ")}</option>
                            <option value="year">{'Year'.replace(/ /g, " ")}</option>
                        </select>
                    </div>
                    {errors.durationValue && <p className="text-red-500 text-xs mt-1">{errors.durationValue.message}</p>}
                    {errors.durationType && <p className="text-red-500 text-xs mt-1">{errors.durationType.message}</p>}
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
                      {isSubmitting ? 'Saving...'.replace(/ /g, " ") : 'Save Changes'.replace(/ /g, " ")}
                  </button>
                </div>
            </form>
        </div>
    </div>
  );
}
