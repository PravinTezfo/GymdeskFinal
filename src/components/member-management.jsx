
'use client';
import { useEscape } from '@/hooks/useEscape';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { GymMemberList } from '@/components/gym-member-list';
import { AddMemberForm } from '@/components/admin/add-member-form';
import { EditMemberForm } from '@/components/admin/edit-member-form';
import { ViewMemberModal } from './view-member-modal';
import { deleteMember } from '@/firebase/firestore/members';
import { useFirestore } from '@/firebase';


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


export function MemberManagement({ gymId }) {
    const firestore = useFirestore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    const handleEditMember = (member) => {
        setSelectedMember(member);
        setIsEditModalOpen(true);
    };
    
    const handleViewMember = (member) => {
        setSelectedMember(member);
        setIsViewModalOpen(true);
    }
    
    const handleDeleteMember = (memberId) => {
        if (window.confirm("Are you sure you want to delete this member? This action cannot be undone.")) {
            if (firestore) {
                deleteMember(firestore, gymId, memberId);
            }
        }
    }

    const closeModal = () => {
        setIsEditModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedMember(null);
    }

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-card-foreground">Members</h1>
                <button 
                    onClick={() => setIsAddModalOpen(true)} 
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg"
                >
                    <Plus className="w-5 h-5" />
                    Add Member
                </button>
            </div>
            
            <GymMemberList 
                gymId={gymId} 
                onEditMember={handleEditMember} 
                onViewMember={handleViewMember}
                onDeleteMember={handleDeleteMember}
            />

            <AddMemberModal 
                gymId={gymId}
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
            
            <EditMemberModal
                gymId={gymId}
                member={selectedMember}
                isOpen={isEditModalOpen}
                onClose={closeModal}
            />

            <ViewMemberModal
                gymId={gymId}
                member={selectedMember}
                isOpen={isViewModalOpen}
                onClose={closeModal}
            />
        </>
    );
}
