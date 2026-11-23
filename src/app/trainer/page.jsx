
'use client';
import { useRole } from '@/hooks/useRole';
import { MemberManagement } from '@/components/admin/member-management';

export default function TrainerHomePage() {
  const { data: trainerData, isRoleLoading } = useRole();

  if (isRoleLoading) {
    return <div className="p-8 text-foreground animate-pulse">Loading Member List...</div>;
  }

  const gymId = trainerData?.assignedGymId;

  if (!gymId) {
    return (
      <div className="p-8 text-foreground">
        <h1 className="text-2xl font-bold mb-4">Welcome, Trainer!</h1>
        <p>You are not assigned to a gym. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-card-foreground">Member List</h1>
        <p className="text-muted-foreground">View and search all members assigned to your gym.</p>
      </div>

      <MemberManagement gymId={gymId} readOnly={true} />
    </div>
  );
}
