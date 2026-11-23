
"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createGymWithAdmin } from "@/firebase/firestore/gyms";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeForm, themeSchema } from "./theme-form";
import { hexToHsl } from "@/lib/utils";
import { useAuth, useFirestore } from "@/firebase";

const addGymSchema = z.object({
  gymName: z.string().min(1, "Gym name is required"),
  active: z.boolean(),
  adminFirstname: z.string().min(1, "First name is required"),
  adminLastname: z.string().min(1, "Last name is required"),
  adminEmail: z.string().email("Invalid email address"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters long"),
}).merge(themeSchema);


function convertThemeToHsl(theme) {
    const hslTheme = { logoUrl: theme.logoUrl };
    if (theme.background) hslTheme.background = hexToHsl(theme.background);
    if (theme.primary) hslTheme.primary = hexToHsl(theme.primary);
    if (theme.sidebarBackground) hslTheme.sidebarBackground = hexToHsl(theme.sidebarBackground);
    if (theme.sidebarActive) hslTheme.sidebarActive = hexToHsl(theme.sidebarActive);
    if (theme.sidebarForeground) hslTheme.sidebarForeground = hexToHsl(theme.sidebarForeground);
    if (theme.sidebarMutedForeground) hslTheme.sidebarMutedForeground = hexToHsl(theme.sidebarMutedForeground);
    if (theme.card) hslTheme.card = hexToHsl(theme.card);
    if (theme.cardForeground) hslTheme.cardForeground = hexToHsl(theme.cardForeground);
    if (theme.border) hslTheme.border = hexToHsl(theme.border);
    return hslTheme;
}


const FormInput = ({ register, errors, name, label, type = "text" }) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={name} className="font-medium text-sm">{label}</label>
    <input
      id={name}
      type={type}
      {...register(name)}
      className="p-2 border rounded-md bg-transparent"
    />
    {errors[name] && <p className="text-red-500 text-xs">{errors[name]?.message}</p>}
  </div>
);

export function AddGymForm({ onSuccess }) {
  const [serverError, setServerError] = useState(null);
  const auth = useAuth();
  const firestore = useFirestore();

  const methods = useForm({
    resolver: zodResolver(addGymSchema),
    defaultValues: {
      gymName: "",
      active: true,
      adminFirstname: "",
      adminLastname: "",
      adminEmail: "",
      adminPassword: "",
      logoUrl: "",
      background: '#111827',
      primary: '#4F46E5',
      sidebarBackground: '#1F2937',
      sidebarActive: '#4F46E5',
      sidebarForeground: '#FFFFFF',
      sidebarMutedForeground: '#E5E7EB',
      card: '#1F2937',
      cardForeground: '#FFFFFF',
      border: '#374151',
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = methods;

  const onSubmit = async (data) => {
    setServerError(null);
    if (!auth || !firestore) {
      setServerError("Firebase services not available.");
      return;
    }
    try {
      const { 
        gymName, active, adminFirstname, adminLastname, adminEmail, adminPassword, 
        ...themeData 
      } = data;
      
      const gymDetails = { gymName, active, adminFirstname, adminLastname, adminEmail, adminPassword };
      const themeInHsl = convertThemeToHsl(themeData);

      // This is now an async function that can throw errors.
      await createGymWithAdmin(auth, firestore, gymDetails, { theme: themeInHsl });
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error(error);
      setServerError(error.message || "An unexpected error occurred.");
    }
  };
  

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {serverError && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                <h4 className="font-bold">Error</h4>
                <p>{serverError}</p>
            </div>
        )}

        {/* Gym Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Gym Details</h3>
          <FormInput register={register} errors={errors} name="gymName" label="Gym Name" />
          <div className="flex items-center gap-2 pt-2">
            <input
              id="active"
              type="checkbox"
              {...register("active")}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="active" className="font-medium text-sm">Active</label>
          </div>
        </div>

        {/* Admin User Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Gym Administrator</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput register={register} errors={errors} name="adminFirstname" label="First Name" />
            <FormInput register={register} errors={errors} name="adminLastname" label="Last Name" />
            <FormInput register={register} errors={errors} name="adminEmail" label="Admin Email" type="email" />
            <FormInput register={register} errors={errors} name="adminPassword" label="Admin Password" type="password" />
          </div>
        </div>

        <ThemeForm isAdmin={false} />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "bg-primary text-primary-foreground py-2 px-4 rounded-md",
              "hover:bg-primary/90 disabled:opacity-50"
            )}
          >
            {isSubmitting ? "Saving..." : "Save Gym"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
