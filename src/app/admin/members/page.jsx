'use client';
import { useGym } from '@/hooks/useGym';
import { MemberManagement } from '@/components/admin/member-management';

export default function AdminMembersPage() {
    const { gymId, isGymLoading } = useGym();

    if (isGymLoading) {
        return <div className="p-8 text-card-foreground">Loading...</div>;
    }

    if (!gymId) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4 text-card-foreground">Manage Members</h1>
                <p className="text-card-foreground">You are not currently assigned to a gym. Please contact a super administrator.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <MemberManagement gymId={gymId} />
        </div>
    );
}
