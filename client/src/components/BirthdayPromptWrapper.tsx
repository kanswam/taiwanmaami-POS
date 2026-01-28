import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { BirthdayPromptModal } from './BirthdayPromptModal';

export function BirthdayPromptWrapper() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { user, isAuthenticated } = useAuth();
  
  const { data: birthdayInfo, isLoading } = trpc.profile.getBirthday.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    
    const dismissed = localStorage.getItem('birthday-prompt-dismissed');
    if (dismissed === 'true') return;
    
    if (birthdayInfo && !birthdayInfo.hasBirthday) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, birthdayInfo]);

  if (!showPrompt) return null;

  return (
    <BirthdayPromptModal 
      open={showPrompt} 
      onClose={() => setShowPrompt(false)} 
    />
  );
}
