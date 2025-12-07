import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, GST_RATE, SIZES, SUGAR_LEVELS, ICE_LEVELS, Size, calculateGst, BobaSize, BobaType, ExtraBoba } from '@shared/types';
import { 
  Minus, Plus, Trash2, Search, ShoppingCart, CreditCard, Banknote, 
  Percent, X, Check, RefreshCw, LogOut, Home, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { nanoid } from 'nanoid';
import { getPOSSession, clearPOSSession, POSSessionData } from './POSLogin';

interface POSCartItem {
  id: string;
  productId: number;
  productName: string;
  chineseName?: string;
  imageUrl?: string;
  size?: Size;
  withBoba?: boolean;
  bobaSize?: BobaSize;
  bobaType?: BobaType;
  poppingBobaFlavor?: string;
  extraBoba?: ExtraBoba;
  sugarLevel?: string;
  iceLevel?: string;
  addons: { id: number; name: string; price: number }[];
  quantity: number;
  unitPrice: number;
  addonsTotal: number;
  lineTotal: number;
  specialInstructions?: string;
  mochiQuantity?: 1 | 2 | 3; // For mochi products: 1pc, 2pc, or 3pc
  mochiSelections?: { productId: number; name: string }[]; // Selected mochi flavors for mix-and-match
}

// Popping boba flavors
const POPPING_BOBA_FLAVORS = [
  { value: 'strawberry', label: 'Strawberry', chinese: '草莓' },
  { value: 'blueberry', label: 'Blueberry', chinese: '藍莓' },
  { value: 'mango', label: 'Mango', chinese: '芒果' },
  { value: 'lychee', label: 'Lychee', chinese: '荔枝' },
  { value: 'passionfruit', label: 'Passionfruit', chinese: '百香果' },
];

// Extra boba pricing based on size
const EXTRA_BOBA_PRICES = {
  petite: 30,
  regular: 40,
  large: 50,
};

// Product image mapping
const PRODUCT_IMAGES: Record<string, string> = {
  'rose-milk-tea': '/images/products/rose-milk-tea.jpg',
  'caramel-milk-tea': '/images/products/caramel-milk-tea.jpg',
  'butterscotch-milk-oolong': '/images/products/butterscotch-milk-oolong.jpg',
  'creme-caramel-oolong': '/images/products/creme-caramel-oolong.jpg',
  'hazelnut-milk-tea': '/images/products/hazelnut-milk-tea.jpg',
  'creme-caramel-taro-latte': '/images/products/creme-caramel-taro-latte.jpg',
  'banoffee-matcha': '/images/products/banoffee-matcha.jpg',
  'yaki-onigiri': '/images/products/yaki-onigiri.jpg',
  'cong-you-bing': '/images/products/cong-you-bing.jpg',
  'stir-fried-cong-you-bing': '/images/products/stir-fried-cong-you-bing.jpg',
  'egg-cong-you-bing': '/images/products/egg-cong-you-bing.jpg',
  'biang-biang-noodles': '/images/products/biang-biang-noodles.jpg',
  'velvety-aubergine-stew-noodle': '/images/products/velvety-aubergine-stew-noodle.jpg',
  'cheesy-corn': '/images/products/cheesy-corn.jpg',
  'egg-mayo': '/images/products/egg-mayo.jpg',
  'cucumber': '/images/products/cucumber.jpg',
  'mango-mochi': '/images/products/mango-mochi.jpg',
  'dragon-fruit-mochi': '/images/products/dragon-fruit-mochi.jpg',
  'banoffee-mochi': '/images/products/banoffee-mochi.jpg',
  'boba-creme-caramel': '/images/products/boba-creme-caramel.jpg',
  'popping-boba': '/images/products/popping-boba.jpg',
  'slush': '/images/products/slush.jpg',
};

export default function POS() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  
  // POS Session state
  const [posSession, setPosSession] = useState<POSSessionData | null>(null);
  
  // Check for POS session on mount
  useEffect(() => {
    const session = getPOSSession();
    if (!session) {
      // No session, redirect to login
      navigate('/pos/login');
    } else {
      setPosSession(session);
    }
  }, [navigate]);

  // End session mutation
  const endSessionMutation = trpc.posAuth.endSession.useMutation({
    onSuccess: () => {
      clearPOSSession();
      toast.success('Session ended');
      navigate('/pos/login');
    },
  });

  const handleEndSession = () => {
    if (posSession) {
      endSessionMutation.mutate({ sessionId: posSession.sessionId });
    }
  };

  const { data: menuData, isLoading } = trpc.menu.getFullMenu.useQuery({ isDelivery: false });
  const { data: addonsData } = trpc.menu.getAddons.useQuery();

  // Navigation state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state
  const [cart, setCart] = useState<POSCartItem[]>([]);
  
  // Customization modal state
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSubcategoryData, setSelectedSubcategoryData] = useState<any>(null);
  const [customSize, setCustomSize] = useState<Size>('regular');
  const [customBoba, setCustomBoba] = useState(true);
  const [customBobaType, setCustomBobaType] = useState<BobaType | null>(null);
  const [customBobaSize, setCustomBobaSize] = useState<BobaSize>('small');
  const [customPoppingFlavor, setCustomPoppingFlavor] = useState('');
  const [customSugar, setCustomSugar] = useState('100%');
  const [customIce, setCustomIce] = useState('regular_ice');
  const [customAddons, setCustomAddons] = useState<{ id: number; name: string; price: number }[]>([]);
  const [customQty, setCustomQty] = useState(1);
  const [customInstructions, setCustomInstructions] = useState('');
  
  // Extra boba state
  const [wantExtraBoba, setWantExtraBoba] = useState(false);
  const [extraBobaType, setExtraBobaType] = useState<BobaType | null>(null);
  const [extraBobaSize, setExtraBobaSize] = useState<BobaSize>('small');
  const [extraPoppingFlavor, setExtraPoppingFlavor] = useState('');
  // Mochi quantity state (for mochi products only)
  const [mochiQuantity, setMochiQuantity] = useState<1 | 2 | 3>(1);
  const [mochiSelections, setMochiSelections] = useState<{ productId: number; name: string }[]>([]);
  const [showMochiBoxModal, setShowMochiBoxModal] = useState(false);
  const [selectedMochiSubcategory, setSelectedMochiSubcategory] = useState<any>(null);

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Create order mutation - using POS endpoint with session tracking
  const createOrder = trpc.pos.createOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`Order #${data.orderNumber} created!`);
      setCart([]);
      setShowPayment(false);
      setDiscountPercent(0);
      setCustomerName('');
      setCustomerPhone('');
    },
    onError: (error) => {
      toast.error('Failed to create order');
    },
  });

  // Get product image
  const getProductImage = (product: any): string | undefined => {
    if (product.imageUrl) return product.imageUrl;
    const slug = product.slug || product.name.toLowerCase().replace(/\s+/g, '-');
    return PRODUCT_IMAGES[slug];
  };

  // Get subcategory image (use first product's image or category default)
  const getSubcategoryImage = (subcategory: any): string | undefined => {
    const products = menuData?.products.filter(p => p.subcategoryId === subcategory.id) || [];
    if (products.length > 0) {
      return getProductImage(products[0]);
    }
    return undefined;
  };

  // Categories with counts
  const categoriesWithCounts = useMemo(() => {
    if (!menuData) return [];
    return menuData.categories.map(cat => ({
      ...cat,
      productCount: menuData.products.filter(p => {
        const sub = menuData.subcategories.find(s => s.id === p.subcategoryId);
        return sub?.categoryId === cat.id;
      }).length,
    }));
  }, [menuData]);

  // Current subcategories
  const currentSubcategories = useMemo(() => {
    if (!menuData || !selectedCategory) return [];
    const category = menuData.categories.find(c => c.slug === selectedCategory);
    if (!category) return [];
    return menuData.subcategories
      .filter(s => s.categoryId === category.id)
      .map(sub => ({
        ...sub,
        productCount: menuData.products.filter(p => p.subcategoryId === sub.id).length,
      }));
  }, [menuData, selectedCategory]);

  // Current products
  const currentProducts = useMemo(() => {
    if (!menuData || !selectedSubcategory) return [];
    return menuData.products.filter(p => p.subcategoryId === selectedSubcategory);
  }, [menuData, selectedSubcategory]);

  // Search results
  const searchResults = useMemo(() => {
    if (!menuData || !searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return menuData.products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.chineseName?.toLowerCase().includes(query)
    );
  }, [menuData, searchQuery]);

  // Get subcategory by ID
  const getSubcategoryById = (id: number) => {
    return menuData?.subcategories.find(s => s.id === id);
  };

  // Handle product click
  const handleProductClick = (product: any) => {
    const subcategory = getSubcategoryById(product.subcategoryId);
    
    // Check if this is a mochi product - open mochi box modal instead
    const isMochiProduct = product.mochiPrice1pc && product.mochiPrice2pc && product.mochiPrice3pc;
    if (isMochiProduct) {
      setSelectedMochiSubcategory(subcategory);
      setMochiQuantity(1);
      setMochiSelections([{ productId: product.id, name: product.name }]); // Start with clicked product
      setShowMochiBoxModal(true);
      return;
    }
    
    setSelectedProduct(product);
    setSelectedSubcategoryData(subcategory);
    setCustomSize('regular');
    setCustomBoba(true);
    setCustomBobaType('tapioca');
    setCustomBobaSize('small');
    setCustomPoppingFlavor('strawberry');
    setCustomSugar('100%');
    setCustomIce('regular_ice');
    setCustomAddons([]);
    setCustomQty(1);
    setCustomInstructions('');
    setWantExtraBoba(false);
    setExtraBobaType('tapioca');
    setExtraBobaSize('small');
    setExtraPoppingFlavor('strawberry');
    setMochiQuantity(1); // Reset mochi quantity
    setShowCustomization(true);
  };

  // Add to cart
  const addToCart = (item: POSCartItem) => {
    const existingIndex = cart.findIndex(c =>
      c.productId === item.productId &&
      c.size === item.size &&
      c.withBoba === item.withBoba &&
      c.bobaSize === item.bobaSize &&
      c.bobaType === item.bobaType &&
      c.poppingBobaFlavor === item.poppingBobaFlavor &&
      c.sugarLevel === item.sugarLevel &&
      c.iceLevel === item.iceLevel &&
      c.mochiQuantity === item.mochiQuantity &&
      JSON.stringify(c.addons) === JSON.stringify(item.addons) &&
      JSON.stringify(c.extraBoba) === JSON.stringify(item.extraBoba) &&
      c.specialInstructions === item.specialInstructions
    );

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += item.quantity;
      newCart[existingIndex].lineTotal = newCart[existingIndex].quantity * 
        (newCart[existingIndex].unitPrice + newCart[existingIndex].addonsTotal);
      setCart(newCart);
    } else {
      setCart([...cart, item]);
    }
  };

  // Get extra boba price based on drink size
  const getExtraBobaPrice = (drinkSize: Size): number => {
    return EXTRA_BOBA_PRICES[drinkSize] || 40;
  };

  // Handle customization confirm
  const handleAddCustomized = () => {
    if (!selectedProduct || !selectedSubcategoryData) return;

    // Validate boba selection
    if (selectedSubcategoryData.hasBobaOption && customBoba && !customBobaType) {
      toast.error('Please select Tapioca or Popping Boba');
      return;
    }

    if (customBobaType === 'popping' && !customPoppingFlavor) {
      toast.error('Please select a popping boba flavor');
      return;
    }

    // Validate extra boba
    if (wantExtraBoba && !extraBobaType) {
      toast.error('Please select extra boba type');
      return;
    }

    if (wantExtraBoba && extraBobaType === 'popping' && !extraPoppingFlavor) {
      toast.error('Please select extra popping boba flavor');
      return;
    }

    let unitPrice = 0;
    // Check if this is a mochi product with quantity pricing
    const isMochiProduct = selectedProduct.mochiPrice1pc && selectedProduct.mochiPrice2pc && selectedProduct.mochiPrice3pc;
    
    if (isMochiProduct) {
      // Use mochi quantity pricing
      if (mochiQuantity === 1) {
        unitPrice = selectedProduct.mochiPrice1pc;
      } else if (mochiQuantity === 2) {
        unitPrice = selectedProduct.mochiPrice2pc;
      } else {
        unitPrice = selectedProduct.mochiPrice3pc;
      }
    } else if (selectedSubcategoryData.hasSizeVariants) {
      if (customSize === 'petite') {
        unitPrice = customBoba ? selectedSubcategoryData.basePricePetiteWithBoba : selectedSubcategoryData.basePricePetiteNoBoba;
      } else if (customSize === 'regular') {
        unitPrice = customBoba ? selectedSubcategoryData.basePriceRegularWithBoba : selectedSubcategoryData.basePriceRegularNoBoba;
      } else {
        unitPrice = customBoba ? selectedSubcategoryData.basePriceLargeWithBoba : selectedSubcategoryData.basePriceLargeNoBoba;
      }
    } else {
      unitPrice = selectedProduct.instorePrice || 0;
    }

    // Calculate addons total including extra boba
    let addonsTotal = customAddons.reduce((sum, a) => sum + a.price, 0);
    
    // Build extra boba object
    let extraBobaObj: ExtraBoba | undefined;
    if (wantExtraBoba && extraBobaType) {
      const extraPrice = getExtraBobaPrice(customSize);
      addonsTotal += extraPrice;
      extraBobaObj = {
        type: extraBobaType,
        size: extraBobaType === 'tapioca' ? (customBobaSize || 'small') : undefined,
        flavor: extraBobaType === 'popping' ? extraPoppingFlavor : undefined,
        price: extraPrice,
      };
    }

    // Check if mochi product
    const isMochiProductForCart = selectedProduct.mochiPrice1pc && selectedProduct.mochiPrice2pc && selectedProduct.mochiPrice3pc;
    
    addToCart({
      id: nanoid(),
      productId: selectedProduct.id,
      productName: isMochiProductForCart ? `${selectedProduct.name} (${mochiQuantity}pc)` : selectedProduct.name,
      chineseName: selectedProduct.chineseName,
      imageUrl: getProductImage(selectedProduct),
      size: selectedSubcategoryData.hasSizeVariants ? customSize : undefined,
      withBoba: selectedSubcategoryData.hasBobaOption ? customBoba : undefined,
      bobaSize: selectedSubcategoryData.hasBobaOption && customBoba && customBobaType === 'tapioca' ? customBobaSize : undefined,
      bobaType: selectedSubcategoryData.hasBobaOption && customBoba ? customBobaType || undefined : undefined,
      poppingBobaFlavor: selectedSubcategoryData.hasBobaOption && customBoba && customBobaType === 'popping' ? customPoppingFlavor : undefined,
      extraBoba: extraBobaObj,
      sugarLevel: selectedSubcategoryData.hasSizeVariants ? customSugar : undefined,
      iceLevel: selectedSubcategoryData.hasSizeVariants ? customIce : undefined,
      addons: customAddons,
      quantity: customQty,
      unitPrice,
      addonsTotal,
      lineTotal: (unitPrice + addonsTotal) * customQty,
      specialInstructions: customInstructions.trim() || undefined,
      mochiQuantity: isMochiProductForCart ? mochiQuantity : undefined,
    });

    setShowCustomization(false);
    toast.success(`Added ${selectedProduct.name}`);
  };

  // Update cart item quantity
  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        if (newQty === 0) return null as any;
        return { ...item, quantity: newQty, lineTotal: newQty * (item.unitPrice + item.addonsTotal) };
      }
      return item;
    }).filter(Boolean));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = Math.round(subtotal * discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const gst = calculateGst(afterDiscount);
  const total = afterDiscount + gst.total;

  // Handle payment
  const handlePayment = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'split') {
      const cashNum = parseFloat(cashAmount) || 0;
      const cardNum = parseFloat(cardAmount) || 0;
      if (Math.abs(cashNum + cardNum - total / 100) > 1) {
        toast.error('Split amounts must equal total');
        return;
      }
    }

    if (!posSession) {
      toast.error('No active session');
      return;
    }

    const paymentsList: { method: 'cash' | 'card' | 'upi'; amount: number }[] = [];
    if (paymentMethod === 'cash') {
      paymentsList.push({ method: 'cash', amount: total });
    } else if (paymentMethod === 'card') {
      paymentsList.push({ method: 'card', amount: total });
    } else {
      // Split payment
      const cashNum = Math.round((parseFloat(cashAmount) || 0) * 100);
      const cardNum = Math.round((parseFloat(cardAmount) || 0) * 100);
      if (cashNum > 0) paymentsList.push({ method: 'cash', amount: cashNum });
      if (cardNum > 0) paymentsList.push({ method: 'card', amount: cardNum });
    }

    createOrder.mutate({
      items: cart.map(item => ({
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
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      discountAmount,
      payments: paymentsList,
      // Session info for audit
      sessionId: posSession.sessionId,
      outletId: posSession.outletId,
      employeeCode: posSession.employeeCode,
    });
  };

  // Addon price helper
  const getAddonPrice = (addon: any) => {
    if (addon.fixedPrice) return addon.fixedPrice;
    if (customSize === 'petite') return addon.pricePetite || 0;
    if (customSize === 'regular') return addon.priceRegular || 0;
    return addon.priceLarge || 0;
  };

  const milkAddons = addonsData?.filter(a => a.type === 'vegan_milk') || [];

  // Check access - must be after all hooks
  if (!isAuthenticated || (user?.role !== 'staff' && user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need staff or admin access to use POS mode.</p>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Render category grid
  const renderCategoryGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {categoriesWithCounts.map((category) => (
        <button
          key={category.id}
          onClick={() => {
            setSelectedCategory(category.slug);
            setSelectedSubcategory(null);
          }}
          className="aspect-square rounded-xl bg-gradient-to-br from-primary/80 to-primary flex flex-col items-center justify-center text-white p-4 hover:scale-105 transition-transform shadow-lg"
        >
          <span className="text-2xl font-bold text-center">{category.name}</span>
          <span className="text-sm opacity-80 mt-2">{category.productCount} items</span>
        </button>
      ))}
    </div>
  );

  // Render subcategory grid with images
  const renderSubcategoryGrid = () => (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h2 className="text-xl font-bold">
          {menuData?.categories.find(c => c.slug === selectedCategory)?.name}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {currentSubcategories.map((subcategory) => {
          const image = getSubcategoryImage(subcategory);
          return (
            <button
              key={subcategory.id}
              onClick={() => setSelectedSubcategory(subcategory.id)}
              className="aspect-[4/3] rounded-xl overflow-hidden relative group border-2 border-transparent hover:border-primary transition-colors"
            >
              {image ? (
                <img 
                  src={image} 
                  alt={subcategory.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-secondary" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <span className="text-lg font-semibold block">{subcategory.name}</span>
                {subcategory.chineseName && (
                  <span className="text-sm opacity-80">{subcategory.chineseName}</span>
                )}
                <span className="text-xs opacity-70 block mt-1">{subcategory.productCount} items</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Render product grid with images
  const renderProductGrid = (products: typeof currentProducts) => (
    <div className="p-4">
      {selectedSubcategory && (
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSubcategory(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h2 className="text-xl font-bold">
            {getSubcategoryById(selectedSubcategory)?.name}
          </h2>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {products.map((product) => {
          const subcategory = getSubcategoryById(product.subcategoryId);
          const price = product.instorePrice || 
            (subcategory?.basePriceRegularWithBoba) || 0;
          const image = getProductImage(product);
          
          return (
            <button
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="bg-card rounded-lg overflow-hidden text-left hover:shadow-lg transition-shadow border border-border hover:border-primary"
            >
              {/* Product Image */}
              <div className="aspect-square relative bg-muted">
                {image ? (
                  <img 
                    src={image} 
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                )}
              </div>
              {/* Product Info */}
              <div className="p-2">
                <div className="font-medium text-sm line-clamp-2">{product.name}</div>
                {product.chineseName && (
                  <div className="text-xs text-muted-foreground">{product.chineseName}</div>
                )}
                <div className="text-primary font-bold mt-1">
                  {price > 0 ? formatPrice(Math.round(price * 1.05)) : 'Select size'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Format cart item description
  const formatCartItemDesc = (item: POSCartItem) => {
    const parts: string[] = [];
    if (item.size) parts.push(SIZES.find(s => s.value === item.size)?.label || item.size);
    if (item.withBoba !== undefined) {
      if (item.withBoba) {
        if (item.bobaType === 'tapioca') {
          parts.push(`${item.bobaSize === 'big' ? 'Big' : 'Small'} Tapioca`);
        } else if (item.bobaType === 'popping') {
          parts.push(`${item.poppingBobaFlavor} Popping`);
        }
      } else {
        parts.push('No Boba');
      }
    }
    if (item.extraBoba) {
      if (item.extraBoba.type === 'tapioca') {
        parts.push(`+Extra ${item.extraBoba.size === 'big' ? 'Big' : 'Small'} Tapioca`);
      } else {
        parts.push(`+Extra ${item.extraBoba.flavor} Popping`);
      }
    }
    if (item.sugarLevel) parts.push(item.sugarLevel);
    if (item.iceLevel) parts.push(ICE_LEVELS.find(l => l.value === item.iceLevel)?.label || item.iceLevel);
    if (item.addons.length > 0) parts.push(...item.addons.map(a => a.name));
    return parts.join(' • ');
  };

  // Show loading while checking session
  if (!posSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-primary text-primary-foreground flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg">Taiwan Maami POS</h1>
          <div className="flex flex-col text-xs leading-tight">
            <span className="font-medium">{posSession.outletName}</span>
            <span className="opacity-70">{posSession.employeeName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-48 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10"
            onClick={handleEndSession}
            title="End Session"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Product area */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : searchQuery ? (
            // Search results
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Search Results for "{searchQuery}"</h2>
              {searchResults.length === 0 ? (
                <p className="text-muted-foreground">No products found</p>
              ) : (
                renderProductGrid(searchResults)
              )}
            </div>
          ) : !selectedCategory ? (
            // Category grid
            renderCategoryGrid()
          ) : !selectedSubcategory ? (
            // Subcategory grid
            renderSubcategoryGrid()
          ) : (
            // Product grid
            renderProductGrid(currentProducts)
          )}
        </div>

        {/* Cart panel */}
        <div className="w-80 lg:w-96 border-l border-border flex flex-col bg-card">
          {/* Cart header */}
          <div className="h-12 border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">Cart ({cart.length})</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                Clear
              </Button>
            )}
          </div>

          {/* Cart items */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="bg-background rounded-lg p-2 border border-border">
                  <div className="flex gap-2">
                    {/* Item image */}
                    {item.imageUrl && (
                      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.productName}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {formatCartItemDesc(item)}
                      </div>
                      {item.specialInstructions && (
                        <div className="text-xs text-amber-600 mt-1">Note: {item.specialInstructions}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-semibold text-sm">{formatPrice(item.lineTotal)}</div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setCart(cart.filter(c => c.id !== item.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Cart is empty
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Cart totals */}
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({discountPercent}%)</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>SGST (2.5%)</span>
              <span>{formatPrice(gst.stateGst)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>CGST (2.5%)</span>
              <span>{formatPrice(gst.centralGst)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            {/* Discount buttons */}
            <div className="flex gap-2 pt-2">
              {[5, 10, 15, 20].map((pct) => (
                <Button
                  key={pct}
                  variant={discountPercent === pct ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDiscountPercent(discountPercent === pct ? 0 : pct)}
                >
                  {pct}%
                </Button>
              ))}
            </div>

            {/* Payment button */}
            <Button
              className="w-full h-12 text-lg mt-2"
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
            >
              Pay {formatPrice(total)}
            </Button>
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      <Dialog open={showCustomization} onOpenChange={setShowCustomization}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct?.name}
              {selectedProduct?.chineseName && (
                <span className="block text-sm text-muted-foreground font-normal">
                  {selectedProduct.chineseName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Mochi Quantity Selection (for mochi products only) */}
            {selectedProduct?.mochiPrice1pc && selectedProduct?.mochiPrice2pc && selectedProduct?.mochiPrice3pc && (
              <div>
                <h4 className="font-medium mb-2">Quantity</h4>
                <RadioGroup 
                  value={String(mochiQuantity)} 
                  onValueChange={(v) => setMochiQuantity(Number(v) as 1 | 2 | 3)} 
                  className="grid grid-cols-3 gap-2"
                >
                  <div>
                    <RadioGroupItem value="1" id="pos-mochi-1pc" className="peer sr-only" />
                    <Label
                      htmlFor="pos-mochi-1pc"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span className="font-medium">1 Mochi</span>
                      <span className="text-sm text-primary font-semibold">
                        {formatPrice(selectedProduct.mochiPrice1pc)}
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="2" id="pos-mochi-2pc" className="peer sr-only" />
                    <Label
                      htmlFor="pos-mochi-2pc"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span className="font-medium">2 Mochis</span>
                      <span className="text-sm text-primary font-semibold">
                        {formatPrice(selectedProduct.mochiPrice2pc)}
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="3" id="pos-mochi-3pc" className="peer sr-only" />
                    <Label
                      htmlFor="pos-mochi-3pc"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span className="font-medium">3 Mochis</span>
                      <span className="text-sm text-primary font-semibold">
                        {formatPrice(selectedProduct.mochiPrice3pc)}
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Size */}
            {selectedSubcategoryData?.hasSizeVariants && (
              <div>
                <h4 className="font-medium mb-2">Size</h4>
                <RadioGroup value={customSize} onValueChange={(v) => setCustomSize(v as Size)} className="grid grid-cols-3 gap-2">
                  {SIZES.map((s) => (
                    <div key={s.value}>
                      <RadioGroupItem value={s.value} id={`pos-size-${s.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`pos-size-${s.value}`}
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        <span className="font-medium text-sm">{s.label}</span>
                        <span className="text-xs text-muted-foreground">{s.volume}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Boba option - With or Without */}
            {selectedSubcategoryData?.hasBobaOption && (
              <div>
                <h4 className="font-medium mb-2">Boba</h4>
                <RadioGroup value={customBoba ? 'with' : 'without'} onValueChange={(v) => {
                  setCustomBoba(v === 'with');
                  if (v === 'without') {
                    setCustomBobaType('tapioca');
                    setCustomBobaSize('small');
                    setCustomPoppingFlavor('strawberry');
                    setWantExtraBoba(false);
                  }
                }} className="grid grid-cols-2 gap-2">
                  <div>
                    <RadioGroupItem value="with" id="pos-boba-with" className="peer sr-only" />
                    <Label htmlFor="pos-boba-with" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      With Boba
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="without" id="pos-boba-without" className="peer sr-only" />
                    <Label htmlFor="pos-boba-without" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      Without Boba
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Boba Type - Tapioca or Popping (only if With Boba) */}
            {selectedSubcategoryData?.hasBobaOption && customBoba && (
              <div>
                <h4 className="font-medium mb-2">Boba Type</h4>
                <RadioGroup value={customBobaType || ''} onValueChange={(v) => {
                  setCustomBobaType(v as BobaType);
                  if (v === 'tapioca') {
                    setCustomPoppingFlavor('strawberry');
                  }
                }} className="grid grid-cols-2 gap-2">
                  <div>
                    <RadioGroupItem value="tapioca" id="pos-boba-tapioca" className="peer sr-only" />
                    <Label htmlFor="pos-boba-tapioca" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      <span className="font-medium">Tapioca Pearls</span>
                      <span className="text-xs text-muted-foreground">珍珠</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="popping" id="pos-boba-popping" className="peer sr-only" />
                    <Label htmlFor="pos-boba-popping" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      <span className="font-medium">Popping Boba</span>
                      <span className="text-xs text-muted-foreground">爆爆珠</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Tapioca Size - Small or Big (only if Tapioca selected) */}
            {selectedSubcategoryData?.hasBobaOption && customBoba && customBobaType === 'tapioca' && (
              <div>
                <h4 className="font-medium mb-2">Tapioca Size</h4>
                <RadioGroup value={customBobaSize} onValueChange={(v) => setCustomBobaSize(v as BobaSize)} className="grid grid-cols-2 gap-2">
                  <div>
                    <RadioGroupItem value="small" id="pos-tapioca-small" className="peer sr-only" />
                    <Label htmlFor="pos-tapioca-small" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      <span className="font-medium">Small</span>
                      <span className="text-xs text-muted-foreground">小珍珠</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="big" id="pos-tapioca-big" className="peer sr-only" />
                    <Label htmlFor="pos-tapioca-big" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      <span className="font-medium">Big</span>
                      <span className="text-xs text-muted-foreground">大珍珠</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Popping Boba Flavor (only if Popping selected) */}
            {selectedSubcategoryData?.hasBobaOption && customBoba && customBobaType === 'popping' && (
              <div>
                <h4 className="font-medium mb-2">Popping Boba Flavor</h4>
                <RadioGroup value={customPoppingFlavor} onValueChange={setCustomPoppingFlavor} className="grid grid-cols-3 gap-2">
                  {POPPING_BOBA_FLAVORS.map((flavor) => (
                    <div key={flavor.value}>
                      <RadioGroupItem value={flavor.value} id={`pos-popping-${flavor.value}`} className="peer sr-only" />
                      <Label htmlFor={`pos-popping-${flavor.value}`} className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-center">
                        <span className="font-medium text-xs">{flavor.label}</span>
                        <span className="text-xs text-muted-foreground">{flavor.chinese}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Extra Boba Add-on */}
            {selectedSubcategoryData?.hasBobaOption && customBoba && customBobaType && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Checkbox
                    id="pos-extra-boba"
                    checked={wantExtraBoba}
                    onCheckedChange={(checked) => {
                      setWantExtraBoba(!!checked);
                      if (!checked) {
                        setExtraBobaType('tapioca');
                        setExtraBobaSize(customBobaSize);
                        setExtraPoppingFlavor('strawberry');
                      } else {
                        // Default extra boba to same type as primary
                        setExtraBobaType(customBobaType);
                        setExtraBobaSize(customBobaSize);
                      }
                    }}
                  />
                  <Label htmlFor="pos-extra-boba" className="font-medium cursor-pointer">
                    Add Extra Boba (+{formatPrice(getExtraBobaPrice(customSize))})
                  </Label>
                </div>

                {wantExtraBoba && (
                  <div className="space-y-4 pl-6">
                    {/* Extra Boba Type */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Extra Boba Type</h4>
                      <RadioGroup value={extraBobaType || ''} onValueChange={(v) => {
                        setExtraBobaType(v as BobaType);
                        if (v === 'tapioca') {
                          setExtraPoppingFlavor('strawberry');
                          setExtraBobaSize(customBobaSize); // Default to same size
                        }
                      }} className="grid grid-cols-2 gap-2">
                        <div>
                          <RadioGroupItem value="tapioca" id="pos-extra-tapioca" className="peer sr-only" />
                          <Label htmlFor="pos-extra-tapioca" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-sm">
                            Tapioca
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="popping" id="pos-extra-popping" className="peer sr-only" />
                          <Label htmlFor="pos-extra-popping" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-sm">
                            Popping
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Extra Tapioca Size */}
                    {extraBobaType === 'tapioca' && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Extra Tapioca Size</h4>
                        <RadioGroup value={extraBobaSize} onValueChange={(v) => setExtraBobaSize(v as BobaSize)} className="grid grid-cols-2 gap-2">
                          <div>
                            <RadioGroupItem value="small" id="pos-extra-small" className="peer sr-only" />
                            <Label htmlFor="pos-extra-small" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-sm">
                              Small
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="big" id="pos-extra-big" className="peer sr-only" />
                            <Label htmlFor="pos-extra-big" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-sm">
                              Big
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {/* Extra Popping Flavor */}
                    {extraBobaType === 'popping' && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Extra Popping Flavor</h4>
                        <RadioGroup value={extraPoppingFlavor} onValueChange={setExtraPoppingFlavor} className="grid grid-cols-3 gap-2">
                          {POPPING_BOBA_FLAVORS.map((flavor) => (
                            <div key={flavor.value}>
                              <RadioGroupItem value={flavor.value} id={`pos-extra-pop-${flavor.value}`} className="peer sr-only" />
                              <Label htmlFor={`pos-extra-pop-${flavor.value}`} className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-xs">
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

            {/* Sugar */}
            {selectedSubcategoryData?.hasSizeVariants && (
              <div>
                <h4 className="font-medium mb-2">Sugar Level</h4>
                <RadioGroup value={customSugar} onValueChange={setCustomSugar} className="grid grid-cols-5 gap-1">
                  {SUGAR_LEVELS.map((level) => (
                    <div key={level.value}>
                      <RadioGroupItem value={level.value} id={`pos-sugar-${level.value}`} className="peer sr-only" />
                      <Label htmlFor={`pos-sugar-${level.value}`} className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 text-xs hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                        {level.value}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Ice */}
            {selectedSubcategoryData?.hasSizeVariants && (
              <div>
                <h4 className="font-medium mb-2">Ice Level</h4>
                <RadioGroup value={customIce} onValueChange={setCustomIce} className="grid grid-cols-4 gap-1">
                  {ICE_LEVELS.map((level) => (
                    <div key={level.value}>
                      <RadioGroupItem value={level.value} id={`pos-ice-${level.value}`} className="peer sr-only" />
                      <Label htmlFor={`pos-ice-${level.value}`} className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 text-xs hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer text-center">
                        {level.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Vegan Milk Add-ons - Only for Hot Coffee */}
            {milkAddons.length > 0 && selectedSubcategoryData?.name?.toLowerCase().includes('coffee') && menuData?.categories.find(c => menuData?.subcategories.find(s => s.id === selectedSubcategoryData?.id)?.categoryId === c.id)?.slug === 'hot-beverages' && (
              <div>
                <h4 className="font-medium mb-2">Vegan Milk Options</h4>
                <div className="grid grid-cols-2 gap-2">
                  {milkAddons.map((addon) => {
                    const isSelected = customAddons.some(a => a.id === addon.id);
                    const price = getAddonPrice(addon);
                    return (
                      <button
                        key={addon.id}
                        onClick={() => {
                          if (isSelected) {
                            setCustomAddons(customAddons.filter(a => a.id !== addon.id));
                          } else {
                            setCustomAddons([...customAddons, { id: addon.id, name: addon.name, price }]);
                          }
                        }}
                        className={`rounded-lg border-2 p-2 text-left transition-colors ${
                          isSelected ? 'border-primary bg-primary/10' : 'border-muted hover:bg-accent'
                        }`}
                      >
                        <div className="font-medium text-sm">{addon.name}</div>
                        <div className="text-xs text-muted-foreground">+{formatPrice(price)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Coconut Cream Cap - Only for Tea Lattes (bubble tea lattes) */}
            {selectedSubcategoryData?.hasBobaOption && selectedProduct?.name?.toLowerCase().includes('latte') && (
              <div>
                <h4 className="font-medium mb-2">Cream Cap</h4>
                <button
                  onClick={() => {
                    const coconutCreamAddon = { id: 99999, name: 'Coconut Cream Cap', price: 0 };
                    const isSelected = customAddons.some(a => a.id === 99999);
                    if (isSelected) {
                      setCustomAddons(customAddons.filter(a => a.id !== 99999));
                    } else {
                      setCustomAddons([...customAddons, coconutCreamAddon]);
                    }
                  }}
                  className={`rounded-lg border-2 p-3 text-left transition-colors w-full ${
                    customAddons.some(a => a.id === 99999) ? 'border-primary bg-primary/10' : 'border-muted hover:bg-accent'
                  }`}
                >
                  <div className="font-medium text-sm">Coconut Cream Cap</div>
                  <div className="text-xs text-muted-foreground">Free</div>
                </button>
              </div>
            )}

            {/* Special Instructions */}
            <div>
              <h4 className="font-medium mb-2">Special Instructions</h4>
              <Textarea
                placeholder="Any special requests..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Quantity */}
            <div>
              <h4 className="font-medium mb-2">Quantity</h4>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setCustomQty(Math.max(1, customQty - 1))}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xl font-semibold w-8 text-center">{customQty}</span>
                <Button variant="outline" size="icon" onClick={() => setCustomQty(customQty + 1)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button className="w-full h-12" onClick={handleAddCustomized}>
            <Check className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-center py-4 bg-secondary rounded-lg">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-3xl font-bold">{formatPrice(total)}</div>
            </div>

            <div>
              <Label>Customer Name (Optional)</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
              />
            </div>

            <div>
              <Label>Phone (Optional)</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="For loyalty points"
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="mt-2">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="cash" className="gap-2">
                    <Banknote className="w-4 h-4" />
                    Cash
                  </TabsTrigger>
                  <TabsTrigger value="card" className="gap-2">
                    <CreditCard className="w-4 h-4" />
                    Card
                  </TabsTrigger>
                  <TabsTrigger value="split" className="gap-2">
                    <Percent className="w-4 h-4" />
                    Split
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {paymentMethod === 'split' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cash Amount</Label>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Card Amount</Label>
                  <Input
                    type="number"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            <Button
              className="w-full h-12 text-lg"
              onClick={handlePayment}
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? (
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              Complete Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mochi Box Modal - Mix and Match */}
      <Dialog open={showMochiBoxModal} onOpenChange={setShowMochiBoxModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMochiSubcategory?.name} Box
              {selectedMochiSubcategory?.chineseName && (
                <span className="block text-sm text-muted-foreground font-normal">
                  {selectedMochiSubcategory.chineseName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Quantity Selection */}
            <div>
              <h4 className="font-medium mb-2">How many mochis?</h4>
              <RadioGroup 
                value={String(mochiQuantity)} 
                onValueChange={(v) => {
                  const qty = Number(v) as 1 | 2 | 3;
                  setMochiQuantity(qty);
                  // Adjust selections array to match quantity
                  if (qty < mochiSelections.length) {
                    setMochiSelections(mochiSelections.slice(0, qty));
                  } else if (qty > mochiSelections.length && mochiSelections.length > 0) {
                    // Fill with the first selection
                    const fill = Array(qty - mochiSelections.length).fill(mochiSelections[0]);
                    setMochiSelections([...mochiSelections, ...fill]);
                  }
                }} 
                className="grid grid-cols-3 gap-2"
              >
                {(() => {
                  const mochiProducts = menuData?.products.filter(p => 
                    p.subcategoryId === selectedMochiSubcategory?.id && p.mochiPrice1pc
                  ) || [];
                  const sampleProduct = mochiProducts[0];
                  if (!sampleProduct) return null;
                  return (
                    <>
                      <div>
                        <RadioGroupItem value="1" id="mochi-box-1" className="peer sr-only" />
                        <Label
                          htmlFor="mochi-box-1"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer"
                        >
                          <span className="font-medium">1 Mochi</span>
                          <span className="text-sm text-primary font-semibold">
                            {formatPrice(sampleProduct.mochiPrice1pc || 0)}
                          </span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="2" id="mochi-box-2" className="peer sr-only" />
                        <Label
                          htmlFor="mochi-box-2"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer"
                        >
                          <span className="font-medium">2 Mochis</span>
                          <span className="text-sm text-primary font-semibold">
                            {formatPrice(sampleProduct.mochiPrice2pc || 0)}
                          </span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="3" id="mochi-box-3" className="peer sr-only" />
                        <Label
                          htmlFor="mochi-box-3"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer"
                        >
                          <span className="font-medium">3 Mochis</span>
                          <span className="text-sm text-primary font-semibold">
                            {formatPrice(sampleProduct.mochiPrice3pc || 0)}
                          </span>
                        </Label>
                      </div>
                    </>
                  );
                })()}
              </RadioGroup>
            </div>

            {/* Flavor Selection for each slot */}
            <div>
              <h4 className="font-medium mb-2">Select Flavors</h4>
              <div className="space-y-3">
                {Array.from({ length: mochiQuantity }).map((_, index) => {
                  const mochiProducts = menuData?.products.filter(p => 
                    p.subcategoryId === selectedMochiSubcategory?.id && p.mochiPrice1pc
                  ) || [];
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-20">Mochi {index + 1}:</span>
                      <select
                        value={mochiSelections[index]?.productId || ''}
                        onChange={(e) => {
                          const productId = Number(e.target.value);
                          const product = mochiProducts.find(p => p.id === productId);
                          if (product) {
                            const newSelections = [...mochiSelections];
                            newSelections[index] = { productId: product.id, name: product.name };
                            setMochiSelections(newSelections);
                          }
                        }}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select flavor...</option>
                        {mochiProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Summary */}
            {mochiSelections.length > 0 && mochiSelections.every(s => s?.productId) && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-1">Your selection:</p>
                <p className="font-medium">
                  {mochiSelections.map(s => s.name).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Add to Cart Button */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowMochiBoxModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (mochiSelections.length !== mochiQuantity || !mochiSelections.every(s => s?.productId)) {
                  toast.error('Please select all mochi flavors');
                  return;
                }
                const mochiProducts = menuData?.products.filter(p => 
                  p.subcategoryId === selectedMochiSubcategory?.id && p.mochiPrice1pc
                ) || [];
                const sampleProduct = mochiProducts[0];
                if (!sampleProduct) return;
                
                let unitPrice = 0;
                if (mochiQuantity === 1) unitPrice = sampleProduct.mochiPrice1pc || 0;
                else if (mochiQuantity === 2) unitPrice = sampleProduct.mochiPrice2pc || 0;
                else unitPrice = sampleProduct.mochiPrice3pc || 0;
                
                const flavorNames = mochiSelections.map(s => s.name.replace(' Mochi', '')).join(', ');
                
                addToCart({
                  id: nanoid(),
                  productId: sampleProduct.id,
                  productName: `${selectedMochiSubcategory?.name} (${mochiQuantity}pc): ${flavorNames}`,
                  chineseName: selectedMochiSubcategory?.chineseName,
                  imageUrl: getProductImage(sampleProduct),
                  addons: [],
                  quantity: 1,
                  unitPrice,
                  addonsTotal: 0,
                  lineTotal: unitPrice,
                  mochiQuantity,
                  mochiSelections,
                });
                
                setShowMochiBoxModal(false);
                toast.success(`Added ${selectedMochiSubcategory?.name} Box`);
              }}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
