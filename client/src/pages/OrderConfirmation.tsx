import React from 'react';
import { useParams, Link } from 'wouter';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { CheckCircle, Clock, MapPin, Phone, ArrowRight, RefreshCw, Printer, UtensilsCrossed, Trash2 } from 'lucide-react';
import { OrderTracker } from '@/components/OrderTracker';

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [cancelItemDialog, setCancelItemDialog] = useState<{ open: boolean; item: any; reason: string }>({
    open: false, item: null, reason: ''
  });
  
  const { data, isLoading } = trpc.orders.getByNumber.useQuery(
    { orderNumber: orderId || '' },
    { enabled: !!orderId }
  );
  const order = data?.order;
  const utils = trpc.useUtils();
  
  const cancelOrderItem = trpc.orders.cancelOrderItem.useMutation({
    onSuccess: () => {
      setCancelItemDialog({ open: false, item: null, reason: '' });
      utils.orders.getByNumber.invalidate();
    },
  });
  
  // Fetch company details from site settings
  const { data: siteSettings } = trpc.admin.getSiteSettings.useQuery();
  const companyName = siteSettings?.find((s: any) => s.key === 'company_name')?.value || 'Thamarai Foods and Trading Private Limited';
  const gstNumber = siteSettings?.find((s: any) => s.key === 'gst_number')?.value || '33AAKCT4782H1Z1';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12">
          <div className="max-w-lg mx-auto text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-secondary rounded-full mx-auto mb-4" />
              <div className="h-8 bg-secondary rounded w-3/4 mx-auto mb-2" />
              <div className="h-4 bg-secondary rounded w-1/2 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find the order you're looking for.
            </p>
            <Link href="/menu">
              <Button>Back to Menu</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-orange-100 text-orange-800',
    ready: 'bg-green-100 text-green-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Order Placed!</h1>
            <p className="text-muted-foreground text-sm">
              Order #{order.orderNumber}
            </p>
          </div>

          {/* Order Status Tracker */}
          <Card className="p-6 mb-6">
            <OrderTracker 
              currentStatus={order.orderStatus} 
              orderType={order.orderType as 'delivery' | 'pickup' | 'instore'}
              paymentStatus={order.paymentStatus}
            />
          </Card>

          {/* Order Details Card */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="text-xl font-bold">{order.orderNumber}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.orderStatus] || 'bg-gray-100'}`}>
                {order.orderStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>
            </div>

            <hr className="my-4" />

            {/* Order Type & Time */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                {order.orderType === 'delivery' ? (
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                ) : order.orderType === 'instore' ? (
                  <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium capitalize">{order.orderType === 'instore' ? 'Dine-in' : order.orderType}</span>
                {order.tableNumber && (
                  <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded font-bold">
                    Table {order.tableNumber}
                  </span>
                )}
              </div>
              {order.scheduledTime && (
                <span className="text-sm text-muted-foreground">
                  Scheduled: {new Date(order.scheduledTime).toLocaleString()}
                </span>
              )}
            </div>

            {/* Delivery Address */}
            {order.deliveryAddress && (
              <div className="bg-secondary/50 p-3 rounded-lg mb-4">
                <p className="text-sm font-medium mb-1">Delivery Address</p>
                <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
              </div>
            )}

            {/* Order Items */}
            <div className="space-y-3 mb-4">
              <p className="font-medium">Order Items</p>
              {data?.items?.map((item: any, index: number) => {
                const isCancelled = item.status === 'cancelled';
                return (
                <div key={index} className={`text-sm ${isCancelled ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className={isCancelled ? 'line-through text-red-500' : ''}>
                        {item.quantity}x {item.productName}
                        {item.size && ` (${item.size})`}
                      </span>
                      {isCancelled && (
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Cancelled</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isCancelled && order?.orderType === 'instore' && order?.orderStatus !== 'completed' && order?.orderStatus !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Cancel Item"
                          onClick={() => setCancelItemDialog({ open: true, item, reason: '' })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <span className={isCancelled ? 'line-through' : ''}>{formatPrice(item.lineTotal)}</span>
                    </div>
                  </div>
                  {/* Display addons if any */}
                  {item.addons && item.addons.length > 0 && (
                    <div className="ml-4 text-xs text-muted-foreground">
                      {item.addons.map((addon: any, addonIndex: number) => (
                        <div key={addonIndex}>+ {addon.addonName}</div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            <hr className="my-4" />

            {/* Price Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">State GST (2.5%)</span>
                <span>{formatPrice(order.stateGst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Central GST (2.5%)</span>
                <span>{formatPrice(order.centralGst)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
            
            {/* Company & GST Details */}
            <div className="mt-4 pt-4 border-t border-dashed text-xs text-muted-foreground text-center">
              <p className="font-medium">{companyName}</p>
              <p>GSTIN: {gstNumber}</p>
            </div>
          </Card>

          {/* Contact Info */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Need Help?</span>
            </div>
            <p className="text-sm text-muted-foreground">
              If you have any questions about your order, please contact us at the store.
            </p>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Bill
            </Button>
            <Link href="/orders" className="flex-1">
              <Button variant="outline" className="w-full">
                View All Orders
              </Button>
            </Link>
            <Link href="/menu" className="flex-1">
              <Button className="w-full">
                Order More
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cancel Item Dialog */}
      <Dialog open={cancelItemDialog.open} onOpenChange={(open) => setCancelItemDialog({ ...cancelItemDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Item: {cancelItemDialog.item?.productName}</p>
              <p className="text-sm text-muted-foreground">Quantity: {cancelItemDialog.item?.quantity}</p>
              <p className="text-sm text-muted-foreground">Price: {formatPrice(cancelItemDialog.item?.lineTotal || 0)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                placeholder="Why do you want to cancel this item?"
                value={cancelItemDialog.reason}
                onChange={(e) => setCancelItemDialog({ ...cancelItemDialog, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelItemDialog({ open: false, item: null, reason: '' })}>
              Keep Item
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (cancelItemDialog.item) {
                  cancelOrderItem.mutate({
                    orderItemId: cancelItemDialog.item.id,
                    reason: cancelItemDialog.reason,
                  });
                }
              }}
              disabled={cancelOrderItem.isPending}
            >
              {cancelOrderItem.isPending ? 'Cancelling...' : 'Cancel Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
