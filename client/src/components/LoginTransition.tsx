import { useEffect, useState } from 'react';

interface LoginTransitionProps {
  /** The OAuth URL to redirect to after showing the transition */
  targetUrl: string;
  /** Callback when transition is complete (before redirect) */
  onComplete?: () => void;
}

/**
 * A branded interstitial overlay that briefly shows the Taiwan Maami logo
 * and "Redirecting to secure login..." before navigating to the OAuth page.
 * This smooths the transition so customers see familiar branding first.
 */
export function LoginTransition({ targetUrl, onComplete }: LoginTransitionProps) {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation
    requestAnimationFrame(() => setFadeIn(true));

    // Redirect after a brief branded pause
    const timer = setTimeout(() => {
      onComplete?.();
      window.location.href = targetUrl;
    }, 1400);

    return () => clearTimeout(timer);
  }, [targetUrl, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgb(210, 180, 140)' }}
    >
      {/* Logo */}
      <img
        src="https://files.manuscdn.com/user_upload_by_module/session_file/114675165/PNSTmVAGBQQgOlVy.png"
        alt="Taiwan Maami"
        className="h-24 md:h-32 w-auto mb-6"
      />

      {/* Spinner */}
      <div className="mb-4">
        <div
          className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#bd302c', borderTopColor: 'transparent' }}
        />
      </div>

      {/* Message */}
      <p className="text-base font-medium tracking-wide" style={{ color: '#3d2c24' }}>
        Redirecting to secure login…
      </p>
      <p className="text-sm mt-1" style={{ color: '#7a6a5f' }}>
        You'll be right back
      </p>
    </div>
  );
}
