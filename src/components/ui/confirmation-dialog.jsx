'use client';
import { useEscape } from '@/hooks/useEscape';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConfirmationDialog({ isOpen, onClose, onConfirm, title, description, confirmText = "Confirm" }) {
    useEscape(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-sm flex flex-col border border-border" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-card-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{description}</p>
                </div>
                <div className="flex justify-end gap-3 p-4 bg-muted/50 border-t border-border rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium text-primary-foreground",
                            confirmText.toLowerCase() === 'delete' ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
                        )}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
