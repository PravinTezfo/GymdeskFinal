
'use client';
import { useEscape } from '@/hooks/useEscape';
import { Plus, Eye, Edit, List, MoreHorizontal } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useState } from 'react';
import { SchemeManagementModal } from './schemes/scheme-management-modal';
import { AddGymForm } from './add-gym-form';
import { EditGymForm } from './edit-gym-form';
import { X } from 'lucide-react';
import { GymTableRow } from './GymTableRow';
import { ViewGymModal } from './view-gym-modal';


function AddGymModal({ isOpen, onClose }) {
    useEscape(isOpen, onClose);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-card-foreground">{'Add New Gym'.replace(/ /g, "\u00A0")}</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <AddGymForm onSuccess={onClose} />
                </div>
            </div>
        </div>
    );
}

export function EditGymModal({ gym, isOpen, onClose }) {
    useEscape(isOpen, onClose);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-card-foreground">{'Edit Gym'.replace(/ /g, "\u00A0")}</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                 <div className="overflow-y-auto p-6">
                    <EditGymForm gymId={gym.id} onSuccess={onClose} />
                </div>
            </div>
        </div>
    );
}


export function GymPage() {
    const firestore = useFirestore();
    const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
    const [isAddGymModalOpen, setIsAddGymModalOpen] = useState(false);
    const [isEditGymModalOpen, setIsEditGymModalOpen] = useState(false);
    const [isViewGymModalOpen, setIsViewGymModalOpen] = useState(false);
    const [selectedGym, setSelectedGym] = useState(null);

    const gymsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'gyms');
    }, [firestore]);

    const { data: gyms, isLoading } = useCollection(gymsQuery);
    
    const handleManageSchemes = (gym) => {
        setSelectedGym(gym);
        setIsSchemeModalOpen(true);
    }
    
    const handleEditGym = (gym) => {
        setSelectedGym(gym);
        setIsEditGymModalOpen(true);
    }

    const handleViewGym = (gym) => {
        setSelectedGym(gym);
        setIsViewGymModalOpen(true);
    }


    return (
        <>
            <div className="p-4 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-card-foreground">{'Gym Management'.replace(/ /g, "\u00A0")}</h1>
                    <button onClick={() => setIsAddGymModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg">
                        <Plus className="w-5 h-5" />
                        {'Add New Gym'.replace(/ /g, "\u00A0")}
                    </button>
                </div>
                <div className="bg-card text-card-foreground rounded-lg shadow-md border">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4">{'Existing Gyms'.replace(/ /g, "\u00A0")}</h2>
                        {isLoading && <p>Loading gyms...</p>}
                        {!isLoading && (!gyms || gyms.length === 0) && (
                            <p className="text-muted-foreground">No gyms found.</p>
                        )}
                        {gyms && gyms.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-card-foreground">
                                    <thead className="bg-card">
                                        <tr className="border-b border-border">
                                            <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">{'Gym Name'.replace(/ /g, "\u00A0")}</th>
                                            <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">{'Email'.replace(/ /g, "\u00A0")}</th>
                                            <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground">{'Status'.replace(/ /g, "\u00A0")}</th>
                                            <th className="p-4 font-semibold text-sm text-card-foreground md:text-muted-foreground text-center">{'Actions'.replace(/ /g, "\u00A0")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gyms.map(gym => (
                                            <GymTableRow 
                                                key={gym.id} 
                                                gym={gym} 
                                                onViewClick={() => handleViewGym(gym)}
                                                onManageSchemesClick={() => handleManageSchemes(gym)}
                                                onEditClick={() => handleEditGym(gym)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AddGymModal isOpen={isAddGymModalOpen} onClose={() => setIsAddGymModalOpen(false)} />
            
            <EditGymModal gym={selectedGym} isOpen={isEditGymModalOpen} onClose={() => { setIsEditGymModalOpen(false); setSelectedGym(null); }} />

            <ViewGymModal gym={selectedGym} isOpen={isViewGymModalOpen} onClose={() => { setIsViewGymModalOpen(false); setSelectedGym(null); }} />

            {isSchemeModalOpen && selectedGym && (
                <SchemeManagementModal
                    gym={selectedGym}
                    onClose={() => setIsSchemeModalOpen(false)}
                />
            )}
        </>
    );
}
