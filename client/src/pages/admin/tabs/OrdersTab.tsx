import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, GST_RATE } from '@shared/types';
import { 
  Home, Package, ShoppingCart, Tag, Upload, LogOut, 
  Plus, Edit, Trash2, ImageIcon, RefreshCw, Check, X, Search,
  ChevronDown, ChevronUp, Eye, EyeOff, Star, MessageSquare, Reply, Printer,
  ClipboardList, RotateCcw, History, Filter, BarChart3, UtensilsCrossed, AlertCircle, DollarSign, CreditCard, Users,
  Settings, Layers, FileText, TrendingUp, Calendar, Ticket, Mail, Phone, MapPin, Clock, UserCheck, BookOpen, GitMerge, ArrowRight, AlertTriangle, Download, Bot, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrderNotification, playOrderNotification } from '@/hooks/useOrderNotification';
import { PaymentFailureAlert } from '@/components/PaymentFailureAlert';
import { KOT_PRINT_SECRET } from '@/lib/env';

function generateOrderInvoice(order: any): string {
  const formatPrice = (paise: number) => `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const items = order.items || [];
  const itemsHtml = items.map((item: any) => {
    const addonsHtml = (item.addonsList && item.addonsList.length > 0)
      ? item.addonsList.map((addon: any) => 
          `<br><small style="color: #2563eb;">+ ${addon.addonName} (${formatPrice(addon.addonPrice)})</small>`
        ).join('')
      : '';
    return `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        ${item.product?.name || item.productName || 'Unknown'}
        ${item.size ? `<br><small style="color: #666;">Size: ${item.size}</small>` : ''}
        ${item.sugarLevel ? `<small style="color: #666;"> • Sugar: ${item.sugarLevel}</small>` : ''}
        ${item.iceLevel ? `<small style="color: #666;"> • Ice: ${item.iceLevel}</small>` : ''}
        ${addonsHtml}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.unitPrice || 0)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.lineTotal || item.totalPrice || (item.unitPrice * item.quantity))}</td>
    </tr>
  `;
  }).join('');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Tax Invoice - Order #${order.orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #B45309; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { color: #B45309; margin: 0; }
    .header p { margin: 5px 0; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; }
    .info-box h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; }
    .info-box p { margin: 5px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #B45309; color: white; padding: 10px; text-align: left; }
    .totals { background: #f9f9f9; padding: 15px; border-radius: 8px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .totals-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #B45309; padding-top: 10px; margin-top: 10px; }
    .discount { color: #16a34a; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Taiwan Maami™</h1>
    <p>Thamarai Foods and Trading Private Limited</p>
    <p>GSTIN: 33AAKCT4782H1Z1</p>
    <p>Phone: +91 9150570557 | Email: hello@taiwanmaami.com</p>
    <p style="font-size: 18px; font-weight: bold; margin-top: 10px;">TAX INVOICE</p>
  </div>
  
  <div class="info-grid">
    <div class="info-box">
      <h3>Invoice Details</h3>
      <p><strong>Invoice No:</strong> INV-${order.orderNumber}</p>
      <p><strong>Order No:</strong> #${order.orderNumber}</p>
      <p><strong>Date:</strong> ${orderDate}</p>
      <p><strong>Order Type:</strong> ${order.orderType === 'delivery' ? 'Delivery' : order.orderType === 'pickup' ? 'Pickup' : 'Dine-in'}</p>
    </div>
    <div class="info-box">
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
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>${formatPrice(order.subtotal || 0)}</span>
    </div>
    ${order.discountAmount > 0 ? `
    <div class="totals-row discount">
      <span>Discount ${order.discountCode ? `(${order.discountCode})` : ''}</span>
      <span>-${formatPrice(order.discountAmount)}</span>
    </div>
    ` : ''}
    ${order.manualDiscountAmount > 0 ? `
    <div class="totals-row discount">
      <span>Manual Discount ${order.manualDiscountReason ? `(${order.manualDiscountReason})` : ''}</span>
      <span>-${formatPrice(order.manualDiscountAmount)}</span>
    </div>
    ` : ''}
    <div class="totals-row">
      <span>SGST (2.5%)</span>
      <span>${formatPrice(order.stateGst || 0)}</span>
    </div>
    <div class="totals-row">
      <span>CGST (2.5%)</span>
      <span>${formatPrice(order.centralGst || 0)}</span>
    </div>
    ${order.deliveryCharge > 0 ? `
    <div class="totals-row">
      <span>Delivery Charge</span>
      <span>${formatPrice(order.deliveryCharge)}</span>
    </div>
    ` : ''}
    <div class="totals-row total">
      <span>Total Amount</span>
      <span>${formatPrice(order.totalAmount)}</span>
    </div>
  </div>
  
  ${order.razorpayPaymentId ? `
  <div style="margin-top: 20px; padding: 10px; background: #f0fdf4; border-radius: 8px;">
    <p style="margin: 0; color: #16a34a;"><strong>Payment Received</strong></p>
    <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Payment ID: ${order.razorpayPaymentId}</p>
  </div>
  ` : ''}
  
  <div class="footer">
    <p>Thank you for your order!</p>
    <p>Taiwan Maami™ - Crafted Daily. Enjoy Thoughtfully.</p>
    <p>For queries: +91 9150570557 | hello@taiwanmaami.com</p>
  </div>
</body>
</html>
  `;
}

// Orders Tab

// Helper to get today's date as YYYY-MM-DD in local timezone
function getLocalDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function OrdersTab() {
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');
  // Pass localDate so the server uses the client's local date (fixes IST midnight timezone bug)
  const localDate = dateFilter === 'today' ? getLocalDateStr(0)
    : dateFilter === 'yesterday' ? getLocalDateStr(-1)
    : dateFilter === 'week' ? getLocalDateStr(-7)
    : undefined;
  const { data: orders, refetch } = trpc.orders.getRecent.useQuery({ limit: 200, dateFilter, localDate });
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { data: orderDetails } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );
  
  // Order notification sound & auto-poll (every 20s)
  const { soundEnabled, toggleSound, newOrderIds } = useOrderNotification(orders, refetch, 20000);
  
  // Order type filter
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'instore' | 'delivery' | 'pickup'>('all');
  
  // Apply Discount state
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountOrderId, setDiscountOrderId] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  
  // Add Items state
  const [addItemsDialogOpen, setAddItemsDialogOpen] = useState(false);
  const [addItemsOrderId, setAddItemsOrderId] = useState<number | null>(null);
  const [addItemsOrderNumber, setAddItemsOrderNumber] = useState<string>('');
  
  // Cancel Item state
  const [cancelItemDialog, setCancelItemDialog] = useState<{ open: boolean; item: any; order: any; reason: string }>({
    open: false, item: null, order: null, reason: ''
  });

  // Merge Orders state
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedMergeOrderIds, setSelectedMergeOrderIds] = useState<Set<number>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [primaryOrderId, setPrimaryOrderId] = useState<number | null>(null);
  
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Order status updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
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
      
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelOrderItem = trpc.orders.cancelOrderItem.useMutation({
    onSuccess: () => {
      toast.success('Item cancelled');
      setCancelItemDialog({ open: false, item: null, order: null, reason: '' });
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel item');
    },
  });

  const applyDiscount = trpc.orders.applyManualDiscount.useMutation({
    onSuccess: (data) => {
      toast.success(`Discount applied! New total: ${formatPrice(data.newTotalAmount)}`);
      setDiscountDialogOpen(false);
      setDiscountValue('');
      setDiscountReason('');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Manual payment confirmation for delivery orders (QR code payment)
  // @ts-ignore - confirmPaymentManually is defined in routers.ts but tRPC types may not be regenerated yet
  const confirmPaymentManually = trpc.orders.confirmPaymentManually?.useMutation({
    onSuccess: () => {
      toast.success('Payment confirmed! Order can now be prepared.');
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Verify payment with Razorpay API for missed callbacks
  // @ts-ignore
  const verifyRazorpayPayment = trpc.orders.verifyRazorpayPayment?.useMutation({
    onSuccess: (data: any) => {
      if (data.success && !data.alreadyPaid) {
        toast.success(data.message);
      } else if (data.alreadyPaid) {
        toast.info('Payment was already marked as completed');
      } else {
        toast.error(data.message);
      }
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to verify with Razorpay'),
  });


  // Change payment method mutation
  // @ts-ignore
  const changePaymentMethod = trpc.orders.changePaymentMethod?.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Payment method changed: ${data.oldMethod} → ${data.newMethod}`);
      refetch();
      setEditingPaymentOrderId(null);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to change payment method'),
  });
  const [editingPaymentOrderId, setEditingPaymentOrderId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  // Merge Orders mutation
  const mergeOrders = trpc.orders.mergeOrders.useMutation({
    onSuccess: (data) => {
      toast.success(`Orders merged! ${data.itemCount} items now in Order #${data.primaryOrderNumber}. New total: ${formatPrice(data.newTotalAmount)}`);
      setMergeMode(false);
      setSelectedMergeOrderIds(new Set());
      setMergeDialogOpen(false);
      setPrimaryOrderId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Get mergeable orders (in-store, pending payment, not completed/cancelled)
  const mergeableOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o: any) =>
      o.orderType === 'instore' &&
      o.paymentStatus === 'pending' &&
      o.orderStatus !== 'completed' &&
      o.orderStatus !== 'cancelled'
    );
  }, [orders]);

  const toggleMergeSelection = (orderId: number) => {
    setSelectedMergeOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleStartMerge = () => {
    if (selectedMergeOrderIds.size < 2) {
      toast.error('Select at least 2 orders to merge');
      return;
    }
    // Default primary = the first (oldest) selected order
    const ids = Array.from(selectedMergeOrderIds);
    setPrimaryOrderId(ids[0]);
    setMergeDialogOpen(true);
  };

  const handleConfirmMerge = () => {
    if (!primaryOrderId) return;
    const secondaryIds = Array.from(selectedMergeOrderIds).filter(id => id !== primaryOrderId);
    if (secondaryIds.length === 0) {
      toast.error('Need at least one secondary order to merge');
      return;
    }
    mergeOrders.mutate({ primaryOrderId, secondaryOrderIds: secondaryIds });
  };

  const handleApplyDiscount = () => {
    if (!discountOrderId || !discountValue) return;
    
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      toast.error('Please enter a valid discount value');
      return;
    }
    
    applyDiscount.mutate({
      orderId: discountOrderId,
      discountType,
      discountValue: discountType === 'fixed' ? Math.round(value * 100) : value, // Convert to paise for fixed
      reason: discountReason || undefined,
    });
  };

  const statusOptions = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-orange-100 text-orange-800',
    ready: 'bg-green-100 text-green-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  // Order type visual config
  const orderTypeConfig: Record<string, { label: string; badge: string; border: string; icon: string }> = {
    instore: { label: 'In-Store', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', border: 'border-l-4 border-l-emerald-500', icon: '🏪' },
    delivery: { label: 'Delivery', badge: 'bg-blue-100 text-blue-800 border-blue-300', border: 'border-l-4 border-l-blue-500', icon: '🚚' },
    pickup: { label: 'Pickup', badge: 'bg-purple-100 text-purple-800 border-purple-300', border: 'border-l-4 border-l-purple-500', icon: '🛍️' },
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (orderTypeFilter === 'all') return orders;
    return orders.filter((o: any) => o.orderType === orderTypeFilter);
  }, [orders, orderTypeFilter]);

  // Order counts by type
  const orderCounts = useMemo(() => {
    if (!orders) return { all: 0, instore: 0, delivery: 0, pickup: 0 };
    return {
      all: orders.length,
      instore: orders.filter((o: any) => o.orderType === 'instore').length,
      delivery: orders.filter((o: any) => o.orderType === 'delivery').length,
      pickup: orders.filter((o: any) => o.orderType === 'pickup').length,
    };
  }, [orders]);

  // Count active (non-completed, non-cancelled) orders by type
  const activeOrderCounts = useMemo(() => {
    if (!orders) return { all: 0, instore: 0, delivery: 0, pickup: 0 };
    const active = orders.filter((o: any) => o.orderStatus !== 'completed' && o.orderStatus !== 'cancelled');
    return {
      all: active.length,
      instore: active.filter((o: any) => o.orderType === 'instore').length,
      delivery: active.filter((o: any) => o.orderType === 'delivery').length,
      pickup: active.filter((o: any) => o.orderType === 'pickup').length,
    };
  }, [orders]);

  // Get next status in workflow
  const getNextStatus = (currentStatus: string, orderType: string) => {
    const deliveryFlow = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed'];
    const pickupFlow = ['confirmed', 'preparing', 'ready', 'completed'];
    const flow = orderType === 'delivery' ? deliveryFlow : pickupFlow;
    const currentIndex = flow.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < flow.length - 1) {
      return flow[currentIndex + 1];
    }
    return null;
  };

  const getNextStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      preparing: 'Start Preparing',
      ready: 'Mark Ready',
      out_for_delivery: 'Out for Delivery',
      completed: 'Complete Order',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-4">
      {/* Payment Failure Alert */}
      <PaymentFailureAlert />

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {dateFilter === 'today' ? "Today's Orders" : dateFilter === 'yesterday' ? "Yesterday's Orders" : dateFilter === 'week' ? 'This Week' : 'All Orders'}
          </h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Auto-refresh 20s
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSound}
            className={soundEnabled ? 'border-green-500 text-green-700 hover:bg-green-50' : 'border-gray-300 text-gray-400'}
            title={soundEnabled ? 'Sound alerts ON — click to mute' : 'Sound alerts OFF — click to enable'}
          >
            {soundEnabled ? (
              <><span className="text-base mr-1">\uD83D\uDD0A</span> Sound ON</>
            ) : (
              <><span className="text-base mr-1">\uD83D\uDD07</span> Sound OFF</>
            )}
          </Button>
          {/* Test Sound */}
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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {/* Merge Orders Toggle */}
          {mergeableOrders.length >= 2 && (
            <Button
              variant={mergeMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (mergeMode) {
                  setMergeMode(false);
                  setSelectedMergeOrderIds(new Set());
                } else {
                  setMergeMode(true);
                }
              }}
              className={mergeMode ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'border-violet-500 text-violet-600 hover:bg-violet-50'}
            >
              <GitMerge className="w-4 h-4 mr-1" />
              {mergeMode ? 'Cancel Merge' : 'Merge Orders'}
            </Button>
          )}
        </div>
      </div>

      {/* Merge Mode Banner */}
      {mergeMode && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-violet-600" />
            <span className="text-sm font-medium text-violet-800">
              Select 2 or more unpaid in-store orders to merge.
              {selectedMergeOrderIds.size > 0 && (
                <span className="ml-2 font-bold">{selectedMergeOrderIds.size} selected</span>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMergeMode(false);
                setSelectedMergeOrderIds(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedMergeOrderIds.size < 2}
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleStartMerge}
            >
              <GitMerge className="w-4 h-4 mr-1" />
              Merge {selectedMergeOrderIds.size} Orders
            </Button>
          </div>
        </div>
      )}

      {/* Date Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'today' as const, label: 'Today', icon: '📅' },
          { key: 'yesterday' as const, label: 'Yesterday', icon: '⏪' },
          { key: 'week' as const, label: 'This Week', icon: '📆' },
          { key: 'all' as const, label: 'All Time', icon: '📊' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setDateFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              dateFilter === tab.key
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Order Type Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all' as const, label: 'All Orders', icon: '📋' },
          { key: 'instore' as const, label: 'In-Store', icon: '🏪' },
          { key: 'delivery' as const, label: 'Delivery', icon: '🚚' },
          { key: 'pickup' as const, label: 'Pickup', icon: '🛍️' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setOrderTypeFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              orderTypeFilter === tab.key
                ? tab.key === 'instore' ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400'
                : tab.key === 'delivery' ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-400'
                : tab.key === 'pickup' ? 'bg-purple-100 text-purple-800 ring-2 ring-purple-400'
                : 'bg-secondary text-foreground ring-2 ring-primary'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
              orderTypeFilter === tab.key ? 'bg-white/60' : 'bg-secondary'
            }`}>
              {orderCounts[tab.key]}
            </span>
            {activeOrderCounts[tab.key] > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                {activeOrderCounts[tab.key]} active
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                {mergeMode && <th className="w-10 p-3"></th>}
                <th className="text-left p-3 text-sm font-medium">Order #</th>
                <th className="text-left p-3 text-sm font-medium">Customer</th>
                <th className="text-left p-3 text-sm font-medium">Type</th>
                <th className="text-right p-3 text-sm font-medium">Total</th>
                <th className="text-center p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Time</th>
                <th className="text-center p-3 text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={mergeMode ? 8 : 7} className="p-8 text-center text-muted-foreground">
                    No {orderTypeFilter !== 'all' ? orderTypeConfig[orderTypeFilter]?.label.toLowerCase() : ''} orders found
                  </td>
                </tr>
              )}
              {filteredOrders.map((order: any) => {
                const typeConf = orderTypeConfig[order.orderType] || orderTypeConfig.instore;
                const isNew = newOrderIds.has(order.id);
                const isMergeable = order.orderType === 'instore' && order.paymentStatus === 'pending' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled';
                const isSelectedForMerge = selectedMergeOrderIds.has(order.id);
                return (
                <tr 
                  key={order.id} 
                  className={`border-b hover:bg-secondary/50 cursor-pointer ${typeConf.border} ${
                    isNew ? 'animate-pulse bg-amber-50 ring-2 ring-amber-400 ring-inset' : ''
                  } ${
                    mergeMode && isSelectedForMerge ? 'bg-violet-50 ring-2 ring-violet-400 ring-inset' : ''
                  }`}
                  onClick={() => {
                    if (mergeMode && isMergeable) {
                      toggleMergeSelection(order.id);
                    } else if (!mergeMode) {
                      setSelectedOrderId(order.id);
                    }
                  }}
                >
                  {/* Merge checkbox column */}
                  {mergeMode && (
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      {isMergeable ? (
                        <Checkbox
                          checked={isSelectedForMerge}
                          onCheckedChange={() => toggleMergeSelection(order.id)}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground" title="Cannot merge: order is paid, completed, or not in-store">—</span>
                      )}
                    </td>
                  )}
                  <td className="p-3 font-medium text-primary underline">
                    {order.orderNumber}
                    {isNew && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white animate-bounce">
                        NEW!
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <p>{order.customerName || 'Guest'}</p>
                    {order.customerPhone && (
                      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${typeConf.badge}`}>
                      {typeConf.icon} {typeConf.label}
                    </span>
                    {order.orderType === 'instore' && order.tableNumber && (
                      <p className="text-xs text-muted-foreground mt-0.5">Table {order.tableNumber}</p>
                    )}
                  </td>
                  <td className="p-3 text-right font-medium">{formatPrice(order.totalAmount)}</td>
                  <td className="p-3">
                    <Select
                      value={order.orderStatus}
                      onValueChange={(v) => updateStatus.mutate({ orderId: order.id, status: v })}
                    >
                      <SelectTrigger className={`w-32 ${statusColors[order.orderStatus]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status} className="capitalize">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      {/* Apply Discount button - only for pending payment AND not completed/cancelled */}
                      {order.paymentStatus === 'pending' && !order.manualDiscountAmount && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-500 text-amber-600 hover:bg-amber-50"
                          onClick={() => {
                            setDiscountOrderId(order.id);
                            setDiscountDialogOpen(true);
                          }}
                        >
                          🏷️ Discount
                        </Button>
                      )}
                      {/* Show applied discount */}
                      {(order.manualDiscountAmount ?? 0) > 0 && (
                        <span className="text-amber-600 text-xs font-medium">
                          -{formatPrice(order.manualDiscountAmount ?? 0)} off
                        </span>
                      )}
                      {/* Add Items button - only for pending payment AND not completed/cancelled */}
                      {order.orderType === 'instore' && order.paymentStatus === 'pending' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500 text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            setAddItemsOrderId(order.id);
                            setAddItemsOrderNumber(order.orderNumber);
                            setAddItemsDialogOpen(true);
                          }}
                        >
                          ➕ Add Items
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
                      {/* Confirm Payment button - for delivery/pickup orders with pending payment (QR code payment) */}
                      {confirmPaymentManually && (order.orderType === 'delivery' || order.orderType === 'pickup') && order.paymentStatus === 'pending' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => {
                            if (confirm('Confirm that payment has been received via QR code/UPI?')) {
                              confirmPaymentManually.mutate({ orderId: order.id, paymentMethod: 'upi' });
                            }
                          }}
                          disabled={confirmPaymentManually.isPending}
                        >
                          ✅ Confirm Payment
                        </Button>
                      )}
                      {/* Verify with Razorpay - for orders with razorpayOrderId but pending payment */}
                      {verifyRazorpayPayment && order.razorpayOrderId && order.paymentStatus === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500 text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            if (confirm('Check Razorpay for a captured payment on this order?')) {
                              verifyRazorpayPayment.mutate({ orderId: order.id });
                            }
                          }}
                          disabled={verifyRazorpayPayment.isPending}
                        >
                          {verifyRazorpayPayment.isPending ? '⏳ Checking...' : '🔍 Verify Razorpay'}
                        </Button>
                      )}

                      {/* Show payment collected info */}
                      {order.paymentCollectedBy && order.paymentCollectedAt && (
                        <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                          ✓ Collected {new Date(order.paymentCollectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {/* Reprint KOT button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await fetch('/api/kot/reprint', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                secret: KOT_PRINT_SECRET,
                                orderId: order.id,
                              }),
                            });
                            toast.success('KOT queued for reprinting');
                          } catch (error) {
                            toast.error('Failed to reprint KOT');
                          }
                        }}
                      >
                        🖨️ Reprint KOT
                      </Button>
                      {/* Print Receipt button for completed orders */}
                      {order.paymentStatus === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await fetch('/api/receipt/queue', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  secret: KOT_PRINT_SECRET,
                                  orderId: order.id,
                                }),
                              });
                              toast.success('Receipt queued for printing');
                            } catch (error) {
                              toast.error('Failed to queue receipt');
                            }
                          }}
                        >
                          🧾 Print Receipt
                        </Button>
                      )}
                      {getNextStatus(order.orderStatus, order.orderType) && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const nextStatus = getNextStatus(order.orderStatus, order.orderType);
                            if (nextStatus) {
                              updateStatus.mutate({ orderId: order.id, status: nextStatus });
                            }
                          }}
                          disabled={updateStatus.isPending}
                        >
                          {getNextStatusLabel(getNextStatus(order.orderStatus, order.orderType)!)}
                        </Button>
                      )}
                      {order.orderStatus === 'completed' && (
                        <span className="text-green-600 font-medium">✓ Done</span>
                      )}
                      {order.orderStatus === 'cancelled' && (
                        <span className="text-red-600 font-medium">Cancelled</span>
                      )}
                      {/* Reprint KOT button */}
                      {order.orderStatus !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/kot/reprint', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  secret: KOT_PRINT_SECRET,
                                  orderId: order.id,
                                }),
                              });
                              if (response.ok) {
                                toast.success('KOT queued for reprinting');
                              } else {
                                toast.error('Failed to reprint KOT');
                              }
                            } catch (error) {
                              toast.error('Failed to reprint KOT');
                            }
                          }}
                          title="Reprint KOT"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{orderDetails?.orderNumber}</DialogTitle>
          </DialogHeader>
          {orderDetails ? (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{orderDetails.customerName || 'Guest'}</p>
                  {orderDetails.customerPhone && <p className="text-sm">{orderDetails.customerPhone}</p>}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Type</p>
                  <p className="font-medium capitalize">{orderDetails.orderType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{orderDetails.orderStatus}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment</p>
                  <p className="font-medium capitalize">
                    {(orderDetails as any).paymentMethod === 'birthday_gift' ? (
                      <span className="text-amber-600">🎂 Birthday Gift</span>
                    ) : (orderDetails as any).paymentMethod === 'complimentary' ? (
                      <span className="text-amber-600">🎁 Complimentary</span>
                    ) : (
                      <>{(orderDetails as any).paymentMethod || 'N/A'} - {orderDetails.paymentStatus}</>
                    )}
                  </p>

                  {(orderDetails as any).paymentCollectedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Collected {new Date((orderDetails as any).paymentCollectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {(orderDetails as any).paymentNote && (
                    <p className="text-xs text-muted-foreground mt-1">{(orderDetails as any).paymentNote}</p>
                  )}
                  {/* Action buttons in the dialog */}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {verifyRazorpayPayment && (orderDetails as any).razorpayOrderId && orderDetails.paymentStatus === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-blue-500 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          if (confirm('Check Razorpay for a captured payment on this order?')) {
                            verifyRazorpayPayment.mutate({ orderId: orderDetails.id });
                          }
                        }}
                        disabled={verifyRazorpayPayment.isPending}
                      >
                        {verifyRazorpayPayment.isPending ? '⏳ Checking...' : '🔍 Verify Razorpay'}
                      </Button>
                    )}
                    {/* Change Payment Method - Admin only */}
                    {changePaymentMethod && (
                      <>
                        {editingPaymentOrderId === orderDetails.id ? (
                          <div className="flex gap-1 items-center w-full mt-1">
                            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                              <SelectTrigger className="h-7 text-xs w-[160px]">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">💵 Cash</SelectItem>
                                <SelectItem value="upi">📱 GPay / UPI</SelectItem>
                                <SelectItem value="card">💳 Card</SelectItem>
                                <SelectItem value="razorpay">💳 Razorpay</SelectItem>
                                <SelectItem value="swiggy_dineout">🟠 Swiggy Dineout</SelectItem>
                                <SelectItem value="zomato_dineout">🔴 Zomato District</SelectItem>
                                <SelectItem value="eazydiner">🟣 EazyDiner</SelectItem>
                                <SelectItem value="birthday_gift">🎂 Birthday Gift</SelectItem>
                                <SelectItem value="complimentary">🎁 Complimentary</SelectItem>
                                <SelectItem value="other">📋 Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                if (selectedPaymentMethod) {
                                  changePaymentMethod.mutate({ orderId: orderDetails.id, paymentMethod: selectedPaymentMethod as any });
                                }
                              }}
                              disabled={!selectedPaymentMethod || changePaymentMethod.isPending}
                            >
                              {changePaymentMethod.isPending ? '...' : '✓'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => { setEditingPaymentOrderId(null); setSelectedPaymentMethod(''); }}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditingPaymentOrderId(orderDetails.id);
                              setSelectedPaymentMethod((orderDetails as any).paymentMethod || '');
                            }}
                          >
                            ✏️ Change Payment Method
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Order Time</p>
                  <p className="font-medium">{new Date(orderDetails.createdAt).toLocaleString()}</p>
                </div>
                {orderDetails.deliveryAddress && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Delivery Address</p>
                    <p className="font-medium">{orderDetails.deliveryAddress}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold mb-2">Order Items</h4>
                <div className="space-y-2">
                  {orderDetails.items?.map((item: any, idx: number) => {
                    const isCancelled = item.status === 'cancelled';
                    return (
                    <div key={idx} className={`flex justify-between items-start p-3 bg-secondary/50 rounded-lg ${isCancelled ? 'opacity-60' : ''}`}>
                      <div className="flex-1">
                        <p className={`font-medium ${isCancelled ? 'line-through text-red-500' : ''}`}>{item.product?.name || item.productName || 'Unknown Product'}</p>
                        {isCancelled && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Cancelled</span>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {item.size && `Size: ${item.size}`}
                          {item.bobaType && ` • Boba: ${item.bobaType}`}
                          {item.sugarLevel && ` • Sugar: ${item.sugarLevel}`}
                          {item.iceLevel && ` • Ice: ${item.iceLevel}`}
                        </p>
                        {item.addonsList && item.addonsList.length > 0 && (
                          <div className="mt-1">
                            {item.addonsList.map((addon: any, aidx: number) => (
                              <p key={aidx} className="text-sm text-muted-foreground flex justify-between">
                                <span className="text-blue-600">+ {addon.addonName}</span>
                                <span className="text-blue-600 ml-2">₹{(addon.addonPrice / 100).toFixed(0)}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        {item.specialInstructions && (
                          <p className="text-sm text-amber-600">Note: {item.specialInstructions}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isCancelled && orderDetails.orderType === 'instore' && orderDetails.orderStatus !== 'completed' && orderDetails.orderStatus !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Cancel Item"
                            onClick={() => setCancelItemDialog({ open: true, item, order: orderDetails, reason: '' })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <div className="text-right">
                          <p className={`font-medium ${isCancelled ? 'line-through' : ''}`}>{formatPrice(item.lineTotal || item.totalPrice || item.unitPrice * item.quantity)}</p>
                          <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t pt-4 space-y-2">
                <h4 className="font-semibold mb-2">Price Breakdown</h4>
                
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice((orderDetails as any).subtotal || 0)}</span>
                </div>
                
                {/* Discount */}
                {((orderDetails as any).discountAmount > 0 || (orderDetails as any).discountCode) && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      Discount
                      {(orderDetails as any).discountCode && (
                        <span className="ml-1 text-xs bg-green-100 px-1.5 py-0.5 rounded">
                          {(orderDetails as any).discountCode}
                        </span>
                      )}
                    </span>
                    <span>-{formatPrice((orderDetails as any).discountAmount || 0)}</span>
                  </div>
                )}
                
                {/* Manual Discount */}
                {(orderDetails as any).manualDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      Manual Discount
                      {(orderDetails as any).manualDiscountReason && (
                        <span className="ml-1 text-xs text-muted-foreground">({(orderDetails as any).manualDiscountReason})</span>
                      )}
                    </span>
                    <span>-{formatPrice((orderDetails as any).manualDiscountAmount)}</span>
                  </div>
                )}
                
                {/* GST */}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>SGST (2.5%)</span>
                  <span>{formatPrice((orderDetails as any).stateGst || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>CGST (2.5%)</span>
                  <span>{formatPrice((orderDetails as any).centralGst || 0)}</span>
                </div>
                
                {/* Delivery Charge */}
                {(orderDetails as any).deliveryCharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery Charge</span>
                    <span>{formatPrice((orderDetails as any).deliveryCharge)}</span>
                  </div>
                )}
                
                {/* Total */}
                <div className="flex justify-between items-center text-lg font-semibold border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatPrice(orderDetails.totalAmount)}</span>
                </div>
              </div>

              {/* Special Instructions */}
              {orderDetails.specialInstructions && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">Special Instructions:</p>
                  <p className="text-amber-700">{orderDetails.specialInstructions}</p>
                </div>
              )}
              
              {/* View Invoice Button */}
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Generate and open invoice in new tab
                    const invoiceHtml = generateOrderInvoice(orderDetails);
                    const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Tax Invoice
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Discount Type</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'fixed' | 'percentage')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount (₹)'}</Label>
              <Input
                type="number"
                placeholder={discountType === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 100 for ₹100'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
              />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g., Customer complaint, Loyalty, Manager approval"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApplyDiscount}
                disabled={!discountValue || applyDiscount.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {applyDiscount.isPending ? 'Applying...' : 'Apply Discount'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Items Dialog */}
      <Dialog open={addItemsDialogOpen} onOpenChange={setAddItemsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Items to Order #{addItemsOrderNumber}</DialogTitle>
          </DialogHeader>
          {addItemsOrderId && (
            <AddItemsToOrderForm 
              orderId={addItemsOrderId} 
              orderNumber={addItemsOrderNumber}
              onSuccess={() => {
                setAddItemsDialogOpen(false);
                setAddItemsOrderId(null);
                refetch();
              }}
              onCancel={() => setAddItemsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

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
                        #{order.orderNumber} — {order.customerName || 'Guest'} — {formatPrice(order.totalAmount)}
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
                      <span className="text-violet-600">→ merged into #{orders?.find((o: any) => o.id === primaryOrderId)?.orderNumber}</span>
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
    </div>
  );
}

// Add Items to Order Form Component

function AddItemsToOrderForm({ orderId, orderNumber, onSuccess, onCancel }: {
  orderId: number;
  orderNumber: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { data: categories } = trpc.menu.getCategories.useQuery();
  const { data: allProducts } = trpc.menu.getProducts.useQuery({});
  const [selectedItems, setSelectedItems] = useState<Array<{
    productId: number;
    productName: string;
    size?: 'petite' | 'regular' | 'large';
    withBoba?: boolean;
    sugarLevel?: string;
    iceLevel?: string;
    quantity: number;
    unitPrice: number;
    addonsTotal: number;
    lineTotal: number;
    addons: Array<{ id: number; name: string; price: number }>;
    specialInstructions?: string;
  }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const addItemsToOrder = trpc.orders.addItemsToOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`Items added. New total: ${formatPrice(data.newTotal)}`);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const filteredProducts = allProducts?.filter(p => {
    const name = 'product' in p ? p.product.name : p.name;
    const subcatName = 'subcategory' in p ? p.subcategory?.name : '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (subcatName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
  }) || [];
  
  const addProduct = (productData: any) => {
    const product = 'product' in productData ? productData.product : productData;
    const basePrice = product.instorePrice ?? 0;
    setSelectedItems(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      size: product.hasSizes ? 'regular' : undefined,
      withBoba: product.hasBobaOption ? true : undefined,
      sugarLevel: product.hasSugarOptions ? '100%' : undefined,
      iceLevel: product.hasIceOptions ? 'Regular' : undefined,
      quantity: 1,
      unitPrice: basePrice,
      addonsTotal: 0,
      lineTotal: basePrice,
      addons: [],
      specialInstructions: '',
    }]);
  };
  
  const updateItem = (index: number, updates: Partial<typeof selectedItems[0]>) => {
    setSelectedItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, ...updates };
      updated.lineTotal = (updated.unitPrice + updated.addonsTotal) * updated.quantity;
      return updated;
    }));
  };
  
  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };
  
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  
  const handleSubmit = () => {
    if (selectedItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    addItemsToOrder.mutate({ orderId, items: selectedItems });
  };
  
  return (
    <div className="space-y-4">
      {/* Search Products */}
      <div>
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      
      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
        {filteredProducts.slice(0, 20).map(productData => {
          const product = 'product' in productData ? productData.product : productData;
          return (
            <Button
              key={product.id}
              variant="outline"
              size="sm"
              className="h-auto py-2 px-3 text-left justify-start"
              onClick={() => addProduct(productData)}
            >
              <div>
                <div className="font-medium text-xs truncate">{product.name}</div>
                <div className="text-xs text-muted-foreground">{formatPrice(product.instorePrice ?? 0)}</div>
              </div>
            </Button>
          );
        })}
      </div>
      
      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <h4 className="font-semibold text-sm">Items to Add:</h4>
          {selectedItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-secondary rounded">
              <div className="flex-1">
                <div className="font-medium text-sm">{item.productName}</div>
                <div className="text-xs text-muted-foreground">
                  {item.size && `${item.size} `}
                  {formatPrice(item.unitPrice)} x {item.quantity} = {formatPrice(item.lineTotal)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                >
                  -
                </Button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => updateItem(index, { quantity: item.quantity + 1 })}
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-500"
                  onClick={() => removeItem(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Subtotal:</span>
            <span className="font-semibold">{formatPrice(totalAmount)}</span>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={selectedItems.length === 0 || addItemsToOrder.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {addItemsToOrder.isPending ? 'Adding...' : `Add ${selectedItems.length} Item(s)`}
        </Button>
      </div>
    </div>
  );
}

// Tables Tab - Table Status Dashboard for In-store Orders

