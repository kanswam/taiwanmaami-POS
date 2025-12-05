import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Plus, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { trpc } from '@/lib/trpc';
import { formatPrice, GST_RATE, SIZES, SUGAR_LEVELS, ICE_LEVELS, Size } from '@shared/types';
import { nanoid } from 'nanoid';

interface ProductCustomizationModalProps {
  product: {
    id: number;
    name: string;
    chineseName?: string | null;
    imageUrl?: string | null;
    instorePrice?: number | null;
    deliveryPrice?: number | null;
  };
  subcategory: {
    id: number;
    name: string;
    hasSizeVariants?: boolean;
    hasBobaOption?: boolean;
    basePricePetiteWithBoba?: number | null;
    basePricePetiteNoBoba?: number | null;
    basePriceRegularWithBoba?: number | null;
    basePriceRegularNoBoba?: number | null;
    basePriceLargeWithBoba?: number | null;
    basePriceLargeNoBoba?: number | null;
    deliveryPriceRegularWithBoba?: number | null;
    deliveryPriceRegularNoBoba?: number | null;
    deliveryPriceLargeWithBoba?: number | null;
    deliveryPriceLargeNoBoba?: number | null;
  };
  isDelivery?: boolean;
  open: boolean;
  onClose: () => void;
}

export function ProductCustomizationModal({
  product,
  subcategory,
  isDelivery = false,
  open,
  onClose,
}: ProductCustomizationModalProps) {
  const { addItem } = useCart();
  const { data: addonsData } = trpc.menu.getAddons.useQuery();

  // State for customization
  const [size, setSize] = useState<Size>(isDelivery ? 'regular' : 'petite');
  const [withBoba, setWithBoba] = useState(true);
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('Regular Ice');
  const [selectedAddons, setSelectedAddons] = useState<{ id: number; name: string; price: number }[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Filter available sizes for delivery (no petite)
  const availableSizes = isDelivery ? SIZES.filter(s => s.value !== 'petite') : SIZES;

  // Get addons by type
  const bobaAddons = addonsData?.filter(a => a.type === 'boba_flavor') || [];
  const milkAddons = addonsData?.filter(a => a.type === 'vegan_milk') || [];

  // Calculate base price based on selections
  const getBasePrice = () => {
    if (!subcategory.hasSizeVariants) {
      return isDelivery ? (product.deliveryPrice || product.instorePrice || 0) : (product.instorePrice || 0);
    }

    if (isDelivery) {
      if (size === 'regular') {
        return withBoba ? (subcategory.deliveryPriceRegularWithBoba || 0) : (subcategory.deliveryPriceRegularNoBoba || 0);
      } else {
        return withBoba ? (subcategory.deliveryPriceLargeWithBoba || 0) : (subcategory.deliveryPriceLargeNoBoba || 0);
      }
    } else {
      if (size === 'petite') {
        return withBoba ? (subcategory.basePricePetiteWithBoba || 0) : (subcategory.basePricePetiteNoBoba || 0);
      } else if (size === 'regular') {
        return withBoba ? (subcategory.basePriceRegularWithBoba || 0) : (subcategory.basePriceRegularNoBoba || 0);
      } else {
        return withBoba ? (subcategory.basePriceLargeWithBoba || 0) : (subcategory.basePriceLargeNoBoba || 0);
      }
    }
  };

  // Calculate addon price based on size
  const getAddonPrice = (addon: NonNullable<typeof addonsData>[0]) => {
    if (addon.fixedPrice) return addon.fixedPrice;
    if (size === 'petite') return addon.pricePetite || 0;
    if (size === 'regular') return addon.priceRegular || 0;
    return addon.priceLarge || 0;
  };

  // Calculate totals
  const basePrice = getBasePrice();
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = basePrice;
  const lineTotal = (unitPrice + addonsTotal) * quantity;
  const displayTotal = Math.round(lineTotal * (1 + GST_RATE));

  // Toggle addon selection
  const toggleAddon = (addon: NonNullable<typeof addonsData>[0]) => {
    const price = getAddonPrice(addon);
    const existing = selectedAddons.find(a => a.id === addon.id);
    if (existing) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, { id: addon.id, name: addon.name, price }]);
    }
  };

  // Update addon prices when size changes
  const updateAddonPrices = (newSize: Size) => {
    setSelectedAddons(prev => prev.map(a => {
      const addon = addonsData?.find(ad => ad.id === a.id);
      if (!addon) return a;
      let newPrice = addon.fixedPrice || 0;
      if (!addon.fixedPrice) {
        if (newSize === 'petite') newPrice = addon.pricePetite || 0;
        else if (newSize === 'regular') newPrice = addon.priceRegular || 0;
        else newPrice = addon.priceLarge || 0;
      }
      return { ...a, price: newPrice };
    }));
  };

  const handleSizeChange = (newSize: Size) => {
    setSize(newSize);
    updateAddonPrices(newSize);
  };

  const handleAddToCart = () => {
    addItem({
      id: nanoid(),
      productId: product.id,
      productName: product.name,
      chineseName: product.chineseName || undefined,
      subcategoryId: subcategory.id,
      imageUrl: product.imageUrl || undefined,
      size: subcategory.hasSizeVariants ? size : undefined,
      withBoba: subcategory.hasBobaOption ? withBoba : undefined,
      sugarLevel: subcategory.hasSizeVariants ? sugarLevel : undefined,
      iceLevel: subcategory.hasSizeVariants ? iceLevel : undefined,
      addons: selectedAddons,
      quantity,
      unitPrice,
      addonsTotal,
      lineTotal,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between">
            <div>
              <span className="text-lg">{product.name}</span>
              {product.chineseName && (
                <span className="block text-sm text-muted-foreground">{product.chineseName}</span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Size selection */}
          {subcategory.hasSizeVariants && (
            <div>
              <h4 className="font-medium mb-3">Size</h4>
              <RadioGroup value={size} onValueChange={(v) => handleSizeChange(v as Size)} className="grid grid-cols-3 gap-2">
                {availableSizes.map((s) => (
                  <div key={s.value}>
                    <RadioGroupItem value={s.value} id={`size-${s.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`size-${s.value}`}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.volume}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Boba option */}
          {subcategory.hasBobaOption && (
            <div>
              <h4 className="font-medium mb-3">Boba</h4>
              <RadioGroup value={withBoba ? 'with' : 'without'} onValueChange={(v) => setWithBoba(v === 'with')} className="grid grid-cols-2 gap-2">
                <div>
                  <RadioGroupItem value="with" id="boba-with" className="peer sr-only" />
                  <Label
                    htmlFor="boba-with"
                    className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    With Boba
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="without" id="boba-without" className="peer sr-only" />
                  <Label
                    htmlFor="boba-without"
                    className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    Without Boba
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Sugar level */}
          {subcategory.hasSizeVariants && (
            <div>
              <h4 className="font-medium mb-3">Sugar Level</h4>
              <RadioGroup value={sugarLevel} onValueChange={setSugarLevel} className="grid grid-cols-5 gap-1">
                {SUGAR_LEVELS.map((level) => (
                  <div key={level.value}>
                    <RadioGroupItem value={level.value} id={`sugar-${level.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`sugar-${level.value}`}
                      className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 text-xs hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      {level.value}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Ice level */}
          {subcategory.hasSizeVariants && (
            <div>
              <h4 className="font-medium mb-3">Ice Level</h4>
              <RadioGroup value={iceLevel} onValueChange={setIceLevel} className="grid grid-cols-4 gap-1">
                {ICE_LEVELS.map((level) => (
                  <div key={level.value}>
                    <RadioGroupItem value={level.value} id={`ice-${level.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`ice-${level.value}`}
                      className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 text-xs hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                    >
                      {level.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Popping Boba Add-ons */}
          {withBoba && bobaAddons.length > 0 && subcategory.hasBobaOption && (
            <div>
              <h4 className="font-medium mb-3">Upgrade Boba (Optional)</h4>
              <div className="space-y-2">
                {bobaAddons.filter(a => a.name !== 'Tapioca Pearls').map((addon) => {
                  const price = getAddonPrice(addon);
                  const isSelected = selectedAddons.some(a => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => toggleAddon(addon)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} />
                        <div>
                          <span className="font-medium">{addon.name}</span>
                          {addon.chineseName && (
                            <span className="text-xs text-muted-foreground ml-2">{addon.chineseName}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-primary">+{formatPrice(price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vegan Milk Add-ons */}
          {milkAddons.length > 0 && subcategory.hasSizeVariants && (
            <div>
              <h4 className="font-medium mb-3">Vegan Milk (Optional)</h4>
              <div className="space-y-2">
                {milkAddons.map((addon) => {
                  const price = getAddonPrice(addon);
                  const isSelected = selectedAddons.some(a => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => toggleAddon(addon)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} />
                        <span className="font-medium">{addon.name}</span>
                      </div>
                      <span className="text-sm font-medium text-primary">+{formatPrice(price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <h4 className="font-medium mb-3">Quantity</h4>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Add to cart button */}
        <div className="sticky bottom-0 bg-background pt-4 border-t">
          <Button className="w-full h-12 text-lg" onClick={handleAddToCart}>
            Add to Cart - {formatPrice(displayTotal)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
