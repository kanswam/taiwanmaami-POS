import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearch } from 'wouter';
import { Header } from '@/components/Header';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { useCart } from '@/contexts/CartContext';
import { Search, ShoppingCart, Truck, Store, ChevronRight, ArrowLeft, Home, AlertCircle, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'wouter';
import { formatPrice } from '@shared/types';

// Product image mapping
const PRODUCT_IMAGES: Record<string, string> = {
  'hazelnut-milk-tea': '/images/hazelnut-milk-tea.jpg',
  'caramel-milk-tea': '/images/caramel-milk-tea.jpg',
  'butterscotch-milk-oolong': '/images/butterscotch-milk-oolong.jpg',
  'creme-brulee-oolong-latte': '/images/creme-brulee-oolong-latte.jpg',
  'creme-caramel-taro-latte': '/images/creme-caramel-taro-latte.jpg',
  'banoffee-matcha-latte': '/images/banoffee-matcha-latte.jpg',
  'dragon-speck-mochi': '/images/dragon-speck-mochi.jpg',
  'mango-mochi': '/images/mango-mochi.jpg',
  'banoffee-mochi': '/images/banoffee-mochi.jpg',
  'biang-biang-noodles': '/images/biang-biang-noodles.jpg',
  'yaki-onigiri': '/images/yaki-onigiri.jpg',
  'stir-fried-veg-cong-you-bing': '/images/stir-fried-veg-cong-you-bing.jpg',
  'cheesy-corn-cong-you-bing': '/images/cheesy-corn-cong-you-bing.jpg',
  'egg-cong-you-bing': '/images/egg-cong-you-bing.jpg',
  'velvety-aubergine-stew-noodle': '/images/velvety-aubergine-stew-noodle.jpg',
  'boba-creme-caramel': '/images/boba-creme-caramel.jpg',
};

// Subcategory image mapping
const SUBCATEGORY_IMAGES: Record<string, string> = {
  'organic-black-tea': '/images/caramel-milk-tea.jpg',
  'organic-oolong-tea': '/images/butterscotch-milk-oolong.jpg',
  'organic-green-tea': '/images/cucumber-drink.jpg',
  'matcha-blend': '/images/banoffee-matcha-latte.jpg',
  'taro-blend': '/images/creme-caramel-taro-latte.jpg',
  'iced-coffee': '/images/hazelnut-milk-tea.jpg',
  'hot-coffee': '/images/hazelnut-milk-tea.jpg',
  'fruit-mochi': '/images/mango-mochi.jpg',
  'signature-mochi': '/images/dragon-speck-mochi.jpg',
  'noodles': '/images/biang-biang-noodles.jpg',
  'flat-bread': '/images/stir-fried-veg-cong-you-bing.jpg',
  'onigiri': '/images/yaki-onigiri.jpg',
  'desserts': '/images/boba-creme-caramel.jpg',
  'pillow-brioche': '/images/egg-mayo-onigiri.jpg',
  'fruit-slush': '/images/popping-boba.jpg',
};

export default function Menu() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialCategory = params.get('category') || 'all';
  const initialSubcategory = params.get('subcategory') || null;
  const tableFromUrl = params.get('table');
  const outletFromUrl = params.get('outlet');
  const orderTypeFromUrl = params.get('type'); // instore, delivery, pickup

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(initialSubcategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [pendingOrderType, setPendingOrderType] = useState<'instore' | 'pickup' | null>(null);
  const [showAddToOrderBanner, setShowAddToOrderBanner] = useState(false);
  const { state, setOrderType, setTableNumber, tableNumber, setPickupOutlet, pickupOutlet, setInstoreOutlet, instoreOutlet, itemCount, total, setActiveOrderId } = useCart();
  
  // Check for active order if table number is in URL
  const { data: activeOrder } = trpc.orders.getActiveOrderForTable.useQuery(
    { tableNumber: tableFromUrl || '' },
    { enabled: !!tableFromUrl }
  );
  
  // Auto-set order type from URL params - only on initial mount
  const initialOrderTypeSet = useRef(false);
  useEffect(() => {
    if (orderTypeFromUrl && !initialOrderTypeSet.current) {
      initialOrderTypeSet.current = true;
      if (orderTypeFromUrl === 'instore') setOrderType('instore');
      else if (orderTypeFromUrl === 'delivery') setOrderType('delivery');
      else if (orderTypeFromUrl === 'pickup') setOrderType('pickup');
    }
  }, [orderTypeFromUrl, setOrderType]);

  // Auto-set order type and table number from URL params
  useEffect(() => {
    if (tableFromUrl) {
      setOrderType('instore');
      setTableNumber(tableFromUrl);
      // Set instore outlet from URL if provided
      if (outletFromUrl === 'palladium' || outletFromUrl === 'tnagar') {
        setInstoreOutlet(outletFromUrl);
      }
      // Show banner if there's an active order for this table
      if (activeOrder) {
        setShowAddToOrderBanner(true);
        setActiveOrderId(activeOrder.id);
      }
    }
  }, [tableFromUrl, outletFromUrl, activeOrder, setOrderType, setTableNumber, setInstoreOutlet, setActiveOrderId]);


  const { data: menuData, isLoading } = trpc.menu.getFullMenu.useQuery({
    isDelivery: state.orderType === 'delivery',
    isPickup: state.orderType === 'pickup',
  });

  // Get delivery settings (radius and enabled status)
  const { data: deliverySettings } = trpc.menu.getDeliverySettings.useQuery();
  const deliveryRadius = deliverySettings?.deliveryRadius || 15;
  const deliveryEnabled = deliverySettings?.deliveryEnabled !== false;

  // Determine current outlet for filtering
  const currentOutlet = useMemo(() => {
    if (state.orderType === 'instore') return instoreOutlet || outletFromUrl;
    if (state.orderType === 'pickup') return pickupOutlet;
    return null; // delivery - no outlet restriction
  }, [state.orderType, instoreOutlet, outletFromUrl, pickupOutlet]);

  // Get subcategories for selected category (filtered by outlet availability)
  const categorySubcategories = useMemo(() => {
    if (!menuData || selectedCategory === 'all') return [];
    const category = menuData.categories.find(c => c.slug === selectedCategory);
    if (!category) return [];
    return menuData.subcategories.filter(s => {
      if (s.categoryId !== category.id) return false;
      // Filter by outlet availability
      const sub = s as any;
      if (currentOutlet === 'palladium' && sub.availableAtPalladium === false) return false;
      if (currentOutlet === 'tnagar' && sub.availableAtTnagar === false) return false;
      return true;
    });
  }, [menuData, selectedCategory, currentOutlet]);

  // Get products for selected subcategory (filtered by outlet availability)
  const subcategoryProducts = useMemo(() => {
    if (!menuData || !selectedSubcategory) return [];
    const subcategory = menuData.subcategories.find(s => s.slug === selectedSubcategory);
    if (!subcategory) return [];
    return menuData.products.filter(p => {
      if (p.subcategoryId !== subcategory.id) return false;
      // Filter by outlet availability
      const prod = p as any;
      if (currentOutlet === 'palladium' && prod.availableAtPalladium === false) return false;
      if (currentOutlet === 'tnagar' && prod.availableAtTnagar === false) return false;
      return true;
    });
  }, [menuData, selectedSubcategory, currentOutlet]);

  // Search results across all products (filtered by outlet availability)
  const searchResults = useMemo(() => {
    if (!menuData || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return menuData.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(query) ||
        p.chineseName?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      // Filter by outlet availability
      const prod = p as any;
      if (currentOutlet === 'palladium' && prod.availableAtPalladium === false) return false;
      if (currentOutlet === 'tnagar' && prod.availableAtTnagar === false) return false;
      return true;
    });
  }, [menuData, searchQuery, currentOutlet]);

  // Get subcategory info
  const getSubcategory = (slug: string) => menuData?.subcategories.find(s => s.slug === slug);
  const getSubcategoryById = (id: number) => menuData?.subcategories.find(s => s.id === id);
  const getCategoryById = (id: number) => menuData?.categories.find(c => c.id === id);

  const handleCategoryClick = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSelectedSubcategory(null);
    setSearchQuery('');
  };

  const handleSubcategoryClick = (subcategorySlug: string) => {
    setSelectedSubcategory(subcategorySlug);
  };

  const handleBackToSubcategories = () => {
    setSelectedSubcategory(null);
  };

  const handleBackToCategories = () => {
    setSelectedCategory('all');
    setSelectedSubcategory(null);
  };

  // Get current category name for breadcrumb
  const currentCategory = menuData?.categories.find(c => c.slug === selectedCategory);
  const currentSubcategory = selectedSubcategory ? getSubcategory(selectedSubcategory) : null;

  // Render breadcrumb navigation
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
      <button 
        onClick={handleBackToCategories}
        className="flex items-center gap-1 hover:text-primary transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Menu</span>
      </button>
      {selectedCategory !== 'all' && currentCategory && (
        <>
          <ChevronRight className="w-4 h-4" />
          <button 
            onClick={handleBackToSubcategories}
            className={`hover:text-primary transition-colors ${!selectedSubcategory ? 'text-foreground font-medium' : ''}`}
          >
            {currentCategory.name}
          </button>
        </>
      )}
      {selectedSubcategory && currentSubcategory && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{currentSubcategory.name}</span>
        </>
      )}
    </div>
  );

  // Render category cards for main menu view
  const renderCategoryCards = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Browse Categories</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {menuData?.categories.map((category) => {
          // Check if category is available for current order type
          // Note: We show the category but mark products as disabled with appropriate badge
          const cat = category as any;
          const isNotAvailableForOrderType = (
            (state.orderType === 'instore' && cat.availableInstore === false) ||
            (state.orderType === 'delivery' && cat.availableDelivery === false) ||
            (state.orderType === 'pickup' && cat.availablePickup === false)
          );
          
          // Filter subcategories by outlet availability
          const subcategories = menuData.subcategories.filter(s => {
            if (s.categoryId !== category.id) return false;
            const sub = s as any;
            if (currentOutlet === 'palladium' && sub.availableAtPalladium === false) return false;
            if (currentOutlet === 'tnagar' && sub.availableAtTnagar === false) return false;
            return true;
          });
          const productCount = menuData.products.filter(p => 
            subcategories.some(s => s.id === p.subcategoryId)
          ).length;
          
          // Hide category if no subcategories available at this outlet
          if (subcategories.length === 0 || productCount === 0) return null;

          // Get a representative image from the first subcategory
          const firstSub = subcategories[0];
          const imageUrl = firstSub?.imageUrl || SUBCATEGORY_IMAGES[firstSub?.slug] || '/images/shopfront.jpg';

          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.slug)}
              className={`group relative overflow-hidden rounded-2xl bg-card border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-xl text-left ${isNotAvailableForOrderType ? 'opacity-75' : ''}`}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={imageUrl}
                  alt={category.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/shopfront.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                {/* In-store Only badge for categories not available for delivery/pickup */}
                {isNotAvailableForOrderType && (
                  <div className="absolute top-3 left-3">
                    <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      In-store Only
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
                <h3 className="font-bold text-sm sm:text-lg leading-tight line-clamp-2">{category.name}</h3>
                <p className="text-xs sm:text-sm text-white/70 mt-0.5 sm:mt-1">{subcategories.length} subcategories • {productCount} items</p>
              </div>
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <ChevronRight className="w-5 h-5 text-primary" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Render subcategory cards
  const renderSubcategoryCards = () => {
    // Filter out subcategories with 0 products in current mode and check availability
    const visibleSubcategories = categorySubcategories.filter(sub => {
      const count = menuData?.products.filter(p => p.subcategoryId === sub.id).length || 0;
      if (count === 0) return false;
      
      // Check subcategory availability based on order type
      const subAny = sub as any;
      if (state.orderType === 'delivery' && subAny.availableDelivery === false) return false;
      if (state.orderType === 'pickup' && subAny.availablePickup === false) return false;
      if (state.orderType === 'instore' && subAny.availableInstore === false) return false;
      
      return true;
    });
    
    return (
      <div className="space-y-6">
        {renderBreadcrumb()}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{currentCategory?.name}</h2>
            {currentCategory?.description && (
              <p className="text-muted-foreground mt-1">{currentCategory.description}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleSubcategories.map((subcategory) => {
            const productCount = menuData?.products.filter(p => p.subcategoryId === subcategory.id).length || 0;
            const imageUrl = subcategory.imageUrl || SUBCATEGORY_IMAGES[subcategory.slug] || '/images/shopfront.jpg';
            
            return (
              <button
                key={subcategory.id}
                onClick={() => handleSubcategoryClick(subcategory.slug)}
                className="group relative overflow-hidden rounded-xl bg-card border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-lg text-left"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={subcategory.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/shopfront.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
                  <h3 className="font-bold text-sm sm:text-lg leading-tight line-clamp-2">{subcategory.name}</h3>
                  {subcategory.chineseName && (
                    <p className="text-xs sm:text-sm text-white/80 line-clamp-1">{subcategory.chineseName}</p>
                  )}
                  <p className="text-xs text-white/60 mt-0.5 sm:mt-1">{productCount} items</p>
                </div>
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full p-2 group-hover:bg-primary group-hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render product grid
  const renderProductGrid = (products: typeof subcategoryProducts) => {
    const subcategory = selectedSubcategory ? getSubcategory(selectedSubcategory) : null;
    
    // Check if product is available at selected pickup outlet
    const isProductAvailableAtOutlet = (product: typeof products[0]) => {
      return true; // All products available at T Nagar
    };
    
    return (
      <div className="space-y-6">
        {renderBreadcrumb()}
        {selectedSubcategory && subcategory && (
          <div>
            <h2 className="text-2xl font-bold">{subcategory.name}</h2>
            {subcategory.chineseName && (
              <p className="text-muted-foreground">{subcategory.chineseName}</p>
            )}
          </div>
        )}
        
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.filter((product) => product.isAvailable !== false).map((product) => {
            const sub = getSubcategoryById(product.subcategoryId);
            if (!sub) return null;
            // Find the category for this product's subcategory
            const cat = menuData?.categories.find(c => c.id === sub.categoryId);
            const isAvailable = isProductAvailableAtOutlet(product);
            
            return (
              <div key={product.id} className={`relative ${!isAvailable ? 'opacity-50 pointer-events-none' : ''}`}>
                <ProductCard
                  product={{
                    ...product,
                    imageUrl: product.imageUrl || PRODUCT_IMAGES[product.slug] || null,
                    imageUrl2: (product as any).imageUrl2 || null,
                    imageUrl3: (product as any).imageUrl3 || null,
                  }}
                  subcategory={sub}
                  category={cat}
                  isDelivery={state.orderType !== 'instore'}
                  orderType={state.orderType}
                />

              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Menu - Bubble Tea, Food & Mochi"
        description="Browse Taiwan Maami's full menu. Organic bubble tea, matcha, taro drinks, Asian rice & noodles, Taiwanese flatbreads, fresh mochi & desserts. Order online for delivery in Chennai."
        keywords="Taiwan Maami menu, bubble tea menu Chennai, boba menu, mochi menu, Asian food menu Chennai, matcha drinks, taro drinks"
        canonicalPath="/menu"
      />
      <Header />

      {/* Active Order Banner - shown when customer scans table QR and there's an existing order */}
      {showAddToOrderBanner && activeOrder && (
        <div className="bg-blue-600 text-white py-3">
          <div className="container">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <div>
                  <p className="font-semibold">Table {tableFromUrl} has an active order</p>
                  <p className="text-sm text-blue-100">Order #{activeOrder.orderNumber} • {formatPrice(activeOrder.totalAmount)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white text-blue-600 hover:bg-blue-50"
                  onClick={() => setShowAddToOrderBanner(false)}
                >
                  Start New Order
                </Button>
              </div>
            </div>
            <p className="text-sm text-blue-100 mt-2">
              Add more items to your cart and they'll be added to your existing order when you checkout.
            </p>
          </div>
        </div>
      )}

      {/* Order Type Toggle & Search */}
      <div className="sticky top-16 z-40 bg-background border-b border-border">
        <div className="container py-3">
          {/* Order Type Selector - Prominent with icons */}
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Ordering for:</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  // Set order type to instore - the blocking screen will show until outlet is selected
                  setOrderType('instore');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  state.orderType === 'instore'
                    ? 'bg-primary text-white shadow-md scale-105'
                    : 'bg-white border border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Dine In</span>
              </button>
              <button
                onClick={() => setOrderType('delivery')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  state.orderType === 'delivery'
                    ? 'bg-primary text-white shadow-md scale-105'
                    : 'bg-white border border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
                }`}
              >
                <Truck className="w-5 h-5" />
                <span>Delivery</span>
              </button>
              <button
                onClick={() => {
                  // Set order type to pickup - the blocking screen will show until outlet is selected
                  setOrderType('pickup');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  state.orderType === 'pickup'
                    ? 'bg-primary text-white shadow-md scale-105'
                    : 'bg-white border border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
                }`}
              >
                <Store className="w-5 h-5" />
                <span>Pickup</span>
              </button>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">

            {/* Outlet selector for In-store orders */}
            {state.orderType === 'instore' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Location:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setInstoreOutlet('palladium')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        instoreOutlet === 'palladium'
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-white border border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
                      }`}
                    >
                      Palladium Mall
                    </button>
                    <button
                      onClick={() => setInstoreOutlet('tnagar')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        instoreOutlet === 'tnagar'
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-white border border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
                      }`}
                    >
                      T. Nagar
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Table:</span>
                  <Input
                    placeholder="#"
                    value={tableNumber || ''}
                    onChange={(e) => setTableNumber(e.target.value || null)}
                    className="w-16 text-center font-bold"
                    maxLength={3}
                  />
                </div>
              </div>
            )}

            {/* Outlet selector for Pickup orders */}
            {state.orderType === 'pickup' && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Pickup from:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPickupOutlet('palladium')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      pickupOutlet === 'palladium'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white border border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
                    }`}
                  >
                    Palladium Mall
                  </button>
                  <button
                    onClick={() => setPickupOutlet('tnagar')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      pickupOutlet === 'tnagar'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white border border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
                    }`}
                  >
                    T. Nagar
                  </button>
                </div>
              </div>
            )}

            {/* Delivery - automatically T Nagar only */}
            {state.orderType === 'delivery' && (
              deliveryEnabled ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                  <Truck className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-primary">Delivery from T. Nagar only (within {deliveryRadius}km)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-100 border-2 border-red-300 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-700">Delivery is temporarily unavailable. Please choose In-store or Pickup.</span>
                </div>
              )
            )}

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Check if outlet selection is required */}
      {((state.orderType === 'instore' && !instoreOutlet) || (state.orderType === 'pickup' && !pickupOutlet)) ? (
        /* Block menu access until outlet is selected */
        <div className="container py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Select Your Location</h2>
            <p className="text-muted-foreground mb-8">
              {state.orderType === 'instore' 
                ? 'Please select which outlet you are dining at to view the menu.'
                : 'Please select which outlet you want to pick up from to view the menu.'}
            </p>
            <div className="space-y-4">
              <button
                onClick={() => {
                  if (state.orderType === 'instore') {
                    setInstoreOutlet('palladium');
                  } else {
                    setPickupOutlet('palladium');
                  }
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="w-7 h-7 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">Palladium Mall</h3>
                  <p className="text-sm text-muted-foreground">Velachery, Chennai</p>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => {
                  if (state.orderType === 'instore') {
                    setInstoreOutlet('tnagar');
                  } else {
                    setPickupOutlet('tnagar');
                  }
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="w-7 h-7 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">T. Nagar</h3>
                  <p className="text-sm text-muted-foreground">Chennai</p>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Show menu when outlet is selected or order type is delivery */
        <>
      {/* Category Pills - More prominent */}
      <div className="sticky top-[120px] sm:top-[104px] z-30 bg-background border-b border-border shadow-sm">
        <div className="container py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => handleBackToCategories()}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'all' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-secondary hover:bg-secondary/80 text-foreground'
              }`}
            >
              All
            </button>
            {menuData?.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category.slug 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'bg-secondary hover:bg-secondary/80 text-foreground'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl animate-pulse bg-secondary" />
            ))}
          </div>
        ) : searchQuery ? (
          // Search Results
          <div className="space-y-4">
            {renderBreadcrumb()}
            <h2 className="text-xl font-bold">Search Results for "{searchQuery}"</h2>
            {searchResults.length === 0 ? (
              <p className="text-muted-foreground">No products found</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {searchResults.map((product) => {
                  const sub = getSubcategoryById(product.subcategoryId);
                  if (!sub) return null;
                  const cat = getCategoryById(sub.categoryId);
                  // Check Palladium availability for search results too
                  const isAvailable = state.orderType !== 'pickup' || !pickupOutlet || pickupOutlet === 'tnagar' || (product as any).availableAtPalladium !== false;
                  return (
                    <div key={product.id} className={`relative ${!isAvailable ? 'opacity-50 pointer-events-none' : ''}`}>
                      <ProductCard
                        product={{
                          ...product,
                          imageUrl: product.imageUrl || PRODUCT_IMAGES[product.slug] || null,
                          imageUrl2: (product as any).imageUrl2 || null,
                          imageUrl3: (product as any).imageUrl3 || null,
                        }}
                        subcategory={sub}
                        category={cat}
                        isDelivery={state.orderType !== 'instore'}
                        orderType={state.orderType}
                      />

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : selectedCategory === 'all' ? (
          // Category Cards View
          renderCategoryCards()
        ) : selectedSubcategory ? (
          // Products in Subcategory
          renderProductGrid(subcategoryProducts)
        ) : (
          // Subcategories in Category
          renderSubcategoryCards()
        )}
      </main>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <Link href="/cart">
            <Button className="w-full h-14 text-lg shadow-lg">
              <ShoppingCart className="w-5 h-5 mr-2" />
              View Cart ({itemCount} items) - {formatPrice(Math.round(total))}
            </Button>
          </Link>
        </div>
      )}
        </>  
      )}

      {/* Outlet Selection Modal */}
      <Dialog open={showOutletModal} onOpenChange={setShowOutletModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MapPin className="w-6 h-6 text-primary" />
              Select Your Location
            </DialogTitle>
            <DialogDescription>
              {pendingOrderType === 'instore' 
                ? 'Choose which outlet you are dining at'
                : 'Choose which outlet you want to pick up from'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <button
              onClick={() => {
                if (pendingOrderType === 'instore') {
                  setOrderType('instore');
                  setInstoreOutlet('palladium');
                } else if (pendingOrderType === 'pickup') {
                  setOrderType('pickup');
                  setPickupOutlet('palladium');
                }
                setShowOutletModal(false);
                setPendingOrderType(null);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">Palladium Mall</h3>
                <p className="text-sm text-muted-foreground">Velachery, Chennai</p>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
            <button
              onClick={() => {
                if (pendingOrderType === 'instore') {
                  setOrderType('instore');
                  setInstoreOutlet('tnagar');
                } else if (pendingOrderType === 'pickup') {
                  setOrderType('pickup');
                  setPickupOutlet('tnagar');
                }
                setShowOutletModal(false);
                setPendingOrderType(null);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">T. Nagar</h3>
                <p className="text-sm text-muted-foreground">Chennai</p>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
