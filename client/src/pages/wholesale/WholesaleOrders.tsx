import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, ArrowLeft, ShoppingCart, Clock, CheckCircle, 
  XCircle, Truck, AlertCircle
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useWholesaleAuth } from '@/contexts/WholesaleAuthContext';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-4 w-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-4 w-4" /> },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: <Package className="h-4 w-4" /> },
  ready: { label: 'Ready for Pickup', color: 'bg-green-100 text-green-800', icon: <Truck className="h-4 w-4" /> },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-4 w-4" /> },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Payment Pending', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Payment Failed', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
};

export default function WholesaleOrders() {
  const [, setLocation] = useLocation();
  const { isLoggedIn, customer } = useWholesaleAuth();

  // Redirect if not logged in
  if (!isLoggedIn) {
    setLocation('/wholesale/login');
    return null;
  }

  const { data: orders, isLoading } = trpc.wholesale.getOrders.useQuery();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="container mx-auto max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/wholesale/products">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Products
                </Button>
              </Link>
            </div>
            <h1 className="text-xl font-bold">My Orders</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-6">
        {!orders || orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-500 mb-6">Place your first wholesale order today</p>
              <Link href="/wholesale/products">
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order: {
              id: number;
              orderNumber: string;
              orderStatus: string;
              paymentStatus: string;
              totalAmount: number;
              subtotal: number;
              totalGst: number;
              createdAt: Date | string;
              pickupLocation?: string | null;
            }) => {
              const status = statusConfig[order.orderStatus] || statusConfig.pending;
              const paymentStatus = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.pending;
              
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">Order #{order.orderNumber}</h3>
                          <Badge className={status.color}>
                            <span className="mr-1">{status.icon}</span>
                            {status.label}
                          </Badge>
                          <Badge className={paymentStatus.color}>
                            {paymentStatus.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                        {order.pickupLocation && (
                          <p className="text-sm text-gray-500 mt-1">
                            Pickup: {order.pickupLocation}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-600">
                          {formatPrice(order.totalAmount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          (incl. GST {formatPrice(order.totalGst)})
                        </p>
                      </div>
                    </div>

                    {order.orderStatus === 'ready' && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-green-600" />
                        <p className="text-sm text-green-800">
                          Your order is ready for pickup! Please collect it from our T. Nagar store.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
