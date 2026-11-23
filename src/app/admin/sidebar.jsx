
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, X, LogOut, Users, List, Activity } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

function BrandLogo() {
  const { user } = useUser();
  const firestore = useFirestore();

  const adminDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'admins', user.uid);
  }, [firestore, user]);
  const { data: adminData } = useDoc(adminDocRef);
  const gymId = adminData?.assignedGymId;

  const gymDocRef = useMemoFirebase(() => {
    if (!firestore || !gymId) return null;
    return doc(firestore, 'gyms', gymId);
  }, [firestore, gymId]);
  const { data: gymData, isLoading: isGymLoading } = useDoc(gymDocRef);

  if (isGymLoading) {
    return <div className="h-8 w-36 bg-gray-700 rounded animate-pulse" />;
  }

  const logoUrl = gymData?.theme?.logoUrl;

  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="Gym Logo" width={140} height={40} className="object-contain" />;
  }

  return <h1 className="font-bold text-sidebar-foreground">Tezfo GymDesk</h1>;
}

export function Sidebar({ onLogout, isOpen, setIsOpen }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Members', href: '/admin/members', icon: Users },
    { name: 'Plans', href: '/admin/plans', icon: List },
    { name: 'Activity Log', href: '/admin/activity-log', icon: Activity },
    { name: 'Setting', href: '/admin/settings', icon: Settings },
  ];

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      // md breakpoint
      setIsOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <nav className="flex flex-col gap-2 p-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== '/admin' || pathname === '/admin');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg font-medium transition-colors text-left',
                isActive
                  ? 'bg-sidebar-active text-sidebar-foreground'
                  : 'text-sidebar-muted-foreground hover:bg-white/10'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="md:inline">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 p-3 rounded-lg font-medium transition-colors hover:bg-white/10 w-full text-sidebar-muted-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar (Overlay) */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden',
          isOpen ? 'block' : 'hidden'
        )}
        onClick={() => setIsOpen(false)}
      ></div>
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar transition-transform md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex justify-between items-center p-4 border-b border-sidebar-border">
          <BrandLogo />
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-sidebar-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:fixed md:top-0 md:left-0 md:h-full w-64 flex-shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center justify-center p-4 border-b h-[100px] border-sidebar-border">
          <BrandLogo />
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
