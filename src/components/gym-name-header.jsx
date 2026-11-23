'use client';
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

export function GymNameHeader({ gymId }) {
    const firestore = useFirestore();
    const gymRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, "gyms", gymId);
    }, [firestore, gymId]);

    const { data: gymDoc, isLoading } = useDoc(gymRef);

    const gymName = isLoading ? "..." : (gymDoc?.name || "Gym");

    return <h1 className="text-2xl font-bold mb-6">Manage Schemes for {gymName}</h1>;
}
