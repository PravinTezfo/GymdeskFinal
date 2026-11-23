
'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useGym } from '@/hooks/useGym';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

function MemberActivityRow({ log }) {
    if (!log) {
        return null;
    }

    return (
        <tr className="border-b border-border last:border-b-0">
            <td className="p-4 font-medium">{log.name?.replace(/ /g, "\u00A0") || <>&nbsp;</>}</td>
            <td className="p-4 font-mono text-xs hidden md:table-cell">{log.memberId || <>&nbsp;</>}</td>
            <td className="p-4 hidden md:table-cell">{log.phone?.replace(/ /g, "\u00A0") || <>&nbsp;</>}</td>
            <td className="p-4 hidden md:table-cell">{log.createdAt ? format(log.createdAt.toDate(), 'dd MMM yyyy, hh:mm a').replace(/ /g, "\u00A0") : <>&nbsp;</>}</td>
            <td className="p-4 text-center">
                <Link 
                    href={`/admin/members/${log.memberId}/logs`}
                    className={cn(
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        "text-xs font-medium px-3 py-1.5 rounded-md"
                    )}
                >
                    {'View Log'.replace(/ /g, "\u00A0")}
                </Link>
            </td>
        </tr>
    );
}

export default function ActivityLogPage() {
    const firestore = useFirestore();
    const { gymId, isGymLoading } = useGym();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const logsPerPage = 10;

    const logsQuery = useMemoFirebase(() => {
        if (!firestore || !gymId) return null;
        return query(collection(firestore, 'gyms', gymId, 'members_log'), orderBy('createdAt', 'desc'));
    }, [firestore, gymId]);

    const { data: logs, isLoading } = useCollection(logsQuery);
    
    const pageIsLoading = isLoading || isGymLoading;

    // Get the latest log for each unique member
    const latestLogsPerMember = useMemo(() => {
        if (!logs) return [];
        const memberMap = new Map();
        logs.forEach(log => {
            if (!memberMap.has(log.memberId)) {
                memberMap.set(log.memberId, log);
            }
        });
        return Array.from(memberMap.values());
    }, [logs]);

    const filteredLogs = useMemo(() => {
        if (!latestLogsPerMember) return [];
        if (!searchQuery) return latestLogsPerMember;
        
        const lowercasedQuery = searchQuery.toLowerCase();
        return latestLogsPerMember.filter(log => {
            const idMatch = log.memberId?.toLowerCase().includes(lowercasedQuery);
            const nameMatch = log?.name?.toLowerCase().includes(lowercasedQuery);
            const phoneMatch = log?.phone?.includes(searchQuery);
            return idMatch || nameMatch || phoneMatch;
        });
    }, [latestLogsPerMember, searchQuery]);

    // Pagination logic
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * logsPerPage;
        return filteredLogs.slice(startIndex, startIndex + logsPerPage);
    }, [filteredLogs, currentPage, logsPerPage]);

    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="p-4 md:p-8">
             <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-card-foreground">{'Activity Log'.replace(/ /g, "\u00A0")}</h1>
                 <div className="w-full">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name, ID, phone"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-card pl-10 pr-4 py-2 border rounded-lg text-card-foreground border-border"
                        />
                    </div>
                </div>
            </div>
            <div className="bg-card text-card-foreground rounded-lg shadow-md border overflow-x-auto">
                 {pageIsLoading && <div className="text-center p-8 text-muted-foreground">Loading activity log...</div>}

                 {!pageIsLoading && paginatedLogs.length === 0 && (
                    <div className="text-center py-12 px-4 border border-dashed rounded-lg m-4">
                        <h3 className="text-lg font-semibold text-card-foreground">
                            {searchQuery ? 'No Results Found'.replace(/ /g, "\u00A0") : 'No Activity Yet'.replace(/ /g, "\u00A0")}
                        </h3>
                        <p className="text-muted-foreground mt-1">
                            {searchQuery 
                                ? `Your search for "${searchQuery}" did not return any results.`
                                : 'When new members are added, their activity will appear here.'
                            }
                        </p>
                    </div>
                )}

                 {!pageIsLoading && paginatedLogs.length > 0 && (
                    <table className="w-full text-left">
                        <thead className="bg-card">
                            <tr className="border-b border-border">
                                <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">{'Member'.replace(/ /g, "\u00A0")}</th>
                                <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground hidden md:table-cell">{'Member ID'.replace(/ /g, "\u00A0")}</th>
                                <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground hidden md:table-cell">{'Phone'.replace(/ /g, "\u00A0")}</th>
                                <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground hidden md:table-cell">{'Last Activity'.replace(/ /g, "\u00A0")}</th>
                                <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground text-center">{'Actions'.replace(/ /g, "\u00A0")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLogs.map(log => (
                                <MemberActivityRow key={log.id} log={log} />
                            ))}
                        </tbody>
                    </table>
                 )}
            </div>
            {totalPages > 1 && !pageIsLoading && paginatedLogs.length > 0 && (
                <div className="flex justify-between items-center p-4 border-t border-border mt-4 bg-card rounded-lg border text-card-foreground">
                    <button 
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}
