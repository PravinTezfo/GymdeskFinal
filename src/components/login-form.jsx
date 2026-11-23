
"use client";

import { useState, useEffect } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";


function LoginBrandLogo() {
  const firestore = useFirestore();

  const [logoUrl, setLogoUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // public/branding is a tiny world-readable document mirrored from the superadmin's settings.
  // A failed or missing read simply means "show the default brand".
  useEffect(() => {
    if (!firestore) return;
    let cancelled = false;
    getDoc(doc(firestore, 'public', 'branding'))
      .then((snap) => { if (!cancelled) setLogoUrl(snap.exists() ? snap.data().logoUrl || null : null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [firestore]);

  if (isLoading) {
      return <div className="h-12 w-48 bg-muted/30 animate-pulse rounded-md mx-auto" />;
  }

  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="Tezfo GymDesk Logo" width={180} height={50} className="object-contain mx-auto" />;
  }
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'hsl(var(--card-foreground))' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ height: '2rem', width: '2rem' }}><path d="M12.22 16.52a5 5 0 0 1-4.24-2.22"/><path d="M12 14a5 5 0 0 1-5 5"/><path d="M2 12a10 10 0 1 1 20 0c0 7-5 12-12 12"/><path d="M15.29 11.29a5 5 0 0 1 4.24 2.22"/><path d="M12 14a5 5 0 0 1 5 5"/></svg>
        <h1 style={{ fontFamily: 'Inter, sans-serif' }}>Tezfo GymDesk</h1>
    </div>
  );
}


export function LoginForm() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();

  async function onSubmit(e) {
    e.preventDefault();
    if (!auth) {
      setError("Authentication service is not available.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // No need to call onLogin, the useUser hook will handle the state change
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else {
        setError("An unexpected error occurred during login. Please try again later.");
      }
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ margin: 'auto', maxWidth: '24rem' }}>
      <div style={{ width: '100%', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', backgroundColor: 'hsl(var(--card))', animation: 'fade-in 0.5s', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))' }}>
        <div style={{ textAlign: 'center', padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <div>
            <LoginBrandLogo />
          </div>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>All-in-One Gym CRM & Management System</p>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && (
              <div style={{ border: '1px solid hsl(var(--destructive))', color: 'hsl(var(--destructive))', padding: '1rem', borderRadius: 'var(--radius)' }}>
                <h3 style={{ fontWeight: '500' }}>Login Failed</h3>
                <p>{error}</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="email" style={{ color: 'hsl(var(--card-foreground))' }}>Email</label>
              <input 
                id="email" 
                type="email"
                placeholder="admin@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: 'calc(var(--radius) - 2px)', border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--card-foreground))' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="password" style={{ color: 'hsl(var(--card-foreground))' }}>Password</label>
              <input 
                id="password" 
                type="password" 
                placeholder="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: 'calc(var(--radius) - 2px)', border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--card-foreground))' }}
              />
            </div>
            <button type="submit" disabled={isLoading} style={{ width: '100%', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', padding: '0.5rem', borderRadius: 'calc(var(--radius) - 2px)', opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
