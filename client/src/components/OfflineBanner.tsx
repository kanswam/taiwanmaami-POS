/**
 * Offline Mode Banner
 * 
 * Shows an amber banner at the top of the screen when:
 * 1. Offline mode is enabled AND internet is down → "Offline Mode — Orders queued locally"
 * 2. Syncing in progress → "Syncing X orders..."
 * 3. Sync errors → "X orders failed to sync — Retry"
 * 
 * Also shows a small indicator when offline mode is enabled but online (standby).
 */

import React from 'react';
import { useOffline } from '@/contexts/OfflineContext';
import { WifiOff, Wifi, CloudUpload, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export function OfflineBanner() {
  const {
    isOnline,
    offlineModeEnabled,
    pendingOrderCount,
    syncProgress,
  } = useOffline();

  // Don't show anything if offline mode is not enabled
  if (!offlineModeEnabled) return null;

  // Syncing state
  if (syncProgress.status === 'syncing') {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          Syncing orders... ({syncProgress.synced}/{syncProgress.total})
        </span>
      </div>
    );
  }

  // Sync complete with errors
  if (syncProgress.status === 'error' && syncProgress.failed > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-lg">
        <AlertTriangle className="h-4 w-4" />
        <span>
          {syncProgress.failed} order{syncProgress.failed > 1 ? 's' : ''} failed to sync
        </span>
        <span className="text-red-200 mx-1">|</span>
        <span className="text-red-100">Check Offline Queue in Admin</span>
      </div>
    );
  }

  // Offline — show prominent amber banner
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg">
        <WifiOff className="h-4 w-4" />
        <span>Offline Mode</span>
        <span className="text-amber-800 mx-1">—</span>
        <span className="font-medium text-amber-900">
          {pendingOrderCount > 0
            ? `${pendingOrderCount} order${pendingOrderCount > 1 ? 's' : ''} queued locally`
            : 'Cash orders will be queued locally'}
        </span>
      </div>
    );
  }

  // Online with pending orders (waiting to sync)
  if (pendingOrderCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-100 text-amber-900 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md">
        <CloudUpload className="h-4 w-4" />
        <span>
          {pendingOrderCount} offline order{pendingOrderCount > 1 ? 's' : ''} pending sync
        </span>
      </div>
    );
  }

  // Online, offline mode enabled, no pending — small green indicator
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-50 text-emerald-700 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium">
      <Wifi className="h-3 w-3" />
      <span>Offline resilience active — standby</span>
      <CheckCircle className="h-3 w-3" />
    </div>
  );
}

/**
 * Compact offline indicator for the POS/Admin header area.
 * Shows a small dot + text in the header bar.
 */
export function OfflineIndicator() {
  const { isOnline, offlineModeEnabled, pendingOrderCount } = useOffline();

  if (!offlineModeEnabled) return null;

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 text-xs font-medium">
        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span>Offline</span>
        {pendingOrderCount > 0 && (
          <span className="bg-amber-500 text-white rounded-full px-1.5 text-[10px] font-bold">
            {pendingOrderCount}
          </span>
        )}
      </div>
    );
  }

  if (pendingOrderCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/20 text-blue-600 text-xs font-medium">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Syncing {pendingOrderCount}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
      <div className="h-2 w-2 rounded-full bg-emerald-500" />
      <span>Resilient</span>
    </div>
  );
}
