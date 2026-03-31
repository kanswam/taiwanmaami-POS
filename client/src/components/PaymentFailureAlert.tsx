import React, { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { toast } from 'sonner';
import { AlertTriangle, Phone, CreditCard, X, CheckCircle, RefreshCw, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export function PaymentFailureAlert() {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; orderId: number | null; orderNumber: string }>({
    open: false, orderId: null, orderNumber: ''
  });
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const prevCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Poll for failed payments every 30 seconds
  const { data: failedPayments, isLoading } = trpc.orders.getFailedPayments.useQuery(undefined, {
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const verifyPayment = trpc.orders.verifyFailedPayment.useMutation({
    onSuccess: (result) => {
      if (result.success && !result.alreadyPaid) {
        toast.success(result.message || 'Payment recovered!');
      } else if (result.success && result.alreadyPaid) {
        toast.info('Payment was already completed');
      } else {
        toast.warning(result.message || 'No payment found');
      }
      utils.orders.getFailedPayments.invalidate();
      utils.orders.getRecent.invalidate();
      setVerifyingId(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to verify payment');
      setVerifyingId(null);
    },
  });

  const cancelOrder = trpc.orders.cancelFailedPaymentOrder.useMutation({
    onSuccess: () => {
      toast.success('Order cancelled');
      utils.orders.getFailedPayments.invalidate();
      utils.orders.getRecent.invalidate();
      setCancelDialog({ open: false, orderId: null, orderNumber: '' });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel order');
    },
  });

  // Play alert sound when new failed payments appear
  useEffect(() => {
    const count = failedPayments?.length || 0;
    if (count > prevCountRef.current && prevCountRef.current >= 0) {
      // New failed payment detected - play alert
      try {
        if (!audioRef.current) {
          // Create a simple beep using Web Audio API
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'square';
          gainNode.gain.value = 0.3;
          oscillator.start();
          // Two short beeps
          setTimeout(() => { gainNode.gain.value = 0; }, 200);
          setTimeout(() => { gainNode.gain.value = 0.3; }, 300);
          setTimeout(() => { 
            gainNode.gain.value = 0; 
            oscillator.stop();
          }, 500);
        }
      } catch (e) {
        // Audio may not be available
      }
      setExpanded(true);
    }
    prevCountRef.current = count;
  }, [failedPayments?.length]);

  if (isLoading || !failedPayments || failedPayments.length === 0) {
    return null;
  }

  const urgentCount = failedPayments.filter((p: any) => p.isUrgent).length;

  return (
    <>
      {/* Alert Banner */}
      <div className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-950/30 overflow-hidden">
        {/* Header - always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {failedPayments.length}
              </span>
            </div>
            <div className="text-left">
              <span className="font-bold text-red-700 dark:text-red-400 text-sm sm:text-base">
                {failedPayments.length} Payment{failedPayments.length > 1 ? 's' : ''} Failed
              </span>
              {urgentCount > 0 && (
                <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                  {urgentCount} URGENT - Customer may still be here
                </Badge>
              )}
            </div>
          </div>
          <span className="text-red-600 text-xs">{expanded ? 'Collapse' : 'Expand'}</span>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3">
            {failedPayments.map((order: any) => (
              <Card
                key={order.id}
                className={`p-3 ${order.isUrgent ? 'border-red-400 bg-red-100/50 dark:bg-red-900/20' : 'border-orange-300 bg-orange-50/50 dark:bg-orange-900/10'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm">#{order.orderNumber}</span>
                      <Badge variant={order.isUrgent ? 'destructive' : 'outline'} className="text-[10px]">
                        <Clock className="w-3 h-3 mr-1" />
                        {order.minutesAgo < 60
                          ? `${order.minutesAgo}m ago`
                          : `${Math.floor(order.minutesAgo / 60)}h ${order.minutesAgo % 60}m ago`}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {order.orderType === 'instore' ? 'Dine-in' : order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
                      </Badge>
                      {order.tableNumber && (
                        <Badge variant="secondary" className="text-[10px]">Table {order.tableNumber}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="font-medium">{order.customerName}</span>
                      <span className="font-bold text-red-700 dark:text-red-400">{formatPrice(order.totalAmount)}</span>
                    </div>
                    {order.customerPhone && (
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
                      >
                        <Phone className="w-3 h-3" />
                        {order.customerPhone}
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      disabled={verifyingId === order.id}
                      onClick={() => {
                        setVerifyingId(order.id);
                        verifyPayment.mutate({ orderId: order.id });
                      }}
                    >
                      {verifyingId === order.id ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <CreditCard className="w-3 h-3 mr-1" />
                      )}
                      Check Razorpay
                    </Button>
                    {order.customerPhone && (
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs h-8 bg-green-600 hover:bg-green-700"
                        asChild
                      >
                        <a href={`tel:${order.customerPhone}`}>
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                      onClick={() => setCancelDialog({ open: true, orderId: order.id, orderNumber: order.orderNumber })}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              Orders shown for the last 24 hours. "Check Razorpay" verifies if payment was actually captured. "Call" contacts the customer directly.
            </p>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => !open && setCancelDialog({ open: false, orderId: null, orderNumber: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order #{cancelDialog.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the order. The customer's Razorpay payment failed and was not recovered. 
              Make sure you've attempted to contact the customer first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (cancelDialog.orderId) {
                  cancelOrder.mutate({ 
                    orderId: cancelDialog.orderId,
                    reason: 'Payment failed - customer did not re-attempt',
                  });
                }
              }}
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
