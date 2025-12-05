import { useState, useMemo } from 'react';
import { useSearch } from 'wouter';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { useCart } from '@/contexts/CartContext';
import { Search, ShoppingCart, Truck, Store, ChevronRight, ArrowLeft } from 'lucide-react';
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
  const { state, setOrderType, itemCount, total } = useCart();

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

  // Render subcategory cards
  const renderSubcategoryCards = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {categorySubcategories.map((subcategory) => {
        const productCount = menuData?.products.filter(p => p.subcategoryId === subcategory.id).length || 0;
        const imageUrl = SUBCATEGORY_IMAGES[subcategory.slug] || '/images/shopfront.jpg';
        
        return (
          <button
            key={subcategory.id}
            onClick={() => handleSubcategoryClick(subcategory.slug)}
            className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary transition-all duration-300 hover:shadow-lg text-left"
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
  );

  // Render product grid
  const renderProductGrid = (products: typeof subcategoryProducts) => {
    const subcategory = selectedSubcategory ? getSubcategory(selectedSubcategory) : null;
    
    return (
      <div className="space-y-4">
        {selectedSubcategory && subcategory && (
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToSubcategories}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{subcategory.name}</h2>
              {subcategory.chineseName && (
                <p className="text-muted-foreground">{subcategory.chineseName}</p>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => {
            const sub = getSubcategoryById(product.subcategoryId);
            if (!sub) return null;
            return (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  imageUrl: product.imageUrl || PRODUCT_IMAGES[product.slug] || null,
                }}
                subcategory={sub}
                isDelivery={state.orderType === 'delivery'}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Render category overview (all categories with subcategories)
  const renderCategoryOverview = () => (
    <div className="space-y-12">
      {menuData?.categories.map((category) => {
        const subcategories = menuData.subcategories.filter(s => s.categoryId === category.id);
        if (subcategories.length === 0) return null;

        return (
          <section key={category.id}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{category.name}</h2>
                {category.description && (
                  <p className="text-muted-foreground">{category.description}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCategoryClick(category.slug)}
                className="gap-2"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {subcategories.slice(0, 5).map((subcategory) => {
                const productCount = menuData.products.filter(p => p.subcategoryId === subcategory.id).length;
                const imageUrl = SUBCATEGORY_IMAGES[subcategory.slug] || '/images/shopfront.jpg';
                
                return (
                  <button
                    key={subcategory.id}
                    onClick={() => {
                      setSelectedCategory(category.slug);
                      setSelectedSubcategory(subcategory.slug);
                    }}
                    className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary transition-all duration-300 hover:shadow-lg text-left"
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
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <h3 className="font-semibold text-sm">{subcategory.name}</h3>
                      <p className="text-xs text-white/60">{productCount} items</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );

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
              <TabsList className="grid w-full sm:w-auto grid-cols-2">
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

      {/* Category Pills */}
      <div className="sticky top-[120px] sm:top-[104px] z-30 bg-background border-b border-border">
        <div className="container py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => handleBackToCategories()}
              className={`category-pill ${selectedCategory === 'all' ? 'category-pill-active' : 'category-pill-inactive'}`}
            >
              All
            </button>
            {menuData?.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className={`category-pill ${selectedCategory === category.slug ? 'category-pill-active' : 'category-pill-inactive'}`}
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
            <h2 className="text-xl font-bold">Search Results for "{searchQuery}"</h2>
            {searchResults.length === 0 ? (
              <p className="text-muted-foreground">No products found</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {searchResults.map((product) => {
                  const sub = getSubcategoryById(product.subcategoryId);
                  if (!sub) return null;
                  return (
                    <ProductCard
                      key={product.id}
                      product={{
                        ...product,
                        imageUrl: product.imageUrl || PRODUCT_IMAGES[product.slug] || null,
                      }}
                      subcategory={sub}
                      isDelivery={state.orderType === 'delivery'}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : selectedCategory === 'all' ? (
          // Category Overview
          renderCategoryOverview()
        ) : selectedSubcategory ? (
          // Products in Subcategory
          renderProductGrid(subcategoryProducts)
        ) : (
          // Subcategories in Category
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToCategories}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                All Categories
              </Button>
              <h2 className="text-2xl font-bold">
                {menuData?.categories.find(c => c.slug === selectedCategory)?.name}
              </h2>
            </div>
            {renderSubcategoryCards()}
          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <Link href="/cart">
            <Button className="w-full h-14 text-lg shadow-lg">
              <ShoppingCart className="w-5 h-5 mr-2" />
              View Cart ({itemCount} items) - {formatPrice(Math.round(total * 1.05))}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
