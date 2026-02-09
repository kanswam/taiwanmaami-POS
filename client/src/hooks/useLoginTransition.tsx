import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getLoginUrl } from '@/const';
import { LoginTransition } from '@/components/LoginTransition';

/**
 * Hook that provides a `triggerLogin` function and a portal-rendered
 * transition overlay. Call `triggerLogin()` instead of directly setting
 * window.location.href to the OAuth URL.
 *
 * Usage:
 *   const { triggerLogin, transitionPortal } = useLoginTransition();
 *   return (
 *     <>
 *       <Button onClick={triggerLogin}>Login</Button>
 *       {transitionPortal}
 *     </>
 *   );
 */
export function useLoginTransition() {
  const [showTransition, setShowTransition] = useState(false);

  const triggerLogin = useCallback(() => {
    setShowTransition(true);
  }, []);

  const transitionPortal = showTransition
    ? createPortal(
        <LoginTransition targetUrl={getLoginUrl()} />,
        document.body
      )
    : null;

  return { triggerLogin, transitionPortal };
}
