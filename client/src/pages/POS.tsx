import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, GST_RATE, SIZES, SUGAR_LEVELS, ICE_LEVELS, Size, calculateGst } from '@shared/types';
import { 
  Minus, Plus, Trash2, Search, ShoppingCart, CreditCard, Banknote, 
  Percent, Gift, X, Check, RefreshCw, LogOut, Home
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
  sugarLevel?: string;
  iceLevel?: string;
  addons: { id: number; name: string; price: number }[];
  quantity: number;
  unitPrice: number;
  addonsTotal: number;
  lineTotal: number;
}

export default function POS() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: menuData, isLoading } = trpc.menu.getFullMenu.useQuery({ isDelivery: false });
  const { data: addonsData } = trpc.menu.getAddons.useQuery();

  // Cart state
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customization modal state
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<any>(null);
  const [customSize, setCustomSize] = useState<Size>('petite');
  const [customBoba, setCustomBoba] = useState(true);
  const [customSugar, setCustomSugar] = useState('100%');
  const [customIce, setCustomIce] = useState('Regular Ice');
  const [customAddons, setCustomAddons] = useState<{ id: number; name: string; price: number }[]>([]);
  const [customQty, setCustomQty] = useState(1);

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

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!menuData) return [];
    return menuData.products.filter((product) => {
      if (selectedCategory !== 'all') {
        const sub = menuData.subcategories.find(s => s.id === product.subcategoryId);
        const cat = menuData.categories.find(c => c.id === sub?.categoryId);
        if (cat?.slug !== selectedCategory) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return product.name.toLowerCase().includes(query) || product.chineseName?.toLowerCase().includes(query);
      }
      return true;
    });
  }, [menuData, selectedCategory, searchQuery]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = Math.round(subtotal * discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const gst = calculateGst(afterDiscount);
  const total = afterDiscount + gst.total;

  // Get subcategory for a product
  const getSubcategory = (productId: number) => {
    const product = menuData?.products.find(p => p.id === productId);
    return menuData?.subcategories.find(s => s.id === product?.subcategoryId);
  };

  // Handle product click
  const handleProductClick = (product: any) => {
    const subcategory = getSubcategory(product.id);
    if (subcategory?.hasSizeVariants || subcategory?.hasBobaOption) {
      setSelectedProduct(product);
      setSelectedSubcategory(subcategory);
      setCustomSize('petite');
      setCustomBoba(true);
      setCustomSugar('100%');
      setCustomIce('Regular Ice');
      setCustomAddons([]);
      setCustomQty(1);
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
    }
  };

  // Add to cart
  const addToCart = (item: POSCartItem) => {
    const existingIndex = cart.findIndex(
      c => c.productId === item.productId &&
        c.size === item.size &&
        c.withBoba === item.withBoba &&
        c.sugarLevel === item.sugarLevel &&
        c.iceLevel === item.iceLevel &&
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
    if (!selectedProduct || !selectedSubcategory) return;

    let unitPrice = 0;
    if (selectedSubcategory.hasSizeVariants) {
      if (customSize === 'petite') {
        unitPrice = customBoba ? selectedSubcategory.basePricePetiteWithBoba : selectedSubcategory.basePricePetiteNoBoba;
      } else if (customSize === 'regular') {
        unitPrice = customBoba ? selectedSubcategory.basePriceRegularWithBoba : selectedSubcategory.basePriceRegularNoBoba;
      } else {
        unitPrice = customBoba ? selectedSubcategory.basePriceLargeWithBoba : selectedSubcategory.basePriceLargeNoBoba;
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
      size: selectedSubcategory.hasSizeVariants ? customSize : undefined,
      withBoba: selectedSubcategory.hasBobaOption ? customBoba : undefined,
      sugarLevel: selectedSubcategory.hasSizeVariants ? customSugar : undefined,
      iceLevel: selectedSubcategory.hasSizeVariants ? customIce : undefined,
      addons: customAddons,
      quantity: customQty,
      unitPrice,
      addonsTotal,
      lineTotal: (unitPrice + addonsTotal) * customQty,
    });

    setShowCustomization(false);
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
      if (Math.abs(cashNum + cardNum - total) > 1) {
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

  const bobaAddons = addonsData?.filter(a => a.type === 'boba_flavor' && a.name !== 'Tapioca Pearls') || [];

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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-primary text-primary-foreground flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg">Taiwan Maami POS</h1>
          <span className="text-sm opacity-80">Staff: {user?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Home className="w-4 h-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => logout()}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Categories */}
          <div className="p-3 border-b space-y-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`category-pill whitespace-nowrap ${selectedCategory === 'all' ? 'category-pill-active' : 'category-pill-inactive'}`}
              >
                All
              </button>
              {menuData?.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`category-pill whitespace-nowrap ${selectedCategory === cat.slug ? 'category-pill-active' : 'category-pill-inactive'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="pos-btn-secondary p-2 flex flex-col items-center justify-center text-center h-24 hover:bg-secondary/80"
                >
                  <span className="text-sm font-medium line-clamp-2">{product.name}</span>
                  {product.chineseName && (
                    <span className="text-xs text-muted-foreground">{product.chineseName}</span>
                  )}
                  <span className="text-xs text-primary mt-1">
                    {formatPrice(Math.round((product.instorePrice || 0) * (1 + GST_RATE)))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-80 lg:w-96 border-l flex flex-col bg-card">
          {/* Cart Header */}
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">Current Order</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No items in cart</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-secondary/50 rounded-lg p-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.size && `${item.size} `}
                        {item.withBoba !== undefined && (item.withBoba ? '• Boba' : '• No Boba')}
                      </p>
                    </div>
                    <p className="text-sm font-medium">{formatPrice(item.lineTotal)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setCart(cart.filter(c => c.id !== item.id))}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary */}
          <div className="border-t p-3 space-y-2">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <Button
                variant={discountPercent === 0 ? 'outline' : 'default'}
                size="sm"
                className="flex-1"
                onClick={() => setDiscountPercent(discountPercent === 0 ? 10 : 0)}
              >
                <Percent className="w-4 h-4 mr-1" />
                {discountPercent > 0 ? `${discountPercent}% Off` : 'Discount'}
              </Button>
              {discountPercent > 0 && (
                <div className="flex gap-1">
                  {[5, 10, 15, 20].map((p) => (
                    <Button
                      key={p}
                      variant={discountPercent === p ? 'default' : 'outline'}
                      size="sm"
                      className="w-10"
                      onClick={() => setDiscountPercent(p)}
                    >
                      {p}%
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>GST (5%)</span>
                <span>{formatPrice(gst.total)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-1 border-t">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                className="h-14 text-lg"
                variant="outline"
                disabled={cart.length === 0}
                onClick={() => {
                  setPaymentMethod('cash');
                  setShowPayment(true);
                }}
              >
                <Banknote className="w-5 h-5 mr-2" />
                Cash
              </Button>
              <Button
                className="h-14 text-lg"
                disabled={cart.length === 0}
                onClick={() => {
                  setPaymentMethod('card');
                  setShowPayment(true);
                }}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Card
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      <Dialog open={showCustomization} onOpenChange={setShowCustomization}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {selectedSubcategory?.hasSizeVariants && (
              <div>
                <Label className="text-sm font-medium">Size</Label>
                <RadioGroup value={customSize} onValueChange={(v) => setCustomSize(v as Size)} className="grid grid-cols-3 gap-2 mt-2">
                  {SIZES.map((s) => (
                    <div key={s.value}>
                      <RadioGroupItem value={s.value} id={`pos-size-${s.value}`} className="peer sr-only" />
                      <Label htmlFor={`pos-size-${s.value}`} className="flex flex-col items-center p-2 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-xs text-muted-foreground">{s.volume}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {selectedSubcategory?.hasBobaOption && (
              <div>
                <Label className="text-sm font-medium">Boba</Label>
                <RadioGroup value={customBoba ? 'with' : 'without'} onValueChange={(v) => setCustomBoba(v === 'with')} className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <RadioGroupItem value="with" id="pos-boba-with" className="peer sr-only" />
                    <Label htmlFor="pos-boba-with" className="flex items-center justify-center p-2 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary">
                      With Boba
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="without" id="pos-boba-without" className="peer sr-only" />
                    <Label htmlFor="pos-boba-without" className="flex items-center justify-center p-2 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary">
                      No Boba
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {selectedSubcategory?.hasSizeVariants && (
              <>
                <div>
                  <Label className="text-sm font-medium">Sugar Level</Label>
                  <RadioGroup value={customSugar} onValueChange={setCustomSugar} className="grid grid-cols-5 gap-1 mt-2">
                    {SUGAR_LEVELS.map((level) => (
                      <div key={level.value}>
                        <RadioGroupItem value={level.value} id={`pos-sugar-${level.value}`} className="peer sr-only" />
                        <Label htmlFor={`pos-sugar-${level.value}`} className="flex items-center justify-center p-1 text-xs border-2 rounded cursor-pointer peer-data-[state=checked]:border-primary">
                          {level.value}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium">Ice Level</Label>
                  <RadioGroup value={customIce} onValueChange={setCustomIce} className="grid grid-cols-4 gap-1 mt-2">
                    {ICE_LEVELS.map((level) => (
                      <div key={level.value}>
                        <RadioGroupItem value={level.value} id={`pos-ice-${level.value}`} className="peer sr-only" />
                        <Label htmlFor={`pos-ice-${level.value}`} className="flex items-center justify-center p-1 text-xs border-2 rounded cursor-pointer peer-data-[state=checked]:border-primary text-center">
                          {level.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}

            {customBoba && bobaAddons.length > 0 && selectedSubcategory?.hasBobaOption && (
              <div>
                <Label className="text-sm font-medium">Upgrade Boba</Label>
                <div className="space-y-1 mt-2">
                  {bobaAddons.map((addon) => {
                    const price = getAddonPrice(addon);
                    const isSelected = customAddons.some(a => a.id === addon.id);
                    return (
                      <div
                        key={addon.id}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setCustomAddons(customAddons.filter(a => a.id !== addon.id));
                          } else {
                            setCustomAddons([...customAddons, { id: addon.id, name: addon.name, price }]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={isSelected} />
                          <span className="text-sm">{addon.name}</span>
                        </div>
                        <span className="text-sm text-primary">+{formatPrice(price)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Quantity</Label>
              <div className="flex items-center gap-3 mt-2">
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
            Add to Order
          </Button>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{formatPrice(total)}</p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>

            <div className="space-y-2">
              <Label>Customer Name (Optional)</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="cash" id="pay-cash" />
                <Label htmlFor="pay-cash" className="flex items-center gap-2 cursor-pointer">
                  <Banknote className="w-5 h-5" />
                  Cash
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="card" id="pay-card" />
                <Label htmlFor="pay-card" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="w-5 h-5" />
                  Card
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="split" id="pay-split" />
                <Label htmlFor="pay-split" className="cursor-pointer">Split Payment</Label>
              </div>
            </RadioGroup>

            {paymentMethod === 'split' && (
              <div className="grid grid-cols-2 gap-2">
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

            <Button className="w-full h-12 text-lg" onClick={handlePayment} disabled={createOrder.isPending}>
              {createOrder.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Complete Order
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
