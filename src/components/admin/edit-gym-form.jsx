
"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateGym } from "@/firebase/firestore/gyms";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { ThemeForm, themeSchema } from "@/components/theme-form";
import { hexToHsl, hslToHex } from "@/lib/utils";

const editGymSchema = z.object({
  gymName: z.string().min(1, "Gym name is required"),
}).merge(themeSchema);


function convertThemeToHsl(theme, forAdmin = false) {
    const hslTheme = {};
    if (!forAdmin) {
      hslTheme.logoUrl = theme.logoUrl;
    }
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

function convertThemeToHex(theme = {}) {
    const hexTheme = { logoUrl: theme.logoUrl || "" };
    hexTheme.background = hslToHex(theme.background || 'hsl(222, 47%, 11%)');
    hexTheme.primary = hslToHex(theme.primary || 'hsl(243, 75%, 59%)');
    hexTheme.sidebarBackground = hslToHex(theme.sidebarBackground || 'hsl(215, 39%, 23%)');
    hexTheme.sidebarActive = hslToHex(theme.sidebarActive || 'hsl(243, 75%, 59%)');
    hexTheme.sidebarForeground = hslToHex(theme.sidebarForeground || 'hsl(0, 0%, 100%)');
    hexTheme.sidebarMutedForeground = hslToHex(theme.sidebarMutedForeground || 'hsl(220, 6%, 90%)');
    hexTheme.card = hslToHex(theme.card || 'hsl(215, 39%, 23%)');
    hexTheme.cardForeground = hslToHex(theme.cardForeground || 'hsl(0, 0%, 100%)');
    hexTheme.border = hslToHex(theme.border || 'hsl(215, 14%, 34%)');
    return hexTheme;
}

const FormInput = ({ register, errors, name, label, type = "text" }) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={name} className="font-medium text-sm">{label}</label>
    <input
      id={name}
      type={type}
      {...register(name)}
      className="p-2 border rounded-md bg-transparent text-card-foreground border-border"
    />
    {errors[name] && <p className="text-red-500 text-xs">{errors[name]?.message}</p>}
  </div>
);

export function EditGymForm({ gymId }) {
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const firestore = useFirestore();
  
  const gymDocRef = useMemoFirebase(() => {
    if (!firestore || !gymId) return null;
    return doc(firestore, 'gyms', gymId);
  }, [firestore, gymId]);

  const { data: gymData, isLoading: isGymLoading } = useDoc(gymDocRef);

  const methods = useForm({
    resolver: zodResolver(editGymSchema),
  });
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = methods;

  useEffect(() => {
    if (gymData) {
      const themeInHex = convertThemeToHex(gymData.theme);
      reset({
        gymName: gymData.name,
        ...themeInHex
      });
    }
  }, [gymData, reset]);

  const onSubmit = async (data) => {
    setServerError(null);
    setSuccessMessage(null);
    if (!firestore) {
      setServerError("Firestore not available");
      return;
    }
    try {
      const { gymName, ...themeData } = data;
      // Pass true to indicate it's an admin edit, so logoUrl is excluded
      const themeInHsl = convertThemeToHsl(themeData, true);
      
      const gymUpdates = {
        name: gymName
      };

      // Only include theme if it's not empty, to avoid overwriting existing theme with blank
      if (Object.keys(themeInHsl).length > 0) {
        gymUpdates.theme = gymData.theme ? { ...gymData.theme, ...themeInHsl } : themeInHsl;
      }

      const ok = await updateGym(firestore, gymId, gymUpdates);
      if (ok) setSuccessMessage("Your gym settings have been saved!");

    } catch (error) {
      console.error(error);
      setServerError(error.message || "An unexpected error occurred.");
    }
  };

  
  if (isGymLoading) {
    return <p className="text-card-foreground">Loading gym details...</p>;
  }
  
  if (!gymData && !isGymLoading) {
      return <p className="text-card-foreground">Gym not found.</p>
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-card text-card-foreground p-8 rounded-lg border border-border">
        
        {serverError && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                <h4 className="font-bold">Error</h4>
                <p>{serverError}</p>
            </div>
        )}
        {successMessage && (
            <div className="bg-green-100 text-green-700 p-4 rounded-md">
                <h4 className="font-bold">Success</h4>
                <p>{successMessage}</p>
            </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Gym Details</h3>
          <p className="text-sm text-muted-foreground">Gym ID: {gymId}</p>
          <FormInput register={register} errors={errors} name="gymName" label="Gym Name" />
        </div>

        <ThemeForm isAdmin={true} />

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full bg-primary text-primary-foreground py-2 px-4 rounded-md",
            "hover:bg-primary/90 disabled:opacity-50"
          )}
        >
          {isSubmitting ? "Saving..." : "Save Gym Details"}
        </button>
      </form>
    </FormProvider>
  );
}
