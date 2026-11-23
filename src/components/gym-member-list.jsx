
'use client';

import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { format, parseISO } from 'date-fns';
import { isMembershipExpired } from '@/lib/membership';
import { Edit, Trash2, Eye, MoreHorizontal, FileText, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";

function MemberActions({ member, onView, onDelete, onEdit, readOnly }) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const isDateExpired = member.log?.endDate && isMembershipExpired(member.log.endDate);
    const isPaid = member.log?.paymentStatus === 'Paid';
    
    const showRenew = isDateExpired && isPaid;
    const actionButtonText = showRenew ? 'Renew' : 'Edit';
    const ActionIcon = showRenew ? RefreshCw : Edit;


    const handleView = () => {
        onView();
        setIsPopoverOpen(false);
    }
    const handleDelete = () => {
        if (readOnly) return;
        onDelete();
        setIsPopoverOpen(false);
    }
    const handleEdit = () => {
        if (readOnly) return;
        onEdit();
        setIsPopoverOpen(false);
    }

    return (
        <div className="flex items-center justify-center gap-2">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <button aria-label="Row actions" className="p-2 rounded-full hover:bg-muted">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={handleView}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm w-full text-left"
                        >
                            <Eye className="w-4 h-4" />
                            <span>{'View Details'.replace(/ /g, " ")}</span>
                        </button>
                        <Link
                            href={`${readOnly ? '/trainer' : '/admin'}/members/${encodeURIComponent(member.id)}/logs`}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm w-full text-left"
                            onClick={() => setIsPopoverOpen(false)}
                        >
                            <FileText className="w-4 h-4" />
                            <span>{'View Logs'.replace(/ /g, " ")}</span>
                        </Link>
                        {!readOnly && (
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm w-full text-left text-destructive"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>{'Delete'.replace(/ /g, " ")}</span>
                            </button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            {!readOnly && (
                <button onClick={handleEdit} className={cn("flex items-center gap-1 text-primary-foreground text-sm px-3 py-1.5 rounded-md", showRenew ? "bg-orange-500 hover:bg-orange-600" : "bg-primary hover:bg-primary/90")}>
                    <ActionIcon className="w-4 h-4" />
                    <span>{actionButtonText.replace(/ /g, " ")}</span>
                </button>
            )}
        </div>
    )
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


const MemberStatusPill = ({ log }) => {
    if (!log) {
         return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-400 text-white animate-pulse">
                Loading...
            </span>
        );
    }
    
    if (log.isDeleted) {
        return (
             <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                Deleted
            </span>
        )
    }

    if (!log.endDate) {
         return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                Inactive
            </span>
        );
    }

    const isDateExpired = isMembershipExpired(log.endDate);
    
    if (isDateExpired) {
        return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                Expired
            </span>
        );
    }
    
    return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
            Active
        </span>
    );
};


function MemberRow({ member, onEditMember, onViewMember, onDeleteMember, readOnly }) {
    const { log } = member;
    if (!log) {
        return (
            <tr className="border-b border-border last:border-b-0">
                <td className="p-4 font-mono text-xs hidden md:table-cell">{member.id || <>&nbsp;</>}</td>
                <td colSpan={8} className="p-4 text-center text-muted-foreground">Loading member details...</td>
                 <td className="p-4 text-center">
                    <MemberActions 
                        member={member}
                        onView={() => onViewMember(member)}
                        onDelete={() => onDeleteMember(member)}
                        onEdit={() => onEditMember(member)}
                        readOnly={readOnly}
                    />
                </td>
            </tr>
        )
    }

    return (
         <tr className="border-b border-border last:border-b-0">
            <td className="p-4 font-mono text-xs hidden md:table-cell">{member.id}</td>
            <td className="p-4 font-medium">{log?.name?.replace(/ /g, " ") || <>&nbsp;</>}</td>
            <td className="p-4 hidden md:table-cell">{log?.membershipType?.replace(/ /g, " ") || <>&nbsp;</>}</td>
            <td className="p-4 hidden lg:table-cell">{log?.phone?.replace(/ /g, " ") || <>&nbsp;</>}</td>
            <td className="p-4 hidden md:table-cell">{log?.startDate ? format(parseISO(log.startDate), 'dd MMM yyyy').replace(/ /g, " ") : <>&nbsp;</>}</td>
            <td className="p-4 hidden lg:table-cell">{log?.endDate ? format(parseISO(log.endDate), 'dd MMM yyyy').replace(/ /g, " ") : <>&nbsp;</>}</td>
            <td className="p-4 hidden md:table-cell">
                <MemberStatusPill log={log} />
            </td>
            <td className="p-4"><PaymentStatusPill status={log?.paymentStatus} /></td>
            <td className="p-4 hidden md:table-cell">₹{log?.balanceAmount?.toFixed(2) || '0.00'}</td>
            <td className="p-4 text-center">
                <MemberActions 
                    member={member}
                    onView={() => onViewMember(member)}
                    onDelete={() => onDeleteMember(member)}
                    onEdit={() => onEditMember(member)}
                    readOnly={readOnly}
                />
            </td>
        </tr>
    );
}

function MemberCard({ member, onEditMember, onViewMember, onDeleteMember, readOnly }) {
    const { log } = member;
    
    return (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-card-foreground">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold">{log?.name?.replace(/ /g, " ") || <>&nbsp;</>}</p>
                    <p className="text-xs text-muted-foreground font-mono">{member.id}</p>
                </div>
                 <MemberActions 
                    member={member}
                    onView={() => onViewMember(member)}
                    onDelete={() => onDeleteMember(member)}
                    onEdit={() => onEditMember(member)}
                    readOnly={readOnly}
                />
            </div>
            {!log && <p className="text-sm">Loading details...</p>}
            {log && (
                <>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-card-foreground">{'Membership:'.replace(/ /g, " ")}</span>
                        <span className="font-medium">{log?.membershipType?.replace(/ /g, " ") || <>&nbsp;</>}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-card-foreground">{'Start Date:'.replace(/ /g, " ")}</span>
                        <span className="font-medium">{log?.startDate ? format(parseISO(log.startDate), 'dd MMM yyyy').replace(/ /g, " ") : <>&nbsp;</>}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-card-foreground">{'Status:'.replace(/ /g, " ")}</span>
                        <MemberStatusPill log={log} />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-card-foreground">{'Balance:'.replace(/ /g, " ")}</span>
                        <span className="font-medium">₹{log?.balanceAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-card-foreground">{'Payment:'.replace(/ /g, " ")}</span>
                        <PaymentStatusPill status={log?.paymentStatus} />
                    </div>
                </>
            )}
        </div>
    )
}

function useMemberLogs(gymId, members) {
    const firestore = useFirestore();
    const [logs, setLogs] = useState({});
    const [loading, setLoading] = useState(true);

    // Re-subscribe only when the SET of (member -> active log) pairs changes, not on every members snapshot.
    const pairsKey = useMemo(
        () => (members ? members.map(m => `${m.id}:${m.activeLogId || ''}`).join('|') : null),
        [members]
    );

    useEffect(() => {
        if (!firestore || !gymId || !members || pairsKey === null) return;
        if (members.length === 0) { setLogs({}); setLoading(false); return; }

        setLoading(true);
        const live = new Set(members.map(m => m.id));
        // drop logs of members that no longer exist
        setLogs(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => live.has(id))));

        let pending = members.length;
        const done = () => { if (--pending <= 0) setLoading(false); };
        const unsubscribers = members.map((member) => {
            if (!member.activeLogId) { done(); return null; }
            let first = true;
            return onSnapshot(
                doc(firestore, 'gyms', gymId, 'members_log', member.activeLogId),
                (snap) => {
                    setLogs(prev => ({ ...prev, [member.id]: snap.data() }));
                    if (first) { first = false; done(); }
                },
                () => { if (first) { first = false; done(); } }
            );
        });
        const safety = setTimeout(() => setLoading(false), 8000);

        return () => {
            unsubscribers.forEach(unsub => unsub && unsub());
            clearTimeout(safety);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firestore, gymId, pairsKey]);

    return { logs, loadingLogs: loading };
}


export function GymMemberList({ gymId, onEditMember, onViewMember, onDeleteMember, searchQuery, filterStatus, filterDeleted, sortOption, readOnly = false }) {
    const firestore = useFirestore();
    const [currentPage, setCurrentPage] = useState(1);
    const membersPerPage = 10;
    
    const membersQuery = useMemoFirebase(() => {
        if (!firestore || !gymId) return null;
        return query(
            collection(firestore, 'gyms', gymId, 'members'),
            orderBy('__name__')
        );
    }, [firestore, gymId]);
    
    const { data: members, isLoading: isLoadingMembers } = useCollection(membersQuery);
    const { logs, loadingLogs } = useMemberLogs(gymId, members);

    const processedMembers = useMemo(() => {
        if (!members) return [];

        let initialFilter = members;

        // 1. Filter by Deleted Status
        if (filterDeleted) {
            initialFilter = members.filter(member => {
                const log = logs[member.id];
                if (!log) return filterDeleted !== 'deleted';
                const isDeleted = log.isDeleted || false;
                if (filterDeleted === 'deleted') {
                    return isDeleted;
                }
                if (filterDeleted === 'active') {
                    return !isDeleted;
                }
                return true; // for 'all'
            })
        }
        
        // 2. Search
        let searched = initialFilter;
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            searched = initialFilter.filter(member => {
                const log = logs[member.id];
                const memberIdMatch = member.id.toLowerCase().includes(lowercasedQuery);
                const nameMatch = log?.name?.toLowerCase().includes(lowercasedQuery);
                const phoneMatch = log?.phone?.includes(searchQuery);
                return memberIdMatch || nameMatch || phoneMatch;
            });
        }
        
        // 3. Filter by Payment Status
        let paymentFiltered = searched;
        if (filterStatus !== 'all') {
            paymentFiltered = searched.filter(member => {
                const log = logs[member.id];
                return log?.paymentStatus === filterStatus;
            });
        }

        // 4. Sort
        const sorted = [...paymentFiltered].sort((a, b) => {
            if (sortOption === 'id-asc') {
                return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
            } else if (sortOption === 'id-desc') {
                return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: 'base' });
            } else { // 'newest'
                const logA = logs[a.id];
                const logB = logs[b.id];
                const dateA = logA?.createdAt ? logA.createdAt.toMillis() : 0;
                const dateB = logB?.createdAt ? logB.createdAt.toMillis() : 0;
                return dateB - dateA;
            }
        });
        
        // 5. Attach logs to members
        return sorted.map(member => ({
            ...member,
            log: logs[member.id]
        }));


    }, [members, logs, searchQuery, filterStatus, filterDeleted, sortOption]);
    
    // Pagination logic
    const paginatedMembers = useMemo(() => {
        const startIndex = (currentPage - 1) * membersPerPage;
        return processedMembers.slice(startIndex, startIndex + membersPerPage);
    }, [processedMembers, currentPage, membersPerPage]);

    const totalPages = Math.ceil(processedMembers.length / membersPerPage);

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

    // Reset to page 1 if filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus, filterDeleted, sortOption]);


    const isLoading = isLoadingMembers || loadingLogs;

    if (isLoading && !members) {
        return <div className="text-center p-8 text-muted-foreground">Loading members...</div>;
    }
    
    if (!isLoadingMembers && (!members || members.length === 0)) {
        return (
            <div className="text-center py-12 px-4 border border-dashed rounded-lg">
                <h3 className="text-lg font-semibold text-card-foreground">{'No Members Yet'.replace(/ /g, " ")}</h3>
                <p className="text-muted-foreground mt-1">Click "Add Member" to get started.</p>
            </div>
        );
    }
    
    if (processedMembers.length === 0 && (searchQuery || filterStatus !== 'all' || filterDeleted !== 'active')) {
         return (
            <div className="text-center py-12 px-4 border border-dashed rounded-lg">
                <h3 className="text-lg font-semibold text-card-foreground">{'No Members Found'.replace(/ /g, " ")}</h3>
                <p className="text-muted-foreground mt-1">Your search and filter criteria did not return any results.</p>
            </div>
        );
    }
    
    const paginationControls = (
        totalPages > 1 && (
            <div className="flex justify-between items-center p-4 mt-4 bg-card rounded-lg border border-border text-card-foreground">
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
        )
    );
    
    return (
        <>
            {/* Desktop Table */}
            <div className="hidden md:block">
                <div className="bg-card text-card-foreground rounded-lg shadow-md border overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-card">
                            <tr className="border-b border-border">
                                <th className="p-4 font-semibold text-sm text-muted-foreground">{'Member ID'.replace(/ /g, " ")}</th>
                                <th className="p-4 font-semibold text-sm text-muted-foreground">{'Name'.replace(/ /g, " ")}</th>
                                <th className="p-4 font-semibold text-sm text-muted-foreground">{'Membership'.replace(/ /g, " ")}</th>
                                <th className="p-4 font-semibold text-sm text-muted-foreground hidden lg:table-cell">{'Phone'.replace(/ /g, " ")}</th>
                                <th className="p-4 font-semibold text-sm text-muted-foreground">{'Start Date'.replace(/ /g, " ")}</th>
                                <th className="p-4 font-semibold text-sm text-muted-foreground hidden lg:table-cell">{'End Date'.replace(/ /g, " ")}</th>
                                <th className="p-4 font-semibold text-sm text-muted-foreground">{'Status'.replace(/ /g, " ")}</th>
                                <th className="p-4 font-semibold text-sm text-muted-foreground">{'Payment'.replace(/ /g, " ")}</th>
                                <th className="p-4 font-semibold text-sm text-muted-foreground">{'Balance'.replace(/ /g, " ")}</th>
                                <th className="p-4 font-semibold text-sm text-muted-foreground text-center">{'Actions'.replace(/ /g, " ")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedMembers.map(member => (
                                <MemberRow 
                                    key={member.id} 
                                    member={member} 
                                    onEditMember={onEditMember}
                                    onViewMember={onViewMember}
                                    onDeleteMember={onDeleteMember}
                                    readOnly={readOnly}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                 {paginationControls}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden grid grid-cols-1 gap-4">
                 {paginatedMembers.map(member => (
                    <MemberCard 
                        key={member.id} 
                        member={member}
                        onEditMember={onEditMember}
                        onViewMember={onViewMember}
                        onDeleteMember={onDeleteMember}
                        readOnly={readOnly}
                    />
                ))}
                {paginationControls}
            </div>
        </>
    );
}
