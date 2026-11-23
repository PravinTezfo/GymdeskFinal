
'use client';

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { deleteScheme } from "@/firebase/firestore/schemes";
import { Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "../ui/confirmation-dialog";

export function SchemeList({ gymId, onEdit }) {
    const firestore = useFirestore();
    const [deleteCandidate, setDeleteCandidate] = useState(null);

    const schemesQuery = useMemoFirebase(() => {
        if (!firestore || !gymId) return null;
        return query(
            collection(firestore, 'gyms', gymId, 'schemes'),
            orderBy('price', 'asc')
        );
    }, [firestore, gymId]);

    const { data: schemes, isLoading } = useCollection(schemesQuery);

    const handleDeleteRequest = (scheme) => {
        setDeleteCandidate(scheme);
    };

    const confirmDelete = () => {
        if (firestore && deleteCandidate) {
            deleteScheme(firestore, gymId, deleteCandidate.id);
        }
        setDeleteCandidate(null);
    }

    if (isLoading) {
        return <div className="text-center text-muted-foreground p-8">Loading schemes...</div>
    }

    if (!schemes || schemes.length === 0) {
        return (
             <div className="text-center py-12 px-4 border border-dashed rounded-lg">
                <h3 className="text-lg font-semibold text-card-foreground">{'No Schemes Found'.replace(/ /g, "\u00A0")}</h3>
                <p className="text-muted-foreground mt-1">Click "Add New Scheme" to get started.</p>
            </div>
        )
    }

    return (
        <>
            <div className="bg-card text-card-foreground rounded-lg">
                {schemes && schemes.length > 0 && (
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left">
                            <thead className="bg-card">
                                <tr className="border-b border-border">
                                    <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">{'Name'.replace(/ /g, "\u00A0")}</th>
                                    <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">{'Price'.replace(/ /g, "\u00A0")}</th>
                                    <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">{'Duration'.replace(/ /g, "\u00A0")}</th>
                                    <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground text-right">{'Actions'.replace(/ /g, "\u00A0")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schemes.map(scheme => (
                                    <tr key={scheme.id} className="border-b border-border last:border-b-0">
                                        <td className="p-4 font-medium">{scheme.name?.replace(/ /g, "\u00A0") || <>&nbsp;</>}</td>
                                        <td className="p-4">₹{scheme.price?.toFixed(2) || '0.00'}</td>
                                        <td className="p-4">{`${scheme.durationValue || ''} ${scheme.durationType || ''}`.replace(/ /g, "\u00A0")}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => onEdit(scheme)} className="p-2 hover:bg-muted rounded-full">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteRequest(scheme)} className="p-2 hover:bg-muted rounded-full text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <ConfirmationDialog
                isOpen={!!deleteCandidate}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={confirmDelete}
                title={'Delete Scheme'.replace(/ /g, "\u00A0")}
                description={`Are you sure you want to delete the "${deleteCandidate?.name}" scheme? This action cannot be undone.`}
                confirmText="Delete"
            />
        </>
    );
}
