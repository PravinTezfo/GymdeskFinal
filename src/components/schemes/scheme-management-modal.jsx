
'use client';
import { useEscape } from '@/hooks/useEscape';

import { useState } from 'react';
import { SchemeList } from './scheme-list';
import { AddSchemeForm } from './add-scheme-form';
import { EditSchemeForm } from './edit-scheme-form';
import { X, Plus } from 'lucide-react';

function AddSchemeModal({ gymId, isOpen, onClose }) {
    useEscape(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
             <div className="bg-card rounded-lg shadow-2xl w-full max-w-lg flex flex-col border border-border" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-card-foreground">Add New Scheme</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted text-card-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <AddSchemeForm gymId={gymId} onSuccess={onClose} />
                </div>
            </div>
        </div>
    )
}


export function SchemeManagementModal({ gym, onClose }) {
    const [editingScheme, setEditingScheme] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleEdit = (scheme) => {
        setEditingScheme(scheme);
    }

    const handleCloseEdit = () => {
        setEditingScheme(null);
    }
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-card-foreground">Manage Schemes for {gym.name}</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted text-card-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    <div className="flex items-center justify-end mb-6">
                         <button 
                            onClick={() => setIsAddModalOpen(true)} 
                            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg"
                        >
                            <Plus className="w-5 h-5" />
                            Add New Scheme
                        </button>
                    </div>
                    <SchemeList gymId={gym.id} onEdit={handleEdit} />
                </div>
            </div>

            <AddSchemeModal 
                gymId={gym.id}
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            {editingScheme && (
                <EditSchemeForm 
                    gymId={gym.id}
                    scheme={editingScheme}
                    onClose={handleCloseEdit}
                />
            )}
        </div>
    );
}
