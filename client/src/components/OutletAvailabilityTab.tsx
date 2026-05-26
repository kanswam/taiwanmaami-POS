import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, ChevronDown, ChevronUp, Store, MapPin, Filter } from 'lucide-react';

type OutletKey = 'palladium' | 'tnagar' | 'annanagar';

export default function OutletAvailabilityTab() {
  const { data: menuData, refetch } = trpc.admin.getFullMenuAdmin.useQuery();
  const toggleProduct = trpc.admin.toggleProductOutlet.useMutation({
    onSuccess: () => refetch(),
  });
  const toggleSubcategory = trpc.admin.toggleSubcategoryOutlet.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Category updated for outlet');
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set());
  const [filterOutlet, setFilterOutlet] = useState<'all' | 'palladium-only' | 'tnagar-only' | 'annanagar-only' | 'all-outlets' | 'neither'>('all');

  const categories = menuData?.categories || [];
  const subcategories = menuData?.subcategories || [];
  const products = menuData?.products || [];

  // Group products by category > subcategory
  const groupedData = useMemo(() => {
    const activeCats = categories.filter((c: any) => c.isActive !== false);
    return activeCats.map((cat: any) => {
      const catSubs = subcategories
        .filter((s: any) => s.categoryId === cat.id && s.isActive !== false)
        .map((sub: any) => {
          const subProducts = products
            .filter((p: any) => p.subcategoryId === sub.id && p.isActive !== false)
            .filter((p: any) => {
              if (!searchQuery) return true;
              return p.name.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .filter((p: any) => {
              if (filterOutlet === 'all') return true;
              if (filterOutlet === 'palladium-only') return p.availableAtPalladium && !p.availableAtTnagar && !p.availableAtAnnanagar;
              if (filterOutlet === 'tnagar-only') return !p.availableAtPalladium && p.availableAtTnagar && !p.availableAtAnnanagar;
              if (filterOutlet === 'annanagar-only') return !p.availableAtPalladium && !p.availableAtTnagar && p.availableAtAnnanagar;
              if (filterOutlet === 'all-outlets') return p.availableAtPalladium && p.availableAtTnagar && p.availableAtAnnanagar;
              if (filterOutlet === 'neither') return !p.availableAtPalladium && !p.availableAtTnagar && !p.availableAtAnnanagar;
              return true;
            });
          return { ...sub, products: subProducts };
        })
        .filter((s: any) => s.products.length > 0 || !searchQuery);
      return { ...cat, subcategories: catSubs };
    }).filter((c: any) => c.subcategories.length > 0);
  }, [categories, subcategories, products, searchQuery, filterOutlet]);

  const toggleCategoryCollapse = (catId: number) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catId)) newSet.delete(catId);
      else newSet.add(catId);
      return newSet;
    });
  };

  const handleToggleProduct = (productId: number, outlet: OutletKey, currentValue: boolean) => {
    toggleProduct.mutate(
      { productId, outlet: outlet as 'palladium' | 'tnagar' | 'annanagar', isAvailable: !currentValue },
      {
        onSuccess: () => {
          // Silent success for individual toggles
        },
        onError: () => toast.error('Failed to update'),
      }
    );
  };

  const handleToggleSubcategory = (subcategoryId: number, outlet: OutletKey, enable: boolean) => {
    toggleSubcategory.mutate({ subcategoryId, outlet: outlet as 'palladium' | 'tnagar' | 'annanagar', isAvailable: enable });
  };

  // Count stats
  const totalProducts = products.filter((p: any) => p.isActive !== false).length;
  const palladiumAvailable = products.filter((p: any) => p.isActive !== false && p.availableAtPalladium).length;
  const tnagarAvailable = products.filter((p: any) => p.isActive !== false && p.availableAtTnagar).length;
  const annanagarAvailable = products.filter((p: any) => p.isActive !== false && p.availableAtAnnanagar).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Outlet Availability</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Toggle which items are available at each outlet. Changes take effect immediately.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-l-4 border-l-gray-400">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Store className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalProducts}</p>
              <p className="text-xs text-muted-foreground">Total Products</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{palladiumAvailable}<span className="text-sm font-normal text-muted-foreground">/{totalProducts}</span></p>
              <p className="text-xs text-muted-foreground">Palladium</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tnagarAvailable}<span className="text-sm font-normal text-muted-foreground">/{totalProducts}</span></p>
              <p className="text-xs text-muted-foreground">T.Nagar</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{annanagarAvailable}<span className="text-sm font-normal text-muted-foreground">/{totalProducts}</span></p>
              <p className="text-xs text-muted-foreground">Anna Nagar</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterOutlet}
            onChange={(e) => setFilterOutlet(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="all">All Products</option>
            <option value="all-outlets">Available at All Outlets</option>
            <option value="palladium-only">Palladium Only</option>
            <option value="tnagar-only">T.Nagar Only</option>
            <option value="annanagar-only">Anna Nagar Only</option>
            <option value="neither">None (Hidden)</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => setCollapsedCategories(new Set())}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            setCollapsedCategories(new Set(groupedData.map((c: any) => c.id)));
          }}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Toggle Grid */}
      <div className="space-y-4">
        {groupedData.map((cat: any) => (
          <Card key={cat.id} className="overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategoryCollapse(cat.id)}
              className="w-full flex items-center justify-between p-4 bg-[#8B1A1A] text-white hover:bg-[#7a1717] transition-colors"
            >
              <div className="flex items-center gap-3">
                {collapsedCategories.has(cat.id) ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronUp className="w-5 h-5" />
                )}
                <span className="font-semibold text-lg">{cat.name}</span>
                <span className="text-sm opacity-75">
                  ({cat.subcategories.reduce((acc: number, s: any) => acc + s.products.length, 0)} items)
                </span>
              </div>
            </button>

            {!collapsedCategories.has(cat.id) && (
              <div className="divide-y">
                {cat.subcategories.map((sub: any) => {
                  // Calculate subcategory-level availability
                  const allPalladium = sub.products.length > 0 && sub.products.every((p: any) => p.availableAtPalladium);
                  const allTnagar = sub.products.length > 0 && sub.products.every((p: any) => p.availableAtTnagar);
                  const allAnnanagar = sub.products.length > 0 && sub.products.every((p: any) => p.availableAtAnnanagar);
                  const somePalladium = sub.products.some((p: any) => p.availableAtPalladium);
                  const someTnagar = sub.products.some((p: any) => p.availableAtTnagar);
                  const someAnnanagar = sub.products.some((p: any) => p.availableAtAnnanagar);

                  return (
                    <div key={sub.id}>
                      {/* Subcategory Header with bulk toggles */}
                      <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b">
                        <span className="font-medium text-sm text-amber-900">{sub.name}</span>
                        <div className="flex items-center gap-4">
                          {/* Subcategory-level Palladium toggle */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-blue-600 font-medium w-16 text-right">Palladium</span>
                            <button
                              onClick={() => handleToggleSubcategory(sub.id, 'palladium', !allPalladium)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                allPalladium ? 'bg-blue-500' : somePalladium ? 'bg-blue-300' : 'bg-gray-300'
                              }`}
                              title={allPalladium ? 'Disable all for Palladium' : 'Enable all for Palladium'}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                allPalladium ? 'translate-x-5' : somePalladium ? 'translate-x-2.5' : ''
                              }`} />
                            </button>
                          </div>
                          {/* Subcategory-level T.Nagar toggle */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-green-600 font-medium w-14 text-right">T.Nagar</span>
                            <button
                              onClick={() => handleToggleSubcategory(sub.id, 'tnagar', !allTnagar)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                allTnagar ? 'bg-green-500' : someTnagar ? 'bg-green-300' : 'bg-gray-300'
                              }`}
                              title={allTnagar ? 'Disable all for T.Nagar' : 'Enable all for T.Nagar'}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                allTnagar ? 'translate-x-5' : someTnagar ? 'translate-x-2.5' : ''
                              }`} />
                            </button>
                          </div>
                          {/* Subcategory-level Anna Nagar toggle */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-purple-600 font-medium w-18 text-right">A.Nagar</span>
                            <button
                              onClick={() => handleToggleSubcategory(sub.id, 'annanagar', !allAnnanagar)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                allAnnanagar ? 'bg-purple-500' : someAnnanagar ? 'bg-purple-300' : 'bg-gray-300'
                              }`}
                              title={allAnnanagar ? 'Disable all for Anna Nagar' : 'Enable all for Anna Nagar'}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                allAnnanagar ? 'translate-x-5' : someAnnanagar ? 'translate-x-2.5' : ''
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Products */}
                      {sub.products.map((product: any) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <span className="text-sm font-medium truncate block">{product.name}</span>
                              {!product.isInStock && (
                                <span className="text-xs text-red-500">Out of stock</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 flex-shrink-0">
                            {/* Palladium toggle */}
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={product.availableAtPalladium}
                                onCheckedChange={() => handleToggleProduct(product.id, 'palladium', product.availableAtPalladium)}
                                className="data-[state=checked]:bg-blue-500"
                              />
                              {product.availableAtPalladium ? (
                                <span className="text-xs text-blue-600 w-7">ON</span>
                              ) : (
                                <span className="text-xs text-gray-400 w-7">OFF</span>
                              )}
                            </div>

                            {/* T.Nagar toggle */}
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={product.availableAtTnagar}
                                onCheckedChange={() => handleToggleProduct(product.id, 'tnagar', product.availableAtTnagar)}
                                className="data-[state=checked]:bg-green-500"
                              />
                              {product.availableAtTnagar ? (
                                <span className="text-xs text-green-600 w-7">ON</span>
                              ) : (
                                <span className="text-xs text-gray-400 w-7">OFF</span>
                              )}
                            </div>

                            {/* Anna Nagar toggle */}
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={product.availableAtAnnanagar}
                                onCheckedChange={() => handleToggleProduct(product.id, 'annanagar', product.availableAtAnnanagar)}
                                className="data-[state=checked]:bg-purple-500"
                              />
                              {product.availableAtAnnanagar ? (
                                <span className="text-xs text-purple-600 w-7">ON</span>
                              ) : (
                                <span className="text-xs text-gray-400 w-7">OFF</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {sub.products.length === 0 && (
                        <div className="px-4 py-3 text-sm text-muted-foreground italic">
                          No products in this subcategory
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>

      {groupedData.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          {searchQuery ? 'No products match your search' : 'No products found'}
        </Card>
      )}
    </div>
  );
}
