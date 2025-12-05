import { useState, useMemo } from 'react';
import { useSearch } from 'wouter';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { useCart } from '@/contexts/CartContext';
import { Search, ShoppingCart, Truck, Store } from 'lucide-react';
import { Link } from 'wouter';
import { formatPrice } from '@shared/types';

export default function Menu() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialCategory = params.get('category') || 'all';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const { state, setOrderType, itemCount, total } = useCart();

  const { data: menuData, isLoading } = trpc.menu.getFullMenu.useQuery({
    isDelivery: state.orderType === 'delivery',
  });

  // Group products by subcategory
  const groupedProducts = useMemo(() => {
    if (!menuData) return {};

    const filtered = menuData.products.filter((product) => {
      // Filter by category
      if (selectedCategory !== 'all') {
        const subcategory = menuData.subcategories.find(s => s.id === product.subcategoryId);
        const category = menuData.categories.find(c => c.id === subcategory?.categoryId);
        if (category?.slug !== selectedCategory) return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.chineseName?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Group by subcategory
    const grouped: Record<number, typeof filtered> = {};
    filtered.forEach((product) => {
      if (!grouped[product.subcategoryId]) {
        grouped[product.subcategoryId] = [];
      }
      grouped[product.subcategoryId].push(product);
    });

    return grouped;
  }, [menuData, selectedCategory, searchQuery]);

  // Get subcategory info
  const getSubcategory = (id: number) => menuData?.subcategories.find(s => s.id === id);
  const getCategory = (subcategoryId: number) => {
    const sub = getSubcategory(subcategoryId);
    return menuData?.categories.find(c => c.id === sub?.categoryId);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      {/* Order Type Toggle */}
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
              onClick={() => setSelectedCategory('all')}
              className={`category-pill ${selectedCategory === 'all' ? 'category-pill-active' : 'category-pill-inactive'}`}
            >
              All
            </button>
            {menuData?.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.slug)}
                className={`category-pill ${selectedCategory === category.slug ? 'category-pill-active' : 'category-pill-inactive'}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="container py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="product-card animate-pulse bg-secondary" />
            ))}
          </div>
        ) : Object.keys(groupedProducts).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedProducts).map(([subcategoryId, products]) => {
              const subcategory = getSubcategory(Number(subcategoryId));
              const category = getCategory(Number(subcategoryId));
              if (!subcategory) return null;

              return (
                <section key={subcategoryId}>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold">{subcategory.name}</h2>
                    {subcategory.chineseName && (
                      <p className="text-sm text-muted-foreground">{subcategory.chineseName}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        subcategory={subcategory}
                        isDelivery={state.orderType === 'delivery'}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
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
