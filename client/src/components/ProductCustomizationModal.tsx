import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus } from 'lucide-react';
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
  
  // NEW BOBA FLOW: First choose Tapioca or Popping, then size/flavor
  const [bobaType, setBobaType] = useState<'tapioca' | 'popping'>('tapioca');
  const [bobaSize, setBobaSize] = useState<'small' | 'big'>('small'); // Only for tapioca
  const [poppingBobaFlavor, setPoppingBobaFlavor] = useState<string>('strawberry'); // Only for popping
  
  // Extra boba settings - defaults to same as primary boba
  const [wantExtraBoba, setWantExtraBoba] = useState(false);
  const [extraBobaType, setExtraBobaType] = useState<'tapioca' | 'popping'>('tapioca');
  const [extraBobaSize, setExtraBobaSize] = useState<'small' | 'big'>('small');
  const [extraPoppingFlavor, setExtraPoppingFlavor] = useState<string>('strawberry');
  
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('Regular Ice');
  const [selectedAddons, setSelectedAddons] = useState<{ id: number; name: string; price: number }[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Filter available sizes for delivery (no petite)
  const availableSizes = isDelivery ? SIZES.filter(s => s.value !== 'petite') : SIZES;

  // Get addons by type
  const bobaFlavorAddons = addonsData?.filter(a => a.type === 'boba_flavor') || [];
  const milkAddons = addonsData?.filter(a => a.type === 'vegan_milk') || [];

  // Popping boba flavors
  const poppingBobaFlavors = [
    { value: 'strawberry', label: 'Strawberry', chinese: '草莓' },
    { value: 'blueberry', label: 'Blueberry', chinese: '藍莓' },
    { value: 'mango', label: 'Mango', chinese: '芒果' },
    { value: 'lychee', label: 'Lychee', chinese: '荔枝' },
    { value: 'passionfruit', label: 'Passionfruit', chinese: '百香果' },
  ];

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

  // Calculate popping boba upgrade price (if choosing popping boba instead of tapioca)
  const getPoppingBobaUpgradePrice = () => {
    const poppingAddon = bobaFlavorAddons.find(a => 
      a.name.toLowerCase().includes(poppingBobaFlavor.toLowerCase())
    );
    if (poppingAddon) {
      return getAddonPrice(poppingAddon);
    }
    return 0;
  };

  // Calculate extra boba price based on drink size and extra boba type
  const getExtraBobaPrice = () => {
    if (!wantExtraBoba) return 0;
    
    // Base extra boba price by drink size
    let baseExtraPrice = 0;
    if (size === 'petite') baseExtraPrice = 3000; // ₹30
    else if (size === 'regular') baseExtraPrice = 4000; // ₹40
    else baseExtraPrice = 5000; // ₹50
    
    // If extra boba is popping, add the popping boba upgrade price
    if (extraBobaType === 'popping') {
      const poppingAddon = bobaFlavorAddons.find(a => 
        a.name.toLowerCase().includes(extraPoppingFlavor.toLowerCase())
      );
      if (poppingAddon) {
        baseExtraPrice += getAddonPrice(poppingAddon);
      }
    }
    
    return baseExtraPrice;
  };

  // Calculate totals
  const basePrice = getBasePrice();
  const poppingBobaPrice = (withBoba && bobaType === 'popping') ? getPoppingBobaUpgradePrice() : 0;
  const extraBobaPrice = getExtraBobaPrice();
  const milkAddonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const addonsTotal = poppingBobaPrice + extraBobaPrice + milkAddonsTotal;
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

  // When boba type changes, set defaults for extra boba to match
  const handleBobaTypeChange = (type: 'tapioca' | 'popping') => {
    setBobaType(type);
    // Default extra boba to same type
    setExtraBobaType(type);
    if (type === 'tapioca') {
      setExtraBobaSize(bobaSize);
    } else {
      setExtraPoppingFlavor(poppingBobaFlavor);
    }
  };

  const handleAddToCart = () => {
    // Build boba description
    let bobaDescription = '';
    if (subcategory.hasBobaOption && withBoba) {
      if (bobaType === 'tapioca') {
        bobaDescription = `${bobaSize === 'big' ? 'Big' : 'Small'} Tapioca Pearls`;
      } else {
        const flavorLabel = poppingBobaFlavors.find(f => f.value === poppingBobaFlavor)?.label || poppingBobaFlavor;
        bobaDescription = `${flavorLabel} Popping Boba`;
      }
    }

    // Build extra boba description
    let extraBobaDescription = '';
    if (wantExtraBoba && withBoba) {
      if (extraBobaType === 'tapioca') {
        extraBobaDescription = `Extra ${extraBobaSize === 'big' ? 'Big' : 'Small'} Tapioca`;
      } else {
        const flavorLabel = poppingBobaFlavors.find(f => f.value === extraPoppingFlavor)?.label || extraPoppingFlavor;
        extraBobaDescription = `Extra ${flavorLabel} Popping Boba`;
      }
    }

    addItem({
      id: nanoid(),
      productId: product.id,
      productName: product.name,
      chineseName: product.chineseName || undefined,
      subcategoryId: subcategory.id,
      imageUrl: product.imageUrl || undefined,
      size: subcategory.hasSizeVariants ? size : undefined,
      withBoba: subcategory.hasBobaOption ? withBoba : undefined,
      bobaSize: subcategory.hasBobaOption && withBoba && bobaType === 'tapioca' ? bobaSize : undefined,
      bobaType: subcategory.hasBobaOption && withBoba ? bobaType : undefined,
      poppingBobaFlavor: subcategory.hasBobaOption && withBoba && bobaType === 'popping' ? poppingBobaFlavor : undefined,
      extraBoba: wantExtraBoba ? {
        type: extraBobaType,
        size: extraBobaType === 'tapioca' ? extraBobaSize : undefined,
        flavor: extraBobaType === 'popping' ? extraPoppingFlavor : undefined,
        price: extraBobaPrice,
      } : undefined,
      sugarLevel: subcategory.hasSizeVariants ? sugarLevel : undefined,
      iceLevel: subcategory.hasSizeVariants ? iceLevel : undefined,
      addons: selectedAddons,
      quantity,
      unitPrice,
      addonsTotal,
      lineTotal,
      specialInstructions: specialInstructions.trim() || undefined,
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

          {/* Boba option - With or Without */}
          {subcategory.hasBobaOption && (
            <div>
              <h4 className="font-medium mb-3">Boba</h4>
              <RadioGroup value={withBoba ? 'with' : 'without'} onValueChange={(v) => {
                setWithBoba(v === 'with');
                if (v === 'without') {
                  setWantExtraBoba(false);
                }
              }} className="grid grid-cols-2 gap-2">
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

          {/* STEP 1: Boba Type Selection (Tapioca or Popping) - Only if with boba */}
          {subcategory.hasBobaOption && withBoba && (
            <div>
              <h4 className="font-medium mb-3">Boba Type</h4>
              <RadioGroup value={bobaType} onValueChange={(v) => handleBobaTypeChange(v as 'tapioca' | 'popping')} className="grid grid-cols-2 gap-2">
                <div>
                  <RadioGroupItem value="tapioca" id="boba-tapioca" className="peer sr-only" />
                  <Label
                    htmlFor="boba-tapioca"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <span className="font-medium">Tapioca Pearls</span>
                    <span className="text-xs text-muted-foreground">珍珠</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="popping" id="boba-popping" className="peer sr-only" />
                  <Label
                    htmlFor="boba-popping"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <span className="font-medium">Popping Boba</span>
                    <span className="text-xs text-muted-foreground">爆爆珠</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* STEP 2A: If Tapioca - Show Size Selection (Small/Big) */}
          {subcategory.hasBobaOption && withBoba && bobaType === 'tapioca' && (
            <div>
              <h4 className="font-medium mb-3">Tapioca Size</h4>
              <RadioGroup value={bobaSize} onValueChange={(v) => {
                setBobaSize(v as 'small' | 'big');
                // Default extra boba size to match
                setExtraBobaSize(v as 'small' | 'big');
              }} className="grid grid-cols-2 gap-2">
                <div>
                  <RadioGroupItem value="small" id="boba-small" className="peer sr-only" />
                  <Label
                    htmlFor="boba-small"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <span className="font-medium">Small Boba</span>
                    <span className="text-xs text-muted-foreground">小珍珠</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="big" id="boba-big" className="peer sr-only" />
                  <Label
                    htmlFor="boba-big"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <span className="font-medium">Big Boba</span>
                    <span className="text-xs text-muted-foreground">大珍珠</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* STEP 2B: If Popping - Show Flavor Selection */}
          {subcategory.hasBobaOption && withBoba && bobaType === 'popping' && (
            <div>
              <h4 className="font-medium mb-3">Popping Boba Flavor</h4>
              <RadioGroup value={poppingBobaFlavor} onValueChange={(v) => {
                setPoppingBobaFlavor(v);
                // Default extra popping flavor to match
                setExtraPoppingFlavor(v);
              }} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {poppingBobaFlavors.map((flavor) => (
                  <div key={flavor.value}>
                    <RadioGroupItem value={flavor.value} id={`popping-${flavor.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`popping-${flavor.value}`}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span className="font-medium text-sm">{flavor.label}</span>
                      <span className="text-xs text-muted-foreground">{flavor.chinese}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* EXTRA BOBA SECTION */}
          {subcategory.hasBobaOption && withBoba && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Extra Boba</h4>
                  <p className="text-xs text-muted-foreground">Add an extra serving of boba</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary font-medium">
                    +{formatPrice(size === 'petite' ? 3000 : size === 'regular' ? 4000 : 5000)}
                  </span>
                  <Checkbox 
                    checked={wantExtraBoba} 
                    onCheckedChange={(checked) => setWantExtraBoba(!!checked)}
                  />
                </div>
              </div>

              {wantExtraBoba && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  {/* Extra Boba Type */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Extra Boba Type</h5>
                    <RadioGroup value={extraBobaType} onValueChange={(v) => setExtraBobaType(v as 'tapioca' | 'popping')} className="grid grid-cols-2 gap-2">
                      <div>
                        <RadioGroupItem value="tapioca" id="extra-tapioca" className="peer sr-only" />
                        <Label
                          htmlFor="extra-tapioca"
                          className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                        >
                          Tapioca
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="popping" id="extra-popping" className="peer sr-only" />
                        <Label
                          htmlFor="extra-popping"
                          className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                        >
                          Popping Boba
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Extra Tapioca Size */}
                  {extraBobaType === 'tapioca' && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Extra Tapioca Size</h5>
                      <RadioGroup value={extraBobaSize} onValueChange={(v) => setExtraBobaSize(v as 'small' | 'big')} className="grid grid-cols-2 gap-2">
                        <div>
                          <RadioGroupItem value="small" id="extra-small" className="peer sr-only" />
                          <Label
                            htmlFor="extra-small"
                            className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                          >
                            Small
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="big" id="extra-big" className="peer sr-only" />
                          <Label
                            htmlFor="extra-big"
                            className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                          >
                            Big
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Extra Popping Flavor */}
                  {extraBobaType === 'popping' && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Extra Popping Flavor</h5>
                      <RadioGroup value={extraPoppingFlavor} onValueChange={setExtraPoppingFlavor} className="grid grid-cols-3 gap-1">
                        {poppingBobaFlavors.map((flavor) => (
                          <div key={flavor.value}>
                            <RadioGroupItem value={flavor.value} id={`extra-pop-${flavor.value}`} className="peer sr-only" />
                            <Label
                              htmlFor={`extra-pop-${flavor.value}`}
                              className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 text-xs hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                            >
                              {flavor.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              )}
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

          {/* Special Instructions */}
          <div>
            <h4 className="font-medium mb-3">Special Instructions (Optional)</h4>
            <Textarea
              placeholder="Any special requests? E.g., less sweet, extra ice, allergies..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

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
