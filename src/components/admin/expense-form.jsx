
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addExpense, updateExpense } from "@/firebase/firestore/expenses";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useFirestore } from "@/firebase";
import { format, parseISO } from 'date-fns';

const expenseSchema = z.object({
  category: z.enum(["waterbill", "eb bill", "rent", "equipment service", "new equipment", "other"]),
  otherCategoryName: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Date is required",
  }),
}).refine(data => {
    if (data.category === 'other') {
        return !!data.otherCategoryName && data.otherCategoryName.length > 0;
    }
    return true;
}, {
    message: "Category name is required when 'Other' is selected",
    path: ["otherCategoryName"],
});


export function ExpenseForm({ gymId, expense, onSuccess }) {
  const [serverError, setServerError] = useState(null);
  const firestore = useFirestore();
  const isEditing = !!expense;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseSchema),
  });

  const watchCategory = watch("category");

  useEffect(() => {
    if (isEditing && expense) {
      reset({
        ...expense,
        date: format(parseISO(expense.date), 'yyyy-MM-dd'),
      });
    } else {
        reset({
            category: "waterbill",
            description: "",
            amount: undefined,
            date: format(new Date(), 'yyyy-MM-dd'),
            otherCategoryName: "",
        });
    }
  }, [expense, isEditing, reset]);


  const onSubmit = async (data) => {
    setServerError(null);
    if (!firestore || !gymId) {
        setServerError("Firestore is not available.");
        return;
    }

    try {
        const ok = isEditing
            ? await updateExpense(firestore, gymId, expense.id, data)
            : await addExpense(firestore, gymId, data);
        if (ok && onSuccess) onSuccess();
    } catch(e) {
        console.error("Failed to save expense:", e);
        setServerError(e.message || "An unexpected error occurred.");
    }
  };
  
  const CATEGORY_OPTIONS = [
    { value: "waterbill", label: "Water Bill" },
    { value: "eb bill", label: "EB Bill" },
    { value: "rent", label: "Rent" },
    { value: "equipment service", label: "Equipment Service" },
    { value: "new equipment", label: "New Equipment" },
    { value: "other", label: "Other" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                <p>{serverError}</p>
            </div>
        )}

        <div>
            <label htmlFor="category" className="block text-sm font-medium text-card-foreground mb-1">Category</label>
            <select
                id="category"
                {...register("category")}
                className="w-full p-2 border rounded-md bg-card border-border text-card-foreground h-[42px]"
            >
                {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label.replace(/ /g, " ")}</option>
                ))}
            </select>
        </div>
        
        {watchCategory === 'other' && (
             <div>
                <label htmlFor="otherCategoryName" className="block text-sm font-medium text-card-foreground mb-1">{'Other Category Name'.replace(/ /g, " ")}</label>
                <input
                    id="otherCategoryName"
                    {...register("otherCategoryName")}
                    className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground"
                    placeholder="Office Supplies"
                />
                {errors.otherCategoryName && <p className="text-red-500 text-xs mt-1">{errors.otherCategoryName.message}</p>}
            </div>
        )}
        
        <div>
            <label htmlFor="description" className="block text-sm font-medium text-card-foreground mb-1">{'Description'.replace(/ /g, " ")}</label>
            <textarea
                id="description"
                {...register("description")}
                rows={3}
                className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground"
                placeholder="Monthly rent payment"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-card-foreground mb-1">{'Amount (₹)'.replace(/ /g, " ")}</label>
                <input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...register("amount")}
                    className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground"
                    placeholder="5000"
                />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-card-foreground mb-1">{'Date'.replace(/ /g, " ")}</label>
                <input
                    id="date"
                    type="date"
                    {...register("date")}
                    className="w-full p-2 border rounded-md bg-transparent border-border text-card-foreground"
                />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                  "bg-primary text-primary-foreground py-2 px-4 rounded-md font-bold",
                  "hover:bg-primary/90 disabled:opacity-50"
              )}
          >
              {isSubmitting ? 'Saving...'.replace(/ /g, " ") : (isEditing ? 'Save Changes'.replace(/ /g, " ") : 'Add Expense'.replace(/ /g, " "))}
          </button>
        </div>
    </form>
  );
}
