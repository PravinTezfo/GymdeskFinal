
'use client';
import { useEscape } from '@/hooks/useEscape';
import { X } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { hslToHex } from '@/lib/utils';

function DetailItem({ label, value, isLoading }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {isLoading ? (
                <div className="h-6 w-32 bg-muted/50 animate-pulse rounded-md" />
            ) : (
                <p className="text-base text-card-foreground">{value || 'N/A'}</p>
            )}
        </div>
    );
}

function ThemeColorPreview({ label, hslColor }) {
    if (!hslColor) return null;
    const hexColor = hslToHex(hslColor);
    return (
        <div className="flex items-center gap-3">
             <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: hexColor }} />
             <div>
                <p className="text-sm font-medium text-card-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{hexColor}</p>
             </div>
        </div>
    )
}

export function ViewGymModal({ gym, isOpen, onClose }) {
    const firestore = useFirestore();

    const adminDocRef = useMemoFirebase(() => {
        if (!firestore || !gym?.adminId) return null;
        return doc(firestore, 'admins', gym.adminId);
    }, [firestore, gym]);

    const { data: admin, isLoading: isAdminLoading } = useDoc(adminDocRef);

    useEscape(isOpen, onClose);
    if (!isOpen || !gym) return null;

    const theme = gym.theme || {};

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-card-foreground">{gym.name}</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6 space-y-8">
                    {/* General Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Gym Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailItem label="Gym Name" value={gym.name} />
                            <DetailItem label="Gym ID" value={gym.id} />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", gym.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                                    {gym.active ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Admin Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Administrator</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <DetailItem label="Admin Name" value={`${admin?.firstname || ''} ${admin?.lastname || ''}`} isLoading={isAdminLoading} />
                           <DetailItem label="Admin Email" value={admin?.email} isLoading={isAdminLoading} />
                        </div>
                    </div>

                    {/* Theme Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Appearance</h3>
                        {theme.logoUrl && (
                             <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Logo</p>
                                <div className="p-4 border rounded-md bg-muted/20 inline-block">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={theme.logoUrl} alt="Gym Logo" width={160} height={50} className="object-contain" />
                                </div>
                             </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <ThemeColorPreview label="Dashboard BG" hslColor={theme.background} />
                            <ThemeColorPreview label="Button Color" hslColor={theme.primary} />
                            <ThemeColorPreview label="Sidebar BG" hslColor={theme.sidebarBackground} />
                            <ThemeColorPreview label="Active Link BG" hslColor={theme.sidebarActive} />
                            <ThemeColorPreview label="Table/Form BG" hslColor={theme.card} />
                            <ThemeColorPreview label="Border Color" hslColor={theme.border} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
