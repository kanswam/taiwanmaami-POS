import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, Search, Filter, ShoppingCart, ArrowLeft, 
  LogIn, User, LogOut, Play, Image as ImageIcon
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useWholesaleAuth } from '@/contexts/WholesaleAuthContext';
import { toast } from 'sonner';

export default function WholesaleProducts() {
  const { isLoggedIn, customer, logout, token } = useWholesaleAuth();
  // Using sonner toast
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = trpc.wholesale.getCategories.useQuery();
  
  // Fetch products with price info if logged in
  const { data: products, isLoading: productsLoading } = trpc.wholesale.getProducts.useQuery({
    categoryId: selectedCategory || undefined,
    includePrice: isLoggedIn,
  });

  // Fetch cart count if logged in
  const { data: cartItems } = trpc.wholesale.getCart.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  const cartCount = cartItems?.length || 0;

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter((p: { name: string; description?: string | null }) => 
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const addToCartMutation = trpc.wholesale.addToCart.useMutation({
    onSuccess: () => {
      toast.success('Added to cart');
      setAddingToCart(null);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Failed to add to cart');
      setAddingToCart(null);
    },
  });

  const handleAddToCart = (productId: number) => {
    if (!isLoggedIn) {
      toast.error('Please login to add items to cart');
      return;
    }
    setAddingToCart(productId);
    addToCartMutation.mutate({ productId, quantity: 1 });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/wholesale">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Wholesale Catalog</h1>
                <p className="text-sm text-gray-500">Taiwan Maami B2B Portal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <Link href="/wholesale/cart">
                    <Button variant="outline" className="relative">
                      <ShoppingCart className="h-5 w-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    {customer?.businessName}
                  </div>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Link href="/wholesale/login">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login to View Prices
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              All
            </Button>
            {categories?.map((cat: { id: number; name: string }) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Login Banner for non-logged in users */}
        {!isLoggedIn && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-800">Login to view wholesale prices</p>
              <p className="text-sm text-amber-600">Register as a retailer to access our B2B pricing</p>
            </div>
            <div className="flex gap-2">
              <Link href="/wholesale/login">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">Login</Button>
              </Link>
              <Link href="/wholesale/register">
                <Button size="sm" variant="outline" className="border-amber-600 text-amber-600">Register</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {productsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-8 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: {
              id: number;
              name: string;
              slug: string;
              description?: string | null;
              imageUrl?: string | null;
              videoUrl?: string | null;
              unit: string;
              stockQuantity: number;
              isFeatured?: boolean;
              basePrice?: number;
              pricingTiers?: Array<{ minQty: number; price: number }> | null;
            }) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="relative h-48 bg-gray-100">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                  {product.videoUrl && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      Video
                    </div>
                  )}
                  {product.isFeatured && (
                    <Badge className="absolute top-2 left-2 bg-amber-600">Featured</Badge>
                  )}
                  {product.stockQuantity <= 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-medium">Out of Stock</span>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-4">
                  <Link href={`/wholesale/products/${product.slug}`}>
                    <h3 className="font-semibold text-lg mb-1 hover:text-amber-600 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {product.description || 'No description available'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    {isLoggedIn && product.basePrice ? (
                      <div>
                        <p className="text-lg font-bold text-amber-600">
                          {formatPrice(product.basePrice)}
                        </p>
                        <p className="text-xs text-gray-500">per {product.unit}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Login to view price</p>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product.id)}
                      disabled={!isLoggedIn || product.stockQuantity <= 0 || addingToCart === product.id}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {addingToCart === product.id ? (
                        <span className="animate-spin">...</span>
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
