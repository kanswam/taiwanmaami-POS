import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { getLoginUrl } from '@/const';
import { Link } from 'wouter';
import { Package, Clock, ChevronRight, ShoppingBag, Star, MessageSquare, Download, FileText, Eye } from 'lucide-react';
import { StampCard } from '@/components/StampCard';
import { toast } from 'sonner';

// Generate tax invoice HTML
function generateOrderInvoice(order: any): string {
  const formatPrice = (amount: number) => `\u20B9${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const items = order.items || [];
  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - Order ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; }
    .invoice-header { text-align: center; margin-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; color: #c75c2e; margin-bottom: 5px; }
    .company-info { font-size: 12px; color: #666; }
    .invoice-title { font-size: 18px; font-weight: bold; color: #666; margin: 15px 0; letter-spacing: 2px; }
    .divider { border-bottom: 2px solid #c75c2e; margin: 10px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .detail-box { background: #f9f9f9; padding: 15px; border-radius: 5px; }
    .detail-box h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
    .detail-box p { font-size: 13px; margin: 5px 0; }
    .detail-box strong { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #c75c2e; color: white; padding: 12px; text-align: left; font-size: 13px; }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    .text-right { text-align: right; }
    .totals { margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .total-row.discount { color: #c75c2e; }
    .total-row.grand { font-size: 16px; font-weight: bold; border-top: 2px solid #c75c2e; padding-top: 12px; margin-top: 8px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
    .payment-status { display: inline-block; background: #4caf50; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-top: 10px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div class="company-name">Taiwan Maami</div>
    <div class="company-info">Thamarai Foods and Trading Private Limited</div>
    <div class="company-info">GSTIN: 33AAKCT4782H1Z1</div>
    <div class="company-info">Phone: +91 9150570557 | Email: hello@taiwanmaami.com</div>
    <div class="invoice-title">TAX INVOICE</div>
    <div class="divider"></div>
  </div>

  <div class="details-grid">
    <div class="detail-box">
      <h3>Invoice Details</h3>
      <p><strong>Invoice No:</strong> INV-${order.orderNumber}</p>
      <p><strong>Order No:</strong> #${order.orderNumber}</p>
      <p><strong>Date:</strong> ${formattedDate}, ${formattedTime}</p>
      <p><strong>Order Type:</strong> ${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}</p>
    </div>
    <div class="detail-box">
      <h3>Customer Details</h3>
      <p><strong>Name:</strong> ${order.customerName || 'Guest'}</p>
      <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
      ${order.deliveryAddress ? `<p><strong>Address:</strong> ${order.deliveryAddress}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any) => `
        <tr>
          <td>${item.productName}${item.size ? ` (${item.size})` : ''}${item.addons?.length ? '<br><small style="color:#666">' + item.addons.map((a: any) => '+ ' + a.addonName).join(', ') + '</small>' : ''}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatPrice(item.unitPrice)}</td>
          <td class="text-right">${formatPrice(item.unitPrice * item.quantity + (item.addons?.reduce((sum: number, a: any) => sum + (a.addonPrice || 0), 0) || 0))}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
    ${order.discountAmount && order.discountAmount > 0 ? `<div class="total-row discount"><span>Discount${order.discountCode ? ` (${order.discountCode})` : ''}</span><span>-${formatPrice(order.discountAmount)}</span></div>` : ''}
    ${order.stateGst ? `<div class="total-row"><span>SGST (2.5%)</span><span>${formatPrice(order.stateGst)}</span></div>` : ''}
    ${order.centralGst ? `<div class="total-row"><span>CGST (2.5%)</span><span>${formatPrice(order.centralGst)}</span></div>` : ''}
    ${order.deliveryCharge && order.deliveryCharge > 0 ? `<div class="total-row"><span>Delivery Charge</span><span>${formatPrice(order.deliveryCharge)}</span></div>` : ''}
    <div class="total-row grand"><span>Total Amount</span><span>${formatPrice(order.totalAmount)}</span></div>
  </div>

  ${order.paymentStatus === 'completed' ? '<div style="text-align:center"><span class="payment-status">PAID</span></div>' : ''}

  <div class="footer">
    <p>Thank you for your order!</p>
    <p>Taiwan Maami - Crafted Daily. Enjoy Thoughtfully.</p>
    <p>For queries: +91 9150570557 | hello@taiwanmaami.com</p>
  </div>
</body>
</html>`;
}

export default function Orders() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: orders, isLoading, refetch } = trpc.orders.getUserOrders.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-secondary rounded w-48" />
            <div className="h-32 bg-secondary rounded" />
            <div className="h-32 bg-secondary rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-4">Sign in to view your orders</h1>
            <p className="text-muted-foreground mb-6">
              Track your orders and reorder your favorites
            </p>
            <a href={getLoginUrl()}>
              <Button size="lg">Sign In</Button>
            </a>
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
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-bold mb-6">My Orders</h1>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="h-6 bg-secondary rounded w-32 mb-2" />
                    <div className="h-4 bg-secondary rounded w-48" />
                  </Card>
                ))}
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    statusColors={statusColors}
                    onReviewSubmitted={refetch}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
                <p className="text-muted-foreground mb-6">
                  Your order history will appear here
                </p>
                <Link href="/menu">
                  <Button>Browse Menu</Button>
                </Link>
              </Card>
            )}
          </div>

          {/* Stamp Card Sidebar */}
          <div className="lg:col-span-1">
            <StampCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, statusColors, onReviewSubmitted }: { 
  order: any; 
  statusColors: Record<string, string>;
  onReviewSubmitted: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const { data: canReviewData } = trpc.reviews.canReview.useQuery(
    { orderId: order.id },
    { enabled: order.orderStatus === 'completed' }
  );

  const submitReview = trpc.reviews.submit.useMutation({
    onSuccess: () => {
      toast.success('Thank you for your review!');
      setReviewOpen(false);
      setRating(5);
      setComment('');
      onReviewSubmitted();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmitReview = () => {
    submitReview.mutate({
      orderId: order.id,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  const canReview = order.orderStatus === 'completed' && canReviewData?.canReview;

  return (
    <Card className="p-4 hover:bg-secondary/50 transition-colors">
      <Link href={`/order-confirmation/${order.orderNumber}`}>
        <div className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">{order.orderNumber}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span className="capitalize">{order.orderType}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{formatPrice(order.totalAmount)}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.orderStatus] || 'bg-gray-100'}`}>
                {order.orderStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </Link>

      {/* Invoice buttons for completed orders */}
      {order.orderStatus === 'completed' && (
        <div className="mt-3 pt-3 border-t flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Generate and open invoice in new tab
              const invoiceContent = generateOrderInvoice(order);
              const blob = new Blob([invoiceContent], { type: 'text/html;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }}
          >
            <Eye className="w-4 h-4" />
            View Invoice
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Generate and download invoice
              const invoiceContent = generateOrderInvoice(order);
              const blob = new Blob([invoiceContent], { type: 'text/html;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `invoice-${order.orderNumber}.html`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success('Invoice downloaded!');
            }}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      )}

      {/* Review Button for completed orders */}
      {canReview && (
        <div className="mt-3 pt-3 border-t">
          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Star className="w-4 h-4" />
                Leave a Review
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rate Your Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Order #{order.orderNumber}</p>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= (hoverRating || rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-sm mt-2">
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </p>
                </div>

                <div>
                  <Textarea
                    placeholder="Tell us about your experience (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmitReview}
                  disabled={submitReview.isPending}
                >
                  {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Show if already reviewed */}
      {order.orderStatus === 'completed' && canReviewData && !canReviewData.canReview && canReviewData.reason === 'Already reviewed' && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>You've reviewed this order</span>
          </div>
        </div>
      )}
    </Card>
  );
}
