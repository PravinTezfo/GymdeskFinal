
'use client';

import { useUser } from "@/firebase";
import { LoginForm } from "@/components/login-form";
import { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { SetupForm } from "@/components/setup-form";
import { useRole } from "@/hooks/useRole";


export default function Home() {
  const { isUserLoading } = useUser();
  const { role, isRoleLoading, needsSetup, isSetupCheckLoading } = useRole();
  const router = useRouter();
  
  // A single, comprehensive loading flag.
  const isLoading = isUserLoading || isRoleLoading || isSetupCheckLoading;

  useEffect(() => {
    // This effect handles all redirection logic once loading is complete.
    if (!isLoading) {
      if (role === 'superadmin') {
        router.replace('/superadmin');
      } else if (role === 'admin') {
        router.replace('/admin');
      } else if (role === 'trainer') {
        router.replace('/trainer');
      }
      // If there's no role, we don't redirect. The renderContent function will handle it.
    }
  }, [role, isLoading, router]);
  
  const containerStyle = {
    minHeight: '100vh', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    backgroundColor: 'hsl(var(--background))', 
    padding: '1rem',
    justifyContent: 'center',
  };
  
  // This function decides what to render based on the loading and data state.
  const renderContent = () => {
    // Primary loading state: show while we determine user status, role, and setup needs.
    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p className="text-foreground animate-pulse">Loading...</p>
        </div>
      );
    }
    
    // If a user has a role, they are in the process of being redirected.
    // Showing a loading message here prevents any brief flash of the login/setup form.
    if (role) {
         return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <p className="text-foreground animate-pulse">Redirecting...</p>
            </div>
        );
    }

    // If not loading, no role, and we have determined setup is needed.
    if (needsSetup) {
      return <SetupForm />;
    }
    
    // If not loading, no role, and setup is NOT needed, show the login form.
    return <LoginForm />;
  }

  return (
    <main style={containerStyle}>
      <div style={{ width: '100%', maxWidth: '72rem' }}>
        <div style={{ width: '100%'}}>
          {renderContent()}
        </div>
      </div>
    </main>
  );
}
