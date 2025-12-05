import React, { useState, useMemo } from 'react';
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
import { formatPrice, GST_RATE, SIZES, SUGAR_LEVELS, ICE_LEVELS, Size, calculateGst, BobaSize, BobaType } from '@shared/types';
import { 
  Minus, Plus, Trash2, Search, ShoppingCart, CreditCard, Banknote, 
  Percent, X, Check, RefreshCw, LogOut, Home, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { nanoid } from 'nanoid';

interface POSCartItem {
  id: string;
  productId: number;
  productName: string;
  chineseName?: string;
  size?: Size;
  withBoba?: boolean;
  bobaSize?: BobaSize;
  bobaType?: BobaType;
  poppingBobaFlavor?: string;
  sugarLevel?: string;
  iceLevel?: string;
  addons: { id: number; name: string; price: number }[];
  quantity: number;
  unitPrice: number;
  addonsTotal: number;
  lineTotal: number;
  specialInstructions?: string;
}

// Popping boba flavors
const POPPING_BOBA_FLAVORS = [
  { value: 'strawberry', label: 'Strawberry', chinese: '草莓' },
  { value: 'blueberry', label: 'Blueberry', chinese: '藍莓' },
  { value: 'mango', label: 'Mango', chinese: '芒果' },
  { value: 'lychee', label: 'Lychee', chinese: '荔枝' },
  { value: 'passionfruit', label: 'Passionfruit', chinese: '百香果' },
];

export default function POS() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
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
  const [customSize, setCustomSize] = useState<Size>('petite');
  const [customBoba, setCustomBoba] = useState(true);
  const [customBobaSize, setCustomBobaSize] = useState<BobaSize>('small');
  const [customBobaType, setCustomBobaType] = useState<BobaType>('tapioca');
  const [customPoppingFlavor, setCustomPoppingFlavor] = useState('');
  const [customSugar, setCustomSugar] = useState('100%');
  const [customIce, setCustomIce] = useState('Regular Ice');
  const [customAddons, setCustomAddons] = useState<{ id: number; name: string; price: number }[]>([]);
  const [customQty, setCustomQty] = useState(1);
  const [customInstructions, setCustomInstructions] = useState('');

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Create order mutation
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Order #${data.orderNumber} created!`);
      setCart([]);
      setShowPayment(false);
      setDiscountPercent(0);
      setCustomerName('');
      setCustomerPhone('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create order');
    },
  });

  // Get categories with product counts
  const categoriesWithCounts = useMemo(() => {
    if (!menuData) return [];
    return menuData.categories.map(cat => {
      const subcats = menuData.subcategories.filter(s => s.categoryId === cat.id);
      const productCount = subcats.reduce((sum, sub) => {
        return sum + menuData.products.filter(p => p.subcategoryId === sub.id).length;
      }, 0);
      return { ...cat, productCount, subcategories: subcats };
    });
  }, [menuData]);

  // Get subcategories for selected category
  const currentSubcategories = useMemo(() => {
    if (!menuData || !selectedCategory) return [];
    const category = menuData.categories.find(c => c.slug === selectedCategory);
    if (!category) return [];
    return menuData.subcategories.filter(s => s.categoryId === category.id).map(sub => ({
      ...sub,
      productCount: menuData.products.filter(p => p.subcategoryId === sub.id).length
    }));
  }, [menuData, selectedCategory]);

  // Get products for selected subcategory
  const currentProducts = useMemo(() => {
    if (!menuData || !selectedSubcategory) return [];
    return menuData.products.filter(p => p.subcategoryId === selectedSubcategory);
  }, [menuData, selectedSubcategory]);

  // Search results
  const searchResults = useMemo(() => {
    if (!menuData || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return menuData.products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.chineseName?.toLowerCase().includes(query)
    );
  }, [menuData, searchQuery]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = Math.round(subtotal * discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const gst = calculateGst(afterDiscount);
  const total = afterDiscount + gst.total;

  // Get subcategory for a product
  const getSubcategoryById = (id: number) => menuData?.subcategories.find(s => s.id === id);

  // Handle product click
  const handleProductClick = (product: any) => {
    const subcategory = getSubcategoryById(product.subcategoryId);
    if (subcategory?.hasSizeVariants || subcategory?.hasBobaOption) {
      setSelectedProduct(product);
      setSelectedSubcategoryData(subcategory);
      setCustomSize('petite');
      setCustomBoba(true);
      setCustomBobaSize('small');
      setCustomBobaType('tapioca');
      setCustomPoppingFlavor('');
      setCustomSugar('100%');
      setCustomIce('Regular Ice');
      setCustomAddons([]);
      setCustomQty(1);
      setCustomInstructions('');
      setShowCustomization(true);
    } else {
      // Add directly to cart
      addToCart({
        id: nanoid(),
        productId: product.id,
        productName: product.name,
        chineseName: product.chineseName,
        addons: [],
        quantity: 1,
        unitPrice: product.instorePrice || 0,
        addonsTotal: 0,
        lineTotal: product.instorePrice || 0,
      });
      toast.success(`Added ${product.name}`);
    }
  };

  // Add to cart
  const addToCart = (item: POSCartItem) => {
    const existingIndex = cart.findIndex(
      c => c.productId === item.productId &&
        c.size === item.size &&
        c.withBoba === item.withBoba &&
        c.bobaSize === item.bobaSize &&
        c.bobaType === item.bobaType &&
        c.poppingBobaFlavor === item.poppingBobaFlavor &&
        c.sugarLevel === item.sugarLevel &&
        c.iceLevel === item.iceLevel &&
        c.specialInstructions === item.specialInstructions &&
        JSON.stringify(c.addons) === JSON.stringify(item.addons)
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

  // Handle customization confirm
  const handleAddCustomized = () => {
    if (!selectedProduct || !selectedSubcategoryData) return;

    let unitPrice = 0;
    if (selectedSubcategoryData.hasSizeVariants) {
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

    const addonsTotal = customAddons.reduce((sum, a) => sum + a.price, 0);

    addToCart({
      id: nanoid(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      chineseName: selectedProduct.chineseName,
      size: selectedSubcategoryData.hasSizeVariants ? customSize : undefined,
      withBoba: selectedSubcategoryData.hasBobaOption ? customBoba : undefined,
      bobaSize: selectedSubcategoryData.hasBobaOption && customBoba ? customBobaSize : undefined,
      bobaType: selectedSubcategoryData.hasBobaOption && customBoba ? customBobaType : undefined,
      poppingBobaFlavor: selectedSubcategoryData.hasBobaOption && customBoba && customBobaType === 'popping' ? customPoppingFlavor : undefined,
      sugarLevel: selectedSubcategoryData.hasSizeVariants ? customSugar : undefined,
      iceLevel: selectedSubcategoryData.hasSizeVariants ? customIce : undefined,
      addons: customAddons,
      quantity: customQty,
      unitPrice,
      addonsTotal,
      lineTotal: (unitPrice + addonsTotal) * customQty,
      specialInstructions: customInstructions.trim() || undefined,
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

    createOrder.mutate({
      orderType: 'instore',
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
        specialInstructions: item.specialInstructions,
      })),
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
    });
  };

  // Addon price helper
  const getAddonPrice = (addon: any) => {
    if (addon.fixedPrice) return addon.fixedPrice;
    if (customSize === 'petite') return addon.pricePetite || 0;
    if (customSize === 'regular') return addon.priceRegular || 0;
    return addon.priceLarge || 0;
  };

  const extraBobaAddons = addonsData?.filter(a => a.type === 'extra_boba') || [];
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

  // Render subcategory grid
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
        {currentSubcategories.map((subcategory) => (
          <button
            key={subcategory.id}
            onClick={() => setSelectedSubcategory(subcategory.id)}
            className="aspect-[4/3] rounded-xl bg-secondary hover:bg-secondary/80 flex flex-col items-center justify-center p-4 transition-colors border-2 border-transparent hover:border-primary"
          >
            <span className="text-lg font-semibold text-center">{subcategory.name}</span>
            {subcategory.chineseName && (
              <span className="text-sm text-muted-foreground">{subcategory.chineseName}</span>
            )}
            <span className="text-xs text-muted-foreground mt-2">{subcategory.productCount} items</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Render product grid
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
            (subcategory?.basePricePetiteWithBoba) || 0;
          
          return (
            <button
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="bg-card rounded-lg p-3 text-left hover:shadow-lg transition-shadow border border-border hover:border-primary"
            >
              <div className="font-medium text-sm line-clamp-2">{product.name}</div>
              {product.chineseName && (
                <div className="text-xs text-muted-foreground">{product.chineseName}</div>
              )}
              <div className="text-primary font-bold mt-2">
                {price > 0 ? formatPrice(Math.round(price * 1.05)) : 'Select size'}
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
        const bobaDesc = `${item.bobaSize === 'big' ? 'Big' : 'Small'} ${item.bobaType === 'popping' ? item.poppingBobaFlavor + ' Popping' : 'Tapioca'}`;
        parts.push(bobaDesc);
      } else {
        parts.push('No Boba');
      }
    }
    if (item.sugarLevel) parts.push(item.sugarLevel);
    if (item.iceLevel) parts.push(item.iceLevel);
    if (item.addons.length > 0) parts.push(...item.addons.map(a => a.name));
    return parts.join(' • ');
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-primary text-primary-foreground flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg">Taiwan Maami POS</h1>
          <span className="text-sm opacity-80">T Nagar</span>
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
            onClick={() => logout()}
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
        <div className="w-80 lg:w-96 bg-card border-l border-border flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cart ({cart.length})
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                Clear
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.productName}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {formatCartItemDesc(item)}
                      </div>
                      {item.specialInstructions && (
                        <div className="text-xs text-orange-600 mt-1">
                          Note: {item.specialInstructions}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      <div className="font-semibold text-sm">{formatPrice(item.lineTotal)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

            {/* Boba option */}
            {selectedSubcategoryData?.hasBobaOption && (
              <div>
                <h4 className="font-medium mb-2">Boba</h4>
                <RadioGroup value={customBoba ? 'with' : 'without'} onValueChange={(v) => setCustomBoba(v === 'with')} className="grid grid-cols-2 gap-2">
                  <div>
                    <RadioGroupItem value="with" id="pos-boba-with" className="peer sr-only" />
                    <Label htmlFor="pos-boba-with" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      With Boba
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="without" id="pos-boba-without" className="peer sr-only" />
                    <Label htmlFor="pos-boba-without" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      Without Boba
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Boba Size */}
            {selectedSubcategoryData?.hasBobaOption && customBoba && (
              <div>
                <h4 className="font-medium mb-2">Boba Size</h4>
                <RadioGroup value={customBobaSize} onValueChange={(v) => setCustomBobaSize(v as BobaSize)} className="grid grid-cols-2 gap-2">
                  <div>
                    <RadioGroupItem value="small" id="pos-boba-small" className="peer sr-only" />
                    <Label htmlFor="pos-boba-small" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      <span className="font-medium">Small</span>
                      <span className="text-xs text-muted-foreground">小珍珠</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="big" id="pos-boba-big" className="peer sr-only" />
                    <Label htmlFor="pos-boba-big" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      <span className="font-medium">Big</span>
                      <span className="text-xs text-muted-foreground">大珍珠</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Boba Type */}
            {selectedSubcategoryData?.hasBobaOption && customBoba && (
              <div>
                <h4 className="font-medium mb-2">Boba Type</h4>
                <RadioGroup value={customBobaType} onValueChange={(v) => {
                  setCustomBobaType(v as BobaType);
                  if (v === 'tapioca') setCustomPoppingFlavor('');
                }} className="grid grid-cols-2 gap-2">
                  <div>
                    <RadioGroupItem value="tapioca" id="pos-boba-tapioca" className="peer sr-only" />
                    <Label htmlFor="pos-boba-tapioca" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      <span className="font-medium">Tapioca</span>
                      <span className="text-xs text-muted-foreground">珍珠</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="popping" id="pos-boba-popping" className="peer sr-only" />
                    <Label htmlFor="pos-boba-popping" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                      <span className="font-medium">Popping</span>
                      <span className="text-xs text-muted-foreground">爆爆珠</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Popping Boba Flavor */}
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
              ) : (
                <Check className="w-5 h-5 mr-2" />
              )}
              Complete Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
