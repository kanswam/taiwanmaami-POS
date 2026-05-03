import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  X, Calendar, Hash, Camera, Upload, Image, ToggleLeft, Trash2, ChevronDown, Gift,
  GitMerge, ArrowRight, Plus, Search, Minus
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { AddItemsDialog } from '@/components/AddItemsDialog';
import { KOT_PRINT_SECRET } from '@/lib/env';
import { useOrderNotification, playOrderNotification } from '@/hooks/useOrderNotification';
import { OfflineSyncDashboard } from '@/components/OfflineSyncDashboard';
import { PaymentFailureAlert } from '@/components/PaymentFailureAlert';
import { OfflineIndicator } from '@/components/OfflineBanner';

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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const utils = trpc.useUtils();
  const { data: subcategories, isLoading } = trpc.menu.getSubcategories.useQuery();
  const { data: categories } = trpc.menu.getCategories.useQuery();
  const { data: products } = trpc.admin.getAllProducts.useQuery();

  // Confirmation dialog state for subcategory toggles
  const [subConfirm, setSubConfirm] = useState<{ open: boolean; sub: any; field: string; newValue: boolean; productCount: number }>({
    open: false, sub: null, field: '', newValue: false, productCount: 0
  });
  // Confirmation dialog state for product toggles
  const [prodConfirm, setProdConfirm] = useState<{ open: boolean; product: any; newValue: boolean }>({
    open: false, product: null, newValue: false
  });
  
  const toggleCategoryExpanded = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };
  
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
      utils.admin.getAllProducts.invalidate();
      utils.menu.getProducts.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update product availability');
    },
  });

  const channelLabel = (field: string) => {
    if (field === 'availableInstore') return 'In-Store';
    if (field === 'availableDelivery') return 'Delivery';
    if (field === 'availablePickup') return 'Pickup';
    return field;
  };

  const handleSubcategoryToggle = (sub: any, field: string, checked: boolean) => {
    if (checked) {
      // Turning ON — no confirmation needed, just do it
      toggleAvailability.mutate({ id: sub.id, [field]: true } as any);
    } else {
      // Turning OFF — show confirmation with product count
      const subProducts = products?.filter((p: any) => p.subcategoryId === sub.id) || [];
      setSubConfirm({ open: true, sub, field, newValue: false, productCount: subProducts.length });
    }
  };

  const handleProductToggle = (product: any, checked: boolean) => {
    if (checked) {
      // Turning ON — no confirmation needed
      toggleProductAvailability.mutate({ id: product.id, isAvailable: true });
    } else {
      // Turning OFF — show confirmation
      setProdConfirm({ open: true, product, newValue: false });
    }
  };

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
                      onCheckedChange={(checked) => handleSubcategoryToggle(sub, 'availableInstore', checked)}
                      disabled={toggleAvailability.isPending}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2 md:flex-row">
                    <span className="text-xs text-muted-foreground text-center md:text-left md:w-16">Delivery</span>
                    <Switch
                      checked={sub.availableDelivery !== false}
                      onCheckedChange={(checked) => handleSubcategoryToggle(sub, 'availableDelivery', checked)}
                      disabled={toggleAvailability.isPending}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2 md:flex-row">
                    <span className="text-xs text-muted-foreground text-center md:text-left md:w-16">Pickup</span>
                    <Switch
                      checked={sub.availablePickup !== false}
                      onCheckedChange={(checked) => handleSubcategoryToggle(sub, 'availablePickup', checked)}
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

        {/* Expand/Collapse All Buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allCategories = Object.keys(groupedSubcategories);
              const newState: Record<string, boolean> = {};
              allCategories.forEach(cat => { newState[cat] = true; });
              setExpandedCategories(newState);
            }}
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allCategories = Object.keys(groupedSubcategories);
              const newState: Record<string, boolean> = {};
              allCategories.forEach(cat => { newState[cat] = false; });
              setExpandedCategories(newState);
            }}
          >
            Collapse All
          </Button>
        </div>

        {Object.entries(groupedSubcategories).map(([categoryName, subs]) => {
          const categoryProducts = products?.filter((p: any) => (subs as any[]).some(s => s.id === p.subcategoryId)) || [];
          if (categoryProducts.length === 0) return null;
          const isExpanded = expandedCategories[categoryName] !== false;
          return (
            <div key={`products-${categoryName}`} className="border rounded-lg overflow-hidden mb-4">
              <button
                onClick={() => toggleCategoryExpanded(categoryName)}
                className="w-full bg-muted hover:bg-muted/80 px-4 py-3 font-medium flex items-center justify-between transition-colors"
              >
                <span>{categoryName} ({categoryProducts.length} items)</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              {isExpanded && (
                <div className="divide-y">
                  {categoryProducts.map((product: any) => {
                    const isProductAvailable = (product.isAvailable === true || product.isAvailable === 1) && (product.isInStock === true || product.isInStock === 1);
                    return (
                      <div key={product.id} className="p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="font-medium truncate">{product.name}</p>
                          {product.chineseName && <p className="text-sm text-muted-foreground truncate">{product.chineseName}</p>}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-sm whitespace-nowrap min-w-[70px] text-right ${isProductAvailable ? 'text-green-600' : 'text-red-500 font-medium'}`}>
                            {isProductAvailable ? 'Available' : 'Out'}
                          </span>
                          <Switch
                            checked={isProductAvailable}
                            onCheckedChange={(checked) => handleProductToggle(product, checked)}
                            disabled={toggleProductAvailability.isPending}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subcategory Availability Confirmation Dialog */}
      <AlertDialog open={subConfirm.open} onOpenChange={(open) => { if (!open) setSubConfirm({ open: false, sub: null, field: '', newValue: false, productCount: 0 }); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Hide from Customers?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                You are about to turn off <strong className="text-foreground">{channelLabel(subConfirm.field)}</strong> for <strong className="text-foreground">{subConfirm.sub?.name}</strong>.
              </span>
              <span className="block text-orange-600 font-medium">
                This will hide {subConfirm.productCount} product{subConfirm.productCount !== 1 ? 's' : ''} from customers immediately.
              </span>
              <span className="block">
                Are you sure you want to continue?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                if (subConfirm.sub) {
                  toggleAvailability.mutate({ id: subConfirm.sub.id, [subConfirm.field]: false } as any);
                }
                setSubConfirm({ open: false, sub: null, field: '', newValue: false, productCount: 0 });
              }}
            >
              Yes, Hide from Customers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Availability Confirmation Dialog */}
      <AlertDialog open={prodConfirm.open} onOpenChange={(open) => { if (!open) setProdConfirm({ open: false, product: null, newValue: false }); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Hide Product from Customers?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                You are about to mark <strong className="text-foreground">{prodConfirm.product?.name}</strong> as unavailable.
              </span>
              <span className="block text-orange-600 font-medium">
                This product will be hidden from all customers immediately.
              </span>
              <span className="block">
                Are you sure you want to continue?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                if (prodConfirm.product) {
                  toggleProductAvailability.mutate({ id: prodConfirm.product.id, isAvailable: false });
                }
                setProdConfirm({ open: false, product: null, newValue: false });
              }}
            >
              Yes, Hide Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function StaffOrders() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  
  // Filters
  const [outletFilter, setOutletFilter] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  
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

  // Merge orders state
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedMergeOrderIds, setSelectedMergeOrderIds] = useState<Set<number>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [primaryOrderId, setPrimaryOrderId] = useState<number | null>(null);

  const mergeOrders = trpc.orders.mergeOrders.useMutation({
    onSuccess: (data) => {
      toast.success(`Orders merged! New total: ${formatPrice(data.newTotalAmount)}`);
      utils.orders.getRecent.invalidate();
      setMergeMode(false);
      setSelectedMergeOrderIds(new Set());
      setMergeDialogOpen(false);
      setPrimaryOrderId(null);
    },
    onError: (err) => toast.error(err.message || 'Failed to merge orders'),
  });

  const toggleMergeSelection = (orderId: number) => {
    setSelectedMergeOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleConfirmMerge = () => {
    if (!primaryOrderId || selectedMergeOrderIds.size < 2) return;
    const secondaryIds = Array.from(selectedMergeOrderIds).filter(id => id !== primaryOrderId);
    mergeOrders.mutate({ primaryOrderId, secondaryOrderIds: secondaryIds });
  };
  
  // Custom item dialog
  const [customItemDialog, setCustomItemDialog] = useState<{ 
    open: boolean; 
    order: any; 
    itemName: string; 
    price: string; 
    quantity: number;
    notes: string;
  }>({
    open: false, order: null, itemName: '', price: '', quantity: 1, notes: ''
  });
  
  const utils = trpc.useUtils();
  
  // Fetch orders with filters and auto-refresh every 10 seconds
  const { data: ordersData, isLoading, refetch } = trpc.orders.getRecent.useQuery({
    limit: 100,
    outlet: outletFilter as any,
    orderType: orderTypeFilter as any,
    status: activeTab === 'active' ? undefined : undefined, // We filter client-side for tabs
    dateFilter: dateFilter as any,
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

  const addCustomItem = trpc.orders.addCustomItemToOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`Added "${data.itemName}" to order`);
      utils.orders.getRecent.invalidate();
      setCustomItemDialog({ open: false, order: null, itemName: '', price: '', quantity: 1, notes: '' });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to add custom item');
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
            secret: KOT_PRINT_SECRET,
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

  // Collect payment mutation - uses confirmPaymentManually which tracks who collected
  const collectPayment = trpc.orders.confirmPaymentManually.useMutation({
    onSuccess: async (_, variables) => {
      toast.success('Payment collected successfully!');
      
      // Queue receipt for printing
      try {
        await fetch('/api/receipt/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: KOT_PRINT_SECRET,
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

  // Staff redeem customer reward at counter
  const redeemRewardMutation = trpc.loyalty.staffRedeemReward.useMutation({
    onSuccess: (data) => {
      toast.success(`Reward redeemed for ${data.customerName}! Free Large Bubble Tea applied.`);
      utils.orders.getRecent.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Failed to redeem reward'),
  });

  // Quick Order state
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [qoCustomerName, setQoCustomerName] = useState('');
  const [qoCustomerPhone, setQoCustomerPhone] = useState('');
  const [qoTableNumber, setQoTableNumber] = useState('');
  const [qoOutletId, setQoOutletId] = useState(2);
  const [qoSearch, setQoSearch] = useState('');
  const [qoCart, setQoCart] = useState<Array<{
    productId: number; productName: string; size?: string;
    withBoba?: boolean; quantity: number; unitPrice: number;
    addons: Array<{ id: number; name: string; price: number }>;
  }>>([]);
  const [qoPaymentMethod, setQoPaymentMethod] = useState<string>('');
  const [qoSpecialInstructions, setQoSpecialInstructions] = useState('');

  const staffCreateOrder = trpc.orders.staffCreateOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`Order #${data.orderNumber} created! Total: ${formatPrice(data.totalAmount)}`);
      utils.orders.getRecent.invalidate();
      setQuickOrderOpen(false);
      setQoCustomerName(''); setQoCustomerPhone(''); setQoTableNumber('');
      setQoCart([]); setQoPaymentMethod(''); setQoSpecialInstructions(''); setQoSearch('');
    },
    onError: (err) => toast.error(err.message || 'Failed to create order'),
  });

  const qoFilteredProducts = useMemo(() => {
    if (!allProducts || !qoSearch.trim()) return allProducts?.slice(0, 20) || [];
    const search = qoSearch.toLowerCase();
    return allProducts.filter((p: any) => p.name.toLowerCase().includes(search)).slice(0, 20);
  }, [allProducts, qoSearch]);

  const addToQoCart = (product: any) => {
    const price = product.instorePrice || product.basePriceRegularWithBoba || product.basePriceRegularNoBoba || 0;
    const existing = qoCart.find(c => c.productId === product.id);
    if (existing) {
      setQoCart(prev => prev.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setQoCart(prev => [...prev, {
        productId: product.id, productName: product.name,
        size: product.hasSizeVariants ? 'regular' : undefined,
        withBoba: false, quantity: 1, unitPrice: price, addons: [],
      }]);
    }
  };

  const removeFromQoCart = (productId: number) => {
    setQoCart(prev => {
      const item = prev.find(c => c.productId === productId);
      if (item && item.quantity > 1) {
        return prev.map(c => c.productId === productId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.productId !== productId);
    });
  };

  const qoCartTotal = useMemo(() => qoCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [qoCart]);

  const handleQuickOrderSubmit = () => {
    if (!qoCustomerName.trim()) { toast.error('Customer name is required'); return; }
    if (qoCart.length === 0) { toast.error('Add at least one item'); return; }
    staffCreateOrder.mutate({
      customerName: qoCustomerName.trim(),
      customerPhone: qoCustomerPhone.trim() || undefined,
      tableNumber: qoTableNumber.trim() || undefined,
      outletId: qoOutletId,
      items: qoCart.map(item => ({
        productId: item.productId, productName: item.productName,
        size: item.size as any, withBoba: item.withBoba,
        quantity: item.quantity, unitPrice: item.unitPrice, addons: item.addons,
      })),
      paymentMethod: (qoPaymentMethod && qoPaymentMethod !== 'pending') ? qoPaymentMethod as any : undefined,
      specialInstructions: qoSpecialInstructions.trim() || undefined,
    });
  };

  // Order notification sounds & auto-poll (synced with admin page chimes)
  const { soundEnabled, toggleSound, newOrderIds } = useOrderNotification(ordersData, refetch, 20000);

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

  // Mergeable orders: in-store, payment pending, not completed/cancelled
  const mergeableOrders = activeOrders.filter((o: any) =>
    o.orderType === 'instore' &&
    o.paymentStatus === 'pending' &&
    o.orderStatus !== 'completed' &&
    o.orderStatus !== 'cancelled'
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

    // If nextStatus is empty, this is collecting payment on an already-completed order
    // Use confirmPaymentManually which tracks who collected the payment
    if (!paymentDialog.nextStatus) {
      collectPayment.mutate({
        orderId: paymentDialog.order.id,
        paymentMethod: selectedPaymentMethod as any,
        notes: paymentProofUrl ? `Payment proof: ${paymentProofUrl}` : undefined,
      });
    } else {
      // Order is being marked completed + payment collected at the same time
      updateStatus.mutate({ 
        orderId: paymentDialog.order.id, 
        status: paymentDialog.nextStatus as any,
        paymentMethod: selectedPaymentMethod as any,
        paymentProofUrl,
      });
    }
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
                  ${item.withBoba ? (item.bobaType === 'popping' ? ` | <b>+${item.poppingBobaFlavor || 'Popping'} Popping Boba</b>` : ` | +Tapioca Boba${item.bobaSize ? ` (${item.bobaSize})` : ''}`) : ''}
                  ${item.sugarLevel ? ` | Sugar: ${item.sugarLevel}` : ''}
                  ${item.iceLevel ? ` | Ice: ${item.iceLevel}` : ''}
                </div>
                ${item.addons?.length > 0 ? item.addons.map((a: any) => `<div class="item-details" style="padding-left:8px">+ ${a.addonName || a.name}</div>`).join('') : ''}
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
    const isNew = newOrderIds.has(order.id);
    
    const isMergeable = mergeMode && order.orderType === 'instore' && order.paymentStatus === 'pending' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled';
    const isSelectedForMerge = selectedMergeOrderIds.has(order.id);

    return (
      <Card 
        className={`p-4 mb-4 ${isUrgent ? 'ring-2 ring-red-500 animate-pulse' : ''} ${isNew ? 'ring-2 ring-amber-400 bg-amber-50 animate-pulse' : ''} ${isSelectedForMerge ? 'ring-2 ring-violet-500 bg-violet-50' : ''} ${isMergeable ? 'cursor-pointer hover:ring-2 hover:ring-violet-300' : ''}`}
        onClick={isMergeable ? () => toggleMergeSelection(order.id) : undefined}
      >
        {/* Merge Mode Checkbox */}
        {mergeMode && (
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-dashed">
            {isMergeable ? (
              <>
                <Checkbox
                  checked={isSelectedForMerge}
                  onCheckedChange={() => toggleMergeSelection(order.id)}
                  className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                />
                <span className="text-sm text-violet-700 font-medium">
                  {isSelectedForMerge ? 'Selected for merge' : 'Tap to select'}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">Not eligible for merge</span>
            )}
          </div>
        )}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xl">#{order.orderNumber}</span>
              {isNew && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white animate-bounce">
                  NEW!
                </span>
              )}
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
              {/* Payment Status Indicator */}
              {order.paymentMethod === 'razorpay' || order.paymentStatus === 'completed' ? (
                <Badge className="bg-green-600 text-white">
                  ✅ Paid{order.paymentMethod === 'razorpay' ? ' (Razorpay)' : order.paymentMethod === 'upi' ? ' (UPI)' : order.paymentMethod === 'card' ? ' (Card)' : order.paymentMethod === 'swiggy_dineout' ? ' (Swiggy)' : order.paymentMethod === 'zomato_dineout' ? ' (Zomato)' : order.paymentMethod === 'eazydiner' ? ' (EazyDiner)' : order.paymentMethod === 'cash' ? ' (Cash)' : ''}
                </Badge>
              ) : order.paymentStatus === 'pending' ? (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  💰 Payment Pending
                </Badge>
              ) : null}
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

        {/* Reward Reminder Banner with Redeem Button */}
        {order.customerRewards && order.customerRewards.count > 0 && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-green-600" />
              <p className="text-sm font-bold text-green-800 flex-1">
                🎉 {order.customerRewards.count} FREE drink{order.customerRewards.count > 1 ? 's' : ''} available!
              </p>
            </div>
            {order.customerRewards.rewards.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-md p-2 mb-1 border border-green-200">
                <div className="flex-1">
                  <p className="text-xs font-medium text-green-800">🧂 Free Large Bubble Tea</p>
                  <p className="text-xs text-green-600">
                    Code: <span className="font-mono font-bold">{r.voucherCode}</span>
                    {' · '}Exp: {new Date(r.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
                  onClick={() => {
                    if (window.confirm(`Mark this reward as REDEEMED for ${order.customerName || 'this customer'}?\n\nReward: Free Large Bubble Tea\nCode: ${r.voucherCode}`)) {
                      redeemRewardMutation.mutate({ rewardId: r.id });
                    }
                  }}
                  disabled={redeemRewardMutation.isPending}
                >
                  {redeemRewardMutation.isPending ? 'Redeeming...' : '✅ Redeem'}
                </Button>
              </div>
            ))}
          </div>
        )}

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
              <>
                <Button 
                  variant="outline" 
                  size="icon" 
                  title="Add Menu Items"
                  onClick={() => setAddItemsDialog({ open: true, order })}
                >
                  <ShoppingBag className="w-4 h-4" />
                </Button>
                {/* Add Custom Item button - for ad-hoc items like extra egg */}
                {order.paymentStatus === 'pending' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    title="Add Custom Item (e.g., Extra Egg)"
                    onClick={() => setCustomItemDialog({ 
                      open: true, 
                      order, 
                      itemName: '', 
                      price: '', 
                      quantity: 1,
                      notes: ''
                    })}
                  >
                    + Custom
                  </Button>
                )}
              </>
            )}
            {/* Collect Payment button - only for pending payment AND not completed/cancelled */}
            {order.paymentStatus === 'pending' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  setPaymentDialog({ open: true, order, nextStatus: '' });
                  setSelectedPaymentMethod('');
                }}
                disabled={collectPayment.isPending}
              >
                💰 Collect Payment
              </Button>
            )}
          </div>
        )}

        {/* Collect Payment button for COMPLETED orders with pending payment */}
        {order.paymentStatus === 'pending' && (order.orderStatus === 'completed') && (
          <div className="mt-3 pt-3 border-t">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                setPaymentDialog({ open: true, order, nextStatus: '' });
                setSelectedPaymentMethod('');
              }}
              disabled={collectPayment.isPending}
            >
              💰 Collect Payment - {formatPrice(order.totalAmount)}
            </Button>
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
              size="sm"
              onClick={toggleSound}
              className={soundEnabled ? 'border-green-500 text-green-700 hover:bg-green-50' : 'border-gray-300 text-gray-400'}
              title={soundEnabled ? 'Sound alerts ON \u2014 click to mute' : 'Sound alerts OFF \u2014 click to enable'}
            >
              {soundEnabled ? <><Volume2 className="w-4 h-4 mr-1" /> ON</> : <><VolumeX className="w-4 h-4 mr-1" /> OFF</>}
            </Button>
            {soundEnabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => playOrderNotification('delivery')}
                title="Test delivery alert sound"
                className="text-xs text-muted-foreground"
              >
                Test \uD83D\uDD14
              </Button>
            )}
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Auto-refresh
            </span>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setQuickOrderOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> Quick Order
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            {/* Merge Orders Button - only show when 2+ mergeable orders exist */}
            {mergeableOrders.length >= 2 && (
              mergeMode ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-violet-100 text-violet-800">
                    {selectedMergeOrderIds.size} selected
                  </Badge>
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                    disabled={selectedMergeOrderIds.size < 2}
                    onClick={() => {
                      setPrimaryOrderId(null);
                      setMergeDialogOpen(true);
                    }}
                  >
                    <GitMerge className="w-4 h-4 mr-1" /> Merge ({selectedMergeOrderIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMergeMode(false);
                      setSelectedMergeOrderIds(new Set());
                    }}
                  >
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-violet-300 text-violet-700 hover:bg-violet-50"
                  onClick={() => setMergeMode(true)}
                >
                  <GitMerge className="w-4 h-4 mr-1" /> Merge Orders
                </Button>
              )
            )}
          </div>
        </div>

        {/* Payment Failure Alert */}
        <PaymentFailureAlert />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-muted/30 rounded-lg">
          <Filter className="w-4 h-4 text-muted-foreground" />
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className={`w-[140px] ${dateFilter !== 'today' ? 'border-orange-400 bg-orange-50 text-orange-700' : ''}`}>
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Past 7 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

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
          
          {(outletFilter !== 'all' || orderTypeFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'today') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setOutletFilter('all');
                setOrderTypeFilter('all');
                setStatusFilter('all');
                setDateFilter('today');
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
            <TabsTrigger value="offline-queue" className="relative">
              Offline Queue
            </TabsTrigger>
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

          <TabsContent value="offline-queue">
            <OfflineSyncDashboard />
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
              disabled={!selectedPaymentMethod || updateStatus.isPending || collectPayment.isPending || isUploadingProof}
            >
              {isUploadingProof ? 'Uploading...' : (updateStatus.isPending || collectPayment.isPending) ? 'Processing...' : paymentDialog.nextStatus ? 'Complete Order' : 'Confirm Payment'}
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

      {/* Custom Item Dialog - for ad-hoc items like extra egg */}
      <Dialog open={customItemDialog.open} onOpenChange={(open) => {
        if (!open) setCustomItemDialog({ open: false, order: null, itemName: '', price: '', quantity: 1, notes: '' });
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Add an item not on the menu (e.g., Extra Egg, Extra Sauce)
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Item Name *</label>
              <Input
                placeholder="e.g., Extra Egg, Extra Sauce"
                value={customItemDialog.itemName}
                onChange={(e) => setCustomItemDialog({ ...customItemDialog, itemName: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Price (₹) *</label>
                <Input
                  type="number"
                  placeholder="25"
                  min="0"
                  step="1"
                  value={customItemDialog.price}
                  onChange={(e) => setCustomItemDialog({ ...customItemDialog, price: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setCustomItemDialog({ 
                      ...customItemDialog, 
                      quantity: Math.max(1, customItemDialog.quantity - 1) 
                    })}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-medium">{customItemDialog.quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setCustomItemDialog({ 
                      ...customItemDialog, 
                      quantity: customItemDialog.quantity + 1 
                    })}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                placeholder="Any special notes"
                value={customItemDialog.notes}
                onChange={(e) => setCustomItemDialog({ ...customItemDialog, notes: e.target.value })}
              />
            </div>
            {customItemDialog.price && parseFloat(customItemDialog.price) > 0 && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total:</span>
                  <span className="font-bold text-lg">
                    {formatPrice(parseFloat(customItemDialog.price) * 100 * customItemDialog.quantity)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCustomItemDialog({ open: false, order: null, itemName: '', price: '', quantity: 1, notes: '' })}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!customItemDialog.itemName.trim()) {
                  toast.error('Please enter an item name');
                  return;
                }
                const priceNum = parseFloat(customItemDialog.price);
                if (isNaN(priceNum) || priceNum < 0) {
                  toast.error('Please enter a valid price');
                  return;
                }
                addCustomItem.mutate({
                  orderId: customItemDialog.order.id,
                  itemName: customItemDialog.itemName.trim(),
                  price: Math.round(priceNum * 100), // Convert to paise
                  quantity: customItemDialog.quantity,
                  notes: customItemDialog.notes.trim() || undefined,
                });
              }}
              disabled={addCustomItem.isPending || !customItemDialog.itemName.trim() || !customItemDialog.price}
            >
              {addCustomItem.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Orders Confirmation Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-violet-600" />
              Merge Orders
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All items from the secondary orders will be moved into the primary order. Secondary orders will be marked as cancelled with a merge audit note.
            </p>

            {/* Primary Order Selector */}
            <div>
              <Label className="text-sm font-medium">Primary Order (items merge INTO this one)</Label>
              <Select
                value={primaryOrderId?.toString() || ''}
                onValueChange={(v) => setPrimaryOrderId(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select primary order" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(selectedMergeOrderIds).map(id => {
                    const order = orders?.find((o: any) => o.id === id);
                    if (!order) return null;
                    return (
                      <SelectItem key={id} value={id.toString()}>
                        #{order.orderNumber} \u2014 {order.customerName || 'Guest'} \u2014 {formatPrice(order.totalAmount)}
                        {order.tableNumber ? ` (Table ${order.tableNumber})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Summary of what will happen */}
            {primaryOrderId && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-violet-800">Merge Summary:</p>
                {Array.from(selectedMergeOrderIds).filter(id => id !== primaryOrderId).map(id => {
                  const order = orders?.find((o: any) => o.id === id);
                  if (!order) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-violet-500" />
                      <span>Order <strong>#{order.orderNumber}</strong></span>
                      <span className="text-muted-foreground">({order.customerName || 'Guest'}, {formatPrice(order.totalAmount)})</span>
                      <span className="text-violet-600">\u2192 merged into #{orders?.find((o: any) => o.id === primaryOrderId)?.orderNumber}</span>
                    </div>
                  );
                })}
                <div className="border-t border-violet-200 pt-2 mt-2">
                  <p className="text-xs text-violet-600">
                    The merged orders will be cancelled and their items moved to the primary order. Totals will be recalculated.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                This action cannot be undone. The secondary orders will be permanently marked as merged.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleConfirmMerge}
              disabled={mergeOrders.isPending || !primaryOrderId}
            >
              {mergeOrders.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Merging...</>
              ) : (
                <><GitMerge className="w-4 h-4 mr-1" /> Confirm Merge</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Order Dialog */}
      <Dialog open={quickOrderOpen} onOpenChange={setQuickOrderOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Quick Order (Staff)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Customer Name *</label>
                <Input value={qoCustomerName} onChange={e => setQoCustomerName(e.target.value)} placeholder="Name" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input value={qoCustomerPhone} onChange={e => setQoCustomerPhone(e.target.value)} placeholder="Phone number" />
              </div>
              <div>
                <label className="text-sm font-medium">Table</label>
                <Input value={qoTableNumber} onChange={e => setQoTableNumber(e.target.value)} placeholder="Table number" />
              </div>
              <div>
                <label className="text-sm font-medium">Outlet</label>
                <Select value={qoOutletId.toString()} onValueChange={v => setQoOutletId(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Palladium Mall</SelectItem>
                    <SelectItem value="2">T. Nagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Search */}
            <div>
              <label className="text-sm font-medium">Add Items</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={qoSearch} onChange={e => setQoSearch(e.target.value)}
                  placeholder="Search menu items..."
                  className="pl-9"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg divide-y">
                {qoFilteredProducts.map((product: any) => {
                  const price = product.instorePrice || product.basePriceRegularWithBoba || product.basePriceRegularNoBoba || 0;
                  return (
                    <div key={product.id} className="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer" onClick={() => addToQoCart(product)}>
                      <div>
                        <span className="text-sm font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatPrice(price)}</span>
                      </div>
                      <Plus className="w-4 h-4 text-green-600" />
                    </div>
                  );
                })}
                {qoFilteredProducts.length === 0 && (
                  <div className="p-3 text-center text-sm text-muted-foreground">No products found</div>
                )}
              </div>
            </div>

            {/* Cart */}
            {qoCart.length > 0 && (
              <div>
                <label className="text-sm font-medium">Order Items ({qoCart.length})</label>
                <div className="border rounded-lg divide-y">
                  {qoCart.map(item => (
                    <div key={item.productId} className="flex items-center justify-between p-2">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{item.productName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatPrice(item.unitPrice)} each</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => removeFromQoCart(item.productId)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => addToQoCart({ id: item.productId, name: item.productName, instorePrice: item.unitPrice })}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-bold w-20 text-right">{formatPrice(item.unitPrice * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-2 bg-muted/50 font-bold">
                    <span>Subtotal</span>
                    <span>{formatPrice(qoCartTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment & Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={qoPaymentMethod} onValueChange={setQoPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Pay later" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pay Later</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">GPay / UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="zomato_dineout">Zomato District</SelectItem>
                    <SelectItem value="swiggy_dineout">Swiggy Dineout</SelectItem>
                    <SelectItem value="eazydiner">EazyDiner</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Special Instructions</label>
                <Input value={qoSpecialInstructions} onChange={e => setQoSpecialInstructions(e.target.value)} placeholder="Any notes..." />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickOrderOpen(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleQuickOrderSubmit}
              disabled={staffCreateOrder.isPending || qoCart.length === 0 || !qoCustomerName.trim()}
            >
              {staffCreateOrder.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="w-4 h-4 mr-1" /> Create Order ({formatPrice(qoCartTotal)})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
