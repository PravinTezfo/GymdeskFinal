
'use client';
import { useGym } from '@/hooks/useGym';
import { SchemeManagement } from '@/components/admin/scheme-management';

export default function AdminPlansPage() {
    const { gymId, isGymLoading } = useGym();

    if (isGymLoading) {
        return <div className="p-8 text-card-foreground">Loading...</div>;
    }

    if (!gymId) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4 text-card-foreground">Manage Plans</h1>
                <p className="text-card-foreground">You are not currently assigned to a gym. Please contact a super administrator.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-2xl font-bold text-card-foreground mb-6">Membership Plans</h1>
            <SchemeManagement gymId={gymId} />
        </div>
    );
}
