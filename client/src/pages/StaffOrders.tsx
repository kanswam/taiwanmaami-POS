import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { 
  ChefHat, Package, Truck, CheckCircle, Clock, 
  Printer, RefreshCw, MapPin, Phone, User
} from 'lucide-react';

const statusFlow = {
  pending: { next: 'confirmed', label: 'Confirm Payment', icon: CheckCircle },
  confirmed: { next: 'preparing', label: 'Start Preparing', icon: ChefHat },
  preparing: { next: 'ready', label: 'Mark Ready', icon: Package },
  ready: { next: 'out_for_delivery', label: 'Handed to Delivery', icon: Truck, deliveryOnly: true },
  out_for_delivery: { next: 'completed', label: 'Mark Delivered', icon: CheckCircle },
};

const pickupStatusFlow = {
  pending: { next: 'confirmed', label: 'Confirm Payment', icon: CheckCircle },
  confirmed: { next: 'preparing', label: 'Start Preparing', icon: ChefHat },
  preparing: { next: 'ready', label: 'Mark Ready', icon: Package },
  ready: { next: 'completed', label: 'Mark Picked Up', icon: CheckCircle },
};

export default function StaffOrders() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const utils = trpc.useUtils();
  
  const { data: ordersData, isLoading, refetch } = trpc.orders.getRecent.useQuery({
    limit: 100,
  });
  
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Order status updated');
      utils.orders.getRecent.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update status');
    },
  });

  if (!isAuthenticated || (user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You need admin access to view this page.</p>
        </div>
      </div>
    );
  }

  const orders = ordersData || [];
  
  const activeOrders = orders.filter((o: any) => 
    ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.orderStatus)
  );
  const completedOrders = orders.filter((o: any) => 
    ['completed', 'cancelled'].includes(o.orderStatus)
  );

  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    updateStatus.mutate({ orderId, status: newStatus as any });
  };

  const getNextAction = (order: any) => {
    const flow = order.orderType === 'delivery' ? statusFlow : pickupStatusFlow;
    return flow[order.orderStatus as keyof typeof flow];
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    preparing: 'bg-orange-100 text-orange-800 border-orange-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
    out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-300',
    completed: 'bg-gray-100 text-gray-800 border-gray-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };

  const OrderCard = ({ order }: { order: any }) => {
    const nextAction = getNextAction(order);
    const Icon = nextAction?.icon || CheckCircle;
    
    return (
      <Card className="p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">#{order.orderNumber}</span>
              <Badge variant="outline" className={statusColors[order.orderStatus]}>
                {order.orderStatus.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {order.orderType}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="font-bold text-lg">{formatPrice(order.totalAmount)}</span>
        </div>

        {/* Customer Info */}
        <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4" />
            <span>{order.customerName || 'Guest'}</span>
          </div>
          {order.customerPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4" />
              <span>{order.customerPhone}</span>
            </div>
          )}
          {order.deliveryAddress && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-2">{order.deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="space-y-1 mb-4">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.productName}
                {item.size && ` (${item.size})`}
              </span>
            </div>
          ))}
        </div>

        {/* Special Instructions */}
        {order.specialInstructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
            <p className="text-sm font-medium text-yellow-800">Special Instructions:</p>
            <p className="text-sm text-yellow-700">{order.specialInstructions}</p>
          </div>
        )}

        {/* Action Buttons */}
        {nextAction && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
          <div className="flex gap-2">
            <Button 
              onClick={() => handleStatusUpdate(order.id, nextAction.next)}
              disabled={updateStatus.isPending}
              className="flex-1"
            >
              <Icon className="w-4 h-4 mr-2" />
              {nextAction.label}
            </Button>
            {order.orderStatus === 'confirmed' && (
              <Button variant="outline" size="icon" title="Print KOT">
                <Printer className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Order Management</h1>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="relative">
              Active Orders
              {activeOrders.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {activeOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active orders</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map((order: any) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No completed orders yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedOrders.slice(0, 20).map((order: any) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
