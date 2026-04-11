/**
 * Offline Sync Dashboard
 * 
 * Staff-facing panel in Staff Orders showing:
 * 1. Offline KOTs with local print trigger (prints from IndexedDB, no server needed)
 * 2. Queued/synced/failed offline orders with status
 * 3. Manual Retry button for failed orders
 * 4. Manual Sync trigger
 */

import React, { useState } from 'react';
import { useOffline } from '@/contexts/OfflineContext';
import { formatPrice } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Printer, RefreshCw, WifiOff, Wifi, CloudUpload, AlertTriangle,
  CheckCircle, Clock, RotateCcw, Loader2, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import type { OfflineOrder, OfflineKot, KotData } from '@/lib/offlineQueue';

// ─── Local KOT Print ────────────────────────────────────────────────

/**
 * Print a KOT directly from IndexedDB data — no server needed.
 * Uses the same 80mm thermal printer format as the existing server KOT print.
 */
function printOfflineKot(kot: OfflineKot): void {
  const { kotData } = kot;
  
  const kotContent = `
    <html>
      <head>
        <title>KOT - ${kotData.orderId}</title>
        <style>
          body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .order-type { font-size: 16px; font-weight: bold; text-transform: uppercase; }
          .order-num { font-size: 24px; font-weight: bold; }
          .offline-tag { font-size: 10px; background: #fef3c7; padding: 2px 6px; border: 1px solid #f59e0b; display: inline-block; margin-top: 4px; }
          .items { margin: 10px 0; }
          .item { margin: 5px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
          .item-name { font-weight: bold; }
          .item-details { font-size: 11px; color: #666; }
          .addon { font-size: 10px; color: #888; padding-left: 12px; }
          .special { background: #fff3cd; padding: 5px; margin-top: 10px; border: 1px dashed #f59e0b; }
          .footer { text-align: center; margin-top: 10px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px solid #000; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="order-type">${kotData.orderType}</div>
          <div class="order-num">${kotData.orderId}</div>
          <div class="offline-tag">⚡ OFFLINE ORDER</div>
          ${kotData.tableNumber ? `<div style="margin-top:4px">Table: ${kotData.tableNumber}</div>` : ''}
          <div style="font-size:10px;margin-top:4px">${new Date(kotData.createdAt).toLocaleString()}</div>
        </div>
        <div class="items">
          ${kotData.items.map(item => `
            <div class="item">
              <div class="item-name">${item.quantity}x ${item.productName}</div>
              <div class="item-details">
                ${item.size ? `Size: ${item.size}` : ''}
                ${item.sugarLevel ? ` | Sugar: ${item.sugarLevel}` : ''}
                ${item.iceLevel ? ` | Ice: ${item.iceLevel}` : ''}
                ${item.withBoba ? (item.bobaType === 'popping' ? ` | +${item.poppingBobaFlavor || 'Popping'} Popping Boba` : ' | +Tapioca Boba') : ''}
              </div>
              ${item.addons.length > 0 ? item.addons.map(a => `<div class="addon">+ ${a.name}</div>`).join('') : ''}
              ${item.specialInstructions ? `<div class="item-details" style="color:#d97706">Note: ${item.specialInstructions}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ${kotData.specialInstructions ? `<div class="special">⚠️ ${kotData.specialInstructions}</div>` : ''}
        <div class="total">Total: ${formatPrice(kotData.totalAmount)}</div>
        <div class="footer">
          <div>Customer: ${kotData.customerName || 'Guest'}</div>
          ${kotData.customerPhone ? `<div>Phone: ${kotData.customerPhone}</div>` : ''}
          <div style="margin-top:6px;font-size:9px;color:#999">Printed from offline queue</div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(kotContent);
    printWindow.document.close();
    printWindow.print();
  }
}

// ─── Status Helpers ─────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  queued: { label: 'Queued', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: <Clock className="w-3 h-3" /> },
  syncing: { label: 'Syncing', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  synced: { label: 'Synced', color: 'bg-green-100 text-green-800 border-green-300', icon: <CheckCircle className="w-3 h-3" /> },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800 border-red-300', icon: <AlertTriangle className="w-3 h-3" /> },
};

// ─── Main Component ─────────────────────────────────────────────────

export function OfflineSyncDashboard() {
  const {
    isOnline,
    offlineModeEnabled,
    setOfflineModeEnabled,
    pendingOrderCount,
    syncProgress,
    offlineOrders,
    unprintedKots,
    triggerSync,
    retryFailed,
    markKotAsPrinted,
    refreshOfflineData,
  } = useOffline();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [kotPreview, setKotPreview] = useState<OfflineKot | null>(null);

  // If offline mode is not enabled, show the enable prompt
  if (!offlineModeEnabled) {
    return (
      <div className="text-center py-12">
        <WifiOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-semibold mb-2">Offline Mode Not Active</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          Enable offline mode to allow staff to place in-store and pickup orders when the internet is down.
          Orders will be saved locally and synced when connectivity returns.
        </p>
        <Button onClick={() => setOfflineModeEnabled(true)}>
          <WifiOff className="w-4 h-4 mr-2" />
          Enable Offline Mode
        </Button>
      </div>
    );
  }

  const queuedOrders = offlineOrders.filter(o => o.status === 'queued');
  const syncedOrders = offlineOrders.filter(o => o.status === 'synced');
  const failedOrders = offlineOrders.filter(o => o.status === 'failed');
  const syncingOrders = offlineOrders.filter(o => o.status === 'syncing');

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
      toast.success('Sync completed');
    } catch {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryFailed();
      toast.success('Retry initiated');
    } catch {
      toast.error('Retry failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const handlePrintKot = async (kot: OfflineKot) => {
    printOfflineKot(kot);
    await markKotAsPrinted(kot.offlineOrderId);
    toast.success(`KOT ${kot.offlineOrderId} sent to printer`);
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Connection Status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
          isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? 'Online' : 'Offline'}
        </div>

        {/* Summary Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {queuedOrders.length > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Clock className="w-3 h-3 mr-1" /> {queuedOrders.length} Queued
            </Badge>
          )}
          {syncingOrders.length > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {syncingOrders.length} Syncing
            </Badge>
          )}
          {syncedOrders.length > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" /> {syncedOrders.length} Synced
            </Badge>
          )}
          {failedOrders.length > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <AlertTriangle className="w-3 h-3 mr-1" /> {failedOrders.length} Failed
            </Badge>
          )}
          {offlineOrders.length === 0 && (
            <span className="text-sm text-muted-foreground">No offline orders</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshOfflineData()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          {queuedOrders.length > 0 && isOnline && (
            <Button size="sm" onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-1" />}
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
          {failedOrders.length > 0 && (
            <Button size="sm" variant="destructive" onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
              {isRetrying ? 'Retrying...' : `Retry ${failedOrders.length} Failed`}
            </Button>
          )}
        </div>
      </div>

      {/* Sync Progress Bar */}
      {syncProgress.status === 'syncing' && syncProgress.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              Syncing {syncProgress.currentOrder}...
            </span>
            <span className="text-sm text-blue-600">
              {syncProgress.synced}/{syncProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(syncProgress.synced / syncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Unprinted KOTs Section */}
      {unprintedKots.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Unprinted KOTs ({unprintedKots.length})
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={async () => {
                for (const kot of unprintedKots) {
                  printOfflineKot(kot);
                  await markKotAsPrinted(kot.offlineOrderId);
                }
                toast.success(`Printed ${unprintedKots.length} KOTs`);
              }}
            >
              <Printer className="w-4 h-4 mr-1" /> Print All
            </Button>
          </div>
          <div className="grid gap-2">
            {unprintedKots.map(kot => (
              <div key={kot.offlineOrderId} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-amber-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-amber-800">{kot.kotData.orderId}</span>
                  <Badge variant="outline" className="text-xs">{kot.kotData.orderType}</Badge>
                  {kot.kotData.tableNumber && (
                    <span className="text-xs text-muted-foreground">Table {kot.kotData.tableNumber}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {kot.kotData.items.length} item{kot.kotData.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setKotPreview(kot)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handlePrintKot(kot)}
                  >
                    <Printer className="w-4 h-4 mr-1" /> Print
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Orders List */}
      {offlineOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Offline Orders</h3>
          {offlineOrders.map(order => {
            const config = statusConfig[order.status] || statusConfig.queued;
            const isExpanded = expandedOrder === order.offlineId;

            return (
              <Card key={order.offlineId} className="overflow-hidden">
                {/* Order Header */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.offlineId)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm">{order.offlineId}</span>
                    {order.serverOrderNumber && (
                      <span className="text-xs text-muted-foreground">→ #{order.serverOrderNumber}</span>
                    )}
                    <Badge variant="outline" className={`text-xs ${config.color}`}>
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">{order.orderType}</Badge>
                    {order.tableNumber && (
                      <span className="text-xs text-muted-foreground">T{order.tableNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{formatPrice(order.totalAmount)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t px-3 pb-3 pt-2 bg-muted/30">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                      <div><span className="text-muted-foreground">Customer:</span> {order.customerName || 'Guest'}</div>
                      <div><span className="text-muted-foreground">Phone:</span> {order.customerPhone || '—'}</div>
                      <div><span className="text-muted-foreground">Outlet:</span> {order.outletName}</div>
                      <div><span className="text-muted-foreground">Payment:</span> Cash</div>
                      <div><span className="text-muted-foreground">Created:</span> {new Date(order.createdAt).toLocaleString()}</div>
                      {order.syncedAt && (
                        <div><span className="text-muted-foreground">Synced:</span> {new Date(order.syncedAt).toLocaleString()}</div>
                      )}
                      {order.syncError && (
                        <div className="col-span-2 text-red-600 text-xs mt-1">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {order.syncError}
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-1 mb-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Items</div>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x {item.productName}
                            {item.size ? ` (${item.size})` : ''}
                          </span>
                          <span className="text-muted-foreground">{formatPrice(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST</span>
                        <span>{formatPrice(order.gstAmount)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatPrice(order.totalAmount)}</span>
                      </div>
                    </div>

                    {order.specialInstructions && (
                      <div className="mt-2 text-sm text-amber-700 bg-amber-50 rounded px-2 py-1">
                        Note: {order.specialInstructions}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Disable Offline Mode */}
      <div className="pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            if (pendingOrderCount > 0) {
              toast.error(`Cannot disable: ${pendingOrderCount} orders still pending sync`);
              return;
            }
            setOfflineModeEnabled(false);
            toast.success('Offline mode disabled');
          }}
        >
          <WifiOff className="w-4 h-4 mr-1" />
          Disable Offline Mode
        </Button>
      </div>

      {/* KOT Preview Dialog */}
      <Dialog open={!!kotPreview} onOpenChange={(open) => !open && setKotPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KOT Preview — {kotPreview?.kotData.orderId}</DialogTitle>
          </DialogHeader>
          {kotPreview && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                <div className="text-center border-b pb-2 mb-2">
                  <div className="text-lg font-bold uppercase">{kotPreview.kotData.orderType}</div>
                  <div className="text-2xl font-bold">{kotPreview.kotData.orderId}</div>
                  <div className="text-xs bg-amber-100 text-amber-800 inline-block px-2 py-0.5 rounded mt-1">OFFLINE</div>
                  {kotPreview.kotData.tableNumber && <div className="mt-1">Table: {kotPreview.kotData.tableNumber}</div>}
                </div>
                <div className="space-y-2">
                  {kotPreview.kotData.items.map((item, idx) => (
                    <div key={idx}>
                      <div className="font-bold">{item.quantity}x {item.productName}</div>
                      {item.size && <div className="text-xs pl-4">Size: {item.size}</div>}
                      {item.sugarLevel && <div className="text-xs pl-4">Sugar: {item.sugarLevel}</div>}
                      {item.iceLevel && <div className="text-xs pl-4">Ice: {item.iceLevel}</div>}
                      {item.addons.map((a, ai) => (
                        <div key={ai} className="text-xs pl-4 text-muted-foreground">+ {a.name}</div>
                      ))}
                      {item.specialInstructions && (
                        <div className="text-xs pl-4 text-orange-600">Note: {item.specialInstructions}</div>
                      )}
                    </div>
                  ))}
                </div>
                {kotPreview.kotData.specialInstructions && (
                  <div className="mt-2 pt-2 border-t text-orange-600">
                    ⚠️ {kotPreview.kotData.specialInstructions}
                  </div>
                )}
                <div className="mt-2 pt-2 border-t text-right font-bold">
                  Total: {formatPrice(kotPreview.kotData.totalAmount)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setKotPreview(null)}>Close</Button>
            {kotPreview && (
              <Button onClick={() => {
                handlePrintKot(kotPreview);
                setKotPreview(null);
              }}>
                <Printer className="w-4 h-4 mr-2" />
                Print KOT
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
