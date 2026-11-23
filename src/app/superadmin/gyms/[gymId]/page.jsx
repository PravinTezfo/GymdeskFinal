
'use client';
import { useState } from "react";
import { useParams } from "next/navigation";
import { GymMemberList } from "@/components/gym-member-list";
import { SchemeList } from "@/components/schemes/scheme-list";
import { EditGymModal } from "@/components/gym-page";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

function GymNameHeader({ gymId }) {
    const firestore = useFirestore();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const gymRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, "gyms", gymId);
    }, [firestore, gymId]);

    const { data: gymDoc, isLoading } = useDoc(gymRef);

    const gymName = isLoading ? "Loading..." : (gymDoc?.name || "Gym Not Found");

    return (
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{gymName}</h1>
            {/* Opens the same edit modal as the gyms list (the old /superadmin/gyms/edit/[id] route never existed). */}
            <button onClick={() => setIsEditOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg">
                Edit Gym
            </button>
            {gymDoc && <EditGymModal gym={{ ...gymDoc, id: gymId }} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />}
        </div>
    )
}


export default function SuperAdminGymDetailPage() {
  // useParams() instead of the `params` prop, which is a Promise in Next 15.
  const { gymId } = useParams();
  return (
    <div className="p-4 md:p-8 space-y-8">
      <GymNameHeader gymId={gymId} />

      <div>
        <h2 className="text-xl font-bold mb-4">Members</h2>
        <GymMemberList gymId={gymId} />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Membership Schemes</h2>
        <SchemeList gymId={gymId} />
      </div>
    </div>
  );
}
