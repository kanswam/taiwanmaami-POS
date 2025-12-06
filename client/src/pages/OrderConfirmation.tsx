import React from 'react';
import { useParams, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { CheckCircle, Clock, MapPin, Phone, ArrowRight, RefreshCw, Download, Mail, Star } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { OrderTracker } from '@/components/OrderTracker';

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();

  const { user } = useAuth();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [overallReview, setOverallReview] = useState('');
  
  const invoiceQuery = trpc.orders.getInvoice.useQuery(
    { orderNumber: orderId || '' },
    { enabled: false }
  );
  const emailInvoiceMutation = trpc.orders.emailInvoice.useMutation();
  const submitReviewMutation = trpc.reviews.submit.useMutation();
  
  const { data, isLoading } = trpc.orders.getByNumber.useQuery(
    { orderNumber: orderId || '' },
    { enabled: !!orderId }
  );
  const order = data?.order;

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
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium capitalize">{order.orderType}</span>
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
              {data?.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.productName}
                    {item.size && ` (${item.size})`}
                  </span>
                  <span>{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
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
          </Card>

          {/* Invoice Options */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">Invoice</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  const result = await invoiceQuery.refetch();
                  if (result.data?.html) {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(result.data.html);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Invoice
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEmail(user?.email || '');
                  setShowEmailDialog(true);
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Invoice
              </Button>
            </div>
          </Card>

          {/* Review Prompt - only show for completed orders */}
          {order.orderStatus === 'completed' && (
            <Card className="p-6 mb-6 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-primary" />
                <span className="font-medium">How was your order?</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                We'd love to hear your feedback!
              </p>
              <Button onClick={() => setShowReviewDialog(true)}>
                Leave a Review
              </Button>
            </Card>
          )}

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

      {/* Email Invoice Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
            <DialogDescription>
              Enter your email address to receive the invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                if (!email) {
                  toast.error('Please enter an email address');
                  return;
                }
                try {
                  await emailInvoiceMutation.mutateAsync({
                    orderNumber: order.orderNumber,
                    email,
                  });
                  toast.success('Invoice sent! Check your email for the invoice.');
                  setShowEmailDialog(false);
                } catch (error) {
                  toast.error('Failed to send invoice');
                }
              }}
              disabled={emailInvoiceMutation.isPending}
            >
              {emailInvoiceMutation.isPending ? 'Sending...' : 'Send Invoice'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Order</DialogTitle>
            <DialogDescription>
              How was your experience with order #{order.orderNumber}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Star Rating */}
            <div>
              <Label className="mb-2 block">Overall Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${star <= overallRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review Text */}
            <div>
              <Label htmlFor="review">Your Review (Optional)</Label>
              <textarea
                id="review"
                className="w-full mt-1 p-3 border rounded-md min-h-[100px] resize-none"
                value={overallReview}
                onChange={(e) => setOverallReview(e.target.value)}
                placeholder="Tell us about your experience..."
              />
            </div>

            <Button
              className="w-full"
              onClick={async () => {
                if (overallRating === 0) {
                  toast.error('Please select a rating');
                  return;
                }
                try {
                  await submitReviewMutation.mutateAsync({
                    orderId: order.id,
                    overallRating,
                    overallReview: overallReview || undefined,
                  });
                  toast.success('Thank you! Your review has been submitted.');
                  setShowReviewDialog(false);
                } catch (error: any) {
                  toast.error(error.message || 'Failed to submit review');
                }
              }}
              disabled={submitReviewMutation.isPending}
            >
              {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
