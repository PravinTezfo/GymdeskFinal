
'use client';

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Edit, Trash2 } from "lucide-react";
import { format } from 'date-fns';

export function TrainerList({ gymId, onEdit, onDelete }) {
    const firestore = useFirestore();

    const trainersQuery = useMemoFirebase(() => {
        if (!firestore || !gymId) return null;
        return query(
            collection(firestore, 'trainers'),
            where('assignedGymId', '==', gymId)
        );
    }, [firestore, gymId]);

    const { data: trainers, isLoading } = useCollection(trainersQuery);

    if (isLoading) {
        return <div className="text-center text-muted-foreground p-8">Loading trainers...</div>
    }

    if (!trainers || trainers.length === 0) {
        return (
             <div className="text-center py-12 px-4 border border-dashed rounded-lg">
                <h3 className="text-lg font-semibold text-card-foreground">No Trainers Found</h3>
                <p className="text-muted-foreground mt-1">Click "Add Trainer" to get started.</p>
            </div>
        )
    }

    return (
        <div className="bg-card text-card-foreground rounded-lg">
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-left">
                    <thead className="bg-card">
                        <tr className="border-b border-border">
                            <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">Name</th>
                            <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">Email</th>
                            <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground hidden md:table-cell">Phone</th>
                            <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trainers.map(trainer => (
                            <tr key={trainer.uid} className="border-b border-border last:border-b-0">
                                <td className="p-4 font-medium">{`${trainer.firstname || ''} ${trainer.lastname || ''}`.trim().replace(/ /g, " ") || <>&nbsp;</>}</td>
                                <td className="p-4">{trainer.email?.replace(/ /g, " ") || <>&nbsp;</>}</td>
                                <td className="p-4 hidden md:table-cell">{trainer.phone?.replace(/ /g, " ") || <>&nbsp;</>}</td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <button aria-label="Edit trainer" onClick={() => onEdit(trainer)} className="p-2 hover:bg-muted rounded-full">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button aria-label="Delete trainer" onClick={() => onDelete(trainer)} className="p-2 hover:bg-muted rounded-full text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
