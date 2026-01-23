import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShoppingCart, ArrowLeft, Trash2, Plus, Minus, 
  Package, CreditCard, Loader2
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useWholesaleAuth } from '@/contexts/WholesaleAuthContext';
import { toast } from 'sonner';

export default function WholesaleCart() {
  const [, setLocation] = useLocation();
  const { isLoggedIn, customer } = useWholesaleAuth();
  // Using sonner toast
  const [customerNotes, setCustomerNotes] = useState('');

  // Redirect if not logged in
  if (!isLoggedIn) {
    setLocation('/wholesale/login');
    return null;
  }

  const { data: cartItems, isLoading, refetch } = trpc.wholesale.getCart.useQuery();
  
  const updateCartMutation = trpc.wholesale.updateCartItem.useMutation({
    onSuccess: () => refetch(),
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Failed to update cart');
    },
  });

  const removeFromCartMutation = trpc.wholesale.removeFromCart.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Item removed from cart');
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Failed to remove item');
    },
  });

  const clearCartMutation = trpc.wholesale.clearCart.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Cart cleared');
    },
  });

  const createOrderMutation = trpc.wholesale.createOrder.useMutation({
    onSuccess: (data: {
      razorpayOrderId: string;
      amount: number;
      currency: string;
      key: string;
      orderId: number;
      customer: { name: string; email: string; phone: string };
    }) => {
      // Initialize Razorpay
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'Taiwan Maami Wholesale',
        description: 'Wholesale Order Payment',
        order_id: data.razorpayOrderId,
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          // Verify payment
          try {
            await verifyPaymentMutation.mutateAsync({
              orderId: data.orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
          } catch (err) {
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: data.customer.name,
          email: data.customer.email,
          contact: data.customer.phone,
        },
        theme: {
          color: '#d97706',
        },
      };

      const razorpay = new (window as unknown as { Razorpay: new (options: unknown) => { open: () => void } }).Razorpay(options);
      razorpay.open();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Failed to create order');
    },
  });

  const verifyPaymentMutation = trpc.wholesale.verifyPayment.useMutation({
    onSuccess: (data: { orderNumber: string }) => {
      toast.success(`Payment successful! Order ${data.orderNumber} has been placed`);
      setLocation('/wholesale/orders');
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Payment verification failed. Please contact support');
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  // Calculate price based on quantity and tiers
  const calculateItemPrice = (item: {
    basePrice: number;
    quantity: number;
    pricingTiers?: Array<{ minQty: number; price: number }> | string | null;
  }) => {
    let unitPrice = item.basePrice;
    
    if (item.pricingTiers) {
      const tiers = typeof item.pricingTiers === 'string' 
        ? JSON.parse(item.pricingTiers) 
        : item.pricingTiers;
      
      if (Array.isArray(tiers)) {
        const sortedTiers = [...tiers].sort((a, b) => b.minQty - a.minQty);
        for (const tier of sortedTiers) {
          if (item.quantity >= tier.minQty) {
            unitPrice = tier.price;
            break;
          }
        }
      }
    }
    
    return {
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!cartItems || cartItems.length === 0) {
      return { subtotal: 0, cgst: 0, sgst: 0, totalGst: 0, total: 0 };
    }

    let subtotal = 0;
    for (const item of cartItems) {
      const { lineTotal } = calculateItemPrice(item);
      subtotal += lineTotal;
    }

    const cgst = Math.round(subtotal * 0.09);
    const sgst = Math.round(subtotal * 0.09);
    const totalGst = cgst + sgst;
    const total = subtotal + totalGst;

    return { subtotal, cgst, sgst, totalGst, total };
  };

  const totals = calculateTotals();

  const handleQuantityChange = (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateCartMutation.mutate({ cartItemId, quantity: newQuantity });
  };

  const handleCheckout = () => {
    createOrderMutation.mutate({ customerNotes });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="container mx-auto max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
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
                  Continue Shopping
                </Button>
              </Link>
            </div>
            <h1 className="text-xl font-bold">Shopping Cart</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-6">
        {!cartItems || cartItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Add some products to get started</p>
              <Link href="/wholesale/products">
                <Button className="bg-amber-600 hover:bg-amber-700">
                  Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{cartItems.length} items in cart</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearCartMutation.mutate()}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
              </div>

              {cartItems.map((item: {
                id: number;
                productId: number;
                productName: string;
                productSlug: string;
                imageUrl?: string | null;
                basePrice: number;
                unit: string;
                quantity: number;
                pricingTiers?: Array<{ minQty: number; price: number }> | string | null;
                stockQuantity: number;
              }) => {
                const { unitPrice, lineTotal } = calculateItemPrice(item);
                
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <Link href={`/wholesale/products/${item.productSlug}`}>
                            <h3 className="font-medium hover:text-amber-600">{item.productName}</h3>
                          </Link>
                          <p className="text-sm text-gray-500">
                            {formatPrice(unitPrice)} per {item.unit}
                          </p>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || updateCartMutation.isPending}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-12 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                disabled={updateCartMutation.isPending}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <p className="font-semibold text-amber-600">
                                {formatPrice(lineTotal)}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeFromCartMutation.mutate({ cartItemId: item.id })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{formatPrice(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST (9%)</span>
                      <span>{formatPrice(totals.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST (9%)</span>
                      <span>{formatPrice(totals.sgst)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span className="text-amber-600">{formatPrice(totals.total)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Order Notes (Optional)</label>
                    <textarea
                      className="w-full border rounded-md p-2 text-sm"
                      rows={3}
                      placeholder="Any special instructions..."
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                    />
                  </div>

                  <div className="bg-amber-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-amber-800 mb-1">Pickup Location</p>
                    <p className="text-amber-700">Taiwan Maami - T. Nagar, Chennai</p>
                  </div>

                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay {formatPrice(totals.total)}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Secure payment powered by Razorpay
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Razorpay Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" />
    </div>
  );
}
