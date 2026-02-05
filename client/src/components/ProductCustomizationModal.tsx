import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trackViewItem, toGA4Item } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { trpc } from '@/lib/trpc';
import { formatPrice, SIZES, SUGAR_LEVELS, ICE_LEVELS, Size } from '@shared/types';
import { nanoid } from 'nanoid';
import { getImageForContext, isCloudinaryUrl, getResponsiveSrcSet } from '@/lib/imageOptimizer';

interface ProductCustomizationModalProps {
  product: {
    id: number;
    name: string;
    chineseName?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    imageUrl2?: string | null;
    imageUrl3?: string | null;
    instorePrice?: number | null;
    deliveryPrice?: number | null;
    availableSizes?: string[] | null; // Product-specific size restrictions
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
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  isDelivery?: boolean;
  open: boolean;
  onClose: () => void;
}

export function ProductCustomizationModal({
  product,
  subcategory,
  category,
  isDelivery = false,
  open,
  onClose,
}: ProductCustomizationModalProps) {
  const { addItem } = useCart();
  const { data: addonsData } = trpc.menu.getAddons.useQuery();
  // Fetch product-specific addons (e.g., Egg for Katsu Curry)
  const { data: productSpecificAddons } = trpc.menu.getProductAddons.useQuery({ productId: product.id });
  // State for product-specific addon quantities (e.g., { addonId: quantity })
  const [productAddonQuantities, setProductAddonQuantities] = useState<Record<number, number>>({});

  // State for customization (Petite size removed)
  const [size, setSize] = useState<Size>('regular');
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
  // Check if this is a mochi product
  const isMochiProduct = subcategory.name.toLowerCase().includes('mochi');
  // For delivery/pickup, mochis must be ordered in pairs (minimum 2)
  const minQuantity = (isDelivery && isMochiProduct) ? 2 : 1;
  const [quantity, setQuantity] = useState(minQuantity);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Update quantity when switching to delivery mode for mochi products
  useEffect(() => {
    if (isDelivery && isMochiProduct && quantity < 2) {
      setQuantity(2);
    }
  }, [isDelivery, isMochiProduct]);

  // Initialize size to first available size when product has size restrictions
  useEffect(() => {
    if (product.availableSizes && product.availableSizes.length > 0) {
      // If current size is not in available sizes, switch to first available
      if (!product.availableSizes.includes(size)) {
        setSize(product.availableSizes[0] as Size);
      }
    }
  }, [product.id, product.availableSizes]);

  // Track view_item event when modal opens
  const hasTrackedViewItem = useRef(false);
  useEffect(() => {
    if (open && !hasTrackedViewItem.current) {
      const price = isDelivery 
        ? (product.deliveryPrice || product.instorePrice || 0) 
        : (product.instorePrice || product.deliveryPrice || 0);
      trackViewItem(toGA4Item({
        id: product.id,
        name: product.name,
        category: category?.name || 'Bubble Tea',
        price: price / 100, // Convert paise to rupees
        quantity: 1,
      }));
      hasTrackedViewItem.current = true;
    }
    // Reset when modal closes
    if (!open) {
      hasTrackedViewItem.current = false;
    }
  }, [open, product, category, isDelivery]);
  
  // Coconut Cream Cap option for all Iced Beverages (not just lattes)
  const [wantCoconutCreamCap, setWantCoconutCreamCap] = useState(false);
  const isIcedBeverage = category?.slug === 'bubble-tea' || category?.name?.toLowerCase().includes('iced');
  // Check if Coconut Cream Cap addon is active in database
  const coconutCreamCapAddon = addonsData?.find(a => a.name.toLowerCase().includes('coconut'));
  const isCoconutCreamCapAvailable = coconutCreamCapAddon?.isActive !== false;
  // Exclude green tea products from coconut cream cap (doesn't pair well)
  const isGreenTea = subcategory.name.toLowerCase().includes('green tea') || 
                     product.name.toLowerCase().includes('green tea') ||
                     product.name.toLowerCase().includes('matcha');
  
  // Food add-ons (Extra Egg, Extra Cheese)
  const [extraEggCount, setExtraEggCount] = useState(0); // 0, 1, 2, or 3 eggs
  const [wantExtraCheese, setWantExtraCheese] = useState(false);
  const isFoodCategory = category?.slug === 'asian-rice-noodle-bread' || category?.name?.toLowerCase().includes('rice') || category?.name?.toLowerCase().includes('noodle') || category?.name?.toLowerCase().includes('bread');
  
  // Hot beverages detection
  const isHotBeverage = category?.name?.toLowerCase().includes('hot') || category?.slug === 'coffee';
  // Extra espresso shot for Latte and Cappuccino
  const [wantExtraEspresso, setWantExtraEspresso] = useState(false);
  const isLatteOrCappuccino = product.name.toLowerCase().includes('latte') || product.name.toLowerCase().includes('cappuccino');
  const extraEspressoPrice = 4000; // ₹40 per extra shot
  
  // Check if product contains egg or cheese (for relevant add-ons)
  // Look for 'egg' in product name/description - but exclude 'cheesy' false positives
  const productNameLower = product.name.toLowerCase();
  const productDescLower = product.description?.toLowerCase() || '';
  const productHasEgg = productNameLower.includes('egg') || productDescLower.includes('egg');
  // Check for cheese/cheesy in product name
  const productHasCheese = productNameLower.includes('cheese') || productNameLower.includes('cheesy') || 
                           productDescLower.includes('cheese') || productDescLower.includes('cheesy');
  
  // Show Extra Egg option for food items that don't already have egg, OR always show for Cong You Bing
  const isCongYouBing = subcategory.name.toLowerCase().includes('cong you bing') || subcategory.name.toLowerCase().includes('flatbread');
  const showExtraEgg = isFoodCategory && (isCongYouBing || !productHasCheese || productHasEgg);
  // Show Extra Cheese for items with cheese in name OR Cong You Bing subcategory
  const showExtraCheese = isFoodCategory && (productHasCheese || isCongYouBing);
  
  // Extra Egg price: ₹25 per egg (2500 paise)
  const extraEggPricePerUnit = 2500;
  const extraEggPrice = extraEggCount * extraEggPricePerUnit;
  // Extra Cheese price: ₹30 (3000 paise)
  const extraCheesePrice = 3000;
  // Coconut Cream Cap price: ₹40-45 based on size
  const getCoconutCreamCapPrice = () => {
    if (size === 'regular') return 4000;
    return 4500; // large
  };

  // Available sizes - filter by product-specific restrictions if set
  const availableSizes = product.availableSizes && product.availableSizes.length > 0
    ? SIZES.filter(s => product.availableSizes!.includes(s.value))
    : SIZES;

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
      // In-store pricing (Regular and Large only)
      if (size === 'regular') {
        return withBoba ? (subcategory.basePriceRegularWithBoba || 0) : (subcategory.basePriceRegularNoBoba || 0);
      } else {
        return withBoba ? (subcategory.basePriceLargeWithBoba || 0) : (subcategory.basePriceLargeNoBoba || 0);
      }
    }
  };

  // Calculate addon price based on size
  const getAddonPrice = (addon: NonNullable<typeof addonsData>[0]) => {
    if (addon.fixedPrice) return addon.fixedPrice;
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
    if (size === 'regular') baseExtraPrice = 4000; // ₹40
    else baseExtraPrice = 5000; // ₹50 (large)
    
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

  // Calculate product-specific addon total (e.g., 2 eggs = 2 × egg price)
  const productAddonsTotal = Object.entries(productAddonQuantities).reduce((sum, [addonId, qty]) => {
    if (qty <= 0) return sum;
    const addon = productSpecificAddons?.find(a => a.id === Number(addonId));
    return sum + (addon?.fixedPrice || 0) * qty;
  }, 0);

  // Calculate totals
  const basePrice = getBasePrice();
  const poppingBobaPrice = (withBoba && bobaType === 'popping') ? getPoppingBobaUpgradePrice() : 0;
  const extraBobaPrice = getExtraBobaPrice();
  const milkAddonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const foodAddonsTotal = extraEggPrice + (wantExtraCheese ? extraCheesePrice : 0);
  const coconutCreamCapTotal = (wantCoconutCreamCap && isIcedBeverage) ? getCoconutCreamCapPrice() : 0;
  const extraEspressoTotal = (wantExtraEspresso && isLatteOrCappuccino) ? extraEspressoPrice : 0;
  const addonsTotal = poppingBobaPrice + extraBobaPrice + milkAddonsTotal + foodAddonsTotal + coconutCreamCapTotal + extraEspressoTotal + productAddonsTotal;
  const unitPrice = basePrice;
  
  // For mochis in delivery/pickup mode:
  // - deliveryPrice is the price for a SET OF 2 pieces
  // - quantity represents individual pieces (must be even: 2, 4, 6...)
  // - So we calculate: (price per set) × (quantity / 2) = total for all sets
  const effectiveQuantity = (isDelivery && isMochiProduct) ? (quantity / 2) : quantity;
  const lineTotal = (unitPrice + addonsTotal) * effectiveQuantity;
  // Display base price without GST - GST added at checkout
  const displayTotal = Math.round(lineTotal);

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
        if (newSize === 'regular') newPrice = addon.priceRegular || 0;
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
      // Food add-ons
      extraEggCount: extraEggCount > 0 ? extraEggCount : undefined,
      extraCheese: wantExtraCheese || undefined,
      coconutCreamCap: wantCoconutCreamCap || undefined,
      // Hot beverage add-ons
      extraEspresso: wantExtraEspresso || undefined,
      // Product-specific addons (e.g., eggs for Katsu Curry)
      productAddons: Object.entries(productAddonQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([addonId, qty]) => {
          const addon = productSpecificAddons?.find(a => a.id === Number(addonId));
          return {
            id: Number(addonId),
            name: addon?.name || '',
            quantity: qty,
            pricePerUnit: addon?.fixedPrice || 0,
            totalPrice: (addon?.fixedPrice || 0) * qty,
          };
        }),
      quantity,
      unitPrice,
      addonsTotal,
      lineTotal,
      specialInstructions: specialInstructions.trim() || undefined,
    });
    onClose();
  };

  // Build array of available images for gallery
  const productImages = [product.imageUrl, product.imageUrl2, product.imageUrl3].filter(Boolean) as string[];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = productImages.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" showCloseButton={false}>
        {/* Custom Close Button - Always visible over image */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors shadow-lg"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {/* Product Image Gallery - Full width at top */}
        {productImages.length > 0 && (
          <div className="relative w-full bg-secondary">
            <img
              src={getImageForContext(productImages[currentImageIndex], 'detail')}
              srcSet={isCloudinaryUrl(productImages[currentImageIndex]) ? getResponsiveSrcSet(productImages[currentImageIndex]) : undefined}
              sizes="(max-width: 768px) 100vw, 672px"
              alt={product.name}
              className="w-full h-auto max-h-[50vh] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-drink.jpg';
              }}
            />
            {/* Navigation arrows for multiple images */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Image dots indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {productImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/75'}`}
                      aria-label={`View image ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-start justify-between">
              <div>
                <span className="text-xl font-semibold">{product.name}</span>
                {product.chineseName && (
                  <span className="block text-sm text-muted-foreground mt-1">{product.chineseName}</span>
                )}
                {product.description && (
                  <p className="block text-sm text-muted-foreground mt-2 font-normal">{product.description}</p>
                )}
                {/* Mochi set indicator for delivery/pickup */}
                {isDelivery && isMochiProduct && (
                  <span className="inline-block mt-2 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                    Minimum 2 pieces for delivery/pickup
                  </span>
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
              <div 
                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors mb-3 ${wantExtraBoba ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}
                onClick={() => setWantExtraBoba(!wantExtraBoba)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={wantExtraBoba} />
                  <div>
                    <h4 className="font-medium">Extra Boba</h4>
                    <p className="text-xs text-muted-foreground">Add an extra serving of boba</p>
                  </div>
                </div>
                <span className="text-sm text-primary font-medium">
                  +{formatPrice(size === 'regular' ? 4000 : 5000)}
                </span>
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

          {/* Coconut Cream Cap - For all Iced Beverages (if addon is active, excluding green tea) */}
          {isIcedBeverage && isCoconutCreamCapAvailable && !isGreenTea && (
            <div 
              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${wantCoconutCreamCap ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}
              onClick={() => setWantCoconutCreamCap(!wantCoconutCreamCap)}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={wantCoconutCreamCap} />
                <div>
                  <span className="font-medium">Coconut Cream Cap</span>
                  <p className="text-xs text-muted-foreground">Replace regular milk cream cap with coconut cream (dairy-free)</p>
                </div>
              </div>
              <span className="text-sm font-medium text-primary">+{formatPrice(getCoconutCreamCapPrice())}</span>
            </div>
          )}

          {/* Product-Specific Add-ons (e.g., Extra Egg for Katsu Curry) */}
          {productSpecificAddons && productSpecificAddons.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Add-ons (Optional)</h4>
              <div className="space-y-3">
                {productSpecificAddons.map((addon) => {
                  const currentQty = productAddonQuantities[addon.id] || 0;
                  const maxQty = addon.maxQuantity || 3;
                  return (
                    <div key={addon.id} className="p-3 rounded-lg border-2 border-muted">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{addon.name}</span>
                          <p className="text-xs text-muted-foreground">{formatPrice(addon.fixedPrice || 0)} each (max {maxQty})</p>
                        </div>
                        {currentQty > 0 && (
                          <span className="text-sm font-medium text-primary">+{formatPrice((addon.fixedPrice || 0) * currentQty)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: maxQty + 1 }, (_, i) => i).map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setProductAddonQuantities(prev => ({ ...prev, [addon.id]: count }))}
                            className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                              currentQty === count
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-muted hover:border-muted-foreground/50'
                            }`}
                          >
                            {count === 0 ? 'None' : count}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra Espresso Shot - For Latte and Cappuccino */}
          {isHotBeverage && isLatteOrCappuccino && (
            <div 
              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${wantExtraEspresso ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}
              onClick={() => setWantExtraEspresso(!wantExtraEspresso)}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={wantExtraEspresso} />
                <div>
                  <span className="font-medium">Extra Shot of Espresso</span>
                  <p className="text-xs text-muted-foreground">Add an extra shot for a stronger coffee</p>
                </div>
              </div>
              <span className="text-sm font-medium text-primary">+{formatPrice(extraEspressoPrice)}</span>
            </div>
          )}

          {/* Vegan Milk Add-ons - Only for Hot Coffee */}
          {milkAddons.length > 0 && category?.slug === 'hot-beverages' && subcategory.name.toLowerCase().includes('coffee') && (
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
            {isDelivery && isMochiProduct && (
              <p className="text-sm text-muted-foreground mb-2">
                Mochis are sold in sets of 2 for delivery (2, 4, 6...)
              </p>
            )}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  // For mochi delivery, decrement by 2 (sets of 2)
                  const step = (isDelivery && isMochiProduct) ? 2 : 1;
                  setQuantity(Math.max(minQuantity, quantity - step));
                }}
                disabled={quantity <= minQuantity}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  // For mochi delivery, increment by 2 (sets of 2)
                  const step = (isDelivery && isMochiProduct) ? 2 : 1;
                  setQuantity(quantity + step);
                }}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
