'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { errorEmitter } from '@/firebase/error-emitter';
import { friendlyError } from '@/lib/errors';

/**
 * An invisible component that listens for globally emitted Firestore errors and shows them as a
 * toast. It must NEVER throw: throwing in render unmounts the whole app (there is no error boundary).
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error) => {
      console.error('[firestore]', error);
      // Same id => the same failure is shown once, not once per listener.
      toast.error(friendlyError(error), { id: `fs-${error?.code || error?.message}` });
    };
    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, []);

  return null;
}
