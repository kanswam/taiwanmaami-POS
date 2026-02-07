import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

// Generate a unique session ID that persists for the browser session
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('tw_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : 
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    sessionStorage.setItem('tw_session_id', sessionId);
  }
  return sessionId;
}

// Extract UTM parameters from URL
function getUtmParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
  };
}

// Detect device type
function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent;
  if (/Mobile|Android.*Mobile|iPhone|iPod/.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

export function usePageTracking() {
  const [location] = useLocation();
  const lastTrackedUrl = useRef<string>('');

  useEffect(() => {
    // Don't track admin pages
    if (location.startsWith('/admin')) return;
    
    // Don't track the same URL twice in a row
    const fullUrl = window.location.pathname;
    if (fullUrl === lastTrackedUrl.current) return;
    lastTrackedUrl.current = fullUrl;

    const sessionId = getSessionId();
    const utmParams = getUtmParams();
    const device = getDeviceType();

    // Send tracking data to our server
    const trackData = {
      sessionId,
      url: fullUrl,
      referrer: document.referrer || undefined,
      device,
      ...utmParams,
    };

    // Use sendBeacon for reliability, fall back to fetch
    const payload = JSON.stringify(trackData);
    
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/track', blob);
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Silently fail - tracking should never break the app
        });
      }
    } catch {
      // Silently fail
    }
  }, [location]);
}
