import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, GST_RATE } from '@shared/types';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, Tag, Gift } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

// Helper to check if an item is a bubble tea (drink)
function isBubbleTea(productName: string): boolean {
  const name = productName.toLowerCase();
  // Exclude mochi and snacks
  if (name.includes('mochi') || name.includes('snack')) return false;
  // Include items that look like drinks
  return name.includes('tea') || name.includes('milk') || name.includes('oolong') || 
         name.includes('latte') || name.includes('matcha') || name.includes('coffee') ||
         name.includes('smoothie') || name.includes('juice');
}

export default function Cart() {
  const { user } = useAuth();
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

  // Fetch available rewards for logged-in users
  const { data: rewards } = trpc.loyalty.getAvailableRewards.useQuery(
    undefined,
    { enabled: !!user }
  );

  const validateDiscount = trpc.discounts.validate.useQuery(
    { code: discountInput, subtotal: subtotal || 0 },
    { enabled: false }
  );

  // Find the cheapest bubble tea in cart for auto-applying reward
  const cheapestBubbleTea = useMemo(() => {
    const bubbleTeaItems = state.items.filter(item => isBubbleTea(item.productName));
    if (bubbleTeaItems.length === 0) return null;
    
    return bubbleTeaItems.reduce((min, item) => {
      const itemPrice = item.unitPrice + item.addonsTotal;
      const minPrice = min.unitPrice + min.addonsTotal;
      return itemPrice < minPrice ? item : min;
    });
  }, [state.items]);

  // Auto-apply reward when user has one and there's a bubble tea in cart
  const autoAppliedReward = useMemo(() => {
    if (!user || !rewards || rewards.length === 0 || !cheapestBubbleTea) return null;
    // Don't auto-apply if user already has a discount code applied (not a reward)
    if (state.discountCode && !state.discountCode.startsWith('REWARD:')) return null;
    
    const reward = rewards[0]; // Use the first available reward
    const rewardValue = cheapestBubbleTea.unitPrice + cheapestBubbleTea.addonsTotal;
    
    return {
      voucherCode: reward.voucherCode,
      value: rewardValue,
      itemName: cheapestBubbleTea.productName,
      expiresAt: reward.expiresAt,
    };
  }, [user, rewards, cheapestBubbleTea, state.discountCode]);

  // Apply the reward discount automatically
  useEffect(() => {
    if (autoAppliedReward && !state.discountCode) {
      applyDiscount(`REWARD:${autoAppliedReward.voucherCode}`, autoAppliedReward.value);
    } else if (!autoAppliedReward && state.discountCode?.startsWith('REWARD:')) {
      // Remove reward if no longer applicable (e.g., removed all bubble teas)
      removeDiscount();
    }
  }, [autoAppliedReward, state.discountCode, applyDiscount, removeDiscount]);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    // Remove any auto-applied reward first
    if (state.discountCode?.startsWith('REWARD:')) {
      removeDiscount();
    }
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

  const handleRemoveDiscount = () => {
    removeDiscount();
    setDiscountInput('');
  };

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

  // Check if reward is currently applied
  const isRewardApplied = state.discountCode?.startsWith('REWARD:');

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
            {state.items.map((item) => {
              // Check if this item is the one getting the free drink reward
              const isFreeDrink = isRewardApplied && autoAppliedReward && 
                item.productName === autoAppliedReward.itemName;
              
              return (
                <Card key={item.id} className={`p-4 ${isFreeDrink ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''}`}>
                  <div className="flex gap-4">
                    {/* Product image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0 relative">
                      <img
                        src={item.imageUrl || '/placeholder-drink.jpg'}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-drink.jpg';
                        }}
                      />
                      {isFreeDrink && (
                        <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                          <Gift className="w-8 h-8 text-orange-600" />
                        </div>
                      )}
                    </div>

                    {/* Product details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {item.productName}
                            {isFreeDrink && (
                              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                                FREE!
                              </span>
                            )}
                          </h3>
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
                        <span className={`font-semibold ${isFreeDrink ? 'line-through text-muted-foreground' : ''}`}>
                          {formatPrice(Math.round(item.lineTotal * (1 + GST_RATE)))}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            <Button variant="ghost" className="text-destructive" onClick={clearCart}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              {/* Auto-applied Reward Banner */}
              {isRewardApplied && autoAppliedReward && (
                <div className="mb-4 p-3 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-300 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-semibold text-orange-800">Loyalty Reward Applied!</p>
                      <p className="text-sm text-orange-700">
                        Your {autoAppliedReward.itemName} is FREE
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Discount Code - only show if no reward applied */}
              {!isRewardApplied && (
                <>
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
                      <Button variant="ghost" size="sm" onClick={handleRemoveDiscount}>
                        Remove
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Price breakdown */}
              <div className="space-y-3 text-sm">
                {/* Item-wise breakdown */}
                {state.items.map((item) => {
                  const isFreeDrink = isRewardApplied && autoAppliedReward && 
                    item.productName === autoAppliedReward.itemName;
                  const itemTotal = item.lineTotal;
                  
                  return (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {item.productName} × {item.quantity}
                        {isFreeDrink && <span className="text-orange-600 ml-1">(FREE)</span>}
                      </span>
                      <span className={isFreeDrink ? 'line-through text-muted-foreground' : ''}>
                        {formatPrice(itemTotal)}
                      </span>
                    </div>
                  );
                })}
                
                <hr className="my-2" />
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                
                {/* Free Drink Reward */}
                {isRewardApplied && autoAppliedReward && (
                  <div className="flex justify-between text-orange-600">
                    <span className="flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      Free Drink Reward
                    </span>
                    <span>-{formatPrice(state.discountAmount)}</span>
                  </div>
                )}
                
                {/* Regular Discount */}
                {!isRewardApplied && state.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(state.discountAmount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">State GST (2.5%)</span>
                  <span>{formatPrice(gst.stateGst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Central GST (2.5%)</span>
                  <span>{formatPrice(gst.centralGst)}</span>
                </div>
                
                <hr />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Link href="/checkout">
                <Button className="w-full mt-6 h-12 text-lg">
                  Proceed to Checkout
                </Button>
              </Link>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Prices include GST. Delivery charges may apply.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
