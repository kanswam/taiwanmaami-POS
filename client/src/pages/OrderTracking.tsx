import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { Search, Package, Clock, CheckCircle, Truck, MapPin, Phone, RefreshCw } from 'lucide-react';

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'ready', label: 'Ready', icon: CheckCircle },
];

const DELIVERY_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'ready', label: 'Ready for Pickup', icon: CheckCircle },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

export default function OrderTracking() {
  const [orderNumber, setOrderNumber] = useState('');
  const [searchedOrder, setSearchedOrder] = useState('');

  const { data, isLoading, error, refetch } = trpc.orders.getByNumber.useQuery(
    { orderNumber: searchedOrder },
    { enabled: !!searchedOrder }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber.trim()) {
      setSearchedOrder(orderNumber.trim().toUpperCase());
    }
  };

  const order = data?.order;
  const items = data?.items;

  const steps = order?.orderType === 'delivery' ? DELIVERY_STEPS : ORDER_STEPS;
  const currentStepIndex = steps.findIndex(s => s.key === order?.orderStatus);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-center">Track Your Order</h1>

          {/* Search Form */}
          <Card className="p-6 mb-8">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter order number (e.g., TM-ABC123)"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Track'}
              </Button>
            </form>
          </Card>

          {/* Error State */}
          {error && searchedOrder && (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">Order not found. Please check the order number and try again.</p>
            </Card>
          )}

          {/* Order Details */}
          {order && (
            <div className="space-y-6">
              {/* Order Header */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="text-xl font-bold">{order.orderNumber}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="capitalize">{order.orderType}</span>
                  <span>•</span>
                  <span>{new Date(order.createdAt).toLocaleString()}</span>
                </div>
              </Card>

              {/* Progress Tracker */}
              <Card className="p-6">
                <h2 className="font-semibold mb-6">Order Status</h2>
                
                {order.orderStatus === 'cancelled' ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">✕</span>
                    </div>
                    <p className="text-lg font-medium text-red-600">Order Cancelled</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-secondary" />
                    <div 
                      className="absolute left-6 top-6 w-0.5 bg-primary transition-all duration-500"
                      style={{ height: `${Math.max(0, currentStepIndex) * (100 / (steps.length - 1))}%` }}
                    />

                    {/* Steps */}
                    <div className="space-y-6">
                      {steps.map((step, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const Icon = step.icon;

                        return (
                          <div key={step.key} className="flex items-center gap-4 relative">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-colors ${
                              isCompleted ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                            } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {step.label}
                              </p>
                              {isCurrent && (
                                <p className="text-sm text-primary">Current Status</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>

              {/* Delivery Address */}
              {order.deliveryAddress && (
                <Card className="p-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Delivery Address</p>
                      <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Order Items */}
              <Card className="p-6">
                <h2 className="font-semibold mb-4">Order Items</h2>
                <div className="space-y-3">
                  {items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.size && `${item.size} `}
                          {item.withBoba !== null && (item.withBoba ? '• With Boba' : '• No Boba')}
                          {item.quantity > 1 && ` × ${item.quantity}`}
                        </p>
                      </div>
                      <p className="font-medium">{formatPrice(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>

                <hr className="my-4" />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (5%)</span>
                    <span>{formatPrice(order.stateGst + order.centralGst)}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(order.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </Card>

              {/* Contact */}
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Need Help?</p>
                    <p className="text-sm text-muted-foreground">
                      Contact us at the store if you have any questions about your order.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
