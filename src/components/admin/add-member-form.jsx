
'use client';

import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addMember } from "@/firebase/firestore/members";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { format, add, parseISO, isValid } from "date-fns";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { MEMBER_ID_PATTERN } from "@/lib/membership";

const addMemberSchema = z.object({
  memberId: z.string().trim().min(1, "Member ID is required").regex(MEMBER_ID_PATTERN, "Use only letters, numbers, \"-\" and \"_\""),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().refine((v) => !v || isValidPhone(v), "Enter a valid 10-digit mobile number"),
  schemeId: z.string().min(1, "Please select a membership scheme"),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Start date is required",
  }),
  endDate: z.string(),
  amountPaid: z.coerce.number().min(0, "Amount must be a positive number"),
  discount: z.coerce.number().min(0, "Discount must be a positive number").optional(),
});

function BalanceDisplay({ control, schemes, schemeId }) {
    const amountPaid = useWatch({
      control,
      name: "amountPaid",
      defaultValue: 0
    });
    const discount = useWatch({
      control,
      name: "discount",
      defaultValue: 0
    });
  
    const selectedScheme = schemes?.find(s => s.id === schemeId);
    const selectedSchemePrice = selectedScheme?.price || 0;
    const balance = Math.max(0, selectedSchemePrice - (amountPaid || 0) - (discount || 0));
  
    return (
        <div>
            <label htmlFor="balance" className="block text-sm font-medium text-card-foreground mb-1">Balance Amount</label>
            <input 
                id="balance" 
                type="text" 
                value={`₹${balance.toFixed(2)}`}
                readOnly
                className="w-full p-2 border rounded-md bg-muted/50 border-border cursor-not-allowed" 
            />
        </div>
    );
}

const FormInput = ({ name, label, type = "text", register, errors, ...props }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-card-foreground mb-1">{label}</label>
    <input 
      id={name} 
      type={type} 
      {...register(name)}
      {...props}
      className="w-full p-2 border rounded-md bg-transparent border-border" 
    />
    {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
  </div>
);

export function AddMemberForm({ gymId, onSuccess }) {
  const [serverError, setServerError] = useState(null);
  const firestore = useFirestore();

  const schemesQuery = useMemoFirebase(() => {
    if (!firestore || !gymId) return null;
    return query(collection(firestore, 'gyms', gymId, 'schemes'), orderBy('price', 'asc'));
  }, [firestore, gymId]);
  const { data: schemes, isLoading: isLoadingSchemes } = useCollection(schemesQuery);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      memberId: "",
      name: "",
      phone: "",
      schemeId: "",
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: "",
      amountPaid: undefined,
      discount: undefined,
    },
  });

  const watchSchemeId = watch("schemeId");
  const watchStartDate = watch("startDate");
  const watchDiscount = watch("discount");
  const lastSchemeRef = useRef("");

  // End date follows the plan + start date (parsed as a LOCAL date, not UTC).
  useEffect(() => {
    if (watchSchemeId && watchStartDate && schemes) {
      const scheme = schemes.find(s => s.id === watchSchemeId);
      const startDate = parseISO(watchStartDate);
      if (scheme && isValid(startDate)) {
        const durationType = scheme.durationType === 'year' ? 'years' : scheme.durationType;
        const endDate = add(startDate, { [durationType]: scheme.durationValue });
        setValue("endDate", format(endDate, 'yyyy-MM-dd'));
      }
    }
  }, [watchSchemeId, watchStartDate, schemes, setValue]);

  // Amount Paid is pre-filled with (price - discount) when the plan changes, and follows the discount
  // until the user types their own amount. It is never overwritten after that.
  useEffect(() => {
    if (!watchSchemeId || !schemes) return;
    const scheme = schemes.find(s => s.id === watchSchemeId);
    if (!scheme) return;
    const schemeChanged = lastSchemeRef.current !== watchSchemeId;
    lastSchemeRef.current = watchSchemeId;
    if (schemeChanged || !dirtyFields.amountPaid) {
      setValue("amountPaid", Math.max(0, (scheme.price || 0) - (Number(watchDiscount) || 0)));
    }
  }, [watchSchemeId, watchDiscount, schemes, setValue, dirtyFields.amountPaid]);

  const onSubmit = async (data) => {
    setServerError(null);
    if (!firestore || !schemes) {
        setServerError("Firestore or schemes are not available.");
        return;
    }

    const selectedScheme = schemes.find(s => s.id === data.schemeId);
    if (!selectedScheme) {
        setServerError("Selected scheme not found.");
        return;
    }

    const price = selectedScheme.price || 0;
    const discount = Number(data.discount) || 0;
    const amountPaid = Number(data.amountPaid) || 0;
    if (discount > price) {
        setServerError("Discount cannot be more than the plan price.");
        return;
    }
    const finalBalance = Math.max(0, price - amountPaid - discount);
    let paymentStatus;
    if (finalBalance <= 0) {
        paymentStatus = "Paid";
    } else if (amountPaid > 0) {
        paymentStatus = "Partially Paid";
    } else {
        paymentStatus = "Not Paid";
    }

    const logDetails = {
      name: data.name,
      phone: normalizePhone(data.phone),
      schemeId: selectedScheme.id,
      membershipType: selectedScheme.name,
      startDate: data.startDate,
      endDate: data.endDate,
      amountPaid,
      balanceAmount: finalBalance,
      discount,
      paymentStatus: paymentStatus,
    };

    try {
      // Rejects (with a readable message) if the Member ID already exists or the write fails.
      await addMember(firestore, gymId, {}, data.memberId, logDetails);
      reset();
      if(onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      setServerError(error.message || "An unexpected error occurred.");
    }
  };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                <p>{serverError}</p>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput name="name" label="Name" register={register} errors={errors} placeholder="Enter member name" />
            <FormInput name="phone" label="Phone Number (Optional)" type="tel" register={register} errors={errors} placeholder="Enter phone number" />
        </div>
        
        <FormInput name="memberId" label="Member ID" register={register} errors={errors} placeholder="Enter unique member ID" />

         <div>
            <label htmlFor="schemeId" className="block text-sm font-medium text-card-foreground mb-1">Membership Type</label>
            <select 
                id="schemeId" 
                {...register("schemeId")}
                className="w-full p-2 border rounded-md bg-card border-border text-card-foreground h-[42px]"
                disabled={isLoadingSchemes}
            >
                <option value="">{isLoadingSchemes ? 'Loading...' : 'Select a scheme'}</option>
                {schemes?.map(scheme => (
                    <option key={scheme.id} value={scheme.id}>{scheme.name} (₹{scheme.price})</option>
                ))}
            </select>
             {errors.schemeId && <p className="text-red-500 text-xs mt-1">{errors.schemeId.message}</p>}
         </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormInput name="startDate" label="Start Date" type="date" register={register} errors={errors} />
             <FormInput name="endDate" label="End Date" type="date" register={register} errors={errors} readOnly className="bg-muted/50 cursor-not-allowed" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormInput name="amountPaid" label="Amount Paid" type="number" register={register} errors={errors} placeholder="1000" />
             <FormInput name="discount" label="Discount" type="number" register={register} errors={errors} placeholder="100" />
        </div>
        
        <BalanceDisplay control={control} schemes={schemes} schemeId={watchSchemeId} />
        
        <div className="flex justify-end pt-4">
          <button
              type="submit"
              disabled={isSubmitting || isLoadingSchemes}
              className={cn(
                  "bg-primary text-primary-foreground py-2 px-4 rounded-md font-bold",
                  "hover:bg-primary/90 disabled:opacity-50"
              )}
          >
              {isSubmitting ? "Saving Member..." : "Save Member"}
          </button>
        </div>
    </form>
  );
}
