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
import { Package, Clock, ChevronRight, ShoppingBag, Star, MessageSquare } from 'lucide-react';
import { StampCard } from '@/components/StampCard';
import { toast } from 'sonner';

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
