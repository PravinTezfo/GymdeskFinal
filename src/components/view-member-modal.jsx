
'use client';
import { useEscape } from '@/hooks/useEscape';
import { X } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { isMembershipExpired } from '@/lib/membership';

function DetailItem({ label, value, isLoading, children }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label.replace(/ /g, " ")}</p>
            {isLoading ? (
                <div className="h-6 w-32 bg-muted/50 animate-pulse rounded-md mt-1" />
            ) : (
                <div className="text-base text-card-foreground">{value ? String(value).replace(/ /g, " ") : children || 'N/A'.replace(/ /g, " ")}</div>
            )}
        </div>
    );
}

const PaymentStatusPill = ({ status }) => {
    if (!status) return null;
    const statusClasses = {
        'Paid': 'bg-green-600 text-white',
        'Partially Paid': 'bg-orange-500 text-white',
        'Not Paid': 'bg-red-600 text-white',
    };
    return (
        <span className={cn('px-2 py-1 text-xs font-medium rounded-full', statusClasses[status])}>
            {status.replace(/ /g, " ")}
        </span>
    )
};


export function ViewMemberModal({ gymId, member, isOpen, onClose }) {
    const firestore = useFirestore();

    const activeLogRef = useMemoFirebase(() => {
        if (!firestore || !gymId || !member?.activeLogId) return null;
        return doc(firestore, 'gyms', gymId, 'members_log', member.activeLogId);
    }, [firestore, gymId, member]);
    const { data: activeLog, isLoading: isLoadingLog } = useDoc(activeLogRef);


    useEscape(isOpen, onClose);
    if (!isOpen || !member) return null;

    const isLoading = isLoadingLog;
    const isExpired = activeLog ? isMembershipExpired(activeLog.endDate) : false;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold text-card-foreground">{activeLog?.name?.replace(/ /g, " ")}</h2>
                        <p className="text-sm text-muted-foreground font-mono">{member.id.replace(/ /g, " ")}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted text-card-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6 space-y-6">
                    {/* General Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-card-foreground">{'Member Details'.replace(/ /g, " ")}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailItem label="Full Name" value={activeLog?.name} isLoading={isLoading} />
                            <DetailItem label="Phone Number" value={activeLog?.phone} isLoading={isLoading} />
                        </div>
                    </div>
                    
                    {/* Membership Details */}
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-card-foreground">{'Membership & Payment'.replace(/ /g, " ")}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                           <DetailItem label="Membership Plan" value={activeLog?.membershipType} isLoading={isLoading} />
                           <DetailItem label="Start Date" value={activeLog ? format(parseISO(activeLog.startDate), 'dd MMM, yyyy') : null} isLoading={isLoading} />
                           <DetailItem label="End Date" value={activeLog ? format(parseISO(activeLog.endDate), 'dd MMM, yyyy') : null} isLoading={isLoading} />
                           <DetailItem label="Membership Status" isLoading={isLoading}>
                                <span className={cn("px-2 py-1 rounded-full text-xs font-medium",
                                    !isExpired ? "bg-green-600 text-white" : "bg-red-600 text-white"
                                )}>
                                    {!isExpired ? "Active" : "Expired"}
                                </span>
                           </DetailItem>
                           <DetailItem label="Payment Status" isLoading={isLoading}>
                                <PaymentStatusPill status={activeLog?.paymentStatus} />
                           </DetailItem>
                           <DetailItem label="Amount Paid" value={activeLog ? `₹${(activeLog.amountPaid || 0).toFixed(2)}` : null} isLoading={isLoading} />
                           <DetailItem label="Discount" value={activeLog ? `₹${(activeLog.discount || 0).toFixed(2)}` : null} isLoading={isLoading} />
                           <DetailItem label="Balance Amount" value={activeLog ? `₹${(activeLog.balanceAmount || 0).toFixed(2)}` : null} isLoading={isLoading} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
