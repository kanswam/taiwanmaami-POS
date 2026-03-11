import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, isOutletOpen } from '@shared/types';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, Tag, Gift } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { trackViewCart, trackBeginCheckout, trackApplyDiscount, toGA4Item } from '@/lib/analytics';
import { toast } from 'sonner';

export default function Cart() {
  const {
    state,
    removeItem,
    updateQuantity,
    clearCart,
    applyDiscount,
    removeDiscount,
    subtotal,
    gst,
    total,
    itemCount,
  } = useCart();

  const { isAuthenticated } = useAuth();
  const [discountInput, setDiscountInput] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [isApplyingReward, setIsApplyingReward] = useState(false);
  const hasTrackedViewCart = useRef(false);

  // Fetch available loyalty rewards for logged-in users
  const { data: availableRewards } = trpc.loyalty.getAvailableRewards.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Track view_cart event when cart page loads with items
  useEffect(() => {
    if (itemCount > 0 && !hasTrackedViewCart.current) {
      const ga4Items = state.items.map(item => toGA4Item({
        id: item.productId,
        name: item.productName,
        category: 'Bubble Tea',
        variant: item.size || undefined,
        price: item.unitPrice + item.addonsTotal,
        quantity: item.quantity,
      }));
      trackViewCart(ga4Items, subtotal / 100); // Convert paise to rupees
      hasTrackedViewCart.current = true;
    }
  }, [itemCount, state.items, subtotal]);

  // Track begin_checkout when proceeding to checkout
  const handleProceedToCheckout = () => {
    const ga4Items = state.items.map(item => toGA4Item({
      id: item.productId,
      name: item.productName,
      category: 'Bubble Tea',
      variant: item.size || undefined,
      price: item.unitPrice + item.addonsTotal,
      quantity: item.quantity,
    }));
    trackBeginCheckout(ga4Items, total / 100, state.discountCode || undefined);
  };

  // Check ordering hours based on selected outlet and order type
  const selectedOutlet = state.orderType === 'instore' 
    ? (state.instoreOutlet || 'tnagar')
    : state.orderType === 'pickup'
      ? (state.pickupOutlet || 'tnagar')
      : 'tnagar'; // Delivery defaults to T Nagar
  const outletStatus = isOutletOpen(selectedOutlet, state.orderType);
  const isOutsideOrderingHours = !outletStatus.available;

  // Map cart orderType to discount validation orderType
  const discountOrderType = state.orderType === 'instore' ? 'dine_in' : state.orderType as 'delivery' | 'pickup' | 'dine_in';
  const validateDiscount = trpc.discounts.validate.useQuery(
    { code: discountInput, subtotal: subtotal || 0, orderType: discountOrderType },
    { enabled: false }
  );

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setIsApplyingDiscount(true);
    const result = await validateDiscount.refetch();
    if (result.data?.valid && result.data.discountAmount !== undefined) {
      applyDiscount(discountInput, result.data.discountAmount);
      trackApplyDiscount(discountInput, true);
      toast.success('Discount applied!');
    } else {
      toast.error(result.data?.message || 'Invalid discount code');
    }
    setIsApplyingDiscount(false);
  };

  // Total already includes GST from CartContext
  const displayTotal = Math.round(total);

  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">
              Add some delicious bubble tea to get started!
            </p>
            <Link href="/#explore-menu">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse Menu
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />

      <div className="container py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/#explore-menu">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Your Cart</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {state.items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex gap-4">
                  {/* Product image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    <img
                      src={item.imageUrl || '/placeholder-drink.jpg'}
                      alt={item.productName}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-drink.jpg';
                      }}
                    />
                  </div>

                  {/* Product details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{item.productName}</h3>
                        {item.chineseName && (
                          <p className="text-xs text-muted-foreground">{item.chineseName}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Customizations */}
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      {item.size && <span className="capitalize">{item.size}</span>}
                      {item.withBoba !== undefined && (
                        <span> • {item.withBoba ? (
                          `${item.bobaSize === 'big' ? 'Big' : 'Small'} ${item.bobaType === 'popping' ? `${item.poppingBobaFlavor} Popping Boba` : 'Tapioca Boba'}`
                        ) : 'No Boba'}</span>
                      )}
                      {item.sugarLevel && <span> • Sugar: {item.sugarLevel}</span>}
                      {item.iceLevel && <span> • {item.iceLevel}</span>}
                      {item.addons.length > 0 && (
                        <div className="text-xs">
                          Add-ons: {item.addons.map(a => a.name).join(', ')}
                        </div>
                      )}
                      {item.extraEspresso && (
                        <span className="text-xs"> • Extra Espresso Shot</span>
                      )}
                      {item.productAddons && item.productAddons.length > 0 && (
                        <div className="text-xs">
                          {item.productAddons.map(addon => (
                            <span key={addon.id}> • {addon.quantity}x {addon.name}</span>
                          ))}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <div className="text-xs text-orange-600 mt-1">
                          Note: {item.specialInstructions}
                        </div>
                      )}
                    </div>

                    {/* Quantity and price */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-semibold">
                        {formatPrice(item.lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <Button variant="ghost" className="text-destructive" onClick={clearCart}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              {/* Loyalty Reward Banner */}
              {isAuthenticated && availableRewards && availableRewards.length > 0 && !state.discountCode && (
                <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Gift className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-800">You have a FREE Large Drink!</p>
                        <p className="text-xs text-green-600">Use your loyalty reward on this order</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-100"
                      disabled={isApplyingReward}
                      onClick={async () => {
                        setIsApplyingReward(true);
                        try {
                          // Find the most expensive large drink in cart to make free
                          const largeDrinks = state.items.filter(item => item.size === 'large');
                          if (largeDrinks.length === 0) {
                            toast.error('Add a large drink to your cart to use this reward');
                            setIsApplyingReward(false);
                            return;
                          }
                          // Apply as discount code with the voucher code
                          const reward = availableRewards[0];
                          const mostExpensiveLarge = largeDrinks.reduce((max, item) => 
                            (item.unitPrice > max.unitPrice) ? item : max, largeDrinks[0]);
                          // Apply the reward as a discount (price of the most expensive large drink)
                          applyDiscount(`REWARD:${reward.voucherCode}`, mostExpensiveLarge.unitPrice);
                          toast.success(`Free drink applied! ${mostExpensiveLarge.productName} (Large) is on us! 🎉`);
                        } catch (err) {
                          toast.error('Failed to apply reward');
                        }
                        setIsApplyingReward(false);
                      }}
                    >
                      {isApplyingReward ? 'Applying...' : 'Apply'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Discount Code */}
              {!state.discountCode ? (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Discount code"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyDiscount}
                    disabled={isApplyingDiscount}
                  >
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
              ) : state.discountCode.startsWith('REWARD:') ? (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">🎉 Free Large Drink Applied!</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeDiscount}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">{state.discountCode}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeDiscount}>
                    Remove
                  </Button>
                </div>
              )}

              {/* BOBALOVE10 Banner for first-time delivery customers */}
              {state.orderType === 'delivery' && !state.discountCode && (
                <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <div>
                      <p className="text-sm font-semibold text-red-700">First Delivery Order?</p>
                      <p className="text-xs text-red-600">Use code <span className="font-bold bg-red-100 px-1 rounded">BOBALOVE10</span> for 10% off!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Price breakdown */}
              <div className="space-y-3 text-sm">
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
                {/* Delivery charge for delivery orders */}
                {state.orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    {subtotal >= 250000 ? (
                      <span className="text-green-600 font-medium">FREE</span>
                    ) : (
                      <span>{formatPrice(10000)}</span>
                    )}
                  </div>
                )}
                {state.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(state.discountAmount)}</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(state.orderType === 'delivery' ? (subtotal >= 250000 ? total : total + 10000) : total)}</span>
                </div>
              </div>

              {isOutsideOrderingHours ? (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="font-medium text-amber-800 text-center">{outletStatus.message}</p>
                </div>
              ) : (
                <Link href="/checkout">
                  <Button className="w-full mt-6 h-12 text-lg" onClick={handleProceedToCheckout}>
                    Proceed to Checkout
                  </Button>
                </Link>
              )}

              <p className="text-xs text-muted-foreground text-center mt-4">
                {state.orderType === 'delivery' 
                  ? (subtotal >= 250000 
                    ? 'Free delivery on orders above ₹2,500!' 
                    : 'Delivery charges: ₹100 (0-10km), ₹200 (10-15km), ₹300 (15-25km), ₹400 (25+km). Free delivery on orders above ₹2,500!')
                  : '5% GST included in total.'
                }
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
