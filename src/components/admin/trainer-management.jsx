
'use client';
import { useEscape } from '@/hooks/useEscape';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TrainerList } from './trainer-list';
import { AddTrainerForm } from './add-trainer-form';
import { EditTrainerForm } from './edit-trainer-form';
import { useFirestore } from '@/firebase';
import { deleteTrainer } from '@/firebase/firestore/trainers';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';


function AddTrainerModal({ gymId, isOpen, onClose }) {
    useEscape(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-lg flex flex-col border border-border max-h-[90vh]" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border flex-shrink-0">
                    <h2 className="text-xl font-bold text-card-foreground">Add New Trainer</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted text-card-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <AddTrainerForm gymId={gymId} onSuccess={onClose} />
                </div>
            </div>
        </div>
    );
}

function EditTrainerModal({ gymId, trainer, isOpen, onClose }) {
    useEscape(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-lg flex flex-col border border-border max-h-[90vh]" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border flex-shrink-0">
                    <h2 className="text-xl font-bold text-card-foreground">Edit Trainer</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted text-card-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <EditTrainerForm gymId={gymId} trainer={trainer} onSuccess={onClose} />
                </div>
            </div>
        </div>
    );
}


export function TrainerManagement({ gymId }) {
    const firestore = useFirestore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTrainer, setEditingTrainer] = useState(null);
    const [deleteCandidate, setDeleteCandidate] = useState(null);

    const handleEdit = (trainer) => {
        setEditingTrainer(trainer);
    }
    
    const handleDeleteRequest = (trainer) => {
        setDeleteCandidate(trainer);
    }
    
    const confirmDelete = () => {
        if (firestore && deleteCandidate) {
            deleteTrainer(firestore, deleteCandidate.uid);
        }
        setDeleteCandidate(null);
    }

    const handleCloseModals = () => {
        setIsAddModalOpen(false);
        setEditingTrainer(null);
    }

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-card-foreground">Manage Trainers</h1>
                <button 
                    onClick={() => setIsAddModalOpen(true)} 
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg"
                >
                    <Plus className="w-5 h-5" />
                    Add Trainer
                </button>
            </div>
           
           <TrainerList gymId={gymId} onEdit={handleEdit} onDelete={handleDeleteRequest} />

            <AddTrainerModal 
                gymId={gymId}
                isOpen={isAddModalOpen}
                onClose={handleCloseModals}
            />

            <EditTrainerModal
                gymId={gymId}
                trainer={editingTrainer}
                isOpen={!!editingTrainer}
                onClose={handleCloseModals}
            />

            <ConfirmationDialog 
                isOpen={!!deleteCandidate}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={confirmDelete}
                title="Delete Trainer"
                description={`Are you sure you want to delete this trainer? They will lose access to this gym; their sign-in account itself is not deleted. This action cannot be undone.`}
                confirmText="Delete"
            />
        </>
    );
}
