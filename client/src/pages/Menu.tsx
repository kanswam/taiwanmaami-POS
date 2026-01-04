import { useState, useMemo, useEffect } from 'react';
import { useSearch } from 'wouter';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { useCart } from '@/contexts/CartContext';
import { Search, ShoppingCart, Truck, Store, ChevronRight, ArrowLeft, Home } from 'lucide-react';
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

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(initialSubcategory);
  const [searchQuery, setSearchQuery] = useState('');
  const { state, setOrderType, setTableNumber, tableNumber, itemCount, total } = useCart();


  const { data: menuData, isLoading } = trpc.menu.getFullMenu.useQuery({
    isDelivery: state.orderType === 'delivery',
  });

  // Get subcategories for selected category
  const categorySubcategories = useMemo(() => {
    if (!menuData || selectedCategory === 'all') return [];
    const category = menuData.categories.find(c => c.slug === selectedCategory);
    if (!category) return [];
    return menuData.subcategories.filter(s => s.categoryId === category.id);
  }, [menuData, selectedCategory]);

  // Get products for selected subcategory
  const subcategoryProducts = useMemo(() => {
    if (!menuData || !selectedSubcategory) return [];
    const subcategory = menuData.subcategories.find(s => s.slug === selectedSubcategory);
    if (!subcategory) return [];
    return menuData.products.filter(p => p.subcategoryId === subcategory.id);
  }, [menuData, selectedSubcategory]);

  // Search results across all products
  const searchResults = useMemo(() => {
    if (!menuData || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return menuData.products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.chineseName?.toLowerCase().includes(query)
    );
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
          
          const subcategories = menuData.subcategories.filter(s => s.categoryId === category.id);
          const productCount = menuData.products.filter(p => 
            subcategories.some(s => s.id === p.subcategoryId)
          ).length;
          
          if (productCount === 0) return null;

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
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-bold text-lg leading-tight">{category.name}</h3>
                <p className="text-sm text-white/70 mt-1">{subcategories.length} subcategories • {productCount} items</p>
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
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/shopfront.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-bold text-lg">{subcategory.name}</h3>
                  {subcategory.chineseName && (
                    <p className="text-sm text-white/80">{subcategory.chineseName}</p>
                  )}
                  <p className="text-xs text-white/60 mt-1">{productCount} items</p>
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
          {products.map((product) => {
            const sub = getSubcategoryById(product.subcategoryId);
            if (!sub) return null;
            // Find the category for this product's subcategory
            const cat = menuData?.categories.find(c => c.id === sub.categoryId);
            return (
              <ProductCard
                key={product.id}
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
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      {/* Order Type Toggle & Search */}
      <div className="sticky top-16 z-40 bg-background border-b border-border">
        <div className="container py-3">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs
              value={state.orderType}
              onValueChange={(v) => setOrderType(v as 'delivery' | 'pickup' | 'instore')}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full sm:w-auto grid-cols-3">
                <TabsTrigger value="instore" className="gap-2">
                  <Home className="w-4 h-4" />
                  In-store
                </TabsTrigger>
                <TabsTrigger value="delivery" className="gap-2">
                  <Truck className="w-4 h-4" />
                  Delivery
                </TabsTrigger>
                <TabsTrigger value="pickup" className="gap-2">
                  <Store className="w-4 h-4" />
                  Pickup
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Table Number for In-store */}
            {state.orderType === 'instore' && (
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
                  return (
                    <ProductCard
                      key={product.id}
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
    </div>
  );
}
