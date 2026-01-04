import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, GST_RATE } from '@shared/types';
import { 
  Home, Package, ShoppingCart, Tag, Upload, LogOut, 
  Plus, Edit, Trash2, ImageIcon, RefreshCw, Check, X, Search,
  ChevronDown, ChevronUp, Eye, EyeOff, Star, MessageSquare, Reply, Printer,
  ClipboardList, RotateCcw, History, Filter, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCategory, SortableSubcategory } from '@/components/SortableCategory';

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('products');

  // Check admin access
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin access to view this page.</p>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg">Taiwan Maami Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Home className="w-4 h-4 mr-2" />
                Website
              </Button>
            </Link>

            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 w-full mb-6">
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <ChevronDown className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="addons" className="gap-2">
              <Plus className="w-4 h-4" />
              Add-ons
            </TabsTrigger>
            <TabsTrigger value="discounts" className="gap-2">
              <Tag className="w-4 h-4" />
              Discounts
            </TabsTrigger>
            <TabsTrigger value="bulk-pricing" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Bulk Pricing
            </TabsTrigger>
            <TabsTrigger value="bulk-upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Bulk Upload
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="w-4 h-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Edit className="w-4 h-4" />
              Site Settings
            </TabsTrigger>
            <TabsTrigger value="kot-reports" className="gap-2">
              <Printer className="w-4 h-4" />
              KOT Reports
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2" onClick={() => navigate('/admin/analytics')}>
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="addons">
            <AddonsTab />
          </TabsContent>

          <TabsContent value="discounts">
            <DiscountsTab />
          </TabsContent>



          <TabsContent value="bulk-upload">
            <BulkUploadTab />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsTab />
          </TabsContent>

          <TabsContent value="settings">
            <SiteSettingsTab />
          </TabsContent>

          <TabsContent value="bulk-pricing">
            <BulkPricingTab />
          </TabsContent>

          <TabsContent value="kot-reports">
            <KOTReportsTab />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Products Tab
function ProductsTab() {
  const utils = trpc.useUtils();
  const { data: menuData, refetch } = trpc.menu.getFullMenu.useQuery({ isDelivery: false });
  const { data: allProductsData, refetch: refetchAll } = trpc.admin.getAllProducts.useQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [draggedProduct, setDraggedProduct] = useState<number | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const collapseAll = () => {
    const allKeys = Object.keys(groupedProducts);
    setCollapsedGroups(new Set(allKeys));
  };

  const expandAll = () => {
    setCollapsedGroups(new Set());
  };

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success('Product updated');
      refetch();
      refetchAll();
      // Invalidate menu cache so customer website reflects changes immediately
      utils.menu.getFullMenu.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProductOrder = trpc.admin.updateProductOrder.useMutation({
    onSuccess: () => {
      toast.success('Product order updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const reactivateProduct = trpc.admin.reactivateProduct.useMutation({
    onSuccess: () => {
      toast.success('Product reactivated');
      refetch();
      refetchAll();
      // Invalidate menu cache so customer website reflects changes immediately
      utils.menu.getFullMenu.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Sort products by Category -> Subcategory -> displayOrder for logical grouping
  const sortedProducts = menuData?.products
    ? [...menuData.products].sort((a, b) => {
        const subA = menuData?.subcategories.find(s => s.id === a.subcategoryId);
        const subB = menuData?.subcategories.find(s => s.id === b.subcategoryId);
        const catA = menuData?.categories.find(c => c.id === subA?.categoryId);
        const catB = menuData?.categories.find(c => c.id === subB?.categoryId);
        
        // First sort by category displayOrder
        const catOrderA = catA?.displayOrder || 999;
        const catOrderB = catB?.displayOrder || 999;
        if (catOrderA !== catOrderB) return catOrderA - catOrderB;
        
        // Then sort by subcategory displayOrder
        const subOrderA = subA?.displayOrder || 999;
        const subOrderB = subB?.displayOrder || 999;
        if (subOrderA !== subOrderB) return subOrderA - subOrderB;
        
        // Finally sort by product displayOrder
        return (a.displayOrder || 999) - (b.displayOrder || 999);
      })
    : [];

  const filteredProducts = sortedProducts.filter(p => {
    if (selectedCategory !== 'all') {
      const sub = menuData?.subcategories.find(s => s.id === p.subcategoryId);
      const cat = menuData?.categories.find(c => c.id === sub?.categoryId);
      if (cat?.slug !== selectedCategory) return false;
    }
    if (searchQuery) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  }) || [];

  // Group products by category and subcategory for display
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const sub = menuData?.subcategories.find(s => s.id === product.subcategoryId);
    const cat = menuData?.categories.find(c => c.id === sub?.categoryId);
    const catName = cat?.name || 'Uncategorized';
    const subName = sub?.name || 'Uncategorized';
    const key = `${catName}|||${subName}`;
    if (!acc[key]) {
      acc[key] = { category: catName, subcategory: subName, products: [] };
    }
    acc[key].products.push(product);
    return acc;
  }, {} as Record<string, { category: string; subcategory: string; products: typeof filteredProducts }>);

  const toggleStock = (productId: number, currentStatus: boolean) => {
    updateProduct.mutate({ id: productId, isInStock: !currentStatus });
  };

  const toggleActive = (productId: number, currentStatus: boolean) => {
    updateProduct.mutate({ id: productId, isActive: !currentStatus });
  };

  const handleDragStart = (e: React.DragEvent, productId: number) => {
    setDraggedProduct(productId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetProductId: number) => {
    e.preventDefault();
    if (draggedProduct === null || draggedProduct === targetProductId) return;

    const draggedIndex = filteredProducts.findIndex(p => p.id === draggedProduct);
    const targetIndex = filteredProducts.findIndex(p => p.id === targetProductId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order
    const newOrder = [...filteredProducts];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    // Update display orders
    const productOrders = newOrder.map((p, idx) => ({
      id: p.id,
      displayOrder: idx + 1,
    }));

    updateProductOrder.mutate({ productOrders });
    setDraggedProduct(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {menuData?.categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={reorderMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setReorderMode(!reorderMode)}
          className="gap-2"
        >
          <ChevronUp className="w-4 h-4" />
          <ChevronDown className="w-4 h-4" />
          {reorderMode ? 'Done Reordering' : 'Reorder Products'}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
            Collapse All
          </Button>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
          <Switch
            checked={showInactive}
            onCheckedChange={setShowInactive}
            id="show-inactive"
          />
          <Label htmlFor="show-inactive" className="text-sm font-medium text-orange-800 cursor-pointer">
            Show Inactive ({allProductsData?.filter(p => !p.isActive).length || 0})
          </Label>
        </div>
        <CreateProductDialog subcategories={menuData?.subcategories || []} categories={menuData?.categories || []} onSuccess={refetch} />
      </div>

      {reorderMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          📌 <strong>Drag and drop</strong> products to reorder them. Changes are saved automatically.
        </div>
      )}

      {/* Grouped Products Display */}
      <div className="space-y-4">
        {Object.entries(groupedProducts).map(([key, group]) => {
          const [catName, subName] = key.split('|||');
          const groupKey = `${catName}-${subName}`;
          const isCollapsed = collapsedGroups.has(key);
          return (
            <Card key={groupKey} className="overflow-hidden">
              {/* Category/Subcategory Header - Clickable */}
              <div 
                className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-colors"
                onClick={() => toggleGroupCollapse(key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">{group.products.length}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{catName}</h3>
                      <p className="text-sm text-muted-foreground">{subName}</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </div>
              </div>
              
              {/* Products Table - Collapsible */}
              {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      {reorderMode && <th className="w-12 p-3 text-sm font-medium">#</th>}
                      <th className="text-left p-3 text-sm font-medium">Product</th>
                      <th className="text-right p-3 text-sm font-medium">In-Store</th>
                      <th className="text-right p-3 text-sm font-medium">Delivery</th>
                      <th className="text-center p-3 text-sm font-medium">Stock</th>
                      <th className="text-center p-3 text-sm font-medium">Active</th>
                      <th className="text-center p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.products.map((product, index) => (
                      <tr 
                        key={product.id} 
                        className={`border-b last:border-b-0 hover:bg-secondary/30 ${reorderMode ? 'cursor-move' : ''} ${draggedProduct === product.id ? 'opacity-50 bg-blue-100' : ''}`}
                        draggable={reorderMode}
                        onDragStart={(e) => reorderMode && handleDragStart(e, product.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => reorderMode && handleDrop(e, product.id)}
                        onDragEnd={() => setDraggedProduct(null)}
                      >
                        {reorderMode && (
                          <td className="p-3 text-center text-muted-foreground">
                            <span className="text-xs font-bold">{index + 1}</span>
                          </td>
                        )}
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.chineseName && (
                                <p className="text-xs text-muted-foreground">{product.chineseName}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right text-sm">
                          {product.instorePrice ? formatPrice(product.instorePrice) : '-'}
                        </td>
                        <td className="p-3 text-right text-sm">
                          {product.deliveryPrice ? formatPrice(product.deliveryPrice) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={product.isInStock}
                            onCheckedChange={() => toggleStock(product.id, product.isInStock)}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={product.isActive}
                            onCheckedChange={() => toggleActive(product.id, product.isActive)}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <ProductEditDialog product={product} onUpdate={refetch} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {Object.keys(groupedProducts).length === 0 && !showInactive && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No products found matching your search criteria.</p>
        </Card>
      )}

      {/* Inactive Products Section */}
      {showInactive && allProductsData && (
        <Card className="mt-6 border-orange-200 bg-orange-50/50">
          <div className="px-4 py-3 border-b border-orange-200 bg-orange-100/50">
            <div className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-orange-800">Inactive Products</h3>
              <span className="text-sm text-orange-600">({allProductsData.filter(p => !p.isActive).length} products)</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">These products are hidden from customers. Click "Reactivate" to make them visible again.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orange-100/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-orange-800">Product</th>
                  <th className="text-left p-3 text-sm font-medium text-orange-800">Category</th>
                  <th className="text-right p-3 text-sm font-medium text-orange-800">In-Store</th>
                  <th className="text-right p-3 text-sm font-medium text-orange-800">Delivery</th>
                  <th className="text-center p-3 text-sm font-medium text-orange-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allProductsData.filter(p => !p.isActive).map((product) => {
                  const sub = menuData?.subcategories.find(s => s.id === product.subcategoryId);
                  const cat = menuData?.categories.find(c => c.id === sub?.categoryId);
                  return (
                    <tr key={product.id} className="border-b border-orange-200 last:border-b-0 hover:bg-orange-100/30">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover opacity-50" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-orange-200 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-orange-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-orange-900">{product.name}</p>
                            {product.chineseName && <p className="text-xs text-orange-600">{product.chineseName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-orange-700">
                        {cat?.name || 'Unknown'} / {sub?.name || 'Unknown'}
                      </td>
                      <td className="p-3 text-right text-orange-800">
                        {product.instorePrice ? formatPrice(product.instorePrice) : '-'}
                      </td>
                      <td className="p-3 text-right text-orange-800">
                        {product.deliveryPrice ? formatPrice(product.deliveryPrice) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
                          onClick={() => reactivateProduct.mutate({ id: product.id })}
                          disabled={reactivateProduct.isPending}
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reactivate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {allProductsData.filter(p => !p.isActive).length === 0 && (
            <div className="p-8 text-center text-orange-600">
              No inactive products found.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// Product Edit Dialog
function ProductEditDialog({ product, onUpdate }: { product: any; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { data: menuData } = trpc.menu.getFullMenu.useQuery({ isDelivery: false });
  const { data: canDeleteData } = trpc.admin.canDeleteProduct.useQuery({ id: product.id }, { enabled: open });
  const [formData, setFormData] = useState({
    name: product.name,
    chineseName: product.chineseName || '',
    description: product.description || '',
    instorePrice: product.instorePrice || 0,
    deliveryPrice: product.deliveryPrice || 0,
    subcategoryId: product.subcategoryId,
    isVegetarian: product.isVegetarian ?? true,
    isVegan: product.isVegan ?? false,
    containsEgg: product.containsEgg ?? false,
  });
  // Multi-image support
  const [images, setImages] = useState<(string | null)[]>([
    product.imageUrl || null,
    product.imageUrl2 || null,
    product.imageUrl3 || null,
  ]);
  const [uploading, setUploading] = useState(false);

  const permanentlyDeleteProduct = trpc.admin.permanentlyDeleteProduct.useMutation({
    onSuccess: () => {
      toast.success('Product permanently deleted');
      setOpen(false);
      onUpdate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success('Product updated');
      setOpen(false);
      onUpdate();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadImage = trpc.admin.uploadProductImage.useMutation({
    onSuccess: (data) => {
      toast.success('Image uploaded');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleImageUpload = async (file: File, index: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const result = await uploadImage.mutateAsync({
            productId: product.id,
            imageBase64: base64,
            mimeType: file.type,
            fileName: file.name,
            imageIndex: index, // 0 = main, 1 = second, 2 = third
          });
          resolve(result.imageUrl);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = () => {
    updateProduct.mutate({
      id: product.id,
      name: formData.name,
      chineseName: formData.chineseName || null,
      description: formData.description || null,
      instorePrice: formData.instorePrice,
      deliveryPrice: formData.deliveryPrice,
      subcategoryId: formData.subcategoryId,
      isVegetarian: formData.isVegetarian,
      isVegan: formData.isVegan,
      containsEgg: formData.containsEgg,
      imageUrl: images[0] || null,
      imageUrl2: images[1] || null,
      imageUrl3: images[2] || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* Multi-Image Upload with Cropping */}
          <div>
            <Label>Product Images (up to 3)</Label>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="relative aspect-square rounded-lg border-2 border-dashed border-border overflow-hidden bg-secondary flex items-center justify-center">
                  {images[index] ? (
                    <>
                      <img src={images[index]!} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const url = await handleImageUpload(file, index);
                                  const newImages = [...images];
                                  newImages[index] = url;
                                  setImages(newImages);
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                          />
                          <Button variant="secondary" size="icon" className="h-7 w-7" asChild>
                            <span><Upload className="h-3 w-3" /></span>
                          </Button>
                        </label>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const newImages = [...images];
                            newImages[index] = null;
                            setImages(newImages);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {index === 0 && <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1 rounded">Main</span>}
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const url = await handleImageUpload(file, index);
                              const newImages = [...images];
                              newImages[index] = url;
                              setImages(newImages);
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                      />
                      <ImageIcon className="h-5 w-5 mb-1" />
                      <span className="text-[10px]">{index === 0 ? 'Main' : `Image ${index + 1}`}</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">First image is the main product image</p>
          </div>

          {/* Dietary Options */}
          <div>
            <Label>Dietary Information</Label>
            <div className="mt-2 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isVegetarian}
                  onCheckedChange={(checked) => setFormData({ ...formData, isVegetarian: checked })}
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500 border border-green-600"></span>
                  Vegetarian
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isVegan}
                  onCheckedChange={(checked) => setFormData({ ...formData, isVegan: checked })}
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-600 border border-green-700">🌱</span>
                  Vegan
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.containsEgg}
                  onCheckedChange={(checked) => setFormData({ ...formData, containsEgg: checked })}
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-yellow-500"></span>
                  Contains Egg
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Chinese Name</Label>
            <Input
              value={formData.chineseName}
              onChange={(e) => setFormData({ ...formData, chineseName: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the product..."
              rows={3}
            />
          </div>
          <div>
            <Label>Category / Subcategory</Label>
            <Select 
              value={formData.subcategoryId?.toString()} 
              onValueChange={(v) => setFormData({ ...formData, subcategoryId: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subcategory" />
              </SelectTrigger>
              <SelectContent>
                {menuData?.categories.map((cat) => (
                  <div key={cat.id}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-secondary">{cat.name}</div>
                    {menuData.subcategories
                      .filter(sub => sub.categoryId === cat.id)
                      .map(sub => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>
                          {sub.name}
                        </SelectItem>
                      ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>In-Store Price (paise)</Label>
              <Input
                type="number"
                value={formData.instorePrice}
                onChange={(e) => setFormData({ ...formData, instorePrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Delivery Price (paise)</Label>
              <Input
                type="number"
                value={formData.deliveryPrice}
                onChange={(e) => setFormData({ ...formData, deliveryPrice: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Add-ons Section */}
          <ProductAddonsSection productId={product.id} />
        </div>
        <div className="flex justify-between">
          {/* Delete button - only show if product can be deleted (no order history) */}
          <div>
            {canDeleteData?.canDelete ? (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-destructive">Delete permanently?</span>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => permanentlyDeleteProduct.mutate({ id: product.id })}
                    disabled={permanentlyDeleteProduct.isPending}
                  >
                    {permanentlyDeleteProduct.isPending ? 'Deleting...' : 'Yes, Delete'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )
            ) : canDeleteData ? (
              <span className="text-xs text-muted-foreground">
                Cannot delete - has {canDeleteData.orderCount} order(s)
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={updateProduct.isPending}>
              {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Product Add-ons Section Component
function ProductAddonsSection({ productId }: { productId: number }) {
  const { data: productAddons, refetch: refetchProductAddons } = trpc.admin.getProductAddons.useQuery({ productId });
  const { data: allAddons } = trpc.admin.getAllAddons.useQuery();
  const linkAddon = trpc.admin.linkAddonToProduct.useMutation({
    onSuccess: () => { toast.success('Add-on linked'); refetchProductAddons(); },
    onError: (err) => toast.error(err.message),
  });
  const unlinkAddon = trpc.admin.unlinkAddonFromProduct.useMutation({
    onSuccess: () => { toast.success('Add-on removed'); refetchProductAddons(); },
    onError: (err) => toast.error(err.message),
  });

  // Filter to show only food_addon type
  const foodAddons = allAddons?.filter(a => a.type === 'food_addon' && a.isActive) || [];
  const linkedAddonIds = productAddons?.map(a => a.id) || [];

  return (
    <div className="border-t pt-4">
      <Label className="text-sm font-medium">Product Add-ons (e.g., Extra Egg)</Label>
      <div className="mt-2 space-y-2">
        {/* Currently linked addons */}
        {productAddons && productAddons.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {productAddons.map(addon => (
              <div key={addon.id} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                <span>{addon.name} (₹{((addon.fixedPrice || 0) / 100).toFixed(0)})</span>
                <button
                  onClick={() => unlinkAddon.mutate({ productId, addonId: addon.id })}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Add new addon dropdown */}
        {foodAddons.length > 0 && (
          <Select
            onValueChange={(v) => {
              const addonId = Number(v);
              if (addonId && !linkedAddonIds.includes(addonId)) {
                linkAddon.mutate({ productId, addonId });
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add an add-on option..." />
            </SelectTrigger>
            <SelectContent>
              {foodAddons
                .filter(a => !linkedAddonIds.includes(a.id))
                .map(addon => (
                  <SelectItem key={addon.id} value={addon.id.toString()}>
                    {addon.name} - ₹{((addon.fixedPrice || 0) / 100).toFixed(0)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
        {foodAddons.length === 0 && (
          <p className="text-xs text-muted-foreground">No food add-ons available. Create them in the Add-ons tab first.</p>
        )}
      </div>
    </div>
  );
}

// Categories Tab
function CategoriesTab() {
  const { data: menuData, refetch } = trpc.menu.getFullMenu.useQuery({ isDelivery: false });
  const { data: allProducts } = trpc.admin.getAllProducts.useQuery();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryData, setNewSubcategoryData] = useState({ name: '', categoryId: 0 });
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null);

  const updateCategory = trpc.admin.updateCategory.useMutation({
    onSuccess: () => { 
      toast.success('Category updated'); 
      setEditingCategoryId(null); // Close dialog on success
      refetch(); 
    },
    onError: (err) => toast.error(err.message),
  });

  const createCategory = trpc.admin.createCategory.useMutation({
    onSuccess: () => { toast.success('Category created'); refetch(); setNewCategoryName(''); },
    onError: (err) => toast.error(err.message),
  });

  const deleteCategory = trpc.admin.deleteCategory.useMutation({
    onSuccess: () => { toast.success('Category deleted'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateSubcategory = trpc.admin.updateSubcategory.useMutation({
    onSuccess: (data) => { 
      console.log('[updateSubcategory] Success:', data);
      toast.success('Subcategory updated successfully'); 
      setEditingSubcategoryId(null); // Close dialog on success
      refetch(); 
    },
    onError: (err) => {
      console.error('[updateSubcategory] Error:', err);
      toast.error(err.message);
    },
  });

  const createSubcategory = trpc.admin.createSubcategory.useMutation({
    onSuccess: () => { toast.success('Subcategory created'); refetch(); setNewSubcategoryData({ name: '', categoryId: 0 }); },
    onError: (err) => toast.error(err.message),
  });

  const deleteSubcategory = trpc.admin.deleteSubcategory.useMutation({
    onSuccess: () => { toast.success('Subcategory deleted'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateCategoryOrder = trpc.admin.updateCategoryOrder.useMutation({
    onSuccess: () => { toast.success('Category order updated'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateSubcategoryOrder = trpc.admin.updateSubcategoryOrder.useMutation({
    onSuccess: () => { toast.success('Subcategory order updated'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handle category drag end
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !menuData?.categories) return;

    const sortedCategories = [...menuData.categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const oldIndex = sortedCategories.findIndex(c => c.id === active.id);
    const newIndex = sortedCategories.findIndex(c => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(sortedCategories, oldIndex, newIndex);
      const newOrders = reordered.map((c, i) => ({ id: c.id, displayOrder: i + 1 }));
      updateCategoryOrder.mutate({ categoryOrders: newOrders });
    }
  };

  // Handle subcategory drag end
  const handleSubcategoryDragEnd = (categoryId: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !menuData?.subcategories) return;

    const categorySubs = menuData.subcategories.filter(s => s.categoryId === categoryId).sort((a, b) => a.displayOrder - b.displayOrder);
    const oldIndex = categorySubs.findIndex(s => s.id === active.id);
    const newIndex = categorySubs.findIndex(s => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(categorySubs, oldIndex, newIndex);
      const newOrders = reordered.map((s, i) => ({ id: s.id, displayOrder: i + 1 }));
      updateSubcategoryOrder.mutate({ subcategoryOrders: newOrders });
    }
  };

  // Move category up or down
  const moveCategoryOrder = (catId: number, direction: 'up' | 'down') => {
    if (!menuData?.categories) return;
    const sorted = [...menuData.categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex(c => c.id === catId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    // Swap display orders
    const newOrders = sorted.map((c, i) => {
      if (i === idx) return { id: c.id, displayOrder: sorted[swapIdx].displayOrder };
      if (i === swapIdx) return { id: c.id, displayOrder: sorted[idx].displayOrder };
      return { id: c.id, displayOrder: c.displayOrder };
    });
    updateCategoryOrder.mutate({ categoryOrders: newOrders });
  };

  // Move subcategory up or down within its category
  const moveSubcategoryOrder = (subId: number, categoryId: number, direction: 'up' | 'down') => {
    if (!menuData?.subcategories) return;
    const categorySubs = menuData.subcategories.filter(s => s.categoryId === categoryId).sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = categorySubs.findIndex(s => s.id === subId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === categorySubs.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    // Swap display orders
    const newOrders = categorySubs.map((s, i) => {
      if (i === idx) return { id: s.id, displayOrder: categorySubs[swapIdx].displayOrder };
      if (i === swapIdx) return { id: s.id, displayOrder: categorySubs[idx].displayOrder };
      return { id: s.id, displayOrder: s.displayOrder };
    });
    updateSubcategoryOrder.mutate({ subcategoryOrders: newOrders });
  };

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Categories <span className="text-xs font-normal text-muted-foreground">(drag to reorder)</span></h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
          <SortableContext items={menuData?.categories.map(c => c.id).sort((a, b) => {
            const catA = menuData?.categories.find(c => c.id === a);
            const catB = menuData?.categories.find(c => c.id === b);
            return (catA?.displayOrder || 0) - (catB?.displayOrder || 0);
          }) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {[...menuData?.categories || []].sort((a, b) => a.displayOrder - b.displayOrder).map((cat) => {
                const categoryProducts = allProducts?.filter(p => {
                  const sub = menuData?.subcategories.find(s => s.id === p.subcategoryId);
                  return sub?.categoryId === cat.id;
                }) || [];
                const isExpanded = expandedCategory === cat.id;
                return (
                  <SortableCategory key={cat.id} id={cat.id}>
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/80"
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">({categoryProducts.length} products)</span>
                      </div>
                      <div className="flex gap-2">
                  <Dialog open={editingCategoryId === cat.id} onOpenChange={(open) => setEditingCategoryId(open ? cat.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingCategoryId(cat.id); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Category Image</Label>
                          <div className="mt-2 flex items-center gap-4">
                            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border overflow-hidden bg-secondary flex items-center justify-center">
                              <img 
                                src={cat.imageUrl || ''} 
                                alt="" 
                                className={`w-full h-full object-cover ${!cat.imageUrl ? 'hidden' : ''}`} 
                                id={`cat-img-preview-${cat.id}`} 
                              />
                              {!cat.imageUrl && <ImageIcon className="w-8 h-8 text-muted-foreground" id={`cat-img-placeholder-${cat.id}`} />}
                            </div>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`cat-img-upload-${cat.id}`}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    const preview = document.getElementById(`cat-img-preview-${cat.id}`) as HTMLImageElement;
                                    const placeholder = document.getElementById(`cat-img-placeholder-${cat.id}`);
                                    if (preview) {
                                      preview.src = reader.result as string;
                                      preview.classList.remove('hidden');
                                    }
                                    if (placeholder) placeholder.classList.add('hidden');
                                    const dataInput = document.getElementById(`cat-img-data-${cat.id}`) as HTMLInputElement;
                                    if (dataInput) dataInput.value = reader.result as string;
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                              <input type="hidden" id={`cat-img-data-${cat.id}`} />
                              <label htmlFor={`cat-img-upload-${cat.id}`}>
                                <Button variant="outline" size="sm" asChild>
                                  <span className="cursor-pointer"><Upload className="w-4 h-4 mr-2" />Upload</span>
                                </Button>
                              </label>
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label>Category Name</Label>
                          <Input
                            defaultValue={cat.name}
                            id={`cat-name-${cat.id}`}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            defaultValue={cat.description || ''}
                            id={`cat-desc-${cat.id}`}
                            placeholder="Optional description"
                          />
                        </div>
                        <div className="space-y-3 p-3 bg-muted rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground">Menu Availability</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`cat-instore-${cat.id}`}
                                defaultChecked={(cat as any).availableInstore !== false}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`cat-instore-${cat.id}`} className="text-sm cursor-pointer">
                                In-store
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`cat-delivery-${cat.id}`}
                                defaultChecked={(cat as any).availableDelivery !== false}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`cat-delivery-${cat.id}`} className="text-sm cursor-pointer">
                                Delivery
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`cat-pickup-${cat.id}`}
                                defaultChecked={(cat as any).availablePickup !== false}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`cat-pickup-${cat.id}`} className="text-sm cursor-pointer">
                                Pickup
                              </Label>
                            </div>
                          </div>
                        </div>
                        <Button onClick={async () => {
                          const name = (document.getElementById(`cat-name-${cat.id}`) as HTMLInputElement).value;
                          const description = (document.getElementById(`cat-desc-${cat.id}`) as HTMLInputElement).value;
                          const imageData = (document.getElementById(`cat-img-data-${cat.id}`) as HTMLInputElement)?.value;
                          const availableInstore = (document.getElementById(`cat-instore-${cat.id}`) as HTMLInputElement)?.checked ?? true;
                          const availableDelivery = (document.getElementById(`cat-delivery-${cat.id}`) as HTMLInputElement)?.checked ?? true;
                          const availablePickup = (document.getElementById(`cat-pickup-${cat.id}`) as HTMLInputElement)?.checked ?? true;
                          updateCategory.mutate({ id: cat.id, name, description, imageBase64: imageData || undefined, availableInstore, availableDelivery, availablePickup } as any);
                        }} disabled={updateCategory.isPending}>
                          {updateCategory.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                    if (confirm('Delete this category? All subcategories must be removed first.')) {
                      deleteCategory.mutate({ id: cat.id });
                    }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                      </div>
                    </div>
                    {isExpanded && categoryProducts.length > 0 && (
                      <div className="border-t bg-background/50 p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Products in this category:</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {categoryProducts.slice(0, 12).map(p => (
                            <div key={p.id} className="text-sm p-2 bg-background rounded border">
                              {p.name}
                            </div>
                          ))}
                          {categoryProducts.length > 12 && (
                            <div className="text-sm p-2 text-muted-foreground">+{categoryProducts.length - 12} more...</div>
                          )}
                        </div>
                      </div>
                    )}
                  </SortableCategory>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button onClick={() => {
            if (newCategoryName) {
              createCategory.mutate({ name: newCategoryName, slug: generateSlug(newCategoryName) });
            }
          }}>
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </div>
      </Card>

      {/* Subcategories Section */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Subcategories <span className="text-xs font-normal text-muted-foreground">(drag to reorder within category)</span></h3>
        <div className="space-y-4">
          {[...menuData?.categories || []].sort((a, b) => a.displayOrder - b.displayOrder).map((cat) => {
            const categorySubs = menuData?.subcategories.filter(sub => sub.categoryId === cat.id).sort((a, b) => a.displayOrder - b.displayOrder) || [];
            return (
              <div key={cat.id} className="border rounded-lg p-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">{cat.name}</h4>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubcategoryDragEnd(cat.id)}>
                  <SortableContext items={categorySubs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {categorySubs.map((sub) => {
                        const subProducts = allProducts?.filter(p => p.subcategoryId === sub.id) || [];
                        const isSubExpanded = expandedSubcategory === sub.id;
                        return (
                          <SortableSubcategory key={sub.id} id={sub.id}>
                            <div 
                              className="flex items-center justify-between p-2 cursor-pointer hover:bg-secondary/70"
                              onClick={() => setExpandedSubcategory(isSubExpanded ? null : sub.id)}
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown className={`w-3 h-3 transition-transform ${isSubExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                <span>{sub.name}</span>
                                {sub.chineseName && <span className="text-xs text-muted-foreground ml-2">{sub.chineseName}</span>}
                                <span className="text-xs text-muted-foreground">({subProducts.length})</span>
                              </div>
                              <div className="flex gap-2">
                            <Dialog open={editingSubcategoryId === sub.id} onOpenChange={(open) => setEditingSubcategoryId(open ? sub.id : null)}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingSubcategoryId(sub.id); }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Edit Subcategory: {sub.name}</DialogTitle>
                                </DialogHeader>
                                <SubcategoryEditForm sub={sub} category={cat} updateSubcategory={updateSubcategory} onClose={() => setEditingSubcategoryId(null)} />
                              </DialogContent>
                            </Dialog>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                              if (confirm('Delete this subcategory? All products must be moved first.')) {
                                deleteSubcategory.mutate({ id: sub.id });
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                              </div>
                            </div>
                            {isSubExpanded && subProducts.length > 0 && (
                              <div className="border-t bg-background/50 p-2">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                                  {subProducts.map(p => (
                                    <div key={p.id} className="text-xs p-1.5 bg-background rounded border truncate">
                                      {p.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </SortableSubcategory>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="New subcategory name"
              value={newSubcategoryData.name}
              onChange={(e) => setNewSubcategoryData({ ...newSubcategoryData, name: e.target.value })}
              className="flex-1"
            />
            <Select
              value={newSubcategoryData.categoryId?.toString() || ''}
              onValueChange={(v) => setNewSubcategoryData({ ...newSubcategoryData, categoryId: Number(v) })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {menuData?.categories.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => {
              if (newSubcategoryData.name && newSubcategoryData.categoryId) {
                createSubcategory.mutate({
                  name: newSubcategoryData.name,
                  slug: generateSlug(newSubcategoryData.name),
                  categoryId: newSubcategoryData.categoryId,
                });
              }
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add Subcategory
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Orders Tab
function OrdersTab() {
  const { data: orders, refetch } = trpc.orders.getRecent.useQuery({ limit: 100 });
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { data: orderDetails } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );
  
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Order status updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const statusOptions = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-orange-100 text-orange-800',
    ready: 'bg-green-100 text-green-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  // Get next status in workflow
  const getNextStatus = (currentStatus: string, orderType: string) => {
    const deliveryFlow = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed'];
    const pickupFlow = ['confirmed', 'preparing', 'ready', 'completed'];
    const flow = orderType === 'delivery' ? deliveryFlow : pickupFlow;
    const currentIndex = flow.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < flow.length - 1) {
      return flow[currentIndex + 1];
    }
    return null;
  };

  const getNextStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      preparing: 'Start Preparing',
      ready: 'Mark Ready',
      out_for_delivery: 'Out for Delivery',
      completed: 'Complete Order',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Recent Orders</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Order #</th>
                <th className="text-left p-3 text-sm font-medium">Customer</th>
                <th className="text-left p-3 text-sm font-medium">Type</th>
                <th className="text-right p-3 text-sm font-medium">Total</th>
                <th className="text-center p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Time</th>
                <th className="text-center p-3 text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr 
                  key={order.id} 
                  className="border-b hover:bg-secondary/50 cursor-pointer"
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <td className="p-3 font-medium text-primary underline">{order.orderNumber}</td>
                  <td className="p-3">
                    <p>{order.customerName || 'Guest'}</p>
                    {order.customerPhone && (
                      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    )}
                  </td>
                  <td className="p-3 capitalize">{order.orderType}</td>
                  <td className="p-3 text-right font-medium">{formatPrice(order.totalAmount)}</td>
                  <td className="p-3">
                    <Select
                      value={order.orderStatus}
                      onValueChange={(v) => updateStatus.mutate({ orderId: order.id, status: v })}
                    >
                      <SelectTrigger className={`w-32 ${statusColors[order.orderStatus]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status} className="capitalize">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      {getNextStatus(order.orderStatus, order.orderType) && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const nextStatus = getNextStatus(order.orderStatus, order.orderType);
                            if (nextStatus) {
                              updateStatus.mutate({ orderId: order.id, status: nextStatus });
                            }
                          }}
                          disabled={updateStatus.isPending}
                        >
                          {getNextStatusLabel(getNextStatus(order.orderStatus, order.orderType)!)}
                        </Button>
                      )}
                      {order.orderStatus === 'completed' && (
                        <span className="text-green-600 font-medium">✓ Done</span>
                      )}
                      {order.orderStatus === 'cancelled' && (
                        <span className="text-red-600 font-medium">Cancelled</span>
                      )}
                      {/* Reprint KOT button */}
                      {order.orderStatus !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/kot/reprint', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  secret: import.meta.env.VITE_KOT_PRINT_SECRET || 'your-kot-secret',
                                  orderId: order.id,
                                }),
                              });
                              if (response.ok) {
                                toast.success('KOT queued for reprinting');
                              } else {
                                toast.error('Failed to reprint KOT');
                              }
                            } catch (error) {
                              toast.error('Failed to reprint KOT');
                            }
                          }}
                          title="Reprint KOT"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{orderDetails?.orderNumber}</DialogTitle>
          </DialogHeader>
          {orderDetails ? (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{orderDetails.customerName || 'Guest'}</p>
                  {orderDetails.customerPhone && <p className="text-sm">{orderDetails.customerPhone}</p>}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Type</p>
                  <p className="font-medium capitalize">{orderDetails.orderType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{orderDetails.orderStatus}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment</p>
                  <p className="font-medium capitalize">{(orderDetails as any).paymentMethod || 'N/A'} - {orderDetails.paymentStatus}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Order Time</p>
                  <p className="font-medium">{new Date(orderDetails.createdAt).toLocaleString()}</p>
                </div>
                {orderDetails.deliveryAddress && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Delivery Address</p>
                    <p className="font-medium">{orderDetails.deliveryAddress}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold mb-2">Order Items</h4>
                <div className="space-y-2">
                  {orderDetails.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start p-3 bg-secondary/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.product?.name || item.productName || 'Unknown Product'}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.size && `Size: ${item.size}`}
                          {item.bobaType && ` • Boba: ${item.bobaType}`}
                          {item.sugarLevel && ` • Sugar: ${item.sugarLevel}`}
                          {item.iceLevel && ` • Ice: ${item.iceLevel}`}
                        </p>
                        {item.addons && (
                          <p className="text-sm text-muted-foreground">Add-ons: {item.addons}</p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-sm text-amber-600">Note: {item.specialInstructions}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(item.totalPrice || item.unitPrice * item.quantity)}</p>
                        <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(orderDetails.totalAmount)}</span>
                </div>
                {(orderDetails as any).gstAmount > 0 && (
                  <p className="text-sm text-muted-foreground text-right">Includes GST: {formatPrice((orderDetails as any).gstAmount)}</p>
                )}
              </div>

              {/* Special Instructions */}
              {orderDetails.specialInstructions && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">Special Instructions:</p>
                  <p className="text-amber-700">{orderDetails.specialInstructions}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add-ons Tab
function AddonsTab() {
  const { data: addons, refetch } = trpc.admin.getAllAddons.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any>(null);
  
  const toggleStatus = trpc.admin.toggleAddonStatus.useMutation({
    onSuccess: () => refetch(),
  });
  
  const createAddon = trpc.admin.createAddon.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreate(false);
    },
  });
  
  const updateAddon = trpc.admin.updateAddon.useMutation({
    onSuccess: () => {
      refetch();
      setEditingAddon(null);
    },
  });

  const addonTypes = [
    { value: 'boba_flavor', label: 'Boba Flavor (Popping Boba)' },
    { value: 'boba_size', label: 'Boba Size (Tapioca)' },
    { value: 'extra_boba', label: 'Extra Boba' },
    { value: 'vegan_milk', label: 'Vegan Milk' },
    { value: 'food_addon', label: 'Food Add-on' },
  ];

  const groupedAddons = addons?.reduce((acc: Record<string, any[]>, addon: any) => {
    const type = addon.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(addon);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Add-ons Management</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Add-on
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Manage all add-ons here. Toggle the switch to enable/disable an add-on (e.g., when out of stock).
      </p>

      {addonTypes.map(({ value: type, label }) => (
        <Card key={type} className="p-4">
          <h3 className="font-medium mb-3">{label}</h3>
          <div className="space-y-2">
            {groupedAddons[type]?.map((addon: any) => (
              <div key={addon.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{addon.name}</span>
                    {addon.chineseName && <span className="text-muted-foreground">({addon.chineseName})</span>}
                    {!addon.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Disabled</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {addon.fixedPrice ? (
                      <span>₹{(addon.fixedPrice / 100).toFixed(0)}</span>
                    ) : (
                      <span>
                        Regular: ₹{addon.priceRegular ? (addon.priceRegular / 100).toFixed(0) : '-'} | 
                        Large: ₹{addon.priceLarge ? (addon.priceLarge / 100).toFixed(0) : '-'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingAddon(addon)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Switch
                    checked={addon.isActive}
                    onCheckedChange={(checked) => toggleStatus.mutate({ id: addon.id, isActive: checked })}
                  />
                </div>
              </div>
            )) || <p className="text-muted-foreground text-sm">No add-ons in this category</p>}
          </div>
        </Card>
      ))}

      {/* Create Add-on Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Add-on</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createAddon.mutate({
              name: formData.get('name') as string,
              chineseName: formData.get('chineseName') as string || undefined,
              type: formData.get('type') as any,
              fixedPrice: formData.get('fixedPrice') ? parseInt(formData.get('fixedPrice') as string) * 100 : undefined,
              pricePetite: formData.get('pricePetite') ? parseInt(formData.get('pricePetite') as string) * 100 : undefined,
              priceRegular: formData.get('priceRegular') ? parseInt(formData.get('priceRegular') as string) * 100 : undefined,
              priceLarge: formData.get('priceLarge') ? parseInt(formData.get('priceLarge') as string) * 100 : undefined,
              displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
            });
          }} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Chinese Name</Label>
              <Input name="chineseName" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select name="type" required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {addonTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fixed Price (₹)</Label>
                <Input name="fixedPrice" type="number" placeholder="For food add-ons" />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input name="displayOrder" type="number" defaultValue="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Regular (₹)</Label>
                <Input name="priceRegular" type="number" placeholder="0" />
              </div>
              <div>
                <Label>Large (₹)</Label>
                <Input name="priceLarge" type="number" placeholder="0" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createAddon.isPending}>
              {createAddon.isPending ? 'Creating...' : 'Create Add-on'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Add-on Dialog */}
      <Dialog open={!!editingAddon} onOpenChange={() => setEditingAddon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Add-on</DialogTitle>
          </DialogHeader>
          {editingAddon && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateAddon.mutate({
                id: editingAddon.id,
                name: formData.get('name') as string,
                chineseName: formData.get('chineseName') as string || undefined,
                type: formData.get('type') as any,
                fixedPrice: formData.get('fixedPrice') ? parseInt(formData.get('fixedPrice') as string) * 100 : null,
                pricePetite: formData.get('pricePetite') ? parseInt(formData.get('pricePetite') as string) * 100 : null,
                priceRegular: formData.get('priceRegular') ? parseInt(formData.get('priceRegular') as string) * 100 : null,
                priceLarge: formData.get('priceLarge') ? parseInt(formData.get('priceLarge') as string) * 100 : null,
                displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
              });
            }} className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input name="name" defaultValue={editingAddon.name} required />
              </div>
              <div>
                <Label>Chinese Name</Label>
                <Input name="chineseName" defaultValue={editingAddon.chineseName || ''} />
              </div>
              <div>
                <Label>Type *</Label>
                <Select name="type" defaultValue={editingAddon.type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {addonTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fixed Price (₹)</Label>
                  <Input name="fixedPrice" type="number" defaultValue={editingAddon.fixedPrice ? editingAddon.fixedPrice / 100 : ''} />
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input name="displayOrder" type="number" defaultValue={editingAddon.displayOrder || 0} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Petite (₹)</Label>
                  <Input name="pricePetite" type="number" defaultValue={editingAddon.pricePetite ? editingAddon.pricePetite / 100 : ''} />
                </div>
                <div>
                  <Label>Regular (₹)</Label>
                  <Input name="priceRegular" type="number" defaultValue={editingAddon.priceRegular ? editingAddon.priceRegular / 100 : ''} />
                </div>
                <div>
                  <Label>Large (₹)</Label>
                  <Input name="priceLarge" type="number" defaultValue={editingAddon.priceLarge ? editingAddon.priceLarge / 100 : ''} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateAddon.isPending}>
                {updateAddon.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcategory Edit Form Component
function SubcategoryEditForm({ sub, category, updateSubcategory, onClose }: { sub: any; category?: any; updateSubcategory: any; onClose?: () => void }) {
  // Determine if this subcategory has size/boba variants based on its own flags, not category name
  // Hot beverages like Tea in Pot have hasSizeVariants=false even though they're in a beverage category
  const hasSizeVariants = sub.hasSizeVariants !== false;
  const hasBobaOption = sub.hasBobaOption !== false;
  const showBeveragePricing = hasSizeVariants; // Only show beverage pricing if subcategory has size variants
  const [imagePreview, setImagePreview] = useState<string | null>(sub.imageUrl || null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [name, setName] = useState(sub.name);
  const [chineseName, setChineseName] = useState(sub.chineseName || '');
  const [description, setDescription] = useState(sub.description || '');
  const [basePricePetiteWithBoba, setBasePricePetiteWithBoba] = useState((sub.basePricePetiteWithBoba || 0) / 100);
  const [basePriceRegularWithBoba, setBasePriceRegularWithBoba] = useState((sub.basePriceRegularWithBoba || 0) / 100);
  const [basePriceLargeWithBoba, setBasePriceLargeWithBoba] = useState((sub.basePriceLargeWithBoba || 0) / 100);
  const [basePricePetiteNoBoba, setBasePricePetiteNoBoba] = useState((sub.basePricePetiteNoBoba || 0) / 100);
  const [basePriceRegularNoBoba, setBasePriceRegularNoBoba] = useState((sub.basePriceRegularNoBoba || 0) / 100);
  const [basePriceLargeNoBoba, setBasePriceLargeNoBoba] = useState((sub.basePriceLargeNoBoba || 0) / 100);
  const [deliveryPriceRegularWithBoba, setDeliveryPriceRegularWithBoba] = useState((sub.deliveryPriceRegularWithBoba || 0) / 100);
  const [deliveryPriceLargeWithBoba, setDeliveryPriceLargeWithBoba] = useState((sub.deliveryPriceLargeWithBoba || 0) / 100);
  const [deliveryPriceRegularNoBoba, setDeliveryPriceRegularNoBoba] = useState((sub.deliveryPriceRegularNoBoba || 0) / 100);
  const [deliveryPriceLargeNoBoba, setDeliveryPriceLargeNoBoba] = useState((sub.deliveryPriceLargeNoBoba || 0) / 100);
  const [syncPrices, setSyncPrices] = useState(false);
  const [availableInstore, setAvailableInstore] = useState(sub.availableInstore !== false);
  const [availableDelivery, setAvailableDelivery] = useState(sub.availableDelivery !== false);
  const [availablePickup, setAvailablePickup] = useState(sub.availablePickup !== false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageData(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateSubcategory.mutate({
      id: sub.id,
      name,
      chineseName: chineseName || null,
      description: description || null,
      imageData,
      basePricePetiteWithBoba: Math.round(basePricePetiteWithBoba * 100),
      basePriceRegularWithBoba: Math.round(basePriceRegularWithBoba * 100),
      basePriceLargeWithBoba: Math.round(basePriceLargeWithBoba * 100),
      basePricePetiteNoBoba: Math.round(basePricePetiteNoBoba * 100),
      basePriceRegularNoBoba: Math.round(basePriceRegularNoBoba * 100),
      basePriceLargeNoBoba: Math.round(basePriceLargeNoBoba * 100),
      deliveryPriceRegularWithBoba: Math.round(deliveryPriceRegularWithBoba * 100),
      deliveryPriceLargeWithBoba: Math.round(deliveryPriceLargeWithBoba * 100),
      deliveryPriceRegularNoBoba: Math.round(deliveryPriceRegularNoBoba * 100),
      deliveryPriceLargeNoBoba: Math.round(deliveryPriceLargeNoBoba * 100),
      syncProductPrices: syncPrices,
      availableInstore,
      availableDelivery,
      availablePickup,
    } as any);
  };

  return (
    <div className="space-y-4">
      {/* Subcategory Image Upload */}
      <div>
        <Label>Subcategory Image</Label>
        <div className="flex items-center gap-4 mt-2">
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
            {imagePreview ? (
              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id={`sub-img-upload-form-${sub.id}`}
              onChange={handleImageUpload}
            />
            <label htmlFor={`sub-img-upload-form-${sub.id}`}>
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer"><Upload className="w-4 h-4 mr-2" />Upload Image</span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-1">Recommended: 400x300px</p>
          </div>
        </div>
      </div>
      
      {/* Availability Toggles */}
      <div className="p-3 bg-secondary rounded-lg">
        <Label className="text-sm font-medium mb-2 block">Availability</Label>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`sub-avail-instore-${sub.id}`}
              checked={availableInstore}
              onChange={(e) => setAvailableInstore(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor={`sub-avail-instore-${sub.id}`} className="text-sm cursor-pointer">In-store</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`sub-avail-delivery-${sub.id}`}
              checked={availableDelivery}
              onChange={(e) => setAvailableDelivery(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor={`sub-avail-delivery-${sub.id}`} className="text-sm cursor-pointer">Delivery</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`sub-avail-pickup-${sub.id}`}
              checked={availablePickup}
              onChange={(e) => setAvailablePickup(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor={`sub-avail-pickup-${sub.id}`} className="text-sm cursor-pointer">Pickup</Label>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Subcategory Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Chinese Name (Optional)</Label>
          <Input value={chineseName} onChange={(e) => setChineseName(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Description (Optional)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {/* Only show size/boba pricing for subcategories with size variants */}
      {showBeveragePricing && (
        <>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">In-Store Base Pricing (₹)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Regular + Boba</Label>
                <Input type="number" step="0.01" value={basePriceRegularWithBoba} onChange={(e) => setBasePriceRegularWithBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Large + Boba</Label>
                <Input type="number" step="0.01" value={basePriceLargeWithBoba} onChange={(e) => setBasePriceLargeWithBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Regular No Boba</Label>
                <Input type="number" step="0.01" value={basePriceRegularNoBoba} onChange={(e) => setBasePriceRegularNoBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Large No Boba</Label>
                <Input type="number" step="0.01" value={basePriceLargeNoBoba} onChange={(e) => setBasePriceLargeNoBoba(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Delivery Base Pricing (₹)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Regular + Boba</Label>
                <Input type="number" step="0.01" value={deliveryPriceRegularWithBoba} onChange={(e) => setDeliveryPriceRegularWithBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Large + Boba</Label>
                <Input type="number" step="0.01" value={deliveryPriceLargeWithBoba} onChange={(e) => setDeliveryPriceLargeWithBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Regular No Boba</Label>
                <Input type="number" step="0.01" value={deliveryPriceRegularNoBoba} onChange={(e) => setDeliveryPriceRegularNoBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Large No Boba</Label>
                <Input type="number" step="0.01" value={deliveryPriceLargeNoBoba} onChange={(e) => setDeliveryPriceLargeNoBoba(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <input type="checkbox" checked={syncPrices} onChange={(e) => setSyncPrices(e.target.checked)} className="w-4 h-4" />
            <Label className="text-sm cursor-pointer">
              <span className="font-medium">Sync prices to products</span>
              <span className="text-muted-foreground block text-xs">Update all products using base pricing in this subcategory</span>
            </Label>
          </div>
        </>
      )}
      
      {/* For subcategories without size variants, show a simple note */}
      {!showBeveragePricing && (
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground">This category uses fixed product pricing. Edit individual products to set prices.</p>
        </div>
      )}
      <Button onClick={handleSave} disabled={updateSubcategory.isPending}>
        {updateSubcategory.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}

// Discounts Tab
function DiscountsTab() {
  const { data: discounts, refetch } = trpc.admin.getAllDiscounts.useQuery();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Discount Codes</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Discount
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Code</th>
                <th className="text-left p-3 text-sm font-medium">Type</th>
                <th className="text-right p-3 text-sm font-medium">Value</th>
                <th className="text-right p-3 text-sm font-medium">Min Order</th>
                <th className="text-center p-3 text-sm font-medium">Usage</th>
                <th className="text-center p-3 text-sm font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {discounts?.map((discount: any) => (
                <tr key={discount.id} className="border-b hover:bg-secondary/50">
                  <td className="p-3 font-mono font-medium">{discount.code}</td>
                  <td className="p-3 capitalize">{discount.type}</td>
                  <td className="p-3 text-right">
                    {discount.type === 'percentage' ? `${discount.value}%` : formatPrice(discount.value)}
                  </td>
                  <td className="p-3 text-right">
                    {discount.minOrderAmount ? formatPrice(discount.minOrderAmount) : '-'}
                  </td>
                  <td className="p-3 text-center">
                    {discount.usageCount} / {discount.usageLimit || '∞'}
                  </td>
                  <td className="p-3 text-center">
                    {discount.isActive ? (
                      <Check className="w-4 h-4 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-red-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateDiscountDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={refetch} />
    </div>
  );
}

// Create Discount Dialog
function CreateDiscountDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed_amount',
    value: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
  });

  const createDiscount = trpc.admin.createDiscount.useMutation({
    onSuccess: () => {
      toast.success('Discount created');
      onClose();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    createDiscount.mutate({
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: formData.value,
      minOrderAmount: formData.minOrderAmount || undefined,
      maxDiscountAmount: formData.maxDiscountAmount || undefined,
      usageLimit: formData.usageLimit || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Discount Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Code</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="SAVE10"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value ({formData.type === 'percentage' ? '%' : '₹'})</Label>
            <Input
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Minimum Order Amount (paise, 0 = no minimum)</Label>
            <Input
              type="number"
              value={formData.minOrderAmount}
              onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Usage Limit (0 = unlimited)</Label>
            <Input
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createDiscount.isPending}>
            {createDiscount.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Bulk Upload Tab
function BulkUploadTab() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ name: string; status: string }[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadResults([]);

    const results: { name: string; status: string }[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          results.push({ name: file.name, status: 'success' });
        } else {
          results.push({ name: file.name, status: 'failed' });
        }
      } catch (error) {
        results.push({ name: file.name, status: 'error' });
      }
    }

    setUploadResults(results);
    setUploading(false);
    toast.success(`Uploaded ${results.filter(r => r.status === 'success').length} of ${files.length} files`);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Bulk Photo Upload</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upload multiple product photos at once. Name your files with the product slug (e.g., "rose-milk-tea.jpg") 
          to automatically match them to products.
        </p>

        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="bulk-upload"
          />
          <label htmlFor="bulk-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Drop images here or click to browse</p>
            <p className="text-sm text-muted-foreground">Supports JPG, PNG, WebP</p>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">{files.length} files selected</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {files.map((file, i) => (
                <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {file.name}
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload All
                </>
              )}
            </Button>
          </div>
        )}

        {uploadResults.length > 0 && (
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <p className="font-medium mb-2">Upload Results</p>
            <div className="space-y-1">
              {uploadResults.map((result, i) => (
                <div key={i} className="text-sm flex items-center gap-2">
                  {result.status === 'success' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  {result.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Instructions</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>1. Name your image files using the product slug (URL-friendly name)</p>
          <p>2. Example: "rose-milk-tea.jpg" will be matched to the "Rose Milk Tea" product</p>
          <p>3. Supported formats: JPG, PNG, WebP</p>
          <p>4. Recommended size: 800x1200 pixels (portrait orientation)</p>
          <p>5. Maximum file size: 5MB per image</p>
        </div>
      </Card>
    </div>
  );
}


// POS functionality removed - OutletsTab and POSAuditTab removed

// Reviews Tab
function ReviewsTab() {
  const { data: reviews, refetch } = trpc.reviews.getAll.useQuery();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const updateStatus = trpc.reviews.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Review status updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteReview = trpc.reviews.delete.useMutation({
    onSuccess: () => {
      toast.success('Review deleted');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredReviews = reviews?.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  }) || [];

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Customer Reviews</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredReviews.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No reviews found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{review.customerName || 'Anonymous'}</span>
                    {renderStars(review.rating)}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[review.status]}`}>
                      {review.status}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                  {review.adminResponse && (
                    <div className="mt-2 p-3 bg-secondary/50 rounded-lg border-l-2 border-primary">
                      <p className="text-xs font-semibold text-primary mb-1">Admin Response:</p>
                      <p className="text-sm">{review.adminResponse}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {review.orderId && ` • Order #${review.orderId}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {review.status !== 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => updateStatus.mutate({ reviewId: review.id, status: 'approved' })}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  {review.status !== 'rejected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-yellow-600 hover:text-yellow-700"
                      onClick={() => updateStatus.mutate({ reviewId: review.id, status: 'rejected' })}
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  )}
                  <Dialog open={replyingTo === review.id} onOpenChange={(open) => { if (!open) { setReplyingTo(null); setReplyText(''); } }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:text-blue-700"
                        onClick={() => {
                          setReplyingTo(review.id);
                          setReplyText(review.adminResponse || '');
                        }}
                      >
                        <Reply className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reply to Review</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>{review.customerName}</strong> rated {review.rating} stars
                          </p>
                          {review.comment && (
                            <p className="text-sm italic border-l-2 border-muted pl-3">"{review.comment}"</p>
                          )}
                        </div>
                        <div>
                          <Label>Your Response</Label>
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Thank you for your feedback..."
                            rows={4}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            updateStatus.mutate({
                              reviewId: review.id,
                              status: review.status as 'pending' | 'approved' | 'rejected',
                              adminResponse: replyText || undefined,
                            });
                            setReplyingTo(null);
                            setReplyText('');
                          }}
                          disabled={!replyText.trim()}
                        >
                          Save Reply
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this review?')) {
                        deleteReview.mutate({ reviewId: review.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


// Site Settings Tab Component
function SiteSettingsTab() {
  const { data: settings, refetch } = trpc.admin.getSiteSettings.useQuery();
  const updateSetting = trpc.admin.updateSiteSetting.useMutation();

  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [qualityTitle, setQualityTitle] = useState('');
  const [qualityDescription, setQualityDescription] = useState('');
  const [freshnessTitle, setFreshnessTitle] = useState('');
  const [freshnessDescription, setFreshnessDescription] = useState('');
  const [deliveryTitle, setDeliveryTitle] = useState('');
  const [deliveryDescription, setDeliveryDescription] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (settings) {
      const settingsMap = settings.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});

      setHeroTitle(settingsMap.hero_title || 'Authentic Taiwanese\nBubble Tea');
      setHeroDescription(settingsMap.hero_description || 'Crafted with imported tapioca pearls from Taiwan. Experience the true taste of premium bubble tea at Taiwan Maami.');
      setQualityTitle(settingsMap.quality_title || 'Premium Quality');
      setQualityDescription(settingsMap.quality_description || 'Imported ingredients from Taiwan');
      setFreshnessTitle(settingsMap.freshness_title || 'Crafted Fresh');
      setFreshnessDescription(settingsMap.freshness_description || 'Made to order, every time');
      setDeliveryTitle(settingsMap.delivery_title || 'Quick Delivery');
      setDeliveryDescription(settingsMap.delivery_description || 'Fast delivery across Chennai');
      setStorePhone(settingsMap.store_phone || '+91 98765 43210');
      setStoreEmail(settingsMap.store_email || 'info@taiwanmaami.com');
      setStoreAddress(settingsMap.store_address || '34/8 Singarar Street, Triplicane, Chennai - 600005');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'hero_title', value: heroTitle },
        { key: 'hero_description', value: heroDescription },
        { key: 'quality_title', value: qualityTitle },
        { key: 'quality_description', value: qualityDescription },
        { key: 'freshness_title', value: freshnessTitle },
        { key: 'freshness_description', value: freshnessDescription },
        { key: 'delivery_title', value: deliveryTitle },
        { key: 'delivery_description', value: deliveryDescription },
        { key: 'store_phone', value: storePhone },
        { key: 'store_email', value: storeEmail },
        { key: 'store_address', value: storeAddress },
      ];

      for (const update of updates) {
        await updateSetting.mutateAsync(update);
      }

      toast.success('Settings saved successfully!');
      refetch();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Site Settings</h2>
        <p className="text-muted-foreground">Edit homepage content and site information</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Hero Section</h3>
        <div className="space-y-4">
          <div>
            <Label>Hero Title</Label>
            <Input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Authentic Taiwanese Bubble Tea"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Use \n for line breaks</p>
          </div>
          <div>
            <Label>Hero Description</Label>
            <textarea
              value={heroDescription}
              onChange={(e) => setHeroDescription(e.target.value)}
              placeholder="Crafted with imported tapioca pearls..."
              className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background mt-2"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Feature Highlights</h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-medium">Premium Quality</h4>
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                value={qualityTitle}
                onChange={(e) => setQualityTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input
                value={qualityDescription}
                onChange={(e) => setQualityDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Crafted Fresh</h4>
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                value={freshnessTitle}
                onChange={(e) => setFreshnessTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input
                value={freshnessDescription}
                onChange={(e) => setFreshnessDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Quick Delivery</h4>
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                value={deliveryTitle}
                onChange={(e) => setDeliveryTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input
                value={deliveryDescription}
                onChange={(e) => setDeliveryDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Store Information</h3>
        <div className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            <Input
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-2"
            />
          </div>
          <div>
            <Label>Email Address</Label>
            <Input
              value={storeEmail}
              onChange={(e) => setStoreEmail(e.target.value)}
              placeholder="info@taiwanmaami.com"
              className="mt-2"
            />
          </div>
          <div>
            <Label>Store Address</Label>
            <textarea
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="34/8 Singarar Street, Triplicane, Chennai - 600005"
              className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background mt-2"
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Changes are saved to the database and will be visible immediately on the homepage after saving.
        </p>
      </div>
    </div>
  );
}

// Bulk Pricing Tab Component
function BulkPricingTab() {
  const [scope, setScope] = useState<'all' | 'category' | 'subcategory'>('all');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>();
  const [priceType, setPriceType] = useState<'instore' | 'delivery' | 'both'>('both');
  const [updateMethod, setUpdateMethod] = useState<'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease'>('percentage_increase');
  const [value, setValue] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  
  const { data: categories } = trpc.menu.getCategories.useQuery();
  const { data: subcategoriesData } = trpc.menu.getSubcategories.useQuery();
  const utils = trpc.useUtils();
  
  const { data: preview, isLoading: previewLoading, refetch: refetchPreview } = trpc.admin.bulkPricePreview.useQuery(
    {
      scope,
      categoryId,
      subcategoryId,
      priceType,
      updateMethod,
      value: updateMethod.includes('fixed') ? value * 100 : value, // Convert to paise for fixed amounts
    },
    { enabled: showPreview && value > 0 }
  );
  
  const updateMutation = trpc.admin.bulkPriceUpdate.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully updated ${data.updatedCount} products`);
      setShowPreview(false);
      setValue(0);
      utils.menu.getProducts.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update prices: ${error.message}`);
    },
  });
  
  const handlePreview = () => {
    if (value <= 0) {
      toast.error('Please enter a value greater than 0');
      return;
    }
    setShowPreview(true);
    refetchPreview();
  };
  
  const handleApply = () => {
    if (!preview?.products) return;
    
    const updates = preview.products.map((p: { id: number; type?: string; newInstorePrice: number | null; newDeliveryPrice: number | null }) => ({
      id: p.id,
      type: (p.type || 'product') as 'product' | 'subcategory',
      instorePrice: p.newInstorePrice,
      deliveryPrice: p.newDeliveryPrice,
    }));
    
    updateMutation.mutate({ 
      updates, 
      priceType,
      updateMethod,
      value: updateMethod.includes('fixed') ? value * 100 : value,
    });
  };
  
  const filteredSubcategories = subcategoriesData?.filter(s => !categoryId || s.categoryId === categoryId) || [];
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Bulk Price Update</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Scope Selection */}
          <div>
            <Label className="mb-2 block">Scope</Label>
            <Select value={scope} onValueChange={(v: 'all' | 'category' | 'subcategory') => {
              setScope(v);
              setShowPreview(false);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="category">By Category</SelectItem>
                <SelectItem value="subcategory">By Subcategory</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Category Selection */}
          {(scope === 'category' || scope === 'subcategory') && (
            <div>
              <Label className="mb-2 block">Category</Label>
              <Select value={categoryId?.toString() || ''} onValueChange={(v) => {
                setCategoryId(v ? Number(v) : undefined);
                setSubcategoryId(undefined);
                setShowPreview(false);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Subcategory Selection */}
          {scope === 'subcategory' && categoryId && (
            <div>
              <Label className="mb-2 block">Subcategory</Label>
              <Select value={subcategoryId?.toString() || ''} onValueChange={(v) => {
                setSubcategoryId(v ? Number(v) : undefined);
                setShowPreview(false);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Price Type */}
          <div>
            <Label className="mb-2 block">Price Type</Label>
            <Select value={priceType} onValueChange={(v: 'instore' | 'delivery' | 'both') => {
              setPriceType(v);
              setShowPreview(false);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select price type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both Prices</SelectItem>
                <SelectItem value="instore">In-Store Only</SelectItem>
                <SelectItem value="delivery">Delivery Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Update Method */}
          <div>
            <Label className="mb-2 block">Update Method</Label>
            <Select value={updateMethod} onValueChange={(v: 'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease') => {
              setUpdateMethod(v);
              setShowPreview(false);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage_increase">Increase by %</SelectItem>
                <SelectItem value="percentage_decrease">Decrease by %</SelectItem>
                <SelectItem value="fixed_increase">Increase by ₹</SelectItem>
                <SelectItem value="fixed_decrease">Decrease by ₹</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Value Input */}
          <div>
            <Label className="mb-2 block">
              {updateMethod.includes('percentage') ? 'Percentage' : 'Amount (₹)'}
            </Label>
            <Input
              type="number"
              min="0"
              step={updateMethod.includes('percentage') ? '0.5' : '5'}
              value={value}
              onChange={(e) => {
                setValue(Number(e.target.value));
                setShowPreview(false);
              }}
              placeholder={updateMethod.includes('percentage') ? 'e.g., 10 for 10%' : 'e.g., 50 for ₹50'}
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={handlePreview} disabled={value <= 0 || previewLoading}>
            {previewLoading ? 'Loading...' : 'Preview Changes'}
          </Button>
          {showPreview && preview && preview.products.length > 0 && (
            <Button 
              onClick={handleApply} 
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateMutation.isPending ? 'Applying...' : `Apply to ${preview.totalCount} Products`}
            </Button>
          )}
        </div>
      </Card>
      
      {/* Preview Table */}
      {showPreview && preview && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Preview ({preview.totalCount} products)</h3>
          {preview.products.length === 0 ? (
            <p className="text-muted-foreground">No products match the selected criteria</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Product</th>
                    <th className="text-right py-2 px-3">Old In-Store</th>
                    <th className="text-right py-2 px-3">New In-Store</th>
                    <th className="text-right py-2 px-3">Old Delivery</th>
                    <th className="text-right py-2 px-3">New Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.products.slice(0, 50).map(p => (
                    <tr key={p.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">{p.name}</td>
                      <td className="text-right py-2 px-3">
                        {p.oldInstorePrice ? formatPrice(p.oldInstorePrice) : '-'}
                      </td>
                      <td className="text-right py-2 px-3 font-medium">
                        {p.newInstorePrice ? (
                          <span className={p.newInstorePrice !== p.oldInstorePrice ? 'text-green-600' : ''}>
                            {formatPrice(p.newInstorePrice)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-right py-2 px-3">
                        {p.oldDeliveryPrice ? formatPrice(p.oldDeliveryPrice) : '-'}
                      </td>
                      <td className="text-right py-2 px-3 font-medium">
                        {p.newDeliveryPrice ? (
                          <span className={p.newDeliveryPrice !== p.oldDeliveryPrice ? 'text-green-600' : ''}>
                            {formatPrice(p.newDeliveryPrice)}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.products.length > 50 && (
                <p className="text-sm text-muted-foreground mt-2">Showing first 50 of {preview.products.length} products</p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// KOT Reports Tab Component
function KOTReportsTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const { data: summary, isLoading } = trpc.kot.getDailySummary.useQuery({ date: selectedDate });

  const toggleOrder = (kotId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(kotId)) {
      newExpanded.delete(kotId);
    } else {
      newExpanded.add(kotId);
    }
    setExpandedOrders(newExpanded);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">KOT Analytics & Staffing Report</h2>
          <div className="flex items-center gap-4">
            <Label>Select Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading report...</div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="text-sm text-blue-600 font-medium">Total Orders</div>
                <div className="text-3xl font-bold text-blue-900 mt-2">{summary.totalKots}</div>
                <div className="text-xs text-blue-600 mt-1">{summary.date}</div>
              </Card>

              <Card className="p-4 bg-green-50 border-green-200">
                <div className="text-sm text-green-600 font-medium">Pickup Orders</div>
                <div className="text-3xl font-bold text-green-900 mt-2">
                  {(summary.orderTypeBreakdown as Record<string, number>)['PICKUP'] || 0}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {summary.totalKots > 0 ? Math.round((((summary.orderTypeBreakdown as Record<string, number>)['PICKUP'] || 0) / summary.totalKots) * 100) : 0}% of total
                </div>
              </Card>

              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Delivery Orders</div>
                <div className="text-3xl font-bold text-purple-900 mt-2">
                  {(summary.orderTypeBreakdown as Record<string, number>)['DELIVERY'] || 0}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {summary.totalKots > 0 ? Math.round((((summary.orderTypeBreakdown as Record<string, number>)['DELIVERY'] || 0) / summary.totalKots) * 100) : 0}% of total
                </div>
              </Card>

              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="text-sm text-amber-600 font-medium">Dine-In Orders</div>
                <div className="text-3xl font-bold text-amber-900 mt-2">
                  {(summary.orderTypeBreakdown as Record<string, number>)['INSTORE'] || 0}
                </div>
                <div className="text-xs text-amber-600 mt-1">
                  {summary.totalKots > 0 ? Math.round((((summary.orderTypeBreakdown as Record<string, number>)['INSTORE'] || 0) / summary.totalKots) * 100) : 0}% of total
                </div>
              </Card>
            </div>

            {/* Hourly Breakdown Chart */}
            {summary.hourlyBreakdown && summary.hourlyBreakdown.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">📊 Hourly Order Volume</h3>
                <div className="space-y-2">
                  {summary.hourlyBreakdown
                    .filter(h => h.count > 0)
                    .map((hour) => (
                      <div key={hour.hour} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-medium text-muted-foreground">
                          {hour.hourLabel}
                        </div>
                        <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                          <div
                            className="bg-primary h-full flex items-center justify-end px-3 text-primary-foreground text-sm font-bold transition-all"
                            style={{
                              width: `${Math.max((hour.count / Math.max(...summary.hourlyBreakdown.map(h => h.count))) * 100, 5)}%`,
                            }}
                          >
                            {hour.count}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {/* Peak Hours & Staffing Recommendations */}
            {summary.peakHours && summary.peakHours.length > 0 && (
              <Card className="p-6 bg-orange-50 border-orange-200">
                <h3 className="text-lg font-bold mb-4 text-orange-900">⚡ Peak Hours & Staffing Recommendations</h3>
                <div className="space-y-3">
                  {summary.peakHours.map((peak, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-orange-200">
                      <div>
                        <div className="font-bold text-orange-900">{peak.hour}</div>
                        <div className="text-sm text-orange-700">{peak.orders} orders</div>
                      </div>
                      <div className="text-sm text-orange-800 font-medium">
                        {peak.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Detailed Order List */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">📋 Detailed Order List ({summary.orders.length} orders)</h3>
              {summary.orders.length > 0 ? (
                <div className="space-y-2">
                  {summary.orders.map((order) => (
                    <div key={order.kotId} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleOrder(order.kotId)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="font-mono text-sm font-bold text-primary">
                            KOT #{order.kotId}
                          </div>
                          <div className="text-sm font-medium">
                            {order.orderNumber}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${
                            order.orderType === 'PICKUP' ? 'bg-green-100 text-green-800' :
                            order.orderType === 'DELIVERY' ? 'bg-purple-100 text-purple-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {order.orderType}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.customerName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.totalItems} items
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium">
                            {formatTime(order.createdAt)}
                          </div>
                          {expandedOrders.has(order.kotId) ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {expandedOrders.has(order.kotId) && (
                        <div className="p-4 bg-background border-t">
                          <div className="space-y-2">
                            {order.items.map((item: { quantity: number; name: string; customizations?: string }, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-muted/20 rounded">
                                <div className="font-bold text-primary">{item.quantity}x</div>
                                <div className="flex-1">
                                  <div className="font-medium">{item.name}</div>
                                  {item.customizations && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {item.customizations}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No orders on this date
                </div>
              )}
            </Card>

            {/* Top Selling Items */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">🏆 Top Selling Items</h3>
              {summary.topItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">#</th>
                        <th className="text-left py-3 px-4 font-semibold">Product Name</th>
                        <th className="text-right py-3 px-4 font-semibold">Quantity Sold</th>
                        <th className="text-right py-3 px-4 font-semibold">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topItems.map((item, index) => {
                        const totalItems = summary.topItems.reduce((sum, i) => sum + i.quantity, 0);
                        const percentage = Math.round((item.quantity / totalItems) * 100);
                        return (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                            <td className="py-3 px-4 font-medium">{item.productName}</td>
                            <td className="py-3 px-4 text-right font-bold">{item.quantity}</td>
                            <td className="py-3 px-4 text-right text-muted-foreground">{percentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No items sold on this date
                </div>
              )}
            </Card>

            {/* Operational Insights */}
            {summary.totalKots > 0 && (
              <Card className="p-6 bg-blue-50 border-blue-200">
                <h3 className="text-lg font-bold mb-3 text-blue-900">💡 Operational Insights</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• <strong>{summary.totalKots} orders</strong> were processed on {summary.date}</p>
                  {summary.peakHours.length > 0 && (
                    <p>• Peak ordering time was <strong>{summary.peakHours[0].hour}</strong> with {summary.peakHours[0].orders} orders - consider scheduling extra staff during this period</p>
                  )}
                  {summary.topItems[0] && (
                    <p>• "<strong>{summary.topItems[0].productName}</strong>" was the most popular item with {summary.topItems[0].quantity} orders - ensure adequate inventory</p>
                  )}
                  <p>• Order type distribution: {(summary.orderTypeBreakdown as Record<string, number>)['PICKUP'] || 0} Pickup, {(summary.orderTypeBreakdown as Record<string, number>)['DELIVERY'] || 0} Delivery, {(summary.orderTypeBreakdown as Record<string, number>)['INSTORE'] || 0} Dine-in</p>
                  <p>• Use this data for inventory planning, staff scheduling, and operational optimization</p>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No data available</div>
        )}
      </Card>
    </div>
  );
}


// Audit Log Tab Component
function AuditTab() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const { data: auditLogs, isLoading } = trpc.audit.getProductLogs.useQuery({
    action: actionFilter !== 'all' ? actionFilter as any : undefined,
    startDate: dateRange.start,
    endDate: dateRange.end + 'T23:59:59',
    limit: 200,
  });

  const { data: summary } = trpc.audit.getSummary.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end + 'T23:59:59',
  });

  const { data: productHistory } = trpc.audit.getProductHistory.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      deactivate: 'bg-orange-100 text-orange-800',
      reactivate: 'bg-emerald-100 text-emerald-800',
      stock_in: 'bg-teal-100 text-teal-800',
      stock_out: 'bg-amber-100 text-amber-800',
      price_change: 'bg-purple-100 text-purple-800',
      image_change: 'bg-indigo-100 text-indigo-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      deactivate: 'Deactivated',
      reactivate: 'Reactivated',
      stock_in: 'Stock In',
      stock_out: 'Stock Out',
      price_change: 'Price Changed',
      image_change: 'Image Changed',
    };
    return labels[action] || action;
  };

  // Export audit logs to CSV
  const exportToCSV = () => {
    if (!auditLogs?.logs || auditLogs.logs.length === 0) {
      toast.error('No audit logs to export');
      return;
    }

    const headers = ['Date', 'Product', 'Action', 'Field Changed', 'Old Value', 'New Value', 'Changed By'];
    const rows = auditLogs.logs.map(log => [
      formatDate(log.createdAt),
      log.productName,
      getActionLabel(log.action),
      log.fieldChanged || '-',
      log.oldValue?.replace(/"/g, '') || '-',
      log.newValue?.replace(/"/g, '') || '-',
      log.userName || 'System',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${dateRange.start}-to-${dateRange.end}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Audit log exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Changes</div>
          <div className="text-3xl font-bold text-blue-900 mt-2">{auditLogs?.total || 0}</div>
          <div className="text-xs text-blue-600 mt-1">In selected period</div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-green-600 font-medium">Products Created</div>
          <div className="text-3xl font-bold text-green-900 mt-2">
            {summary?.byAction.find(a => a.action === 'create')?.count || 0}
          </div>
        </Card>

        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="text-sm text-orange-600 font-medium">Stock Changes</div>
          <div className="text-3xl font-bold text-orange-900 mt-2">
            {(summary?.byAction.find(a => a.action === 'stock_in')?.count || 0) +
             (summary?.byAction.find(a => a.action === 'stock_out')?.count || 0)}
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Price Changes</div>
          <div className="text-3xl font-bold text-purple-900 mt-2">
            {summary?.byAction.find(a => a.action === 'price_change')?.count || 0}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Filters:</span>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Action:</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="deactivate">Deactivated</SelectItem>
                <SelectItem value="reactivate">Reactivated</SelectItem>
                <SelectItem value="stock_in">Stock In</SelectItem>
                <SelectItem value="stock_out">Stock Out</SelectItem>
                <SelectItem value="price_change">Price Change</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">From:</Label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">To:</Label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-40"
            />
          </div>

          <div className="ml-auto">
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={!auditLogs?.logs || auditLogs.logs.length === 0}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Activity by User */}
      {summary?.byUser && summary.byUser.length > 0 && (
        <Card className="p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Activity by User
          </h3>
          <div className="flex flex-wrap gap-4">
            {summary.byUser.map((user, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <span className="font-medium">{user.userName}</span>
                <span className="text-sm text-muted-foreground">({user.count} changes)</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Audit Log Table */}
      <Card className="p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Change History
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
        ) : auditLogs?.logs && auditLogs.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium">Product</th>
                  <th className="text-left py-3 px-4 font-medium">Action</th>
                  <th className="text-left py-3 px-4 font-medium">Field</th>
                  <th className="text-left py-3 px-4 font-medium">Old Value</th>
                  <th className="text-left py-3 px-4 font-medium">New Value</th>
                  <th className="text-left py-3 px-4 font-medium">Changed By</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="font-medium text-primary hover:underline"
                        onClick={() => setSelectedProductId(log.productId)}
                      >
                        {log.productName}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {log.fieldChanged || '-'}
                    </td>
                    <td className="py-3 px-4 max-w-32 truncate" title={log.oldValue || ''}>
                      {log.oldValue ? (
                        <span className="text-red-600">{log.oldValue.replace(/"/g, '')}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 max-w-32 truncate" title={log.newValue || ''}>
                      {log.newValue ? (
                        <span className="text-green-600">{log.newValue.replace(/"/g, '')}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {log.userName || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No audit logs found for the selected filters
          </div>
        )}
      </Card>

      {/* Product History Dialog */}
      <Dialog open={!!selectedProductId} onOpenChange={() => setSelectedProductId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Product Change History
            </DialogTitle>
          </DialogHeader>

          {productHistory && productHistory.length > 0 ? (
            <div className="space-y-3">
              {productHistory.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                    {getActionLabel(log.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{log.fieldChanged || 'Product'}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                    </div>
                    {log.oldValue && log.newValue && (
                      <div className="text-sm mt-1">
                        <span className="text-red-600 line-through">{log.oldValue.replace(/"/g, '')}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{log.newValue.replace(/"/g, '')}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      by {log.userName || 'System'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No history found for this product
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Create Product Dialog
function CreateProductDialog({ 
  subcategories, 
  categories,
  onSuccess 
}: { 
  subcategories: any[]; 
  categories: any[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    chineseName: '',
    slug: '',
    description: '',
    subcategoryId: 0,
    instorePrice: 0,
    deliveryPrice: 0,
    isVegetarian: true,
    isVegan: false,
    containsEgg: false,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();

  const createProduct = trpc.admin.createProduct.useMutation({
    onSuccess: (data) => {
      toast.success('Product created successfully!');
      // Invalidate menu cache so changes reflect immediately
      utils.menu.getFullMenu.invalidate();
      onSuccess();
      if (imagePreview && data.id) {
        // Upload image after product is created
        uploadImage.mutate({
          productId: data.id,
          imageBase64: imagePreview,
          mimeType: 'image/jpeg',
          fileName: `${formData.slug}.jpg`,
        });
      }
      setOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadImage = trpc.admin.uploadProductImage.useMutation({
    onSuccess: () => {
      toast.success('Image uploaded');
      onSuccess();
    },
    onError: (err) => toast.error(`Image upload failed: ${err.message}`),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      chineseName: '',
      slug: '',
      description: '',
      subcategoryId: 0,
      instorePrice: 0,
      deliveryPrice: 0,
      isVegetarian: true,
      isVegan: false,
      containsEgg: false,
    });
    setImagePreview(null);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Image must be less than 50MB');
      return;
    }
    
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.subcategoryId) {
      toast.error('Please fill in required fields (Name and Subcategory)');
      return;
    }
    
    createProduct.mutate({
      name: formData.name,
      chineseName: formData.chineseName || undefined,
      slug: formData.slug || generateSlug(formData.name),
      description: formData.description || undefined,
      subcategoryId: formData.subcategoryId,
      instorePrice: formData.instorePrice * 100, // Convert to paise
      deliveryPrice: formData.deliveryPrice * 100, // Convert to paise
      isVegetarian: formData.isVegetarian,
      isVegan: formData.isVegan,
      containsEgg: formData.containsEgg,
    });
  };

  // Group subcategories by category for easier selection
  const groupedSubcategories = categories.map(cat => ({
    category: cat,
    subcategories: subcategories.filter(sub => sub.categoryId === cat.id),
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4" />
          New Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Upload */}
          <div className="flex items-start gap-4">
            <div className="w-32 h-32 border-2 border-dashed rounded-lg overflow-hidden flex items-center justify-center bg-secondary/20">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                  <span className="text-xs">No image</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label>Product Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: Square image, max 50MB
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Taro Milk Tea"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Chinese Name</Label>
              <Input
                value={formData.chineseName}
                onChange={(e) => setFormData(prev => ({ ...prev, chineseName: e.target.value }))}
                placeholder="e.g., 芋頭奶茶"
                className="mt-1"
              />
            </div>
          </div>

          {/* Slug */}
          <div>
            <Label>URL Slug</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="auto-generated-from-name"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated from name. Used in URLs.
            </p>
          </div>

          {/* Category/Subcategory */}
          <div>
            <Label>Subcategory *</Label>
            <Select 
              value={formData.subcategoryId ? String(formData.subcategoryId) : ''} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, subcategoryId: parseInt(v) }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select subcategory" />
              </SelectTrigger>
              <SelectContent>
                {groupedSubcategories.map(group => (
                  <div key={group.category.id}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-secondary/50">
                      {group.category.name}
                    </div>
                    {group.subcategories.map(sub => (
                      <SelectItem key={sub.id} value={String(sub.id)}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the product..."
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>In-Store Price (₹)</Label>
              <Input
                type="number"
                value={formData.instorePrice || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, instorePrice: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Delivery Price (₹)</Label>
              <Input
                type="number"
                value={formData.deliveryPrice || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryPrice: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>

          {/* Dietary Options */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isVegetarian}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isVegetarian: v }))}
                id="create-vegetarian"
              />
              <Label htmlFor="create-vegetarian" className="cursor-pointer">Vegetarian</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isVegan}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isVegan: v }))}
                id="create-vegan"
              />
              <Label htmlFor="create-vegan" className="cursor-pointer">Vegan</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.containsEgg}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, containsEgg: v }))}
                id="create-egg"
              />
              <Label htmlFor="create-egg" className="cursor-pointer">Contains Egg</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createProduct.isPending || !formData.name || !formData.subcategoryId}
            className="gap-2"
          >
            {createProduct.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Product
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
