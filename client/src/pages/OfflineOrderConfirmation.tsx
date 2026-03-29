/**
 * Offline Order Confirmation Page
 * 
 * Shown after an order is placed while offline.
 * Displays the temporary order number, items, and sync status.
 */

import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOffline } from '@/contexts/OfflineContext';
import { getOfflineOrder, getKotForOrder, type OfflineOrder, type OfflineKot } from '@/lib/offlineQueue';
import { formatPrice } from '@shared/types';
import { WifiOff, CheckCircle, Clock, AlertTriangle, Printer, ArrowLeft, CloudUpload } from 'lucide-react';
import { Link } from 'wouter';

export default function OfflineOrderConfirmation() {
  const { offlineId } = useParams<{ offlineId: string }>();
  const [, navigate] = useLocation();
  const { isOnline, syncProgress } = useOffline();
  const [order, setOrder] = useState<OfflineOrder | null>(null);
  const [kot, setKot] = useState<OfflineKot | null>(null);

  useEffect(() => {
    if (!offlineId) return;
    
    const loadOrder = async () => {
      const o = await getOfflineOrder(offlineId);
      if (o) setOrder(o);
      const k = await getKotForOrder(offlineId);
      if (k) setKot(k);
    };
    
    loadOrder();
    // Refresh every 2 seconds to catch sync status changes
    const interval = setInterval(loadOrder, 2000);
    return () => clearInterval(interval);
  }, [offlineId]);

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container pt-24 pb-12 text-center">
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    queued: {
      icon: <Clock className="h-8 w-8 text-amber-500" />,
      title: 'Order Queued Offline',
      description: 'This order is saved locally and will sync when internet returns.',
      color: 'bg-amber-50 border-amber-200',
    },
    syncing: {
      icon: <CloudUpload className="h-8 w-8 text-blue-500 animate-pulse" />,
      title: 'Syncing to Server...',
      description: 'Your order is being uploaded to the server.',
      color: 'bg-blue-50 border-blue-200',
    },
    synced: {
      icon: <CheckCircle className="h-8 w-8 text-emerald-500" />,
      title: 'Order Synced Successfully',
      description: order.serverOrderNumber 
        ? `Server order number: #${order.serverOrderNumber}`
        : 'Order has been synced to the server.',
      color: 'bg-emerald-50 border-emerald-200',
    },
    failed: {
      icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
      title: 'Sync Failed',
      description: order.syncError || 'Failed to sync order. Will retry automatically.',
      color: 'bg-red-50 border-red-200',
    },
  };

  const status = statusConfig[order.status];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container pt-24 pb-12">
        <div className="max-w-lg mx-auto">
          <Link href="/menu">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </Link>

          {/* Status Banner */}
          <Card className={`p-6 mb-6 border-2 ${status.color}`}>
            <div className="flex items-start gap-4">
              {status.icon}
              <div>
                <h2 className="text-lg font-bold">{status.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{status.description}</p>
              </div>
            </div>
            
            {!isOnline && order.status === 'queued' && (
              <div className="mt-4 flex items-center gap-2 text-amber-700 text-sm">
                <WifiOff className="h-4 w-4" />
                <span>Currently offline — order will sync when internet returns</span>
              </div>
            )}
          </Card>

          {/* Order Details */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                {order.offlineId}
                {order.serverOrderNumber && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    → #{order.serverOrderNumber}
                  </span>
                )}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground uppercase">
                {order.orderType}
              </span>
            </div>

            {order.tableNumber && (
              <p className="text-sm text-muted-foreground mb-3">
                Table: <span className="font-medium text-foreground">{order.tableNumber}</span>
              </p>
            )}

            <div className="space-y-3 mb-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{item.quantity}x {item.productName}</span>
                    {item.size && <span className="text-muted-foreground ml-1">({item.size})</span>}
                    {item.addons.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        + {item.addons.map(a => a.name).join(', ')}
                      </div>
                    )}
                    {(item.productAddons || []).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        + {(item.productAddons || []).map(pa => pa.name).join(', ')}
                      </div>
                    )}
                  </div>
                  <span className="font-medium">{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST</span>
                <span>{formatPrice(order.gstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              <p>Payment: Cash at counter</p>
              <p>Placed: {new Date(order.createdAt).toLocaleString('en-IN')}</p>
              {order.customerName && <p>Customer: {order.customerName}</p>}
            </div>
          </Card>

          {/* KOT Status */}
          {kot && (
            <Card className="p-4 mb-6 bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <Printer className="h-4 w-4" />
                <span className="font-medium">Kitchen Order Ticket</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${kot.isPrinted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {kot.isPrinted ? 'Printed' : 'Pending Print'}
                </span>
              </div>
            </Card>
          )}

          {/* Synced — link to real order */}
          {order.status === 'synced' && order.serverOrderNumber && (
            <Button 
              className="w-full" 
              onClick={() => navigate(`/order-confirmation/${order.serverOrderNumber}`)}
            >
              View Server Order #{order.serverOrderNumber}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
