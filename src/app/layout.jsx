
'use client';
import { FirebaseClientProvider } from '@/firebase';
import './globals.css';
import { doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RoleProvider, useRole } from '@/hooks/useRole';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Toaster } from '@/components/ui/sonner';


function ThemeManager() {
  const { data: userData, role } = useRole();
  const firestore = useFirestore();
  const pathname = usePathname();
  const [activeTheme, setActiveTheme] = useState(null);

  // --- Step 1: Determine gymId from URL if a superadmin is viewing a specific gym page ---
  const [gymIdFromUrl, setGymIdFromUrl] = useState(null);
  useEffect(() => {
      const match = pathname.match(/\/superadmin\/gyms\/([a-zA-Z0-9]+)/);
      if (role === 'superadmin' && match && match[1]) {
          setGymIdFromUrl(match[1]);
      } else {
          setGymIdFromUrl(null);
      }
  }, [pathname, role]);

  // --- Step 2: Fetch the gym-specific theme ---
  const gymDocRef = useMemoFirebase(() => {
    // We need a gymId either from the logged-in admin or from the URL for a superadmin
    const gymId = userData?.assignedGymId || gymIdFromUrl;
    if (!firestore || !gymId) return null;
    return doc(firestore, 'gyms', gymId);
  }, [firestore, userData, gymIdFromUrl]);
  const { data: gymData } = useDoc(gymDocRef);

  
  // --- Step 3: Determine the active theme based on priority ---
  useEffect(() => {
    // Priority 1: Superadmin viewing a specific gym page -> Use that gym's theme.
    if (role === 'superadmin' && gymIdFromUrl && gymData?.theme) {
       setActiveTheme(gymData.theme);
    }
    // Priority 2: Superadmin logged in, not viewing a specific gym -> use their own theme.
    else if (role === 'superadmin' && userData?.theme) {
      setActiveTheme(userData.theme);
    }
    // Priority 3: Gym admin or trainer is logged in -> Use their assigned gym's theme.
    else if ((role === 'admin' || role === 'trainer') && gymData?.theme) {
      setActiveTheme(gymData.theme);
    }
    // Fallback: No specific theme applies.
    else {
      setActiveTheme(null);
    }
  }, [userData, gymData, role, gymIdFromUrl]);

  // --- Step 4: Apply the active theme to the document ---
  useEffect(() => {
    const applyTheme = (theme) => {
        if (typeof window === 'undefined' || !theme) return;
        
        let style = document.getElementById('dynamic-theme-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'dynamic-theme-style';
            document.head.appendChild(style);
        }
        
        const { primary, background, card, cardForeground, border, sidebarBackground, sidebarActive, sidebarForeground, sidebarMutedForeground } = theme;

        const parseHsl = (hslStr) => {
            if (!hslStr || !hslStr.startsWith('hsl(')) return { h: 0, s: 0, l: 0 };
            const [h, s, l] = hslStr.match(/(\d+(\.?\d+)?)/g)?.map(Number) || [0,0,0];
            return { h, s, l };
        }
        
        const createCssVar = (name, value) => {
            if (!value) return '';
            const { h, s, l } = parseHsl(value);
            return `${name}: ${h} ${s}% ${l}%;`;
        }

        const styles = `
          :root {
            ${createCssVar('--background', background)}
            ${createCssVar('--primary', primary)}
            ${createCssVar('--card', card)}
            ${createCssVar('--card-foreground', cardForeground)}
            ${createCssVar('--border', border)}
            ${createCssVar('--sidebar-background', sidebarBackground)}
            ${createCssVar('--sidebar-active', sidebarActive)}
            ${createCssVar('--sidebar-foreground', sidebarForeground)}
            ${createCssVar('--sidebar-muted-foreground', sidebarMutedForeground)}
          }
        `;
        style.innerHTML = styles;
    };
    
    const clearTheme = () => {
        const style = document.getElementById('dynamic-theme-style');
        if (style) {
            style.innerHTML = '';
        }
    }

    if(activeTheme) {
      applyTheme(activeTheme);
    } else {
      clearTheme();
    }
  }, [activeTheme]);

  return null;
}

function GlobalLayout({ children }) {
    return (
        <RoleProvider>
            <ThemeManager />
            {children}
        </RoleProvider>
    );
}


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Tezfo GymDesk</title>
        <meta name="description" content="All-in-One Gym CRM & Management System" />
        <link rel="icon" href="https://gymdesk.tezfo.com/icons/192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <GlobalLayout>
            {children}
          </GlobalLayout>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
