
'use client';
import { MoreHorizontal, Eye, Edit, List, ToggleLeft, ToggleRight } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { updateGym } from '@/firebase/firestore/gyms';
import { useState } from 'react';

function GymActions({ gym, onViewClick, onManageSchemesClick, onEditClick }) {
  const firestore = useFirestore();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleToggleActive = () => {
    if (firestore) {
      updateGym(firestore, gym.id, { active: !gym.active });
    }
    setIsPopoverOpen(false);
  };

  const handleManageSchemesClick = () => {
    onManageSchemesClick();
    setIsPopoverOpen(false);
  }
  
  const handleEditClick = () => {
    onEditClick();
    setIsPopoverOpen(false);
  }
  
  const handleViewClick = () => {
    onViewClick();
    setIsPopoverOpen(false);
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <button aria-label="Row actions" className="p-2 rounded-full hover:bg-muted">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        <div className="flex flex-col gap-1">
          <button
            onClick={handleViewClick}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm"
          >
            <Eye className="w-4 h-4" />
            <span>{'View Gym'.replace(/ /g, " ")}</span>
          </button>
          <button
            onClick={handleEditClick}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm"
          >
            <Edit className="w-4 h-4" />
            <span>{'Edit'.replace(/ /g, " ")}</span>
          </button>
          <button
            onClick={handleManageSchemesClick}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm"
          >
            <List className="w-4 h-4" />
            <span>{'Manage Schemes'.replace(/ /g, " ")}</span>
          </button>
          <button
            onClick={handleToggleActive}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm w-full text-left"
          >
            {gym.active ? (
              <>
                <ToggleLeft className="w-4 h-4 text-destructive" />
                <span className="text-destructive">{'Deactivate'.replace(/ /g, " ")}</span>
              </>
            ) : (
              <>
                <ToggleRight className="w-4 h-4 text-green-600" />
                <span className="text-green-600">{'Activate'.replace(/ /g, " ")}</span>
              </>
            )}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function GymTableRow({ gym, onViewClick, onManageSchemesClick, onEditClick }) {
    const firestore = useFirestore();

    const adminDocRef = useMemoFirebase(() => {
        if (!firestore || !gym.adminId) return null;
        return doc(firestore, 'admins', gym.adminId);
    }, [firestore, gym.adminId]);

    const { data: admin, isLoading: isAdminLoading } = useDoc(adminDocRef);

    return (
        <tr className="border-b border-border">
            <td className="p-4 font-medium">{gym.name?.replace(/ /g, " ") || <>&nbsp;</>}</td>
            <td className="p-4">{isAdminLoading ? '...' : (admin?.email?.replace(/ /g, " ") || <>&nbsp;</>)}</td>
            <td className="p-4">
                <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    gym.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                )}>
                    {gym.active ? "Active" : "Inactive"}
                </span>
            </td>
            <td className="p-4 text-center">
                <GymActions 
                    gym={gym} 
                    onViewClick={onViewClick}
                    onManageSchemesClick={onManageSchemesClick} 
                    onEditClick={onEditClick}
                />
            </td>
        </tr>
    )
}
