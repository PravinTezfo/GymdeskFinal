
"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { updateSuperAdmin } from "@/firebase/firestore/users";
import { ThemeForm, themeSchema } from "./theme-form";
import { hexToHsl, hslToHex } from "@/lib/utils";

const settingsSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
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

const FormInput = ({ register, errors, name, label }) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={name} className="font-medium text-sm">{label}</label>
    <input
      id={name}
      type="text"
      {...register(name)}
      className="p-2 border rounded-md bg-transparent"
    />
    {errors[name] && <p className="text-red-500 text-xs">{errors[name]?.message}</p>}
  </div>
);

export function SettingsForm() {
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'superadmins', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserLoading } = useDoc(userDocRef);

  const methods = useForm({
    resolver: zodResolver(settingsSchema),
  });
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = methods;
  
  useEffect(() => {
    if (userData) {
      const themeInHex = convertThemeToHex(userData.theme);
      reset({
        firstname: userData.firstname,
        lastname: userData.lastname,
        ...themeInHex,
      });
    }
  }, [userData, reset]);
  
  useEffect(() => {
    if (successMessage) {
        const timer = setTimeout(() => {
            setSuccessMessage(null);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [successMessage])

  const onSubmit = async (data) => {
    setServerError(null);
    setSuccessMessage(null);
    if (!user || !firestore) {
        setServerError("You must be logged in to update settings.");
        return;
    }
    try {
      const { firstname, lastname, ...themeData } = data;
      const themeInHsl = convertThemeToHsl(themeData);

      const ok = await updateSuperAdmin(firestore, user.uid, {
          firstname,
          lastname,
          theme: themeInHsl
      });

      if (ok) setSuccessMessage("Your settings have been saved! Changes will apply immediately.");

    } catch (error) {
      console.error(error);
      setServerError(error.message || "An unexpected error occurred.");
    }
  };

  
  if (isUserLoading) {
    return <p>Loading your details...</p>;
  }
  
  if (!userData && !isUserLoading) {
      return <p>User details not found.</p>
  }

  const getButtonText = () => {
      if (isSubmitting) return "Saving...";
      if (successMessage) return "Saved!";
      return "Save";
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-card text-card-foreground p-8 rounded-lg">
        
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

        {/* User Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Profile</h3>
          <p className="text-sm text-muted-foreground">Your email is: {user?.email}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput register={register} errors={errors} name="firstname" label="First Name" />
              <FormInput register={register} errors={errors} name="lastname" label="Last Name" />
          </div>
        </div>

        <ThemeForm />
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "bg-primary text-primary-foreground py-2 px-4 rounded-md",
              "hover:bg-primary/90 disabled:opacity-50",
              "font-bold"
            )}
          >
            {getButtonText()}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
