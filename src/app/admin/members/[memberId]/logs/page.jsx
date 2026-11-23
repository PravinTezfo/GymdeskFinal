
'use client';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useGym } from '@/hooks/useGym';
import { useParams, usePathname } from 'next/navigation';

const PaymentStatusPill = ({ status }) => {
    if (!status) return null;
    const statusClasses = {
        'Paid': 'bg-green-600 text-white',
        'Partially Paid': 'bg-orange-500 text-white',
        'Not Paid': 'bg-red-600 text-white',
    };
    return (
        <span className={cn('px-2 py-1 text-xs font-medium rounded-full', statusClasses[status])}>
            {status.replace(/ /g, "\u00A0")}
        </span>
    )
};

function MemberHeader({ gymId, memberId }) {
    const firestore = useFirestore();

    const logQuery = useMemoFirebase(() => {
        if (!firestore || !gymId || !memberId) return null;
        return query(
            collection(firestore, 'gyms', gymId, 'members_log'),
            where('memberId', '==', memberId),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, gymId, memberId]);
    const { data: logs, isLoading: isLoadingLogs } = useCollection(logQuery);

    const latestLog = logs?.[0];
    const memberName = latestLog?.name;
    const isLoading = isLoadingLogs;

    const getTitle = () => {
        if (isLoading) {
            return 'Loading...';
        }
        if (memberName) {
            return `Payment History for ${memberName}`;
        }
        return `Payment History for ${memberId}`;
    }

    const pathname = usePathname();
    const backHref = pathname?.startsWith('/trainer') ? '/trainer' : '/admin/activity-log';

    return (
        <div className="flex items-center gap-4 mb-6">
            <Link href={backHref} className="p-2 rounded-full hover:bg-muted">
                <ArrowLeft className="w-5 h-5 text-card-foreground" />
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-card-foreground">
                    {getTitle().replace(/ /g, "\u00A0")}
                </h1>
                <p className="text-sm text-muted-foreground font-mono">{memberId}</p>
            </div>
        </div>
    )
}


export default function MemberLogsPage() {
    const params = useParams();
    const { memberId } = params;
    const firestore = useFirestore();
    const { gymId, isGymLoading } = useGym();

    const logsQuery = useMemoFirebase(() => {
        if (isGymLoading || !firestore || !gymId || !memberId) return null;
        return query(
            collection(firestore, 'gyms', gymId, 'members_log'),
            where('memberId', '==', memberId),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, gymId, memberId, isGymLoading]);

    const { data: logs, isLoading: isLoadingLogs } = useCollection(logsQuery);
    
    if (isGymLoading) {
        return <div className="p-8 text-center text-card-foreground animate-pulse">{'Loading Gym Info...'.replace(/ /g, "\u00A0")}</div>
    }

    return (
        <div className="p-4 md:p-8">
            <MemberHeader gymId={gymId} memberId={memberId} />
            <div className="bg-card rounded-lg shadow-md border">
                {isLoadingLogs && <p className="text-center text-muted-foreground p-8 animate-pulse">{'Loading logs...'.replace(/ /g, "\u00A0")}</p>}
                {!isLoadingLogs && (!logs || logs.length === 0) && (
                    <div className="text-center py-12 px-4">
                        <h3 className="text-lg font-semibold text-card-foreground">{'No Logs Found'.replace(/ /g, "\u00A0")}</h3>
                        <p className="text-muted-foreground mt-1">This member does not have any payment history.</p>
                    </div>
                )}
                {!isLoadingLogs && logs && logs.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-card">
                                <tr className="border-b border-border">
                                    <th className="p-4 font-semibold text-sm text-card-foreground">{'Created At'.replace(/ /g, "\u00A0")}</th>
                                    <th className="p-4 font-semibold text-sm text-card-foreground">{'Start Date'.replace(/ /g, "\u00A0")}</th>
                                    <th className="p-4 font-semibold text-sm text-card-foreground">{'End Date'.replace(/ /g, "\u00A0")}</th>
                                    <th className="p-4 font-semibold text-sm text-card-foreground">{'Amount Paid'.replace(/ /g, "\u00A0")}</th>
                                    <th className="p-4 font-semibold text-sm text-card-foreground">{'Balance'.replace(/ /g, "\u00A0")}</th>
                                    <th className="p-4 font-semibold text-sm text-card-foreground">{'Status'.replace(/ /g, "\u00A0")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b border-border last:border-b-0">
                                        <td className="p-4 text-card-foreground">{log.createdAt ? format(log.createdAt.toDate(), 'dd MMM yyyy, hh:mm a').replace(/ /g, "\u00A0") : <>&nbsp;</>}</td>
                                        <td className="p-4 text-card-foreground">{log.startDate ? format(parseISO(log.startDate), 'dd MMM yyyy').replace(/ /g, "\u00A0") : <>&nbsp;</>}</td>
                                        <td className="p-4 text-card-foreground">{log.endDate ? format(parseISO(log.endDate), 'dd MMM yyyy').replace(/ /g, "\u00A0") : <>&nbsp;</>}</td>
                                        <td className="p-4 text-card-foreground">₹{log.amountPaid?.toFixed(2) || '0.00'}</td>
                                        <td className="p-4 text-card-foreground">₹{log.balanceAmount?.toFixed(2) || '0.00'}</td>
                                        <td className="p-4 text-card-foreground"><PaymentStatusPill status={log.paymentStatus} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
