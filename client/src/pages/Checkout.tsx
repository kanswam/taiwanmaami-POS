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
import { formatPrice, GST_RATE } from '@shared/types';
import { ArrowLeft, MapPin, Clock, CreditCard, Banknote, Loader2 } from 'lucide-react';
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
  const { state, subtotal, gst, total, clearCart, itemCount } = useCart();
  const { data: stores } = trpc.stores.getAll.useQuery();

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleRazorpayPayment = useCallback(async (orderId: number, amount: number) => {
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
            navigate(`/order-confirmation/${orderId}`);
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
        items: state.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size,
          withBoba: item.withBoba,
          sugarLevel: item.sugarLevel,
          iceLevel: item.iceLevel,
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

      if (paymentMethod === 'online') {
        // Initiate Razorpay payment
        await handleRazorpayPayment(orderData.orderId, displayTotal);
      } else {
        // Cash on delivery - go directly to confirmation
        clearCart();
        toast.success('Order placed successfully!');
        navigate(`/order-confirmation/${orderData.orderId}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
      setIsSubmitting(false);
    }
  };

  const displayTotal = total + gst.total;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Login Required</h1>
            <p className="text-muted-foreground mb-6">
              Please login to complete your order
            </p>
            <a href={getLoginUrl()}>
              <Button>Login to Continue</Button>
            </a>
          </div>
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
                        <Label htmlFor="area">Area *</Label>
                        <Input
                          id="area"
                          value={formData.area}
                          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                          placeholder="T Nagar"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          disabled
                        />
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

              {/* Payment Method */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as 'online' | 'cod')}
                >
                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="online" id="payment-online" />
                    <Label htmlFor="payment-online" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="w-5 h-5" />
                      Pay Online (Razorpay)
                    </Label>
                  </div>
                  {state.orderType !== 'delivery' && (
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="cod" id="payment-cod" />
                      <Label htmlFor="payment-cod" className="flex items-center gap-2 cursor-pointer">
                        <Banknote className="w-5 h-5" />
                        Pay at Store
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </Card>

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
                      <span>{formatPrice(Math.round(item.lineTotal * (1 + GST_RATE)))}</span>
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
                  <hr />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(displayTotal)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-6 h-12 text-lg"
                  disabled={isSubmitting || itemCount === 0}
                >
                  {isSubmitting ? 'Processing...' : `Place Order - ${formatPrice(displayTotal)}`}
                </Button>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
