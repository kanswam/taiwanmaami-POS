import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
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
import { formatPrice, CHENNAI_AREAS, isOrderingAvailable } from '@shared/types';
import { ArrowLeft, MapPin, Clock, CreditCard, Banknote, Loader2, Gift, User, Stamp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { getLoginUrl } from '@/const';

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Checkout() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { state, subtotal, gst, total, clearCart, itemCount, tableNumber, setTableNumber } = useCart();
  const { data: stores } = trpc.stores.getAll.useQuery();

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'choose' | 'guest' | 'login'>('choose');

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
    // Delivery address
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: 'Chennai',
    pincode: '',
    // Pickup
    selectedStoreId: stores?.[0]?.id || 1,
    // Scheduling
    scheduledTime: '',
    notes: '',
  });

  const createOrder = trpc.orders.create.useMutation();
  const createPaymentOrder = trpc.orders.createPaymentOrder.useMutation();
  const verifyPayment = trpc.orders.verifyPayment.useMutation();
  const createKotForInstore = trpc.orders.createKotForInstore.useMutation();

  // Check ordering hours (skip for in-store orders)
  const orderingStatus = isOrderingAvailable();
  const isOutsideOrderingHours = state.orderType !== 'instore' && !orderingStatus.available;

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

  const handleRazorpayPayment = useCallback(async (orderId: number, orderNumber: string, amount: number) => {
    try {
      // Create Razorpay order
      const paymentOrder = await createPaymentOrder.mutateAsync({ orderId, amount });
      
      const options = {
        key: paymentOrder.razorpayKeyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Taiwan Maami',
        description: `Order #${orderId}`,
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
      setIsSubmitting(false);
    }
  }, [createPaymentOrder, verifyPayment, formData, clearCart, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemCount === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Validation
    if (!formData.name || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (state.orderType === 'delivery') {
      if (!formData.addressLine1 || !formData.area || !formData.pincode) {
        toast.error('Please fill in your delivery address');
        return;
      }
      // Validate Chennai pincode
      if (!formData.pincode.startsWith('6')) {
        toast.error('We currently only deliver within Chennai');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Create order first
      const orderData = await createOrder.mutateAsync({
        orderType: state.orderType,
        tableNumber: state.orderType === 'instore' ? tableNumber || undefined : undefined,
        items: state.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size as 'petite' | 'regular' | 'large' | undefined,
          withBoba: item.withBoba,
          sugarLevel: item.sugarLevel,
          iceLevel: item.iceLevel,
          specialInstructions: item.specialInstructions || undefined,
          addons: item.addons,
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
        // Initiate Razorpay payment
        await handleRazorpayPayment(orderData.orderId, orderData.orderNumber, displayTotal);
      } else {
        // Cash at pickup/counter - create KOT immediately for in-store orders
        if (state.orderType === 'instore') {
          await createKotForInstore.mutateAsync({ orderId: orderData.orderId, orderNumber: orderData.orderNumber });
        }
        clearCart();
        toast.success(state.orderType === 'instore' ? 'Order placed! Pay at counter.' : 'Order placed! Pay at pickup.');
        navigate(`/order-confirmation/${orderData.orderNumber}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
      setIsSubmitting(false);
    }
  };

  // total from useCart already includes gst.total, so displayTotal should just be total
  const displayTotal = total;

  // Guest checkout mutation
  const createGuestOrder = trpc.guest.createOrder.useMutation();

  // Handle guest checkout
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemCount === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!formData.name || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (state.orderType === 'delivery') {
      if (!formData.addressLine1 || !formData.area || !formData.pincode) {
        toast.error('Please fill in your delivery address');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orderData = await createGuestOrder.mutateAsync({
        guestName: formData.name,
        guestPhone: formData.phone,
        guestEmail: formData.email || undefined,
        orderType: state.orderType,
        tableNumber: state.orderType === 'instore' ? tableNumber || undefined : undefined,
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
          addons: item.addons.map(a => ({ id: a.id, name: a.name, price: a.price })),
        })),
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        area: formData.area || undefined,
        pincode: formData.pincode || undefined,
        pickupTime: formData.scheduledTime || undefined,
        storeLocationId: formData.selectedStoreId || undefined,
        specialInstructions: formData.notes || undefined,
        paymentMethod: state.orderType === 'delivery' ? 'online' : (paymentMethod === 'online' ? 'online' : 'cash_at_pickup'),
      });

      // For delivery or online payment, initiate Razorpay
      if (state.orderType === 'delivery' || paymentMethod === 'online') {
        await handleRazorpayPayment(orderData.orderId, orderData.orderNumber, displayTotal);
      } else {
        clearCart();
        toast.success(state.orderType === 'instore' ? 'Order placed! Pay at counter.' : 'Order placed! Pay at pickup.');
        navigate(`/order-confirmation/${orderData.orderNumber}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
      setIsSubmitting(false);
    }
  };

  // Show checkout mode choice for non-authenticated users
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
            
            <h1 className="text-2xl font-bold mb-2 text-center">How would you like to checkout?</h1>
            <p className="text-muted-foreground text-center mb-8">
              Choose an option to complete your order
            </p>

            <div className="space-y-4">
              {/* Login Option */}
              <Card 
                className="p-6 cursor-pointer hover:border-primary transition-colors border-2"
                onClick={() => window.location.href = getLoginUrl()}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Login & Earn Rewards</h3>
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
                    <h3 className="font-semibold text-lg">Continue as Guest</h3>
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
                  <p className="text-sm text-amber-700">{orderingStatus.message}</p>
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
                          <Select
                            value={formData.area}
                            onValueChange={(value) => {
                              const selectedArea = CHENNAI_AREAS.find(a => a.area === value);
                              setFormData({ 
                                ...formData, 
                                area: value,
                                pincode: selectedArea?.pincode || formData.pincode
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select area" />
                            </SelectTrigger>
                            <SelectContent>
                              {CHENNAI_AREAS.map((area) => (
                                <SelectItem key={area.area} value={area.area}>
                                  {area.area}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <span>Delivery (via Porter)</span>
                          <span className="text-muted-foreground">Actual charges</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Delivery will be booked through Porter. Actual delivery charges will be added to your bill (no GST on delivery).
                        </p>
                      </>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>{formatPrice(displayTotal)}{state.orderType === 'delivery' && ' + Delivery'}</span>
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
                    <a href={getLoginUrl()} className="text-primary underline">Login instead</a>
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
                <p className="text-sm text-amber-700">{orderingStatus.message}</p>
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
                        <Select
                          value={formData.area}
                          onValueChange={(value) => {
                            const selectedArea = CHENNAI_AREAS.find(a => a.area === value);
                            setFormData({ 
                              ...formData, 
                              area: value,
                              pincode: selectedArea?.pincode || formData.pincode
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select area" />
                          </SelectTrigger>
                          <SelectContent>
                            {CHENNAI_AREAS.map((area) => (
                              <SelectItem key={area.area} value={area.area}>
                                {area.area}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Schedule Order (Optional)
                </h2>
                <div>
                  <Label htmlFor="scheduledTime">Preferred Time</Label>
                  <Input
                    id="scheduledTime"
                    type="datetime-local"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for immediate preparation
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
                  {state.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(state.discountAmount)}</span>
                    </div>
                  )}
                  {state.orderType === 'delivery' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery (via Porter)</span>
                        <span className="text-muted-foreground">Actual charges</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Delivery booked via Porter. Actual charges added to bill (no GST).
                      </p>
                    </>
                  )}
                  <hr />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(displayTotal)}{state.orderType === 'delivery' && ' + Delivery'}</span>
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
