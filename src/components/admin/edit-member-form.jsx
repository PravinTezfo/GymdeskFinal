
'use client';

import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateMemberLog } from "@/firebase/firestore/member-logs";
import { createNewMemberLogAndUpdateMember } from "@/firebase/firestore/members";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { format, add, parseISO, isSameDay, isValid } from "date-fns";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { isMembershipExpired } from "@/lib/membership";

const editMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().refine((v) => !v || isValidPhone(v), "Enter a valid 10-digit mobile number"),
  // May stay empty when the member's original plan was renamed/deleted and the plan is not being changed.
  schemeId: z.string().optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Start date is required",
  }),
  endDate: z.string(),
  amountPaid: z.coerce.number().min(0, "Amount must be a positive number"),
  discount: z.coerce.number().min(0, "Discount must be a positive number").optional(),
  memberId: z.string().optional(),
});

function BalanceDisplay({ control, schemes, schemeId, originalPrice }) {
    const amountPaid = useWatch({
        control,
        name: "amountPaid"
    });
    const discount = useWatch({
        control,
        name: "discount"
    });

    const selectedScheme = schemes?.find(s => s.id === schemeId);
    const currentPrice = selectedScheme?.price ?? originalPrice ?? 0;
    const balance = Math.max(0, currentPrice - (amountPaid || 0) - (discount || 0));

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
      className="w-full p-2 border rounded-md bg-transparent border-border disabled:bg-muted/50 disabled:cursor-not-allowed" 
    />
    {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
  </div>
);

export function EditMemberForm({ gymId, member, onSuccess }) {
  const [serverError, setServerError] = useState(null);
  const firestore = useFirestore();

  // --- Data Fetching ---
  const schemesQuery = useMemoFirebase(() => {
    if (!firestore || !gymId) return null;
    return query(collection(firestore, 'gyms', gymId, 'schemes'), orderBy('price', 'asc'));
  }, [firestore, gymId]);
  const { data: schemes, isLoading: isLoadingSchemes } = useCollection(schemesQuery);
  
  const activeLogRef = useMemoFirebase(() => {
    if (!firestore || !gymId || !member?.activeLogId) return null;
    return doc(firestore, 'gyms', gymId, 'members_log', member.activeLogId);
  }, [firestore, gymId, member]);
  const { data: activeLog, isLoading: isLoadingLog } = useDoc(activeLogRef);
  
  
  // --- Form Setup ---
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
        amountPaid: undefined,
        discount: undefined,
    }
  });

  // --- Effects ---
  // The plan is matched by its stored id (falling back to the name for older records). If that plan was
  // renamed or deleted there is no match, and the member can still be edited without picking a new one.
  const originalScheme = schemes?.find(s => (activeLog?.schemeId ? s.id === activeLog.schemeId : s.name === activeLog?.membershipType));
  const originalPrice = activeLog
    ? (activeLog.amountPaid || 0) + (activeLog.discount || 0) + (activeLog.balanceAmount || 0)
    : 0;

  // Populate the form ONCE per member/log. (Live snapshots used to re-run this and wipe unsaved typing.)
  const initializedFor = useRef(null);
  const lastSchemeRef = useRef("");
  useEffect(() => {
    if (member && activeLog && schemes && !isLoadingSchemes) {
      const key = `${member.id}:${activeLog.id}`;
      if (initializedFor.current === key) return;
      initializedFor.current = key;
      const start = parseISO(activeLog.startDate);
      const end = parseISO(activeLog.endDate);
      lastSchemeRef.current = originalScheme?.id || "";
      reset({
        memberId: member.id,
        name: activeLog.name || '',
        phone: activeLog.phone || '',
        schemeId: originalScheme?.id || "",
        startDate: isValid(start) ? format(start, 'yyyy-MM-dd') : '',
        endDate: isValid(end) ? format(end, 'yyyy-MM-dd') : '',
        amountPaid: activeLog.amountPaid,
        discount: activeLog.discount || undefined,
        paymentStatus: activeLog.paymentStatus,
      });
    }
  }, [member, activeLog, schemes, reset, isLoadingSchemes, originalScheme]);

  const watchSchemeId = watch("schemeId");
  const watchStartDate = watch("startDate");

  // End date follows the chosen plan + start date; Amount Paid resets only when the PLAN changes.
  useEffect(() => {
    if (initializedFor.current && watchSchemeId && watchStartDate && schemes) {
      const scheme = schemes.find(s => s.id === watchSchemeId);
      const startDate = parseISO(watchStartDate);
      if (scheme && isValid(startDate)) {
        const durationType = scheme.durationType === 'year' ? 'years' : scheme.durationType;
        const endDate = add(startDate, { [durationType]: scheme.durationValue });
        setValue("endDate", format(endDate, 'yyyy-MM-dd'));

        if (lastSchemeRef.current !== watchSchemeId) {
           lastSchemeRef.current = watchSchemeId;
           setValue("amountPaid", Math.max(0, scheme.price - (Number(getValues("discount")) || 0)));
        }
      }
    }
  }, [watchSchemeId, watchStartDate, schemes, setValue, getValues]);


  // --- Submission ---
  const onSubmit = async (data) => {
    setServerError(null);
    if (!firestore || !member || !activeLog || !schemes) {
        setServerError("Required data is not available to save.");
        return;
    }

    const chosenScheme = schemes.find(s => s.id === data.schemeId);
    const effectiveScheme = chosenScheme || originalScheme;   // may be undefined for legacy/renamed plans
    const price = chosenScheme?.price ?? originalPrice;

    const hasSchemeChanged = !!chosenScheme && chosenScheme.id !== originalScheme?.id;
    const startChanged = !isSameDay(parseISO(activeLog.startDate), parseISO(data.startDate));
    // A new payment record is created for a real renewal: a different plan, or a new start date on a membership
    // that has already expired. Fixing the dates of a running membership edits it in place.
    const isRenewal = hasSchemeChanged || (startChanged && isMembershipExpired(activeLog.endDate));

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

    try {
        let ok;
        if (isRenewal) {
            const newLogDetails = {
                name: data.name,
                phone: normalizePhone(data.phone),
                membershipType: effectiveScheme ? effectiveScheme.name : activeLog.membershipType,
                startDate: data.startDate,
                endDate: data.endDate,
                amountPaid,
                discount,
                balanceAmount: finalBalance,
                paymentStatus: paymentStatus,
                ...(effectiveScheme ? { schemeId: effectiveScheme.id } : {}),
            };
            ok = await createNewMemberLogAndUpdateMember(firestore, gymId, member.id, member.allLogId, newLogDetails);
        } else {
            const logUpdates = {
                name: data.name,
                phone: normalizePhone(data.phone),
                startDate: data.startDate,
                endDate: data.endDate,
                amountPaid,
                discount,
                balanceAmount: finalBalance,
                paymentStatus: paymentStatus,
                ...(effectiveScheme ? { schemeId: effectiveScheme.id, membershipType: effectiveScheme.name } : {}),
            };
            ok = await updateMemberLog(firestore, gymId, activeLog.id, logUpdates);
        }

        if (ok && onSuccess) onSuccess();

    } catch(e) {
        console.error("Failed to save member changes:", e);
        setServerError(e.message || "An unexpected error occurred.");
    }
  };

  // --- Components ---
  
  if (isLoadingLog || isLoadingSchemes) {
      return <p className="text-center text-card-foreground py-8">Loading member details...</p>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                <p>{serverError}</p>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormInput name="memberId" label="Member ID" type="text" register={register} errors={errors} readOnly disabled />
             <FormInput name="phone" label="Phone Number (Optional)" type="tel" register={register} errors={errors} placeholder="Enter phone number" />
        </div>
        <FormInput name="name" label="Name" register={register} errors={errors} placeholder="Enter member name" />

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
             <FormInput name="endDate" label="End Date" type="date" register={register} errors={errors} readOnly disabled />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormInput name="amountPaid" label="Amount Paid" type="number" register={register} errors={errors} placeholder="1000" />
             <FormInput name="discount" label="Discount" type="number" register={register} errors={errors} placeholder="100" />
        </div>
        
        <BalanceDisplay control={control} schemes={schemes} schemeId={watchSchemeId} originalPrice={originalPrice} />

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
