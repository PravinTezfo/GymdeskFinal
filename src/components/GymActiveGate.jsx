'use client';
import { useGym } from '@/hooks/useGym';

/** Blocks the dashboard for users of a gym that a super admin has deactivated. */
export function GymActiveGate({ children }) {
  const { gymData, isGymLoading } = useGym();
  if (!isGymLoading && gymData && gymData.active === false) {
    return (
      <div className="w-full h-screen flex justify-center items-center bg-background p-6 text-center">
        <p className="text-foreground">This gym is currently deactivated. Please contact your administrator.</p>
      </div>
    );
  }
  return children;
}
