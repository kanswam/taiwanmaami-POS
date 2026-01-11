import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { 
  ChefHat, Package, Truck, CheckCircle, Clock, 
  Printer, RefreshCw, MapPin, Phone, User, Bell,
  Filter, Store, UtensilsCrossed, ShoppingBag,
  MessageSquare, AlertTriangle, BarChart3, Volume2, VolumeX,
  X, Calendar, Hash, Camera, Upload, Image, ToggleLeft, Trash2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AddItemsDialog } from '@/components/AddItemsDialog';

// Status flow for delivery orders
const statusFlow = {
  pending: { next: 'confirmed', label: 'Confirm Order', icon: CheckCircle, color: 'bg-yellow-500' },
  confirmed: { next: 'preparing', label: 'Start Preparing', icon: ChefHat, color: 'bg-blue-500' },
  preparing: { next: 'ready', label: 'Mark Ready', icon: Package, color: 'bg-orange-500' },
  ready: { next: 'out_for_delivery', label: 'Hand to Delivery', icon: Truck, color: 'bg-green-500' },
  out_for_delivery: { next: 'completed', label: 'Mark Delivered', icon: CheckCircle, color: 'bg-purple-500' },
};

// Status flow for pickup/instore orders
const pickupStatusFlow = {
  pending: { next: 'confirmed', label: 'Confirm Order', icon: CheckCircle, color: 'bg-yellow-500' },
  confirmed: { next: 'preparing', label: 'Start Preparing', icon: ChefHat, color: 'bg-blue-500' },
  preparing: { next: 'ready', label: 'Mark Ready', icon: Package, color: 'bg-orange-500' },
  ready: { next: 'completed', label: 'Mark Picked Up', icon: CheckCircle, color: 'bg-green-500' },
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

const orderTypeIcons: Record<string, React.ReactNode> = {
  instore: <UtensilsCrossed className="w-4 h-4" />,
  delivery: <Truck className="w-4 h-4" />,
  pickup: <ShoppingBag className="w-4 h-4" />,
};

// Availability Panel Component for staff to toggle subcategory availability
function AvailabilityPanel() {
  const utils = trpc.useUtils();
  const { data: subcategories, isLoading } = trpc.menu.getSubcategories.useQuery();
  const { data: categories } = trpc.menu.getCategories.useQuery();
  const { data: products } = trpc.admin.getAllProducts.useQuery();
  
  const toggleAvailability = trpc.admin.toggleSubcategoryAvailability.useMutation({
    onSuccess: () => {
      toast.success('Availability updated');
      utils.menu.getSubcategories.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update availability');
    },
  });

  const toggleProductAvailability = trpc.admin.toggleProductAvailability.useMutation({
    onSuccess: () => {
      toast.success('Product availability updated');
      utils.menu.getProducts.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update product availability');
    },
  });

  const getCategoryName = (categoryId: number) => {
    return categories?.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
        <p>Loading subcategories...</p>
      </div>
    );
  }

  // Group subcategories by category
  const groupedSubcategories = subcategories?.reduce((acc: Record<string, any[]>, sub: any) => {
    const catName = getCategoryName(sub.categoryId);
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(sub);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <ToggleLeft className="w-5 h-5" />
          Toggle Subcategory Availability
        </h3>
        <p className="text-sm text-muted-foreground">
          Turn off availability for subcategories that are out of stock or unavailable. 
          Changes take effect immediately for customers.
        </p>
      </div>

      {Object.entries(groupedSubcategories).map(([categoryName, subs]) => (
        <div key={categoryName} className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 font-medium">{categoryName}</div>
          <div className="divide-y">
            {(subs as any[]).map((sub: any) => (
              <div key={sub.id} className="p-4 space-y-3 md:flex md:items-center md:justify-between md:gap-4 md:space-y-0">
                <div className="flex-1 min-w-0 md:flex-initial">
                  <p className="font-medium break-words">{sub.name}</p>
                  {sub.chineseName && <p className="text-sm text-muted-foreground">{sub.chineseName}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4 md:flex md:items-center md:gap-6 md:flex-shrink-0">
                  <div className="flex flex-col items-center gap-2 md:flex-row">
                    <span className="text-xs text-muted-foreground text-center md:text-left md:w-16">In-store</span>
                    <Switch
                      checked={sub.availableInstore !== false}
                      onCheckedChange={(checked) => {
                        toggleAvailability.mutate({ id: sub.id, availableInstore: checked });
                      }}
                      disabled={toggleAvailability.isPending}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2 md:flex-row">
                    <span className="text-xs text-muted-foreground text-center md:text-left md:w-16">Delivery</span>
                    <Switch
                      checked={sub.availableDelivery !== false}
                      onCheckedChange={(checked) => {
                        toggleAvailability.mutate({ id: sub.id, availableDelivery: checked });
                      }}
                      disabled={toggleAvailability.isPending}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2 md:flex-row">
                    <span className="text-xs text-muted-foreground text-center md:text-left md:w-16">Pickup</span>
                    <Switch
                      checked={sub.availablePickup !== false}
                      onCheckedChange={(checked) => {
                        toggleAvailability.mutate({ id: sub.id, availablePickup: checked });
                      }}
                      disabled={toggleAvailability.isPending}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Product Availability Section */}
      <div className="mt-8 pt-8 border-t">
        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <ToggleLeft className="w-5 h-5" />
            Toggle Product Availability
          </h3>
          <p className="text-sm text-muted-foreground">
            Turn off availability for individual products that are out of stock.
          </p>
        </div>

        {Object.entries(groupedSubcategories).map(([categoryName, subs]) => {
          const categoryProducts = products?.filter((p: any) => (subs as any[]).some(s => s.id === p.subcategoryId)) || [];
          if (categoryProducts.length === 0) return null;
          return (
            <div key={`products-${categoryName}`} className="border rounded-lg overflow-hidden mb-4">
              <div className="bg-muted px-4 py-2 font-medium">{categoryName}</div>
              <div className="divide-y">
                {categoryProducts.map((product: any) => (
                  <div key={product.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium break-words">{product.name}</p>
                      {product.chineseName && <p className="text-sm text-muted-foreground">{product.chineseName}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-sm text-muted-foreground">{product.isAvailable ? 'Available' : 'Out'}</span>
                      <Switch
                        checked={product.isAvailable !== false}
                        onCheckedChange={(checked) => toggleProductAvailability.mutate({ id: product.id, isAvailable: checked })}
                        disabled={toggleProductAvailability.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StaffOrders() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Filters
  const [outletFilter, setOutletFilter] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialogs
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; orderId: number | null; currentNote: string }>({
    open: false, orderId: null, currentNote: ''
  });
  const [kotDialog, setKotDialog] = useState<{ open: boolean; order: any }>({ open: false, order: null });
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; order: any; nextStatus: string }>({
    open: false, order: null, nextStatus: ''
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const paymentProofInputRef = useRef<HTMLInputElement>(null);
  
  // Add items dialog
  const [addItemsDialog, setAddItemsDialog] = useState<{ open: boolean; order: any }>({ open: false, order: null });
  const { data: allProducts } = trpc.menu.getProducts.useQuery();
  const addItemsToOrder = trpc.orders.addItemsToOrder.useMutation({
    onSuccess: () => {
      toast.success('Items added to order');
      utils.orders.getRecent.invalidate();
    }
  });
  
  // Cancel item dialog
  const [cancelItemDialog, setCancelItemDialog] = useState<{ open: boolean; item: any; order: any; reason: string }>({
    open: false, item: null, order: null, reason: ''
  });
  
  const utils = trpc.useUtils();
  
  // Fetch orders with filters and auto-refresh every 10 seconds
  const { data: ordersData, isLoading, refetch } = trpc.orders.getRecent.useQuery({
    limit: 100,
    outlet: outletFilter as any,
    orderType: orderTypeFilter as any,
    status: activeTab === 'active' ? undefined : undefined, // We filter client-side for tabs
  }, {
    refetchInterval: 15000, // Auto-refresh every 15 seconds (reduced from 10s for better mobile performance)
    staleTime: 5000, // Consider data fresh for 5 seconds
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

  const updateStaffNotes = trpc.orders.updateStaffNotes.useMutation({
    onSuccess: () => {
      toast.success('Note saved');
      utils.orders.getRecent.invalidate();
      setNoteDialog({ open: false, orderId: null, currentNote: '' });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save note');
    },
  });

  const cancelOrderItem = trpc.orders.cancelOrderItem.useMutation({
    onSuccess: () => {
      toast.success('Item cancelled');
      utils.orders.getRecent.invalidate();
      setCancelItemDialog({ open: false, item: null, order: null, reason: '' });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel item');
    },
  });

  const updatePaymentStatus = trpc.orders.updatePaymentStatus.useMutation({
    onSuccess: async (_, variables) => {
      toast.success('Payment collected successfully!');
      
      // Queue receipt for printing
      try {
        await fetch('/api/receipt/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: import.meta.env.VITE_KOT_PRINT_SECRET || 'tmm-kot-print-2024-secure',
            orderId: variables.orderId,
          }),
        });
        toast.success('Receipt queued for printing');
      } catch (error) {
        console.error('Failed to queue receipt:', error);
      }
      
      utils.orders.getRecent.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Sound notification for new orders
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/notification.mp3');
    }
  }, []);

  useEffect(() => {
    if (ordersData && soundEnabled) {
      const activeOrders = ordersData.filter((o: any) => 
        ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.orderStatus)
      );
      
      if (activeOrders.length > previousOrderCount && previousOrderCount > 0) {
        // New order arrived
        audioRef.current?.play().catch(() => {});
        toast.info('🔔 New order received!', { duration: 5000 });
      }
      setPreviousOrderCount(activeOrders.length);
    }
  }, [ordersData, soundEnabled, previousOrderCount]);

  // Check access - allow staff and admin
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'staff')) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You need staff access to view this page.</p>
          <p className="text-sm text-muted-foreground mt-2">Please contact your manager to get access.</p>
        </div>
      </div>
    );
  }

  const orders = ordersData || [];
  
  // Apply client-side filters
  let filteredOrders = orders;
  if (statusFilter !== 'all') {
    filteredOrders = filteredOrders.filter((o: any) => o.orderStatus === statusFilter);
  }
  
  const activeOrders = filteredOrders.filter((o: any) => 
    ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.orderStatus)
  );
  const completedOrders = filteredOrders.filter((o: any) => 
    ['completed', 'cancelled'].includes(o.orderStatus)
  );

  // Daily summary stats
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o: any) => new Date(o.createdAt).toDateString() === today);
  const todayCompleted = todayOrders.filter((o: any) => o.orderStatus === 'completed');
  const todayRevenue = todayCompleted.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
  const todayCancelled = todayOrders.filter((o: any) => o.orderStatus === 'cancelled').length;

  const handleStatusUpdate = (orderId: number, newStatus: string, order?: any) => {
    // For in-store orders being marked as completed, show payment method dialog
    if (newStatus === 'completed' && order && (order.orderType === 'instore' || order.paymentStatus === 'pending')) {
      setPaymentDialog({ open: true, order, nextStatus: newStatus });
      setSelectedPaymentMethod('');
      return;
    }
    updateStatus.mutate({ orderId, status: newStatus as any });
  };

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentComplete = async () => {
    if (!paymentDialog.order || !selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    let paymentProofUrl: string | undefined;

    // Upload payment proof if provided (for non-cash payments)
    if (paymentProofFile && selectedPaymentMethod !== 'cash') {
      setIsUploadingProof(true);
      try {
        const formData = new FormData();
        formData.append('file', paymentProofFile);
        formData.append('folder', 'payment-proofs');
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          paymentProofUrl = data.url;
        } else {
          toast.error('Failed to upload payment proof');
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload payment proof');
      } finally {
        setIsUploadingProof(false);
      }
    }

    updateStatus.mutate({ 
      orderId: paymentDialog.order.id, 
      status: paymentDialog.nextStatus as any,
      paymentMethod: selectedPaymentMethod as any,
      paymentProofUrl,
    });
    setPaymentDialog({ open: false, order: null, nextStatus: '' });
    setSelectedPaymentMethod('');
    setPaymentProofFile(null);
    setPaymentProofPreview('');
  };

  const getNextAction = (order: any) => {
    const flow = order.orderType === 'delivery' ? statusFlow : pickupStatusFlow;
    return flow[order.orderStatus as keyof typeof flow];
  };

  const handlePrintKOT = (order: any) => {
    setKotDialog({ open: true, order });
  };

  const printKOT = () => {
    if (!kotDialog.order) return;
    
    const order = kotDialog.order;
    const kotContent = `
      <html>
        <head>
          <title>KOT - ${order.orderNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0; padding: 10px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .order-type { font-size: 16px; font-weight: bold; text-transform: uppercase; }
            .order-num { font-size: 24px; font-weight: bold; }
            .items { margin: 10px 0; }
            .item { margin: 5px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
            .item-name { font-weight: bold; }
            .item-details { font-size: 11px; color: #666; }
            .special { background: #fff3cd; padding: 5px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 10px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="order-type">${order.orderType}</div>
            <div class="order-num">#${order.orderNumber}</div>
            ${order.tableNumber ? `<div>Table: ${order.tableNumber}</div>` : ''}
            <div>${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div class="items">
            ${order.items?.map((item: any) => `
              <div class="item">
                <div class="item-name">${item.quantity}x ${item.productName}</div>
                <div class="item-details">
                  ${item.size ? `Size: ${item.size}` : ''}
                  ${item.sugarLevel ? ` | Sugar: ${item.sugarLevel}` : ''}
                  ${item.iceLevel ? ` | Ice: ${item.iceLevel}` : ''}
                </div>
                ${item.specialInstructions ? `<div class="item-details">Note: ${item.specialInstructions}</div>` : ''}
              </div>
            `).join('')}
          </div>
          ${order.specialInstructions ? `<div class="special">⚠️ ${order.specialInstructions}</div>` : ''}
          <div class="footer">
            <div>Customer: ${order.customerName || 'Guest'}</div>
            ${order.customerPhone ? `<div>Phone: ${order.customerPhone}</div>` : ''}
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
    
    setKotDialog({ open: false, order: null });
    toast.success('KOT sent to printer');
  };

  const OrderCard = ({ order }: { order: any }) => {
    const nextAction = getNextAction(order);
    const Icon = nextAction?.icon || CheckCircle;
    const isUrgent = order.orderStatus === 'pending' && 
      (Date.now() - new Date(order.createdAt).getTime()) > 5 * 60 * 1000; // 5 minutes
    
    return (
      <Card className={`p-4 mb-4 ${isUrgent ? 'ring-2 ring-red-500 animate-pulse' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xl">#{order.orderNumber}</span>
              <Badge variant="outline" className={statusColors[order.orderStatus]}>
                {order.orderStatus.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="secondary" className="capitalize flex items-center gap-1">
                {orderTypeIcons[order.orderType]}
                {order.orderType}
              </Badge>
              {order.tableNumber && (
                <Badge variant="outline" className="bg-blue-50">
                  Table {order.tableNumber}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(order.createdAt).toLocaleTimeString()}
              {isUrgent && <span className="text-red-500 font-medium ml-2">⚠️ Waiting</span>}
            </p>
          </div>
          <span className="font-bold text-lg">{formatPrice(order.totalAmount)}</span>
        </div>

        {/* Customer Info */}
        <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4" />
            <span className="font-medium">{order.customerName || 'Guest'}</span>
          </div>
          {order.customerPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4" />
              <a href={`tel:${order.customerPhone}`} className="text-primary hover:underline">
                {order.customerPhone}
              </a>
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
        <div className="space-y-2 mb-4">
          {order.items?.map((item: any, idx: number) => {
            const isCancelled = item.status === 'cancelled';
            return (
            <div key={idx} className={`flex justify-between text-sm border-b border-dashed pb-1 ${isCancelled ? 'opacity-60' : ''}`}>
              <div className="flex-1">
                <span className={`font-medium ${isCancelled ? 'line-through text-red-500' : ''}`}>
                  {item.quantity}x {item.productName}
                </span>
                {isCancelled && (
                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Cancelled</span>
                )}
                {(item.size || item.sugarLevel || item.iceLevel) && (
                  <div className={`text-xs text-muted-foreground ${isCancelled ? 'line-through' : ''}`}>
                    {[item.size, item.sugarLevel && `Sugar: ${item.sugarLevel}`, item.iceLevel && `Ice: ${item.iceLevel}`]
                      .filter(Boolean).join(' • ')}
                  </div>
                )}
                {item.specialInstructions && (
                  <div className={`text-xs text-orange-600 ${isCancelled ? 'line-through' : ''}`}>📝 {item.specialInstructions}</div>
                )}
                {item.cancellationReason && (
                  <div className="text-xs text-red-600">Reason: {item.cancellationReason}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isCancelled && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && order.orderType === 'instore' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Cancel Item"
                    onClick={() => setCancelItemDialog({ open: true, item, order, reason: '' })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <span className={`text-muted-foreground ${isCancelled ? 'line-through' : ''}`}>
                  {formatPrice(item.lineTotal || item.unitPrice * item.quantity)}
                </span>
              </div>
            </div>
            );
          })}
        </div>

        {/* Special Instructions */}
        {order.specialInstructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
            <p className="text-sm font-medium text-yellow-800 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Special Instructions:
            </p>
            <p className="text-sm text-yellow-700">{order.specialInstructions}</p>
          </div>
        )}

        {/* Staff Notes */}
        {order.staffNotes && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
            <p className="text-sm font-medium text-blue-800 flex items-center gap-1">
              <MessageSquare className="w-4 h-4" /> Staff Notes:
            </p>
            <p className="text-sm text-blue-700">{order.staffNotes}</p>
          </div>
        )}

        {/* Action Buttons */}
        {nextAction && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => handleStatusUpdate(order.id, nextAction.next, order)}
              disabled={updateStatus.isPending}
              className="flex-1"
            >
              <Icon className="w-4 h-4 mr-2" />
              {nextAction.label}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              title="Print KOT"
              onClick={() => handlePrintKOT(order)}
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              title="Add Note"
              onClick={() => setNoteDialog({ open: true, orderId: order.id, currentNote: order.staffNotes || '' })}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            {/* Add Items button for active in-store orders */}
            {order.orderType === 'instore' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
              <Button 
                variant="outline" 
                size="icon" 
                title="Add Items"
                onClick={() => setAddItemsDialog({ open: true, order })}
              >
                <ShoppingBag className="w-4 h-4" />
              </Button>
            )}
            {/* Collect Payment button - only for pending payment AND not completed/cancelled */}
            {order.orderType === 'instore' && order.paymentStatus === 'pending' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  updatePaymentStatus.mutate({ orderId: order.id, paymentStatus: 'completed' });
                }}
                disabled={updatePaymentStatus.isPending}
              >
                💰 Collect Payment
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
      
      <div className="container py-4 sm:py-6">
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Staff Orders</h1>
            <p className="text-muted-foreground text-sm">Manage incoming orders</p>
          </div>
          
          {/* Daily Summary */}
          <div className="flex items-center gap-4 bg-muted/50 rounded-lg p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{todayCompleted.length}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatPrice(todayRevenue)}</div>
              <div className="text-xs text-muted-foreground">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{todayCancelled}</div>
              <div className="text-xs text-muted-foreground">Cancelled</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-muted/30 rounded-lg">
          <Filter className="w-4 h-4 text-muted-foreground" />
          
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger className="w-[140px]">
              <Store className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Outlet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              <SelectItem value="palladium">Palladium</SelectItem>
              <SelectItem value="tnagar">T Nagar</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Order Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="instore">Dine In</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="pickup">Pickup</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            </SelectContent>
          </Select>
          
          {(outletFilter !== 'all' || orderTypeFilter !== 'all' || statusFilter !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setOutletFilter('all');
                setOrderTypeFilter('all');
                setStatusFilter('all');
              }}
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
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
            <TabsTrigger value="completed">Completed Today</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                <p>Loading orders...</p>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No active orders</p>
                <p className="text-sm">New orders will appear here automatically</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeOrders
                  .sort((a: any, b: any) => {
                    // Sort by status priority, then by time
                    const statusPriority: Record<string, number> = {
                      pending: 0, confirmed: 1, preparing: 2, ready: 3, out_for_delivery: 4
                    };
                    const aPriority = statusPriority[a.orderStatus] ?? 5;
                    const bPriority = statusPriority[b.orderStatus] ?? 5;
                    if (aPriority !== bPriority) return aPriority - bPriority;
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                  })
                  .map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No completed orders today</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {completedOrders
                  .filter((o: any) => new Date(o.createdAt).toDateString() === today)
                  .slice(0, 30)
                  .map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="availability">
            <AvailabilityPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* KOT Print Dialog */}
      <Dialog open={kotDialog.open} onOpenChange={(open) => setKotDialog({ open, order: open ? kotDialog.order : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Kitchen Order Ticket</DialogTitle>
          </DialogHeader>
          {kotDialog.order && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                <div className="text-center border-b pb-2 mb-2">
                  <div className="text-lg font-bold uppercase">{kotDialog.order.orderType}</div>
                  <div className="text-2xl font-bold">#{kotDialog.order.orderNumber}</div>
                  {kotDialog.order.tableNumber && <div>Table: {kotDialog.order.tableNumber}</div>}
                </div>
                <div className="space-y-1">
                  {kotDialog.order.items?.map((item: any, idx: number) => (
                    <div key={idx}>
                      <div className="font-bold">{item.quantity}x {item.productName}</div>
                      {item.size && <div className="text-xs pl-4">Size: {item.size}</div>}
                      {item.sugarLevel && <div className="text-xs pl-4">Sugar: {item.sugarLevel}</div>}
                      {item.iceLevel && <div className="text-xs pl-4">Ice: {item.iceLevel}</div>}
                    </div>
                  ))}
                </div>
                {kotDialog.order.specialInstructions && (
                  <div className="mt-2 pt-2 border-t text-orange-600">
                    ⚠️ {kotDialog.order.specialInstructions}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setKotDialog({ open: false, order: null })}>
              Cancel
            </Button>
            <Button onClick={printKOT}>
              <Printer className="w-4 h-4 mr-2" />
              Print KOT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog({ ...noteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Note</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Add a note about this order..."
            value={noteDialog.currentNote}
            onChange={(e) => setNoteDialog({ ...noteDialog, currentNote: e.target.value })}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog({ open: false, orderId: null, currentNote: '' })}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (noteDialog.orderId) {
                  updateStaffNotes.mutate({ orderId: noteDialog.orderId, notes: noteDialog.currentNote });
                }
              }}
              disabled={updateStaffNotes.isPending}
            >
              {updateStaffNotes.isPending ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => {
        if (!open) {
          setPaymentDialog({ open: false, order: null, nextStatus: '' });
          setSelectedPaymentMethod('');
          setPaymentProofFile(null);
          setPaymentProofPreview('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Order #{paymentDialog.order?.orderNumber} - {formatPrice(paymentDialog.order?.totalAmount || 0)}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-3">Select payment method:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'cash', label: 'Cash', icon: '💵' },
                  { value: 'upi', label: 'GPay / UPI', icon: '📱' },
                  { value: 'card', label: 'Card', icon: '💳' },
                  { value: 'swiggy_dineout', label: 'Swiggy Dineout', icon: '🟠' },
                  { value: 'zomato_dineout', label: 'Zomato Dineout', icon: '🔴' },
                  { value: 'eazydiner', label: 'EazyDiner', icon: '🟣' },
                  { value: 'other', label: 'Other', icon: '📋' },
                ].map((method) => (
                  <Button
                    key={method.value}
                    variant={selectedPaymentMethod === method.value ? 'default' : 'outline'}
                    className={`h-auto py-3 flex flex-col items-center gap-1 ${selectedPaymentMethod === method.value ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                  >
                    <span className="text-xl">{method.icon}</span>
                    <span className="text-xs">{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Payment Proof Upload - shown for non-cash payments */}
            {selectedPaymentMethod && selectedPaymentMethod !== 'cash' && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Payment Screenshot (Optional):</p>
                <input
                  type="file"
                  ref={paymentProofInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handlePaymentProofChange}
                  className="hidden"
                />
                
                {paymentProofPreview ? (
                  <div className="relative">
                    <img 
                      src={paymentProofPreview} 
                      alt="Payment proof" 
                      className="w-full h-40 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setPaymentProofFile(null);
                        setPaymentProofPreview('');
                        if (paymentProofInputRef.current) {
                          paymentProofInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => paymentProofInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (paymentProofInputRef.current) {
                          paymentProofInputRef.current.removeAttribute('capture');
                          paymentProofInputRef.current.click();
                          paymentProofInputRef.current.setAttribute('capture', 'environment');
                        }
                      }}
                    >
                      <Image className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Capture screenshot of payment confirmation from {selectedPaymentMethod === 'upi' ? 'GPay/UPI' : selectedPaymentMethod === 'swiggy_dineout' ? 'Swiggy' : selectedPaymentMethod === 'zomato_dineout' ? 'Zomato' : 'payment'} app
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPaymentDialog({ open: false, order: null, nextStatus: '' });
              setSelectedPaymentMethod('');
              setPaymentProofFile(null);
              setPaymentProofPreview('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handlePaymentComplete}
              disabled={!selectedPaymentMethod || updateStatus.isPending || isUploadingProof}
            >
              {isUploadingProof ? 'Uploading...' : updateStatus.isPending ? 'Processing...' : 'Complete Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Items Dialog - Using new component */}
      <AddItemsDialog
        open={addItemsDialog.open}
        order={addItemsDialog.order}
        products={allProducts || []}
        onClose={() => setAddItemsDialog({ open: false, order: null })}
        onAddItem={(orderId, items) => new Promise((resolve) => {
          addItemsToOrder.mutate({ orderId, items }, {
            onSuccess: () => resolve(),
            onError: () => resolve()
          });
        })}
      />

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
                placeholder="Why is this item being cancelled?"
                value={cancelItemDialog.reason}
                onChange={(e) => setCancelItemDialog({ ...cancelItemDialog, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelItemDialog({ open: false, item: null, order: null, reason: '' })}>
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
