import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { trpc } from '@/lib/trpc';
import { formatPrice, isOutletOpen } from '@shared/types';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, Tag } from 'lucide-react';
import { useState } from 'react';
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

  const [discountInput, setDiscountInput] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  // Check ordering hours based on selected outlet and order type
  const selectedOutlet = state.orderType === 'instore' 
    ? (state.instoreOutlet || 'tnagar')
    : state.orderType === 'pickup'
      ? (state.pickupOutlet || 'tnagar')
      : 'tnagar'; // Delivery defaults to T Nagar
  const outletStatus = isOutletOpen(selectedOutlet, state.orderType);
  const isOutsideOrderingHours = !outletStatus.available;

  const validateDiscount = trpc.discounts.validate.useQuery(
    { code: discountInput, subtotal: subtotal || 0, orderType: state.orderType as 'delivery' | 'pickup' | 'dine_in' },
    { enabled: false }
  );

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setIsApplyingDiscount(true);
    const result = await validateDiscount.refetch();
    if (result.data?.valid && result.data.discountAmount !== undefined) {
      applyDiscount(discountInput, result.data.discountAmount);
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
            <Link href="/menu">
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
          <Link href="/menu">
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
                {state.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(state.discountAmount)}</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {isOutsideOrderingHours ? (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="font-medium text-amber-800 text-center">{outletStatus.message}</p>
                </div>
              ) : (
                <Link href="/checkout">
                  <Button className="w-full mt-6 h-12 text-lg">
                    Proceed to Checkout
                  </Button>
                </Link>
              )}

              <p className="text-xs text-muted-foreground text-center mt-4">
                5% GST will be added at checkout. Delivery charges may apply.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
