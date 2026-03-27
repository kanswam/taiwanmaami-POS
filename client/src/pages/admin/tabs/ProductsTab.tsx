import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, GST_RATE } from '@shared/types';
import { 
  Home, Package, ShoppingCart, Tag, Upload, LogOut, 
  Plus, Edit, Trash2, ImageIcon, RefreshCw, Check, X, Search,
  ChevronDown, ChevronUp, Eye, EyeOff, Star, MessageSquare, Reply, Printer,
  ClipboardList, RotateCcw, History, Filter, BarChart3, UtensilsCrossed, AlertCircle, DollarSign, CreditCard, Users,
  Settings, Layers, FileText, TrendingUp, Calendar, Ticket, Mail, Phone, MapPin, Clock, UserCheck, BookOpen, GitMerge, ArrowRight, AlertTriangle, Download, Bot, Crown
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProductsTab() {
  const utils = trpc.useUtils();
  // Use admin-specific query that returns ALL products/subcategories/categories
  // regardless of availability flags (so staff toggling availability doesn't hide items from admin)
  const { data: menuData, refetch } = trpc.admin.getFullMenuAdmin.useQuery();
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
      // Invalidate both admin and customer menu caches
      utils.admin.getFullMenuAdmin.invalidate();
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
      // Invalidate both admin and customer menu caches
      utils.admin.getFullMenuAdmin.invalidate();
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

  // toggleActive removed - product deactivation now requires double confirmation via ProductEditDialog

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
                      <th className="text-center p-3 text-sm font-medium">Status</th>
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
                                <img src={product.imageUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
                          {product.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs border-green-500 text-green-700 hover:bg-green-50"
                              onClick={() => reactivateProduct.mutate({ id: product.id })}
                              disabled={reactivateProduct.isPending}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reactivate
                            </Button>
                          )}
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
                            <img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async" className="w-10 h-10 rounded object-cover opacity-50" />
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
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);
  const [confirmProductName, setConfirmProductName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const { data: menuData } = trpc.admin.getFullMenuAdmin.useQuery();
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
    isNonVeg: product.isNonVeg ?? false,
    availableAtPalladium: product.availableAtPalladium ?? true,
  });
  // Multi-image support
  const [images, setImages] = useState<(string | null)[]>([
    product.imageUrl || null,
    product.imageUrl2 || null,
    product.imageUrl3 || null,
  ]);
  const [uploading, setUploading] = useState(false);

  const reactivateProduct = trpc.admin.reactivateProduct.useMutation({
    onSuccess: () => {
      toast.success('Product reactivated successfully');
      setOpen(false);
      onUpdate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deactivateProduct = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success('Product deactivated successfully');
      setOpen(false);
      setShowDeactivateConfirm(false);
      setConfirmProductName('');
      setConfirmationCode('');
      onUpdate();
    },
    onError: (err) => toast.error(err.message),
  });

  const permanentlyDeleteProduct = trpc.admin.permanentlyDeleteProduct.useMutation({
    onSuccess: () => {
      toast.success('Product permanently deleted');
      setOpen(false);
      setShowPermanentDeleteConfirm(false);
      setConfirmProductName('');
      setConfirmationCode('');
      onUpdate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetConfirmState = () => {
    setShowDeactivateConfirm(false);
    setShowPermanentDeleteConfirm(false);
    setConfirmProductName('');
    setConfirmationCode('');
  };

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
      isNonVeg: formData.isNonVeg,
      availableAtPalladium: formData.availableAtPalladium,
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
                      <img src={images[index]!} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isNonVeg}
                  onCheckedChange={(checked) => setFormData({ ...formData, isNonVeg: checked })}
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-600 border border-red-700"></span>
                  Non-Veg
                </span>
              </div>
            </div>
          </div>

          {/* Outlet Availability */}
          <div>
            <Label>Outlet Availability</Label>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.availableAtPalladium}
                  onCheckedChange={(checked) => setFormData({ ...formData, availableAtPalladium: checked })}
                />
                <span className="text-sm font-medium">Available at Palladium Mall</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                When disabled, this product will be greyed out for Palladium pickup orders.
                T Nagar has all products available.
              </p>
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
        {/* Double Confirmation Deactivation Dialog */}
        {showDeactivateConfirm && (
          <div className="border-2 border-orange-400 bg-orange-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold">Deactivate Product</h4>
            </div>
            <p className="text-sm text-orange-700">
              This will hide <strong>"{product.name}"</strong> from all customers. You can reactivate it later.
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-orange-800">Type the product name to confirm:</Label>
              <Input
                value={confirmProductName}
                onChange={(e) => setConfirmProductName(e.target.value)}
                placeholder={product.name}
                className="border-orange-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-orange-800">Type <strong>DEACTIVATE</strong> to confirm:</Label>
              <Input
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="DEACTIVATE"
                className="border-orange-300"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={
                  confirmProductName.trim().toLowerCase() !== product.name.trim().toLowerCase() ||
                  confirmationCode !== 'DEACTIVATE' ||
                  deactivateProduct.isPending
                }
                onClick={() => deactivateProduct.mutate({
                  id: product.id,
                  confirmProductName: confirmProductName.trim(),
                  confirmationCode: confirmationCode,
                })}
              >
                {deactivateProduct.isPending ? 'Deactivating...' : 'Confirm Deactivation'}
              </Button>
              <Button variant="outline" size="sm" onClick={resetConfirmState}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Double Confirmation Permanent Delete Dialog */}
        {showPermanentDeleteConfirm && (
          <div className="border-2 border-red-400 bg-red-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold">PERMANENT DELETION</h4>
            </div>
            <p className="text-sm text-red-700">
              <strong>WARNING:</strong> This will permanently remove <strong>"{product.name}"</strong> from the database. This action CANNOT be undone.
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-red-800">Type the product name to confirm:</Label>
              <Input
                value={confirmProductName}
                onChange={(e) => setConfirmProductName(e.target.value)}
                placeholder={product.name}
                className="border-red-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-red-800">Type <strong>DELETE-FOREVER</strong> to confirm:</Label>
              <Input
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="DELETE-FOREVER"
                className="border-red-300"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={
                  confirmProductName.trim().toLowerCase() !== product.name.trim().toLowerCase() ||
                  confirmationCode !== 'DELETE-FOREVER' ||
                  permanentlyDeleteProduct.isPending
                }
                onClick={() => permanentlyDeleteProduct.mutate({
                  id: product.id,
                  confirmProductName: confirmProductName.trim(),
                  confirmationCode: confirmationCode,
                })}
              >
                {permanentlyDeleteProduct.isPending ? 'Deleting Forever...' : 'PERMANENTLY DELETE'}
              </Button>
              <Button variant="outline" size="sm" onClick={resetConfirmState}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <div className="flex gap-2">
            {product.isActive ? (
              <Button 
                variant="ghost" 
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                onClick={() => { resetConfirmState(); setShowDeactivateConfirm(true); }}
                disabled={showDeactivateConfirm || showPermanentDeleteConfirm}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Deactivate
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => reactivateProduct.mutate({ id: product.id })}
                disabled={reactivateProduct.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {reactivateProduct.isPending ? 'Reactivating...' : 'Reactivate'}
              </Button>
            )}
            {canDeleteData?.canDelete ? (
              <Button 
                variant="ghost" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => { resetConfirmState(); setShowPermanentDeleteConfirm(true); }}
                disabled={showDeactivateConfirm || showPermanentDeleteConfirm}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Forever
              </Button>
            ) : canDeleteData ? (
              <span className="text-xs text-muted-foreground self-center">
                Cannot delete — has {canDeleteData.orderCount} order(s)
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); resetConfirmState(); }}>Cancel</Button>
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
    isNonVeg: false,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();

  const createProduct = trpc.admin.createProduct.useMutation({
    onSuccess: (data) => {
      toast.success('Product created successfully!');
      // Invalidate both admin and customer menu caches
      utils.admin.getFullMenuAdmin.invalidate();
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
      isNonVeg: false,
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
      isNonVeg: formData.isNonVeg,
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
                <img src={imagePreview} alt="Preview" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isNonVeg}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isNonVeg: v }))}
                id="create-nonveg"
              />
              <Label htmlFor="create-nonveg" className="cursor-pointer text-red-600 font-semibold">Non-Veg</Label>
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


// CMS Tab - Content Management System for editable pages

