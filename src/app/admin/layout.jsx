
"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { GymProvider, useGym } from "@/hooks/useGym";
import { GymActiveGate } from "@/components/GymActiveGate";

function MobileHeader() {
  const { gymData, isGymLoading } = useGym();

  if (isGymLoading) {
    return <div className="h-6 w-32 bg-muted/50 animate-pulse rounded-md" />;
  }

  return (
    <h1 className="font-bold text-lg ml-4 text-card-foreground">
      {gymData?.name || 'Admin Dashboard'}
    </h1>
  );
}

export default function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { role, isRoleLoading } = useRole();
  
  useEffect(() => {
    // The home page now handles the primary redirection. 
    // This is a fallback to ensure non-admins are eventually redirected.
    if (!isRoleLoading && role !== 'admin') {
      router.replace('/');
    }
  }, [role, isRoleLoading, router]);

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/');
      });
    }
  };
  
  // If the role is not yet confirmed as 'admin', show a loading screen.
  // This prevents rendering the dashboard for a user who will be redirected.
  if (isRoleLoading || role !== 'admin') {
     return (
        <div className="w-full h-screen flex justify-center items-center bg-background">
            <p className="text-foreground animate-pulse">Loading Admin Dashboard...</p>
        </div>
     );
  }

  return (
    <GymProvider>
      <GymActiveGate>
      <div className="min-h-screen bg-background">
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          onLogout={handleLogout}
        />
        <main className="flex-1 min-w-0 md:ml-64">
          <div className="md:hidden flex items-center p-4 border-b h-[100px]">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-card-foreground">
              <Menu className="w-6 h-6" />
            </button>
            <MobileHeader />
          </div>
          {children}
        </main>
      </div>
    </GymActiveGate>
    </GymProvider>
  );
}
