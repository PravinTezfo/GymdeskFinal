
'use client';

import { useGym } from "@/hooks/useGym";
import { EditGymForm } from "@/components/admin/edit-gym-form";

export default function AdminSettingsPage() {
    const { gymId, gymData, isGymLoading } = useGym();

    if (isGymLoading) {
        return <p className="p-8 text-card-foreground">Loading settings...</p>
    }

    if (!gymId || !gymData) {
        return (
             <div className="p-8">
                <h1 className="text-2xl font-bold mb-4 text-card-foreground">Settings</h1>
                <p className="text-card-foreground">You are not currently assigned to a gym. Please contact a super administrator.</p>
            </div>
        )
    }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-card-foreground">Manage Your Gym</h1>
        <EditGymForm gymId={gymId} />
      </div>
    </div>
  );
}
