import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trackPurchase, trackAddShippingInfo, trackAddPaymentInfo, toGA4Item } from '@/lib/analytics';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, CHENNAI_AREAS, isOrderingAvailable, isOutletOpen, OUTLET_HOURS, DELIVERY_CONFIG } from '@shared/types';
import { ArrowLeft, MapPin, Clock, CreditCard, Banknote, Loader2, Gift, User, Stamp, Crown, WifiOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { useClerkSafe } from '@/lib/clerkSafe';
import { useOffline } from '@/contexts/OfflineContext';

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Checkout() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { openSignIn } = useClerkSafe();
  const { state, subtotal, gst, total, clearCart, itemCount, tableNumber, setTableNumber, activeOrderId, setActiveOrderId, applyDiscount, removeDiscount } = useCart();
  const { data: stores } = trpc.stores.getAll.useQuery();
  const { isOnline, offlineModeEnabled, placeOfflineOrder } = useOffline();

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'choose' | 'guest' | 'login'>('choose');
  const submissionLockRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
    tableNumber: '',
    // Delivery address
    addressLine1: '',
    addressLine2: '',
    area: localStorage.getItem('deliveryAreaConfirmed') || '',
    city: 'Chennai',
    pincode: (() => {
      const savedArea = localStorage.getItem('deliveryAreaConfirmed');
      if (savedArea) {
        const found = CHENNAI_AREAS.find(a => a.area === savedArea);
        return found?.pincode || '';
      }
      return '';
    })(),
    // Pickup
    selectedStoreId: stores?.[0]?.id || 1,
    // Scheduling
    scheduledTime: '',
    notes: '',
  });

  const createOrder = trpc.orders.create.useMutation();
  const createPaymentOrder = trpc.orders.createPaymentOrder.useMutation();
  const verifyPayment = trpc.orders.verifyPayment.useMutation();
  // KOT is now created automatically in backend for in-store orders - no need for createKotForInstore
  const addItemsToOrder = trpc.orders.addItemsToOrder.useMutation();

  // Determine which outlet is selected based on order type
  const selectedOutlet = state.orderType === 'instore' 
    ? (state.instoreOutlet || 'tnagar')
    : state.orderType === 'pickup'
      ? (state.pickupOutlet || 'tnagar')
      : 'tnagar'; // Delivery defaults to T Nagar
  
  // Check ordering hours based on outlet and order type
  const outletStatus = isOutletOpen(selectedOutlet, state.orderType);
  const isOutsideOrderingHours = !outletStatus.available;

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // ─── AUTO-APPLY LOYALTY REWARD ───
  // Query available rewards for logged-in users
  const { data: availableRewards } = trpc.loyalty.getAvailableRewards.useQuery(
    undefined,
    { enabled: isAuthenticated && state.items.length > 0 }
  );

  // Auto-apply reward when available and not already applied
  useEffect(() => {
    if (!availableRewards || availableRewards.length === 0) return;
    // Don't override if a discount is already applied
    if (state.discountCode) return;

    const reward = availableRewards[0]; // Use the earliest expiring reward
    // Find the cheapest drink (large or regular) in the cart to make free
    const drinkItems = state.items.filter(item => item.size === 'large' || item.size === 'regular');
    if (drinkItems.length === 0) return;

    const cheapest = drinkItems.reduce((min, item) =>
      item.unitPrice < min.unitPrice ? item : min, drinkItems[0]);

    const rewardCode = `REWARD:${reward.voucherCode}`;
    applyDiscount(rewardCode, cheapest.unitPrice);
    toast.success('Loyalty reward auto-applied! Your cheapest bubble tea is FREE.', { duration: 5000 });
  }, [availableRewards, state.items, state.discountCode, applyDiscount]);

  // Mutation to cancel order if payment fails
  const cancelOrder = trpc.orders.cancelOrder.useMutation();
  
  const handleRazorpayPayment = useCallback(async (orderId: number, orderNumber: string, amount: number) => {
    try {
      // Check if Razorpay script is loaded
      if (!window.Razorpay) {
        toast.error('Payment system not loaded. Please refresh the page and try again.');
        // Cancel the pending order since payment can\'t proceed
        try {
          await cancelOrder.mutateAsync({ orderId, reason: 'Payment system not loaded' });
        } catch (e) {
          console.error('Failed to cancel order:', e);
        }
        setIsSubmitting(false);
        submissionLockRef.current = false;
        return;
      }
      
      // Create Razorpay order
      const paymentOrder = await createPaymentOrder.mutateAsync({ orderId, orderNumber, amount });
      
      const options = {
        key: paymentOrder.razorpayKeyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Taiwan Maami',
        description: `Order #${orderNumber}`,
        order_id: paymentOrder.razorpayOrderId,
        handler: async (response: any) => {
          try {
            // Verify payment
            await verifyPayment.mutateAsync({
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            
            // Track GA4 purchase event
            const ga4Items = state.items.map(item => toGA4Item({
              id: item.productId,
              name: item.productName,
              category: 'Bubble Tea',
              variant: item.size || undefined,
              price: (item.unitPrice + item.addonsTotal) / 100,
              quantity: item.quantity,
            }));
            trackPurchase(orderNumber, ga4Items, amount / 100, {
              tax: gst.total / 100,
              shipping: state.orderType === 'delivery' ? 100 : 0,
              coupon: state.discountCode || undefined,
            });
            
            clearCart();
            toast.success('Payment successful!');
            navigate(`/order-confirmation/${orderNumber}`);
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed');
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#B45309', // Primary brand color
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            toast.info('Payment cancelled');
          },
        },
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate payment');
      // Cancel the pending order since payment initiation failed
      try {
        await cancelOrder.mutateAsync({ orderId, reason: 'Payment initiation failed' });
      } catch (e) {
        console.error('Failed to cancel order:', e);
      }
      setIsSubmitting(false);
      submissionLockRef.current = false;
    }
  }, [createPaymentOrder, verifyPayment, cancelOrder, formData, clearCart, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (submissionLockRef.current || isSubmitting) {
      return;
    }
    submissionLockRef.current = true;
    
    if (itemCount === 0) {
      toast.error('Your cart is empty');
      submissionLockRef.current = false;
      return;
    }

    // Validation
    if (!formData.name || !formData.phone) {
      toast.error('Please fill in all required fields');
      submissionLockRef.current = false;
      return;
    }

    if (state.orderType === 'instore') {
      if (!formData.tableNumber) {
        toast.error('Please enter your table number');
        submissionLockRef.current = false;
        return;
      }
      if (formData.tableNumber.length > 10 || /^\+?\d{10,}$/.test(formData.tableNumber.replace(/\s/g, ''))) {
        toast.error('Please enter a valid table number (e.g., 5 or A1), not a phone number');
        submissionLockRef.current = false;
        return;
      }
    }

    if (state.orderType === 'delivery') {
      if (!formData.addressLine1 || !formData.area || !formData.pincode) {
        toast.error('Please fill in your delivery address');
        submissionLockRef.current = false;
        return;
      }
      // Validate Chennai pincode
      if (!formData.pincode.startsWith('6')) {
        toast.error('We currently only deliver within Chennai');
        submissionLockRef.current = false;
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // ─── OFFLINE MODE: Queue order locally when internet is down ───
      // Only for cash orders (instore/pickup) — delivery and online payments require internet
      if (offlineModeEnabled && !isOnline && paymentMethod === 'cash' && (state.orderType === 'instore' || state.orderType === 'pickup')) {
        const outletId = selectedOutlet === 'palladium' ? 1 : 2;
        const outletName = selectedOutlet === 'palladium' ? 'Palladium Mall' : 'T. Nagar';
        
        const offlineOrder = await placeOfflineOrder({
          orderType: state.orderType as 'instore' | 'pickup',
          outletId,
          outletName,
          tableNumber: formData.tableNumber || '',
          customerName: formData.name,
          customerPhone: formData.phone,
          items: state.items,
          specialInstructions: formData.notes || '',
          discountCode: state.discountCode,
          subtotal,
          gstAmount: gst.total,
          totalAmount: total,
          userId: user?.id || null,
          userName: user?.name || null,
        });

        clearCart();
        toast.success(
          `Order ${offlineOrder.offlineId} queued offline! KOT sent to kitchen.`,
          { duration: 5000, icon: '📋' }
        );
        navigate(`/offline-order/${offlineOrder.offlineId}`);
        return;
      }

      // If there's an active order for this table, add items to it instead of creating new
      if (activeOrderId && state.orderType === 'instore') {
        const result = await addItemsToOrder.mutateAsync({
          orderId: activeOrderId,
          items: state.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            size: item.size as 'petite' | 'regular' | 'large' | undefined,
            withBoba: item.withBoba,
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            specialInstructions: item.specialInstructions || undefined,
            addons: [
              ...item.addons,
              // Include product-specific addons (e.g., eggs for food items)
              ...(item.productAddons || []).map(pa => ({ id: pa.id, name: pa.name, price: pa.totalPrice })),
            ],
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            addonsTotal: item.addonsTotal,
            lineTotal: item.lineTotal,
          })),
        });
        
        clearCart();
        setActiveOrderId(null);
        toast.success('Items added to your existing order!');
        navigate(`/order-confirmation/${result.orderNumber}`);
        return;
      }

      // Determine outlet ID: 1 = Palladium, 2 = T.Nagar
      // Delivery is always from T.Nagar
      const outletId = state.orderType === 'delivery' 
        ? 2 
        : selectedOutlet === 'palladium' ? 1 : 2;
      
      // Create new order
      const orderData = await createOrder.mutateAsync({
        orderType: state.orderType,
        tableNumber: state.orderType === 'instore' ? formData.tableNumber || undefined : undefined,
        outletId,
        items: state.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size as 'petite' | 'regular' | 'large' | undefined,
          withBoba: item.withBoba,
          sugarLevel: item.sugarLevel,
          iceLevel: item.iceLevel,
          specialInstructions: item.specialInstructions || undefined,
          addons: [
            ...item.addons,
            // Include product-specific addons (e.g., eggs for food items)
            ...(item.productAddons || []).map(pa => ({ id: pa.id, name: pa.name, price: pa.totalPrice })),
          ],
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          addonsTotal: item.addonsTotal,
          lineTotal: item.lineTotal,
        })),
        discountCode: state.discountCode || undefined,
        customerName: formData.name,
        customerPhone: formData.phone,
        deliveryAddress: state.orderType === 'delivery' 
          ? `${formData.addressLine1}, ${formData.addressLine2 ? formData.addressLine2 + ', ' : ''}${formData.area}, ${formData.city} - ${formData.pincode}`
          : undefined,
        scheduledTime: formData.scheduledTime || undefined,
        specialInstructions: formData.notes || undefined,
      });

      // Delivery orders must pay online
      if (state.orderType === 'delivery' || paymentMethod === 'online') {
        // Initiate Razorpay payment - use orderData.totalAmount which includes delivery charges
        // CRITICAL: Do NOT use displayTotal as it doesn't include delivery charges added by backend
        await handleRazorpayPayment(orderData.orderId, orderData.orderNumber, orderData.totalAmount);
      } else {
        // Cash at pickup/counter - KOT is already created in backend for in-store orders
        // Track GA4 purchase event for cash orders
        const ga4Items = state.items.map(item => toGA4Item({
          id: item.productId,
          name: item.productName,
          category: 'Bubble Tea',
          variant: item.size || undefined,
          price: (item.unitPrice + item.addonsTotal) / 100,
          quantity: item.quantity,
        }));
        trackPurchase(orderData.orderNumber, ga4Items, orderData.totalAmount / 100, {
          tax: gst.total / 100,
          coupon: state.discountCode || undefined,
        });
        
        clearCart();
        toast.success(state.orderType === 'instore' ? 'Order placed! Pay at counter.' : 'Order placed! Pay at pickup.');
        navigate(`/order-confirmation/${orderData.orderNumber}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
      setIsSubmitting(false);
      submissionLockRef.current = false;
    }
  };

  // Build delivery address string for charge calculation
  const deliveryAddressString = useMemo(() => {
    if (state.orderType !== 'delivery') return '';
    const parts = [formData.addressLine1, formData.addressLine2, formData.area, 'Chennai', formData.pincode].filter(Boolean);
    return parts.join(', ');
  }, [state.orderType, formData.addressLine1, formData.addressLine2, formData.area, formData.pincode]);

  // Query delivery charge based on address
  const { data: deliveryChargeData, isLoading: isLoadingDeliveryCharge } = trpc.orders.getDeliveryCharge.useQuery(
    { deliveryAddress: deliveryAddressString },
    { 
      enabled: state.orderType === 'delivery' && deliveryAddressString.length > 10,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  // Check if order qualifies for free delivery
  const isFreeDelivery = state.orderType === 'delivery' && subtotal >= DELIVERY_CONFIG.freeDeliveryThresholdPaise;

  // Calculate display delivery charge
  const displayDeliveryCharge = isFreeDelivery ? 0 : (deliveryChargeData?.chargePaise || 0);

  // Partner benefits preview
  const checkoutOutletId = state.orderType === 'delivery' 
    ? 2 
    : selectedOutlet === 'palladium' ? 1 : 2;

  const partnerBenefitsInput = useMemo(() => ({
    outletId: checkoutOutletId,
    items: state.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      lineTotal: item.lineTotal,
      size: item.size || null,
      quantity: item.quantity,
    })),
  }), [checkoutOutletId, state.items]);

  const { data: partnerBenefits } = trpc.partner.previewBenefits.useQuery(
    partnerBenefitsInput,
    { enabled: isAuthenticated && state.items.length > 0 }
  );

  const partnerSavings = partnerBenefits?.totalBenefitAmount || 0;

  // total from useCart already includes gst.total, so displayTotal should include delivery charge
  const displayTotal = total + displayDeliveryCharge;

  // Guest checkout mutation
  const createGuestOrder = trpc.guest.createOrder.useMutation();

  // Handle guest checkout
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (submissionLockRef.current || isSubmitting) {
      return;
    }
    submissionLockRef.current = true;
    
    if (itemCount === 0) {
      toast.error('Your cart is empty');
      submissionLockRef.current = false;
      return;
    }

    if (!formData.name || !formData.phone) {
      toast.error('Please fill in all required fields');
      submissionLockRef.current = false;
      return;
    }

    if (state.orderType === 'instore') {
      if (!formData.tableNumber) {
        toast.error('Please enter your table number');
        submissionLockRef.current = false;
        return;
      }
      if (formData.tableNumber.length > 10 || /^\+?\d{10,}$/.test(formData.tableNumber.replace(/\s/g, ''))) {
        toast.error('Please enter a valid table number (e.g., 5 or A1), not a phone number');
        submissionLockRef.current = false;
        return;
      }
    }

    if (state.orderType === 'delivery') {
      if (!formData.addressLine1 || !formData.area || !formData.pincode) {
        toast.error('Please fill in your delivery address');
        submissionLockRef.current = false;
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // ─── OFFLINE MODE: Queue order locally when internet is down ───
      if (offlineModeEnabled && !isOnline && paymentMethod === 'cash' && (state.orderType === 'instore' || state.orderType === 'pickup')) {
        const outletId = selectedOutlet === 'palladium' ? 1 : 2;
        const outletName = selectedOutlet === 'palladium' ? 'Palladium Mall' : 'T. Nagar';
        
        const offlineOrder = await placeOfflineOrder({
          orderType: state.orderType as 'instore' | 'pickup',
          outletId,
          outletName,
          tableNumber: formData.tableNumber || '',
          customerName: formData.name,
          customerPhone: formData.phone,
          items: state.items,
          specialInstructions: formData.notes || '',
          discountCode: state.discountCode,
          subtotal,
          gstAmount: gst.total,
          totalAmount: total,
          userId: null,
          userName: null,
        });

        clearCart();
        toast.success(
          `Order ${offlineOrder.offlineId} queued offline! KOT sent to kitchen.`,
          { duration: 5000, icon: '📋' }
        );
        navigate(`/offline-order/${offlineOrder.offlineId}`);
        return;
      }

      // Generate stable idempotency key based on cart contents to prevent duplicate orders
      // Using cart hash instead of timestamp ensures retries reuse the same order
      const cartHash = state.items.map(i => `${i.productId}-${i.quantity}-${i.size || ''}`).join('|');
      const idempotencyKey = `${formData.phone}-${cartHash}`;
      
      // Determine outlet ID: 1 = Palladium, 2 = T.Nagar (same logic as logged-in checkout)
      const guestOutletId = state.orderType === 'delivery' 
        ? 2 
        : selectedOutlet === 'palladium' ? 1 : 2;
      
      const orderData = await createGuestOrder.mutateAsync({
        guestName: formData.name,
        guestPhone: formData.phone,
        guestEmail: formData.email || undefined,
        orderType: state.orderType,
        tableNumber: state.orderType === 'instore' ? formData.tableNumber || undefined : undefined,
        idempotencyKey,
        items: state.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size as 'petite' | 'regular' | 'large' | undefined,
          withBoba: item.withBoba,
          sugarLevel: item.sugarLevel,
          iceLevel: item.iceLevel,
          specialInstructions: item.specialInstructions || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          addons: [
            ...item.addons.map(a => ({ id: a.id, name: a.name, price: a.price })),
            // Include product-specific addons (e.g., eggs for food items)
            ...(item.productAddons || []).map(pa => ({ id: pa.id, name: pa.name, price: pa.totalPrice })),
          ],
        })),
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        area: formData.area || undefined,
        pincode: formData.pincode || undefined,
        pickupTime: formData.scheduledTime || undefined,
        storeLocationId: guestOutletId,
        specialInstructions: formData.notes || undefined,
        paymentMethod: state.orderType === 'delivery' ? 'online' : (paymentMethod === 'online' ? 'online' : 'cash_at_pickup'),
      });

      // For delivery or online payment, initiate Razorpay
      // CRITICAL: Use orderData.totalAmount which includes delivery charges from backend
      if (state.orderType === 'delivery' || paymentMethod === 'online') {
        await handleRazorpayPayment(orderData.orderId, orderData.orderNumber, orderData.totalAmount);
      } else {
        clearCart();
        toast.success(state.orderType === 'instore' ? 'Order placed! Pay at counter.' : 'Order placed! Pay at pickup.');
        navigate(`/order-confirmation/${orderData.orderNumber}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
      setIsSubmitting(false);
      submissionLockRef.current = false;
    }
  }

  if (!isAuthenticated && checkoutMode === 'choose') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container pt-24 pb-12">
          <div className="max-w-lg mx-auto">
            <Link href="/cart">
              <Button variant="ghost" size="sm" className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Cart
              </Button>
            </Link>
            
            <h1 className="text-2xl font-bold mb-2 text-center">Are you sure you want to miss out?</h1>
            <p className="text-muted-foreground text-center mb-8">
              Join now and start collecting stamps toward a free drink 🥤
            </p>

            <div className="space-y-4">
              {/* Login Option */}
              <Card 
                className="p-6 cursor-pointer hover:border-primary transition-colors border-2"
                onClick={() => openSignIn()}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Join & Collect Stamps</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Earn stamps on this order towards a FREE bubble tea!
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-sm text-primary">
                      <Stamp className="w-4 h-4" />
                      <span>Get 1 FREE welcome stamp on your first order</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Guest Option */}
              <Card 
                className="p-6 cursor-pointer hover:border-muted-foreground/50 transition-colors border-2"
                onClick={() => setCheckoutMode('guest')}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-muted-foreground">Continue as Guest</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Quick checkout without creating an account
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Note: You won't earn loyalty stamps as a guest
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Guest checkout form
  if (!isAuthenticated && checkoutMode === 'guest') {
    return (
      <div className="min-h-screen bg-background pb-12">
        <Header />
        <div className="container pt-20 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setCheckoutMode('choose')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Guest Checkout</h1>
          </div>

          {/* Ordering Hours Banner */}
          {isOutsideOrderingHours && (
            <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Online Ordering Closed</p>
                  <p className="text-sm text-amber-700">{outletStatus.message}</p>
                </div>
              </div>
            </Card>
          )}

          <form onSubmit={handleGuestSubmit}>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Contact Details */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Contact Details</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="guest-name">Name *</Label>
                      <Input
                        id="guest-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="guest-phone">Phone *</Label>
                      <Input
                        id="guest-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="9876543210"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="guest-email">Email (for order updates)</Label>
                      <Input
                        id="guest-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                </Card>

                {/* Table Number for Dine-in */}
                {state.orderType === 'instore' && (
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Table Number *</h2>
                    <div>
                      <Label htmlFor="guest-table">Enter your table number</Label>
                    <Input
                      id="guest-table"
                      type="text"
                      value={formData.tableNumber}
                      onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                      placeholder="e.g., 5 or A1"
                      maxLength={10}
                      required
                    />
                    </div>
                  </Card>
                )}

                {/* Delivery Address with Locality Dropdown */}
                {state.orderType === 'delivery' && (
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Delivery Address
                    </h2>
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      🚗 Delivery available within 15km of our T Nagar location, Chennai.
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="guest-address1">Address Line 1 *</Label>
                        <Input
                          id="guest-address1"
                          value={formData.addressLine1}
                          onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                          placeholder="Flat/House No., Building Name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="guest-address2">Address Line 2</Label>
                        <Input
                          id="guest-address2"
                          value={formData.addressLine2}
                          onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                          placeholder="Street, Landmark"
                        />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <Label>Area *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between font-normal",
                                  !formData.area && "text-muted-foreground"
                                )}
                              >
                                {formData.area || "Search area..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Type to search area..." />
                                <CommandList>
                                  <CommandEmpty>No area found.</CommandEmpty>
                                  <CommandGroup>
                                    {CHENNAI_AREAS.map((area) => (
                                      <CommandItem
                                        key={area.area}
                                        value={area.area}
                                        onSelect={(currentValue) => {
                                          const selectedArea = CHENNAI_AREAS.find(a => a.area.toLowerCase() === currentValue.toLowerCase());
                                          if (selectedArea) {
                                            setFormData({
                                              ...formData,
                                              area: selectedArea.area,
                                              pincode: selectedArea.pincode
                                            });
                                          }
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            formData.area === area.area ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {area.area}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>City</Label>
                          <Input value="Chennai" disabled />
                        </div>
                        <div>
                          <Label htmlFor="guest-pincode">Pincode *</Label>
                          <Input
                            id="guest-pincode"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                            placeholder="600017"
                            maxLength={6}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Pickup Store Selection */}
                {state.orderType === 'pickup' && (
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Pickup Details
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <Label>Select Store</Label>
                        <RadioGroup
                          value={String(formData.selectedStoreId)}
                          onValueChange={(v) => setFormData({ ...formData, selectedStoreId: Number(v) })}
                        >
                          {stores?.map((store) => (
                            <div key={store.id} className="flex items-center space-x-2">
                              <RadioGroupItem value={String(store.id)} id={`store-${store.id}`} />
                              <Label htmlFor={`store-${store.id}`} className="cursor-pointer">
                                {store.name} - {store.address}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                      <div>
                        <Label htmlFor="guest-time">Preferred Pickup Time</Label>
                        <Input
                          id="guest-time"
                          type="time"
                          value={formData.scheduledTime}
                          onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </Card>
                )}

                {/* Payment Method (for pickup and in-store) */}
                {(state.orderType === 'pickup' || state.orderType === 'instore') && (
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(v) => setPaymentMethod(v as 'online' | 'cash')}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="online" id="pay-online-guest" />
                        <Label htmlFor="pay-online-guest" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="w-4 h-4" />
                          Pay Online
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="pay-cash-guest" />
                        <Label htmlFor="pay-cash-guest" className="flex items-center gap-2 cursor-pointer">
                          <Banknote className="w-4 h-4" />
                          Cash at Pickup
                        </Label>
                      </div>
                    </RadioGroup>
                  </Card>
                )}
              </div>

              {/* Order Summary */}
              <div>
                <Card className="p-6 sticky top-24">
                  <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal ({itemCount} items)</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CGST (2.5%)</span>
                      <span>{formatPrice(gst.centralGst)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>SGST (2.5%)</span>
                      <span>{formatPrice(gst.stateGst)}</span>
                    </div>
                    {state.orderType === 'delivery' && (
                      <>
                        <div className="flex justify-between">
                          <span>Delivery Charge</span>
                          {isFreeDelivery ? (
                            <span className="text-green-600 font-medium">FREE</span>
                          ) : isLoadingDeliveryCharge ? (
                            <span className="text-muted-foreground"><Loader2 className="w-3 h-3 inline animate-spin" /> Calculating...</span>
                          ) : deliveryChargeData ? (
                            <span>{formatPrice(deliveryChargeData.chargePaise)}</span>
                          ) : (
                            <span className="text-muted-foreground">Enter address</span>
                          )}
                        </div>
                        {!isFreeDelivery && deliveryChargeData && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {deliveryChargeData.distanceText} from T. Nagar ({deliveryChargeData.tierLabel})
                          </p>
                        )}
                        {isFreeDelivery && (
                          <p className="text-xs text-green-600 mt-1">
                            Free delivery on orders above ₹2,500!
                          </p>
                        )}
                      </>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>{formatPrice(displayTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full mt-6" 
                    size="lg"
                    disabled={isSubmitting || isOutsideOrderingHours}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : isOutsideOrderingHours ? (
                      'Ordering Closed'
                    ) : (
                      state.orderType === 'delivery' || paymentMethod === 'online' 
                        ? 'Pay Now' 
                        : 'Place Order'
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Want to earn rewards?{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); openSignIn(); }} className="text-primary underline">Login instead</a>
                  </p>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header />

      <div className="container pt-20 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/cart">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>

        {/* Ordering Hours Banner */}
        {isOutsideOrderingHours && (
          <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Online Ordering Closed</p>
                <p className="text-sm text-amber-700">{outletStatus.message}</p>
              </div>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Details */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Contact Details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">Email (for order updates)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              {/* Delivery Address */}
              {state.orderType === 'delivery' && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Delivery Address
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="addressLine1">Address Line 1 *</Label>
                      <Input
                        id="addressLine1"
                        value={formData.addressLine1}
                        onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                        placeholder="Flat/House No., Building Name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressLine2">Address Line 2</Label>
                      <Input
                        id="addressLine2"
                        value={formData.addressLine2}
                        onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                        placeholder="Street, Landmark"
                      />
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <Label>Area *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-normal",
                                !formData.area && "text-muted-foreground"
                              )}
                            >
                              {formData.area || "Search area..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Type to search area..." />
                              <CommandList>
                                <CommandEmpty>No area found.</CommandEmpty>
                                <CommandGroup>
                                  {CHENNAI_AREAS.map((area) => (
                                    <CommandItem
                                      key={area.area}
                                      value={area.area}
                                      onSelect={(currentValue) => {
                                        const selectedArea = CHENNAI_AREAS.find(a => a.area.toLowerCase() === currentValue.toLowerCase());
                                        if (selectedArea) {
                                          setFormData({
                                            ...formData,
                                            area: selectedArea.area,
                                            pincode: selectedArea.pincode
                                          });
                                        }
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          formData.area === area.area ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {area.area}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input value="Chennai" disabled />
                      </div>
                      <div>
                        <Label htmlFor="pincode">Pincode *</Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          placeholder="600017"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Table Number for Dine-in */}
              {state.orderType === 'instore' && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Table Number *</h2>
                  <div>
                    <Label htmlFor="table-number">Enter your table number</Label>
                    <Input
                      id="table-number"
                      type="text"
                      value={formData.tableNumber}
                      onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                      placeholder="e.g., 5 or A1"
                      maxLength={10}
                      required
                    />
                  </div>
                </Card>
              )}

              {/* Pickup Store */}
              {state.orderType === 'pickup' && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Select Pickup Location
                  </h2>
                  <RadioGroup
                    value={String(formData.selectedStoreId)}
                    onValueChange={(v) => setFormData({ ...formData, selectedStoreId: Number(v) })}
                  >
                    {stores?.map((store) => (
                      <div key={store.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value={String(store.id)} id={`store-${store.id}`} />
                        <Label htmlFor={`store-${store.id}`} className="flex-1 cursor-pointer">
                          <span className="font-medium">{store.name}</span>
                          <span className="block text-sm text-muted-foreground">
                            {store.address}, {store.area}
                          </span>
                          {store.openingHours && (
                            <span className="block text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {store.openingHours}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </Card>
              )}

              {/* Schedule Order */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Schedule Order (Optional)
                  </h2>
                  {formData.scheduledTime && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, scheduledTime: '' })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={!formData.scheduledTime ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setFormData({ ...formData, scheduledTime: '' })}
                    >
                      Prepare Now
                    </Button>
                    <Button
                      type="button"
                      variant={formData.scheduledTime ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => {
                        // Set default to 30 mins from now
                        const now = new Date();
                        now.setMinutes(now.getMinutes() + 30);
                        setFormData({ ...formData, scheduledTime: now.toISOString().slice(0, 16) });
                      }}
                    >
                      Schedule Later
                    </Button>
                  </div>
                  {formData.scheduledTime && (
                    <div>
                      <Label htmlFor="scheduledTime">Select Time</Label>
                      <Input
                        id="scheduledTime"
                        type="datetime-local"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formData.scheduledTime 
                      ? "Your order will be prepared at the scheduled time"
                      : "Your order will be prepared immediately after payment"}
                  </p>
                </div>
              </Card>

              {/* Payment Method - Only show for pickup and in-store orders */}
              {(state.orderType === 'pickup' || state.orderType === 'instore') && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as 'online' | 'cash')}
                >
                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="online" id="payment-online" />
                    <Label htmlFor="payment-online" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="w-5 h-5" />
                      Pay Online (Razorpay)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border rounded-lg mt-2">
                    <RadioGroupItem value="cash" id="payment-cash" />
                    <Label htmlFor="payment-cash" className="flex items-center gap-2 cursor-pointer">
                      <Banknote className="w-5 h-5" />
                      {state.orderType === 'instore' ? 'Pay at Counter' : 'Pay at Pickup'}
                    </Label>
                  </div>
                </RadioGroup>
              </Card>
              )}

              {/* Notes */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Special Instructions</h2>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special requests or instructions..."
                  rows={3}
                />
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

                <div className="space-y-3 text-sm max-h-48 overflow-y-auto mb-4">
                  {state.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.productName}
                        {item.size && ` (${item.size})`}
                      </span>
                      <span>{formatPrice(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>

                <hr className="my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">State GST (2.5%)</span>
                    <span>{formatPrice(gst.stateGst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Central GST (2.5%)</span>
                    <span>{formatPrice(gst.centralGst)}</span>
                  </div>
                  {state.discountAmount > 0 && state.discountCode?.startsWith('REWARD:') && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 -mx-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Gift className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Loyalty Reward Applied!</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-700">
                        <span>Free Bubble Tea</span>
                        <span>-{formatPrice(state.discountAmount)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDiscount()}
                        className="text-xs text-muted-foreground underline mt-1 hover:text-foreground"
                      >
                        Remove reward
                      </button>
                    </div>
                  )}
                  {state.discountAmount > 0 && !state.discountCode?.startsWith('REWARD:') && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(state.discountAmount)}</span>
                    </div>
                  )}
                  {partnerBenefits && partnerSavings > 0 && (
                    <div className="bg-gradient-to-r from-[#fef3e8] to-[#fdf0e3] rounded-lg p-3 -mx-1 border border-[#d4a574]/30">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Crown className="w-3.5 h-3.5 text-[#bd302c]" />
                        <span className="text-xs font-semibold text-[#bd302c]">Partner Benefits</span>
                      </div>
                      {partnerBenefits.benefits.map((b, i) => (
                        <div key={i} className="flex justify-between text-xs text-green-700 mb-0.5">
                          <span>
                            {b.type === 'complimentary_item' ? `Complimentary ${b.itemName}` :
                             b.type === 'drink_discount' ? `5% off ${b.itemName}` :
                             b.type === 'free_biang_biang' ? `Complimentary ${b.itemName}` :
                             b.type === 'free_large_tea' ? `Free ${b.itemName}` :
                             `Partner benefit`}
                          </span>
                          <span>-{formatPrice(b.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold text-green-700 mt-1 pt-1 border-t border-green-200">
                        <span>Partner Savings</span>
                        <span>-{formatPrice(partnerSavings)}</span>
                      </div>
                    </div>
                  )}
                  {!partnerBenefits && isAuthenticated && (
                    <div className="text-center py-2">
                      <Link href="/partner" className="text-xs text-[#bd302c] hover:underline flex items-center justify-center gap-1">
                        <Crown className="w-3 h-3" />
                        Join Maami Partner for complimentary food & drink discounts
                      </Link>
                    </div>
                  )}
                  {state.orderType === 'delivery' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Charge</span>
                        {isFreeDelivery ? (
                          <span className="text-green-600 font-medium">FREE</span>
                        ) : isLoadingDeliveryCharge ? (
                          <span className="text-muted-foreground"><Loader2 className="w-3 h-3 inline animate-spin" /> Calculating...</span>
                        ) : deliveryChargeData ? (
                          <span>{formatPrice(deliveryChargeData.chargePaise)}</span>
                        ) : (
                          <span className="text-muted-foreground">Enter address</span>
                        )}
                      </div>
                      {!isFreeDelivery && deliveryChargeData && (
                        <p className="text-xs text-muted-foreground">
                          {deliveryChargeData.distanceText} from T. Nagar ({deliveryChargeData.tierLabel})
                        </p>
                      )}
                      {isFreeDelivery && (
                        <p className="text-xs text-green-600">
                          Free delivery on orders above ₹2,500!
                        </p>
                      )}
                    </>
                  )}
                  <hr />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(displayTotal)}</span>
                  </div>
                </div>

                {/* Estimated Preparation Time */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-800 font-medium">
                      Estimated Time: {(() => {
                        // Check if order has food items (typically in food category)
                        const hasFoodItems = state.items.some(item => 
                          item.productName.toLowerCase().includes('rice') ||
                          item.productName.toLowerCase().includes('noodle') ||
                          item.productName.toLowerCase().includes('bread') ||
                          item.productName.toLowerCase().includes('omelette')
                        );
                        if (state.orderType === 'delivery') {
                          return hasFoodItems ? '45-75 mins' : '30-60 mins';
                        }
                        return hasFoodItems ? '20-30 mins' : '10-15 mins';
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    {state.orderType === 'delivery' 
                      ? 'Includes preparation + delivery time' 
                      : 'Preparation time (may vary during busy hours)'}
                  </p>
                </div>

                {/* Stamp Card Preview for logged-in users */}
                {isAuthenticated && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Stamp className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-800">
                        Earn <strong>{Math.floor(subtotal / 45000)}</strong> stamp{Math.floor(subtotal / 45000) !== 1 ? 's' : ''} with this order!
                      </span>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">1 stamp per ₹450 spent</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full mt-6 h-12 text-lg"
                  disabled={isSubmitting || itemCount === 0 || isOutsideOrderingHours}
                >
                  {isSubmitting ? 'Processing...' : isOutsideOrderingHours ? 'Ordering Closed' : `Place Order - ${formatPrice(displayTotal)}`}

                </Button>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
