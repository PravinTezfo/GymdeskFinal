
'use client';
import { useEscape } from '@/hooks/useEscape';
import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, X, Search, ChevronDown } from 'lucide-react';
import { GymMemberList } from '@/components/gym-member-list';
import { AddMemberForm } from '@/components/admin/add-member-form';
import { EditMemberForm } from '@/components/admin/edit-member-form';
import { ViewMemberModal } from '../view-member-modal';
import { useFirestore } from '@/firebase';
import { deleteMember } from '@/firebase/firestore/members';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';


function AddMemberModal({ gymId, isOpen, onClose }) {
    useEscape(isOpen, onClose);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card text-card-foreground rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-card-foreground">Add New Member</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted text-card-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <AddMemberForm gymId={gymId} onSuccess={onClose} />
                </div>
            </div>
        </div>
    );
}

function EditMemberModal({ gymId, member, isOpen, onClose }) {
    useEscape(isOpen, onClose);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card text-card-foreground rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-card-foreground">Edit Member</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted text-card-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <EditMemberForm gymId={gymId} member={member} onSuccess={onClose} />
                </div>
            </div>
        </div>
    );
}


export function MemberManagement({ gymId, readOnly = false }) {
    const firestore = useFirestore();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // --- State Initialization from URL ---
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [filterStatus, setFilterStatus] = useState(searchParams.get('payment') || 'all');
    const [filterDeleted, setFilterDeleted] = useState(searchParams.get('status') || 'active');
    const [sortOption, setSortOption] = useState(searchParams.get('sort') || 'newest');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isDeletedFilterOpen, setIsDeletedFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    // --- Effect to update URL when state changes ---
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (searchQuery) {
            params.set('q', searchQuery);
        } else {
            params.delete('q');
        }
        if (filterStatus) {
            params.set('payment', filterStatus);
        } else {
            params.delete('payment');
        }
        if (filterDeleted) {
            params.set('status', filterDeleted);
        } else {
            params.delete('status');
        }
        if (sortOption) {
            params.set('sort', sortOption);
        } else {
            params.delete('sort');
        }
        
        // Use replace to avoid adding to browser history
        router.replace(`${pathname}?${params.toString()}`);
    }, [searchQuery, filterStatus, filterDeleted, sortOption, pathname, router, searchParams]);
    

    const handleEditMember = (member) => {
        if (readOnly) return;
        setSelectedMember(member);
        setIsEditModalOpen(true);
    };

    const handleViewMember = (member) => {
        setSelectedMember(member);
        setIsViewModalOpen(true);
    };
    
    const handleDeleteRequest = (member) => {
        if (readOnly) return;
        setDeleteCandidate(member);
    }

    const confirmDelete = () => {
        if (readOnly) return;
        if (firestore && deleteCandidate) {
            deleteMember(firestore, gymId, deleteCandidate.id, deleteCandidate.activeLogId);
        }
        setDeleteCandidate(null);
    }

    const closeModal = () => {
        setIsEditModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedMember(null);
    }
    
    const filterOptions = [
        { label: 'All Statuses', value: 'all' },
        { label: 'Paid', value: 'Paid' },
        { label: 'Partially Paid', value: 'Partially Paid' },
        { label: 'Not Paid', value: 'Not Paid' },
    ];

    const deletedFilterOptions = [
        { label: 'Active', value: 'active' },
        { label: 'Deleted', value: 'deleted' },
    ];
    
    const sortOptions = [
        { label: 'Sort by Newest', value: 'newest' },
        { label: 'Sort by Ascending', value: 'id-asc' },
        { label: 'Sort by Descending', value: 'id-desc' },
    ];

    const currentFilterLabel = filterOptions.find(f => f.value === filterStatus)?.label;
    const currentDeletedFilterLabel = deletedFilterOptions.find(f => f.value === filterDeleted)?.label;
    const currentSortLabel = sortOptions.find(s => s.value === sortOption)?.label;

    return (
        <>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 lg:flex-wrap">
                 <div className="w-full lg:w-auto xl:w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-card pl-10 pr-4 py-2 border rounded-lg text-card-foreground border-border"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-grow xl:flex-grow-0 xl:justify-end xl:ml-auto">
                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <PopoverTrigger className="flex items-center justify-between w-full lg:w-auto gap-2 border bg-card border-border px-3 py-2 rounded-lg text-sm text-card-foreground hover:bg-muted">
                            <span>Payment: {currentFilterLabel}</span>
                            <ChevronDown className="w-4 h-4"/>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2">
                             {filterOptions.map(opt => (
                                <button key={opt.value} onClick={() => { setFilterStatus(opt.value); setIsFilterOpen(false); }} className="w-full text-left p-2 rounded-md hover:bg-muted text-sm">{opt.label}</button>
                            ))}
                        </PopoverContent>
                    </Popover>
                     <Popover open={isDeletedFilterOpen} onOpenChange={setIsDeletedFilterOpen}>
                        <PopoverTrigger className="flex items-center justify-between w-full lg:w-auto gap-2 border bg-card border-border px-3 py-2 rounded-lg text-sm text-card-foreground hover:bg-muted">
                            <span>Status: {currentDeletedFilterLabel}</span>
                            <ChevronDown className="w-4 h-4"/>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2">
                             {deletedFilterOptions.map(opt => (
                                <button key={opt.value} onClick={() => { setFilterDeleted(opt.value); setIsDeletedFilterOpen(false); }} className="w-full text-left p-2 rounded-md hover:bg-muted text-sm">{opt.label}</button>
                            ))}
                        </PopoverContent>
                    </Popover>
                    <Popover open={isSortOpen} onOpenChange={setIsSortOpen}>
                        <PopoverTrigger className="flex items-center justify-between w-full lg:w-auto gap-2 border bg-card border-border px-3 py-2 rounded-lg text-sm text-card-foreground hover:bg-muted">
                            <span>{currentSortLabel}</span>
                             <ChevronDown className="w-4 h-4"/>
                        </PopoverTrigger>
                         <PopoverContent className="w-48 p-2">
                            {sortOptions.map(opt => (
                                <button key={opt.value} onClick={() => { setSortOption(opt.value); setIsSortOpen(false); }} className="w-full text-left p-2 rounded-md hover:bg-muted text-sm">{opt.label}</button>
                            ))}
                        </PopoverContent>
                    </Popover>
                </div>
                {!readOnly && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)} 
                        className="flex w-full lg:w-auto lg:[@media(min-width:1024px)_and_(max-width:1124px)]:w-full items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg"
                    >
                        <Plus className="w-5 h-5" />
                        Add Member
                    </button>
                )}
            </div>
            
            <GymMemberList 
                gymId={gymId}
                searchQuery={searchQuery}
                filterStatus={filterStatus}
                filterDeleted={filterDeleted}
                sortOption={sortOption}
                onEditMember={handleEditMember}
                onViewMember={handleViewMember}
                onDeleteMember={handleDeleteRequest}
                readOnly={readOnly}
            />

            {!readOnly && (
                <AddMemberModal 
                    gymId={gymId}
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                />
            )}
            
            {!readOnly && (
                <EditMemberModal 
                    gymId={gymId}
                    member={selectedMember}
                    isOpen={isEditModalOpen}
                    onClose={closeModal}
                />
            )}

            <ViewMemberModal 
                gymId={gymId}
                member={selectedMember}
                isOpen={isViewModalOpen}
                onClose={closeModal}
            />

            {!readOnly && (
                <ConfirmationDialog 
                    isOpen={!!deleteCandidate}
                    onClose={() => setDeleteCandidate(null)}
                    onConfirm={confirmDelete}
                    title="Delete Member"
                    description={`Are you sure you want to delete this member? This action cannot be undone.`}
                    confirmText="Delete"
                />
            )}
        </>
    );
}
