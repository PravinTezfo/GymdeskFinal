
'use client';
import { GymAnalyticsDashboard } from './gym-analytics';
import Link from 'next/link';
import { useGym } from '@/hooks/useGym';

export function AdminDashboard() {
  const { gymId, gymData, isGymLoading } = useGym();

  if (isGymLoading) {
    return <div className="p-8 text-foreground">Loading dashboard...</div>;
  }

  if (!gymId || !gymData) {
    return (
      <div className="p-8 text-foreground">
        <h1 className="text-2xl font-bold mb-4">Welcome, Admin!</h1>
        <p>You are not assigned to a gym. Please contact a super administrator.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-card-foreground">Dashboard for {gymData.name}</h1>
      </div>
      <GymAnalyticsDashboard gymId={gymId} />
    </div>
  );
}
