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
import { Search, ShoppingCart, Truck, Store, ChevronRight, ArrowLeft, Home, AlertCircle, MapPin, Sparkles, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'wouter';
import { formatPrice, OUTLET_HOURS, CHENNAI_AREAS, DELIVERY_CONFIG } from '@shared/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Product image mapping
const PRODUCT_IMAGES: Record<string, string> = {
  'hazelnut-milk-tea': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606592/taiwan-maami/static/WkPwhHgxpahbIVvi.jpg',
  'caramel-milk-tea': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606639/taiwan-maami/static/ycWWgbSAUZVoaeTy.jpg',
  'butterscotch-milk-oolong': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606626/taiwan-maami/static/pYbRhiNlPbOcebsT.webp',
  'creme-brulee-oolong-latte': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606632/taiwan-maami/static/uefHOGNUJaQUNIhx.jpg',
  'creme-caramel-taro-latte': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606566/taiwan-maami/static/CdvihcYqWwSGVVqs.jpg',
  'banoffee-matcha-latte': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606569/taiwan-maami/static/FpNjaMkCtHPSSjAg.webp',
  'dragon-speck-mochi': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606579/taiwan-maami/static/JIfaoWUoeItjtLNs.webp',
  'mango-mochi': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606613/taiwan-maami/static/gijTUDecXirMLNbg.webp',
  'banoffee-mochi': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606629/taiwan-maami/static/soALHhslexdCuzFf.webp',
  'biang-biang-noodles': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606617/taiwan-maami/static/kTxbrdufpmJRQCdX.jpg',
  'yaki-onigiri': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606621/taiwan-maami/static/lQcSLUexheHdEdYh.webp',
  'stir-fried-veg-cong-you-bing': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606556/taiwan-maami/static/AcVAopeVLVKfoKoM.jpg',
  'cheesy-corn-cong-you-bing': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606572/taiwan-maami/static/HzuOkwViKWywSApJ.jpg',
  'egg-cong-you-bing': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606582/taiwan-maami/static/NyxsfcZEQisPUFXb.jpg',
  'velvety-aubergine-stew-noodle': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606589/taiwan-maami/static/VumwBnugNbUPZfGP.webp',
  'boba-creme-caramel': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606595/taiwan-maami/static/aJzlzKDqlmGFMmbT.webp',
};

// Subcategory image mapping
const SUBCATEGORY_IMAGES: Record<string, string> = {
  'organic-black-tea': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606639/taiwan-maami/static/ycWWgbSAUZVoaeTy.jpg',
  'organic-oolong-tea': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606626/taiwan-maami/static/pYbRhiNlPbOcebsT.webp',
  'organic-green-tea': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606575/taiwan-maami/static/IWpHWvXBnTknigfp.webp',
  'matcha-blend': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606569/taiwan-maami/static/FpNjaMkCtHPSSjAg.webp',
  'taro-blend': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606566/taiwan-maami/static/CdvihcYqWwSGVVqs.jpg',
  'iced-coffee': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606592/taiwan-maami/static/WkPwhHgxpahbIVvi.jpg',
  'hot-coffee': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606592/taiwan-maami/static/WkPwhHgxpahbIVvi.jpg',
  'fruit-mochi': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606613/taiwan-maami/static/gijTUDecXirMLNbg.webp',
  'signature-mochi': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606579/taiwan-maami/static/JIfaoWUoeItjtLNs.webp',
  'noodles': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606617/taiwan-maami/static/kTxbrdufpmJRQCdX.jpg',
  'flat-bread': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606556/taiwan-maami/static/AcVAopeVLVKfoKoM.jpg',
  'onigiri': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606621/taiwan-maami/static/lQcSLUexheHdEdYh.webp',
  'desserts': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606595/taiwan-maami/static/aJzlzKDqlmGFMmbT.webp',
  'pillow-brioche': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606607/taiwan-maami/static/fwbObkBdJAfUquQz.jpg',
  'fruit-slush': 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606635/taiwan-maami/static/wtAnUeYdJDFoSgKS.jpg',
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

  // Delivery zone check state
  const [deliveryAreaConfirmed, setDeliveryAreaConfirmed] = useState<string | null>(() => {
    return localStorage.getItem('deliveryAreaConfirmed');
  });
  const [deliveryAreaOpen, setDeliveryAreaOpen] = useState(false);
  const [selectedDeliveryArea, setSelectedDeliveryArea] = useState('');
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [deliveryCheckResult, setDeliveryCheckResult] = useState<{
    chargePaise: number;
    chargeRupees: number;
    tierLabel: string;
    distanceKm: number;
    distanceText: string;
    durationText: string;
  } | null>(null);
  const [showAddToOrderBanner, setShowAddToOrderBanner] = useState(false);
  const { state, setOrderType, setTableNumber, tableNumber, setPickupOutlet, pickupOutlet, setInstoreOutlet, instoreOutlet, itemCount, subtotal, total, setActiveOrderId } = useCart();
  
  // Check for active order if table number is in URL
  const { data: activeOrder } = trpc.orders.getActiveOrderForTable.useQuery(
    { tableNumber: tableFromUrl || '' },
    { enabled: !!tableFromUrl }
  );
  
  // Auto-set order type from URL params - only on initial mount
  // IMPORTANT: Only call setOrderType if the type actually differs from current state,
  // because setOrderType clears outlet selections (instoreOutlet/pickupOutlet)
  const initialOrderTypeSet = useRef(false);
  useEffect(() => {
    if (orderTypeFromUrl && !initialOrderTypeSet.current) {
      initialOrderTypeSet.current = true;
      const validType = orderTypeFromUrl as 'instore' | 'delivery' | 'pickup';
      // Only change order type if it's actually different to avoid clearing outlet
      if (['instore', 'delivery', 'pickup'].includes(validType) && state.orderType !== validType) {
        setOrderType(validType);
      }
      // Set outlet from URL params if provided (for instore/pickup)
      if (outletFromUrl === 'palladium' || outletFromUrl === 'tnagar') {
        if (validType === 'instore' || state.orderType === 'instore') {
          setInstoreOutlet(outletFromUrl);
        } else if (validType === 'pickup' || state.orderType === 'pickup') {
          setPickupOutlet(outletFromUrl);
        }
      }
    }
  }, [orderTypeFromUrl, outletFromUrl, state.orderType, setOrderType, setInstoreOutlet, setPickupOutlet]);

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

  // Delivery zone check - build address string for the query
  const deliveryCheckAddress = useMemo(() => {
    if (!selectedDeliveryArea || !isCheckingDelivery) return '';
    const areaObj = CHENNAI_AREAS.find(a => a.area === selectedDeliveryArea);
    return `${selectedDeliveryArea}, Chennai, Tamil Nadu ${areaObj?.pincode || '600000'}`;
  }, [selectedDeliveryArea, isCheckingDelivery]);

  const { data: deliveryCheckData, isFetching: isFetchingDeliveryCheck } = trpc.orders.getDeliveryCharge.useQuery(
    { deliveryAddress: deliveryCheckAddress },
    { 
      enabled: deliveryCheckAddress.length > 10,
      staleTime: 10 * 60 * 1000,
    }
  );

  // Update result when data arrives
  useEffect(() => {
    if (deliveryCheckData && isCheckingDelivery) {
      setDeliveryCheckResult(deliveryCheckData);
      setIsCheckingDelivery(false);
    }
  }, [deliveryCheckData, isCheckingDelivery]);

  const checkDeliveryArea = () => {
    if (!selectedDeliveryArea) {
      toast.error('Please select your delivery area');
      return;
    }
    setIsCheckingDelivery(true);
  };

  const confirmDeliveryArea = () => {
    localStorage.setItem('deliveryAreaConfirmed', selectedDeliveryArea);
    setDeliveryAreaConfirmed(selectedDeliveryArea);
    setDeliveryCheckResult(null);
  };

  const changeDeliveryArea = () => {
    localStorage.removeItem('deliveryAreaConfirmed');
    setDeliveryAreaConfirmed(null);
    setSelectedDeliveryArea('');
    setDeliveryCheckResult(null);
  };
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
    return menuData.subcategories.filter(s => s.categoryId === category.id);
  }, [menuData, selectedCategory]);

  // Get products for selected subcategory (filtered by outlet availability)
  const subcategoryProducts = useMemo(() => {
    if (!menuData || !selectedSubcategory) return [];
    const subcategory = menuData.subcategories.find(s => s.slug === selectedSubcategory);
    if (!subcategory) return [];
    return menuData.products.filter(p => p.subcategoryId === subcategory.id);
  }, [menuData, selectedSubcategory]);

  // Search results across all products (filtered by outlet availability)
  const searchResults = useMemo(() => {
    if (!menuData || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return menuData.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(query) ||
        p.chineseName?.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [menuData, searchQuery]);

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
      {/* Maami Bot CTA - encourage users to ask for recommendations */}
      <button
        onClick={() => {
          // Find and click the chat widget button
          const chatBtn = document.querySelector('[aria-label="Open chat assistant"]') as HTMLButtonElement;
          if (chatBtn) chatBtn.click();
        }}
        className="w-full flex items-center gap-3 bg-gradient-to-r from-[#c0392b]/5 to-[#e74c3c]/10 border border-[#c0392b]/20 rounded-xl px-4 py-3 hover:from-[#c0392b]/10 hover:to-[#e74c3c]/15 transition-all group cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full bg-[#c0392b]/10 flex items-center justify-center shrink-0 group-hover:bg-[#c0392b]/20 transition-colors">
          <Sparkles className="w-5 h-5 text-[#c0392b]" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">Not sure what to order?</p>
          <p className="text-xs text-muted-foreground">Ask Maami Bot for personalized recommendations!</p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#c0392b] ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>
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
          
          // Show all subcategories for this category (no outlet filtering)
          const subcategories = menuData.subcategories.filter(s => s.categoryId === category.id);
          const productCount = menuData.products.filter(p => 
            subcategories.some(s => s.id === p.subcategoryId)
          ).length;
          
          // Hide category if no subcategories available at this outlet
          if (subcategories.length === 0 || productCount === 0) return null;

          // Get a representative image from the first subcategory
          const firstSub = subcategories[0];
          const imageUrl = firstSub?.imageUrl || SUBCATEGORY_IMAGES[firstSub?.slug] || 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606603/taiwan-maami/static/fYHiyJVvyVYquZaW.webp';

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
                    (e.target as HTMLImageElement).src = 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606603/taiwan-maami/static/fYHiyJVvyVYquZaW.webp';
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
            const imageUrl = subcategory.imageUrl || SUBCATEGORY_IMAGES[subcategory.slug] || 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606603/taiwan-maami/static/fYHiyJVvyVYquZaW.webp';
            
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
                      (e.target as HTMLImageElement).src = 'https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606603/taiwan-maami/static/fYHiyJVvyVYquZaW.webp';
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
    
    // Check if product is available at selected outlet
    const isProductAvailableAtOutlet = (product: typeof products[0]) => {
      const prod = product as any;
      if (currentOutlet === 'palladium' && prod.availableAtPalladium === false) return false;
      if (currentOutlet === 'tnagar' && prod.availableAtTnagar === false) return false;
      return true;
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
          {products.filter((product) => product.isActive !== false).map((product) => {
            const sub = getSubcategoryById(product.subcategoryId);
            if (!sub) return null;
            // Find the category for this product's subcategory
            const cat = menuData?.categories.find(c => c.id === sub.categoryId);
            const isAvailableAtOutlet = isProductAvailableAtOutlet(product);
            
            return (
              <div key={product.id}>
                <ProductCard
                  product={{
                    ...product,
                    imageUrl: product.imageUrl || PRODUCT_IMAGES[product.slug] || null,
                    imageUrl2: (product as any).imageUrl2 || null,
                    imageUrl3: (product as any).imageUrl3 || null,
                    isInStock: isAvailableAtOutlet ? product.isInStock : false,
                  }}
                  subcategory={sub}
                  category={cat}
                  isDelivery={state.orderType !== 'instore'}
                  orderType={state.orderType}
                  notAvailableAtOutlet={!isAvailableAtOutlet}
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
                      onClick={() => {
                        if (!OUTLET_HOURS.palladium.orderingEnabled) {
                          toast('Online ordering not available at Palladium Mall yet. Please select T. Nagar.', { icon: '🚫' });
                          return;
                        }
                        setInstoreOutlet('palladium');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        instoreOutlet === 'palladium'
                          ? 'bg-primary text-white shadow-md'
                          : !OUTLET_HOURS.palladium.orderingEnabled
                            ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed line-through'
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
                    onClick={() => {
                      if (!OUTLET_HOURS.palladium.orderingEnabled) {
                        toast('Online ordering not available at Palladium Mall yet. Please select T. Nagar.', { icon: '🚫' });
                        return;
                      }
                      setPickupOutlet('palladium');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      pickupOutlet === 'palladium'
                        ? 'bg-primary text-white shadow-md'
                        : !OUTLET_HOURS.palladium.orderingEnabled
                          ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed line-through'
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

            {/* Delivery - show confirmed area with charge info */}
            {state.orderType === 'delivery' && (
              deliveryEnabled ? (
                deliveryAreaConfirmed ? (
                  <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <MapPin className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="text-sm font-medium text-green-800">Delivering to <strong>{deliveryAreaConfirmed}</strong></span>
                      <button
                        onClick={changeDeliveryArea}
                        className="ml-auto text-xs text-primary hover:underline font-medium shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                    <Truck className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-primary">Delivery from T. Nagar</span>
                  </div>
                )
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
      {(state.orderType === 'delivery' && !deliveryAreaConfirmed && deliveryEnabled) ? (
        /* Block menu access until delivery area is confirmed */
        <div className="container py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Where should we deliver?</h2>
            <p className="text-muted-foreground mb-6">
              Select your area to check delivery availability and charges.
            </p>

            {/* Area selector combobox */}
            <div className="mb-6">
              <Popover open={deliveryAreaOpen} onOpenChange={setDeliveryAreaOpen}>
                <PopoverTrigger asChild>
                  <button
                    role="combobox"
                    aria-expanded={deliveryAreaOpen}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-border hover:border-primary transition-all bg-white text-left"
                  >
                    <span className={selectedDeliveryArea ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {selectedDeliveryArea || 'Search your area...'}
                    </span>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-4rem)] sm:w-[400px] p-0" align="center">
                  <Command>
                    <CommandInput placeholder="Type your area name..." />
                    <CommandList>
                      <CommandEmpty>Area not found. Try a nearby area.</CommandEmpty>
                      <CommandGroup className="max-h-[250px] overflow-y-auto">
                        {CHENNAI_AREAS.map((area) => (
                          <CommandItem
                            key={area.area}
                            value={area.area}
                            onSelect={(val) => {
                              setSelectedDeliveryArea(val === selectedDeliveryArea ? '' : area.area);
                              setDeliveryAreaOpen(false);
                              setDeliveryCheckResult(null);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', selectedDeliveryArea === area.area ? 'opacity-100' : 'opacity-0')} />
                            <span>{area.area}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{area.pincode}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Check button */}
            {!deliveryCheckResult && (
              <button
                onClick={checkDeliveryArea}
                disabled={!selectedDeliveryArea || isCheckingDelivery || isFetchingDeliveryCheck}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(isCheckingDelivery || isFetchingDeliveryCheck) ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Checking...</>
                ) : (
                  <>Check Delivery</>  
                )}
              </button>
            )}

            {/* Result card */}
            {deliveryCheckResult && (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-800">We deliver to {selectedDeliveryArea}!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-left">
                      <span className="text-muted-foreground">Distance</span>
                      <p className="font-semibold">{deliveryCheckResult.distanceText || `${deliveryCheckResult.distanceKm} km`}</p>
                    </div>
                    <div className="text-left">
                      <span className="text-muted-foreground">Est. Time</span>
                      <p className="font-semibold">{deliveryCheckResult.durationText || 'N/A'}</p>
                    </div>
                    <div className="text-left col-span-2">
                      <span className="text-muted-foreground">Delivery Charge</span>
                      <p className="font-bold text-lg text-primary">{deliveryCheckResult.tierLabel}</p>
                      <p className="text-xs text-muted-foreground">Free delivery on orders above {formatPrice(DELIVERY_CONFIG.freeDeliveryThresholdPaise)}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={confirmDeliveryArea}
                  className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold text-lg transition-all hover:bg-amber-700 flex items-center justify-center gap-2"
                >
                  Continue to Menu
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    setSelectedDeliveryArea('');
                    setDeliveryCheckResult(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Choose a different area
                </button>
              </div>
            )}

            {/* Alternative options */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Or try another option:</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setOrderType('pickup')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium"
                >
                  <Store className="w-4 h-4" />
                  Pickup
                </button>
                <button
                  onClick={() => setOrderType('instore')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium"
                >
                  <Home className="w-4 h-4" />
                  Dine In
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : ((state.orderType === 'instore' && !instoreOutlet) || (state.orderType === 'pickup' && !pickupOutlet)) ? (
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
                  if (!OUTLET_HOURS.palladium.orderingEnabled) {
                    toast('Online ordering not available at Palladium Mall yet. Please select T. Nagar.', { icon: '🚫' });
                    return;
                  }
                  if (state.orderType === 'instore') {
                    setInstoreOutlet('palladium');
                  } else {
                    setPickupOutlet('palladium');
                  }
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all group ${
                  !OUTLET_HOURS.palladium.orderingEnabled
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    : 'border-border hover:border-primary hover:bg-primary/5'
                }`}
              >
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${!OUTLET_HOURS.palladium.orderingEnabled ? 'bg-gray-100' : 'bg-primary/10'}`}>
                  <Store className={`w-7 h-7 ${!OUTLET_HOURS.palladium.orderingEnabled ? 'text-gray-400' : 'text-primary'}`} />
                </div>
                <div className="text-left flex-1">
                  <h3 className={`font-bold text-lg transition-colors ${!OUTLET_HOURS.palladium.orderingEnabled ? 'text-gray-400' : 'group-hover:text-primary'}`}>Palladium Mall</h3>
                  <p className="text-sm text-muted-foreground">Velachery, Chennai</p>
                  {!OUTLET_HOURS.palladium.orderingEnabled && (
                    <p className="text-xs text-orange-600 font-medium mt-1">Online ordering coming soon</p>
                  )}
                </div>
                <ChevronRight className={`w-6 h-6 ${!OUTLET_HOURS.palladium.orderingEnabled ? 'text-gray-300' : 'text-muted-foreground group-hover:text-primary'} transition-colors`} />
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
                  const prod = product as any;
                  const isAvailableAtOutlet = (() => {
                    if (currentOutlet === 'palladium' && prod.availableAtPalladium === false) return false;
                    if (currentOutlet === 'tnagar' && prod.availableAtTnagar === false) return false;
                    return true;
                  })();
                  return (
                    <div key={product.id}>
                      <ProductCard
                        product={{
                          ...product,
                          imageUrl: product.imageUrl || PRODUCT_IMAGES[product.slug] || null,
                          imageUrl2: (product as any).imageUrl2 || null,
                          imageUrl3: (product as any).imageUrl3 || null,
                          isInStock: isAvailableAtOutlet ? product.isInStock : false,
                        }}
                        subcategory={sub}
                        category={cat}
                        isDelivery={state.orderType !== 'instore'}
                        orderType={state.orderType}
                        notAvailableAtOutlet={!isAvailableAtOutlet}
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

      {/* Floating Cart Button with Free Delivery Nudge */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2">
          {/* Free delivery nudge - show when delivery order is within ₹500 of ₹2,500 threshold */}
          {state.orderType === 'delivery' && subtotal > 0 && subtotal < DELIVERY_CONFIG.freeDeliveryThresholdPaise && subtotal >= (DELIVERY_CONFIG.freeDeliveryThresholdPaise - 50000) && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 text-center shadow-lg animate-in slide-in-from-bottom-2">
              <p className="text-sm font-medium text-amber-800">
                🚚 Add <strong>{formatPrice(DELIVERY_CONFIG.freeDeliveryThresholdPaise - subtotal)}</strong> more for <strong>FREE delivery!</strong>
              </p>
            </div>
          )}
          {state.orderType === 'delivery' && subtotal >= DELIVERY_CONFIG.freeDeliveryThresholdPaise && (
            <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-2 text-center shadow-lg">
              <p className="text-sm font-medium text-green-700">🎉 You've unlocked <strong>FREE delivery!</strong></p>
            </div>
          )}
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
                if (!OUTLET_HOURS.palladium.orderingEnabled) {
                  toast('Online ordering not available at Palladium Mall yet. Please select T. Nagar.', { icon: '🚫' });
                  return;
                }
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
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all group ${
                !OUTLET_HOURS.palladium.orderingEnabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-border hover:border-primary hover:bg-primary/5'
              }`}
            >
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${!OUTLET_HOURS.palladium.orderingEnabled ? 'bg-gray-100' : 'bg-primary/10'}`}>
                <Store className={`w-8 h-8 ${!OUTLET_HOURS.palladium.orderingEnabled ? 'text-gray-400' : 'text-primary'}`} />
              </div>
              <div className="text-left flex-1">
                <h3 className={`font-bold text-lg transition-colors ${!OUTLET_HOURS.palladium.orderingEnabled ? 'text-gray-400' : 'group-hover:text-primary'}`}>Palladium Mall</h3>
                <p className="text-sm text-muted-foreground">Velachery, Chennai</p>
                {!OUTLET_HOURS.palladium.orderingEnabled && (
                  <p className="text-xs text-orange-600 font-medium mt-1">Online ordering coming soon</p>
                )}
              </div>
              <ChevronRight className={`w-6 h-6 ${!OUTLET_HOURS.palladium.orderingEnabled ? 'text-gray-300' : 'text-muted-foreground group-hover:text-primary'} transition-colors`} />
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
