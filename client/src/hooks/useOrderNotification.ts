import { useRef, useCallback, useState, useEffect } from 'react';

/**
 * Synthesizes attention-grabbing notification sounds using the Web Audio API.
 * No external audio files needed — everything is generated in the browser.
 * 
 * Delivery: Urgent triple-ascending chime with a warble effect (like a doorbell on steroids)
 * Pickup: Double-tone pleasant ding
 * Instore: Single warm chime
 */

type OrderType = 'delivery' | 'pickup' | 'instore';

// Create an AudioContext lazily (browsers require user gesture first)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a single tone with optional vibrato
 */
function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number = 0.3,
  vibratoRate: number = 0,
  vibratoDepth: number = 0,
  waveform: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = waveform;
  osc.frequency.setValueAtTime(frequency, startTime);

  // Add vibrato if specified
  if (vibratoRate > 0 && vibratoDepth > 0) {
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(vibratoRate, startTime);
    vibratoGain.gain.setValueAtTime(vibratoDepth, startTime);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(startTime);
    vibrato.stop(startTime + duration);
  }

  // Envelope: quick attack, sustain, smooth release
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.setValueAtTime(volume, startTime + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * DELIVERY ALERT: Urgent, impossible-to-ignore triple chime with warble
 * Pattern: low-mid-HIGH with vibrato on the final note, repeated twice
 * Think: "WEE-woo-WEEE! WEE-woo-WEEE!" — like a mini siren
 */
function playDeliveryAlert(ctx: AudioContext) {
  const now = ctx.currentTime;

  // First burst: ascending triad
  playTone(ctx, 523.25, now, 0.15, 0.35, 0, 0, 'triangle');         // C5
  playTone(ctx, 659.25, now + 0.15, 0.15, 0.35, 0, 0, 'triangle');  // E5
  playTone(ctx, 880, now + 0.3, 0.3, 0.4, 8, 15, 'triangle');       // A5 with vibrato

  // Brief pause then second burst (slightly higher, more urgent)
  playTone(ctx, 587.33, now + 0.75, 0.12, 0.35, 0, 0, 'triangle');  // D5
  playTone(ctx, 739.99, now + 0.87, 0.12, 0.35, 0, 0, 'triangle');  // F#5
  playTone(ctx, 987.77, now + 0.99, 0.35, 0.45, 10, 20, 'triangle'); // B5 with stronger vibrato

  // Final attention-grab: high staccato burst
  playTone(ctx, 1046.5, now + 1.5, 0.08, 0.3, 0, 0, 'square');     // C6 staccato
  playTone(ctx, 1046.5, now + 1.62, 0.08, 0.3, 0, 0, 'square');    // C6 staccato
  playTone(ctx, 1318.5, now + 1.74, 0.2, 0.35, 6, 10, 'triangle'); // E6 ring out
}

/**
 * PICKUP ALERT: Pleasant but noticeable double-ding
 * Pattern: Two bright bell tones
 */
function playPickupAlert(ctx: AudioContext) {
  const now = ctx.currentTime;

  // Bright bell-like tones using harmonics
  playTone(ctx, 783.99, now, 0.25, 0.3, 0, 0, 'sine');           // G5
  playTone(ctx, 1567.98, now, 0.25, 0.15, 0, 0, 'sine');         // G6 harmonic
  
  playTone(ctx, 1046.5, now + 0.3, 0.35, 0.35, 0, 0, 'sine');    // C6
  playTone(ctx, 2093, now + 0.3, 0.35, 0.15, 0, 0, 'sine');      // C7 harmonic
}

/**
 * INSTORE ALERT: Warm single chime
 */
function playInstoreAlert(ctx: AudioContext) {
  const now = ctx.currentTime;
  playTone(ctx, 659.25, now, 0.4, 0.25, 0, 0, 'sine');           // E5
  playTone(ctx, 1318.5, now, 0.4, 0.1, 0, 0, 'sine');            // E6 harmonic
}

/**
 * Play the notification sound for a given order type
 */
export function playOrderNotification(orderType: OrderType) {
  try {
    const ctx = getAudioContext();
    switch (orderType) {
      case 'delivery':
        playDeliveryAlert(ctx);
        break;
      case 'pickup':
        playPickupAlert(ctx);
        break;
      case 'instore':
        playInstoreAlert(ctx);
        break;
    }
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
}

/**
 * Hook to manage order notification state:
 * - Tracks known order IDs to detect new ones
 * - Auto-polls at a configurable interval
 * - Plays sound and returns new order IDs for visual highlighting
 */
export function useOrderNotification(
  orders: any[] | undefined,
  refetch: () => void,
  pollInterval: number = 20000 // 20 seconds
) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('tmm-order-sound');
      return stored !== 'false'; // default to enabled
    } catch {
      return true;
    }
  });
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const knownOrderIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist sound preference
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('tmm-order-sound', String(next));
      } catch {}
      // If enabling, play a test tone so browser unlocks audio
      if (next) {
        try {
          const ctx = getAudioContext();
          playTone(ctx, 440, ctx.currentTime, 0.1, 0.15, 0, 0, 'sine');
        } catch {}
      }
      return next;
    });
  }, []);

  // Detect new orders when data changes
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const currentIds = new Set(orders.map((o: any) => o.id));

    if (isFirstLoadRef.current) {
      // First load: just record all existing orders, don't alert
      knownOrderIdsRef.current = currentIds;
      isFirstLoadRef.current = false;
      return;
    }

    // Find truly new orders (IDs we haven't seen before)
    const brandNew: any[] = [];
    orders.forEach((order: any) => {
      if (!knownOrderIdsRef.current.has(order.id)) {
        brandNew.push(order);
      }
    });

    if (brandNew.length > 0) {
      // Highlight new orders
      const newIds = new Set(brandNew.map((o: any) => o.id));
      setNewOrderIds(newIds);

      // Play sound for the most urgent new order type
      if (soundEnabled) {
        const hasDelivery = brandNew.some((o: any) => o.orderType === 'delivery');
        const hasPickup = brandNew.some((o: any) => o.orderType === 'pickup');

        if (hasDelivery) {
          playOrderNotification('delivery');
        } else if (hasPickup) {
          playOrderNotification('pickup');
        } else {
          playOrderNotification('instore');
        }
      }

      // Clear highlight after 8 seconds
      setTimeout(() => setNewOrderIds(new Set()), 8000);
    }

    // Update known IDs
    knownOrderIdsRef.current = currentIds;
  }, [orders, soundEnabled]);

  // Auto-poll
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      refetch();
    }, pollInterval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [refetch, pollInterval]);

  return {
    soundEnabled,
    toggleSound,
    newOrderIds,
  };
}
