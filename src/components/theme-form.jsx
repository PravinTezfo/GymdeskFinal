
"use client";

import { useFormContext, useController } from "react-hook-form";
import * as z from "zod";

export const themeSchema = z.object({
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  background: z.string().optional(),
  primary: z.string().optional(),
  sidebarBackground: z.string().optional(),
  sidebarActive: z.string().optional(),
  sidebarForeground: z.string().optional(),
  sidebarMutedForeground: z.string().optional(),
  card: z.string().optional(),
  cardForeground: z.string().optional(),
  border: z.string().optional(),
});


const ColorInput = ({ name, label }) => {
  const { control, formState: { errors } } = useFormContext();
  const { field } = useController({ name, control });

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="font-medium text-sm">{label}</label>
      <div className="relative flex items-center">
        <input
            id={name}
            type="text"
            value={field.value || ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            className="p-2 h-10 w-full block bg-transparent border rounded-md pr-12"
        />
        <input
            type="color"
            value={field.value || '#000000'}
            onChange={field.onChange}
            className="absolute right-1 h-8 w-10 p-1 bg-transparent border-none rounded-md cursor-pointer"
        />
      </div>
      {errors[name] && <p className="text-red-500 text-xs">{errors[name]?.message}</p>}
    </div>
  );
};


export function ThemeForm({ isAdmin = false }) {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Customize Appearance</h3>
      
      {/* Logo - Conditionally rendered */}
      {!isAdmin && (
        <div>
          <label htmlFor="logoUrl" className="font-medium text-sm">Logo URL</label>
          <input
              id="logoUrl"
              type="text"
              placeholder="https://..."
              {...register("logoUrl")}
              className="mt-2 p-2 w-full border rounded-md bg-transparent"
          />
          {errors.logoUrl && <p className="text-red-500 text-xs mt-1">{errors.logoUrl.message}</p>}
        </div>
      )}

      {/* General */}
      <div className="space-y-4">
        <h4 className="font-medium">General</h4>
        <ColorInput name="background" label="Dashboard BG Color" />
        <ColorInput name="primary" label="Button Color" />
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <h4 className="font-medium">Sidebar</h4>
        <ColorInput name="sidebarBackground" label="Sidebar BG Color" />
        <ColorInput name="sidebarActive" label="Active Link BG" />
        <ColorInput name="sidebarForeground" label="Active Link Text" />
        <ColorInput name="sidebarMutedForeground" label="Inactive Link Text" />
      </div>

      {/* Tables & Forms */}
      <div className="space-y-4">
        <h4 className="font-medium">Tables & Forms</h4>
        <ColorInput name="card" label="Background Color" />
        <ColorInput name="cardForeground" label="Text Color" />
        <ColorInput name="border" label="Border Color" />
      </div>
    </div>
  );
}
