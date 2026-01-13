import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
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
  Settings, Layers, FileText, TrendingUp
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
import { RichTextEditor } from '@/components/RichTextEditor';

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
          <TabsList className="flex flex-wrap gap-1 w-full mb-6 h-auto p-1">
            {/* Menu Management Group */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={['products', 'categories', 'addons'].includes(activeTab) ? 'default' : 'outline'} 
                  size="sm" 
                  className={`gap-2 ${!['products', 'categories', 'addons'].includes(activeTab) ? 'border-transparent hover:bg-accent' : ''}`}
                >
                  <Package className="w-4 h-4" />
                  Menu
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setActiveTab('products')} className={activeTab === 'products' ? 'bg-accent' : ''}>
                  <Package className="w-4 h-4 mr-2" /> Products
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('categories')} className={activeTab === 'categories' ? 'bg-accent' : ''}>
                  <Layers className="w-4 h-4 mr-2" /> Categories
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('addons')} className={activeTab === 'addons' ? 'bg-accent' : ''}>
                  <Plus className="w-4 h-4 mr-2" /> Add-ons
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Orders & Operations */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={['orders', 'tables', 'kot-reports'].includes(activeTab) ? 'default' : 'outline'} 
                  size="sm" 
                  className={`gap-2 ${!['orders', 'tables', 'kot-reports'].includes(activeTab) ? 'border-transparent hover:bg-accent' : ''}`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Orders
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setActiveTab('orders')} className={activeTab === 'orders' ? 'bg-accent' : ''}>
                  <ShoppingCart className="w-4 h-4 mr-2" /> All Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('tables')} className={activeTab === 'tables' ? 'bg-accent' : ''}>
                  <UtensilsCrossed className="w-4 h-4 mr-2" /> Tables
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('kot-reports')} className={activeTab === 'kot-reports' ? 'bg-accent' : ''}>
                  <Printer className="w-4 h-4 mr-2" /> KOT Reports
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Pricing & Promotions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={['discounts', 'bulk-pricing'].includes(activeTab) ? 'default' : 'outline'} 
                  size="sm" 
                  className={`gap-2 ${!['discounts', 'bulk-pricing'].includes(activeTab) ? 'border-transparent hover:bg-accent' : ''}`}
                >
                  <Tag className="w-4 h-4" />
                  Pricing
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setActiveTab('discounts')} className={activeTab === 'discounts' ? 'bg-accent' : ''}>
                  <Tag className="w-4 h-4 mr-2" /> Discounts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('bulk-pricing')} className={activeTab === 'bulk-pricing' ? 'bg-accent' : ''}>
                  <DollarSign className="w-4 h-4 mr-2" /> Bulk Pricing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Customers & Feedback */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={['customers', 'reviews', 'complaints'].includes(activeTab) ? 'default' : 'outline'} 
                  size="sm" 
                  className={`gap-2 ${!['customers', 'reviews', 'complaints'].includes(activeTab) ? 'border-transparent hover:bg-accent' : ''}`}
                >
                  <Users className="w-4 h-4" />
                  Customers
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setActiveTab('customers')} className={activeTab === 'customers' ? 'bg-accent' : ''}>
                  <Users className="w-4 h-4 mr-2" /> Customer List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('reviews')} className={activeTab === 'reviews' ? 'bg-accent' : ''}>
                  <Star className="w-4 h-4 mr-2" /> Reviews
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('complaints')} className={activeTab === 'complaints' ? 'bg-accent' : ''}>
                  <AlertCircle className="w-4 h-4 mr-2" /> Complaints
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reports & Analytics */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={['analytics', 'audit', 'payment-report'].includes(activeTab) ? 'default' : 'outline'} 
                  size="sm" 
                  className={`gap-2 ${!['analytics', 'audit', 'payment-report'].includes(activeTab) ? 'border-transparent hover:bg-accent' : ''}`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Reports
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => navigate('/admin/analytics')}>
                  <BarChart3 className="w-4 h-4 mr-2" /> Analytics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('payment-report')} className={activeTab === 'payment-report' ? 'bg-accent' : ''}>
                  <CreditCard className="w-4 h-4 mr-2" /> Payment Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('audit')} className={activeTab === 'audit' ? 'bg-accent' : ''}>
                  <ClipboardList className="w-4 h-4 mr-2" /> Audit Log
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings & Tools */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={['settings', 'bulk-upload', 'cms', 'admin-pin', 'refunds'].includes(activeTab) ? 'default' : 'outline'} 
                  size="sm" 
                  className={`gap-2 ${!['settings', 'bulk-upload', 'cms', 'admin-pin', 'refunds'].includes(activeTab) ? 'border-transparent hover:bg-accent' : ''}`}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'bg-accent' : ''}>
                  <Settings className="w-4 h-4 mr-2" /> Site Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('cms')} className={activeTab === 'cms' ? 'bg-accent' : ''}>
                  <FileText className="w-4 h-4 mr-2" /> Content Pages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('admin-pin')} className={activeTab === 'admin-pin' ? 'bg-accent' : ''}>
                  <CreditCard className="w-4 h-4 mr-2" /> Admin PIN
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('refunds')} className={activeTab === 'refunds' ? 'bg-accent' : ''}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Refund Requests
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab('bulk-upload')} className={activeTab === 'bulk-upload' ? 'bg-accent' : ''}>
                  <Upload className="w-4 h-4 mr-2" /> Bulk Upload
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

          <TabsContent value="tables">
            <TablesTab />
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

          <TabsContent value="complaints">
            <ComplaintsTab />
          </TabsContent>

          <TabsContent value="customers">
            <CustomersTab />
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

          <TabsContent value="cms">
            <CMSTab />
          </TabsContent>

          <TabsContent value="admin-pin">
            <AdminPinTab />
          </TabsContent>

          <TabsContent value="refunds">
            <RefundsTab />
          </TabsContent>

          <TabsContent value="payment-report">
            <PaymentReportTab />
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
    availableAtPalladium: product.availableAtPalladium ?? true,
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
                                loading="lazy"
                                decoding="async"
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
  
  // Apply Discount state
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountOrderId, setDiscountOrderId] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  
  // Add Items state
  const [addItemsDialogOpen, setAddItemsDialogOpen] = useState(false);
  const [addItemsOrderId, setAddItemsOrderId] = useState<number | null>(null);
  const [addItemsOrderNumber, setAddItemsOrderNumber] = useState<string>('');
  
  // Cancel Item state
  const [cancelItemDialog, setCancelItemDialog] = useState<{ open: boolean; item: any; order: any; reason: string }>({
    open: false, item: null, order: null, reason: ''
  });
  
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Order status updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updatePaymentStatus = trpc.orders.updatePaymentStatus.useMutation({
    onSuccess: async (_, variables) => {
      toast.success('Payment collected successfully!');
      
      // Queue receipt for printing
      try {
        await fetch('/api/receipt/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: import.meta.env.VITE_KOT_PRINT_SECRET || 'tmm-kot-print-2024-secure',
            orderId: variables.orderId,
          }),
        });
        toast.success('Receipt queued for printing');
      } catch (error) {
        console.error('Failed to queue receipt:', error);
      }
      
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelOrderItem = trpc.orders.cancelOrderItem.useMutation({
    onSuccess: () => {
      toast.success('Item cancelled');
      setCancelItemDialog({ open: false, item: null, order: null, reason: '' });
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel item');
    },
  });

  const applyDiscount = trpc.orders.applyManualDiscount.useMutation({
    onSuccess: (data) => {
      toast.success(`Discount applied! New total: ${formatPrice(data.newTotalAmount)}`);
      setDiscountDialogOpen(false);
      setDiscountValue('');
      setDiscountReason('');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleApplyDiscount = () => {
    if (!discountOrderId || !discountValue) return;
    
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      toast.error('Please enter a valid discount value');
      return;
    }
    
    applyDiscount.mutate({
      orderId: discountOrderId,
      discountType,
      discountValue: discountType === 'fixed' ? Math.round(value * 100) : value, // Convert to paise for fixed
      reason: discountReason || undefined,
    });
  };

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
                    <div className="flex gap-2 justify-center flex-wrap">
                      {/* Apply Discount button - only for pending payment AND not completed/cancelled */}
                      {order.paymentStatus === 'pending' && !order.manualDiscountAmount && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-500 text-amber-600 hover:bg-amber-50"
                          onClick={() => {
                            setDiscountOrderId(order.id);
                            setDiscountDialogOpen(true);
                          }}
                        >
                          🏷️ Discount
                        </Button>
                      )}
                      {/* Show applied discount */}
                      {(order.manualDiscountAmount ?? 0) > 0 && (
                        <span className="text-amber-600 text-xs font-medium">
                          -{formatPrice(order.manualDiscountAmount ?? 0)} off
                        </span>
                      )}
                      {/* Add Items button - only for pending payment AND not completed/cancelled */}
                      {order.orderType === 'instore' && order.paymentStatus === 'pending' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500 text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            setAddItemsOrderId(order.id);
                            setAddItemsOrderNumber(order.orderNumber);
                            setAddItemsDialogOpen(true);
                          }}
                        >
                          ➕ Add Items
                        </Button>
                      )}
                      {/* Collect Payment button - only for pending payment AND not completed/cancelled */}
                      {order.orderType === 'instore' && order.paymentStatus === 'pending' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            updatePaymentStatus.mutate({ orderId: order.id, paymentStatus: 'completed' });
                          }}
                          disabled={updatePaymentStatus.isPending}
                        >
                          💰 Collect Payment
                        </Button>
                      )}
                      {/* Reprint KOT button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await fetch('/api/kot/reprint', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                secret: import.meta.env.VITE_KOT_PRINT_SECRET || 'tmm-kot-print-2024-secure',
                                orderId: order.id,
                              }),
                            });
                            toast.success('KOT queued for reprinting');
                          } catch (error) {
                            toast.error('Failed to reprint KOT');
                          }
                        }}
                      >
                        🖨️ Reprint KOT
                      </Button>
                      {/* Print Receipt button for completed orders */}
                      {order.paymentStatus === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await fetch('/api/receipt/queue', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  secret: import.meta.env.VITE_KOT_PRINT_SECRET || 'tmm-kot-print-2024-secure',
                                  orderId: order.id,
                                }),
                              });
                              toast.success('Receipt queued for printing');
                            } catch (error) {
                              toast.error('Failed to queue receipt');
                            }
                          }}
                        >
                          🧾 Print Receipt
                        </Button>
                      )}
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
                  {orderDetails.items?.map((item: any, idx: number) => {
                    const isCancelled = item.status === 'cancelled';
                    return (
                    <div key={idx} className={`flex justify-between items-start p-3 bg-secondary/50 rounded-lg ${isCancelled ? 'opacity-60' : ''}`}>
                      <div className="flex-1">
                        <p className={`font-medium ${isCancelled ? 'line-through text-red-500' : ''}`}>{item.product?.name || item.productName || 'Unknown Product'}</p>
                        {isCancelled && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Cancelled</span>
                        )}
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
                      <div className="flex items-center gap-2">
                        {!isCancelled && orderDetails.orderType === 'instore' && orderDetails.orderStatus !== 'completed' && orderDetails.orderStatus !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Cancel Item"
                            onClick={() => setCancelItemDialog({ open: true, item, order: orderDetails, reason: '' })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <div className="text-right">
                          <p className={`font-medium ${isCancelled ? 'line-through' : ''}`}>{formatPrice(item.totalPrice || item.unitPrice * item.quantity)}</p>
                          <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                        </div>
                      </div>
                    </div>
                    );
                  })}
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

      {/* Apply Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Discount Type</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'fixed' | 'percentage')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount (₹)'}</Label>
              <Input
                type="number"
                placeholder={discountType === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 100 for ₹100'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
              />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g., Customer complaint, Loyalty, Manager approval"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApplyDiscount}
                disabled={!discountValue || applyDiscount.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {applyDiscount.isPending ? 'Applying...' : 'Apply Discount'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Items Dialog */}
      <Dialog open={addItemsDialogOpen} onOpenChange={setAddItemsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Items to Order #{addItemsOrderNumber}</DialogTitle>
          </DialogHeader>
          {addItemsOrderId && (
            <AddItemsToOrderForm 
              orderId={addItemsOrderId} 
              orderNumber={addItemsOrderNumber}
              onSuccess={() => {
                setAddItemsDialogOpen(false);
                setAddItemsOrderId(null);
                refetch();
              }}
              onCancel={() => setAddItemsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Item Dialog */}
      <Dialog open={cancelItemDialog.open} onOpenChange={(open) => setCancelItemDialog({ ...cancelItemDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Item: {cancelItemDialog.item?.productName}</p>
              <p className="text-sm text-muted-foreground">Quantity: {cancelItemDialog.item?.quantity}</p>
              <p className="text-sm text-muted-foreground">Price: {formatPrice(cancelItemDialog.item?.lineTotal || 0)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                placeholder="Why do you want to cancel this item?"
                value={cancelItemDialog.reason}
                onChange={(e) => setCancelItemDialog({ ...cancelItemDialog, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelItemDialog({ open: false, item: null, order: null, reason: '' })}>
              Keep Item
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (cancelItemDialog.item) {
                  cancelOrderItem.mutate({
                    orderItemId: cancelItemDialog.item.id,
                    reason: cancelItemDialog.reason,
                  });
                }
              }}
              disabled={cancelOrderItem.isPending}
            >
              {cancelOrderItem.isPending ? 'Cancelling...' : 'Cancel Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add Items to Order Form Component
function AddItemsToOrderForm({ orderId, orderNumber, onSuccess, onCancel }: {
  orderId: number;
  orderNumber: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { data: categories } = trpc.menu.getCategories.useQuery();
  const { data: allProducts } = trpc.menu.getProducts.useQuery({});
  const [selectedItems, setSelectedItems] = useState<Array<{
    productId: number;
    productName: string;
    size?: 'petite' | 'regular' | 'large';
    withBoba?: boolean;
    sugarLevel?: string;
    iceLevel?: string;
    quantity: number;
    unitPrice: number;
    addonsTotal: number;
    lineTotal: number;
    addons: Array<{ id: number; name: string; price: number }>;
    specialInstructions?: string;
  }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const addItemsToOrder = trpc.orders.addItemsToOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`Added ${data.itemsAdded} item(s). New total: ${formatPrice(data.newTotalAmount)}`);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const filteredProducts = allProducts?.filter(p => {
    const name = 'product' in p ? p.product.name : p.name;
    const subcatName = 'subcategory' in p ? p.subcategory?.name : '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (subcatName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
  }) || [];
  
  const addProduct = (productData: any) => {
    const product = 'product' in productData ? productData.product : productData;
    const basePrice = product.instorePrice ?? 0;
    setSelectedItems(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      size: product.hasSizes ? 'regular' : undefined,
      withBoba: product.hasBobaOption ? true : undefined,
      sugarLevel: product.hasSugarOptions ? '100%' : undefined,
      iceLevel: product.hasIceOptions ? 'Regular' : undefined,
      quantity: 1,
      unitPrice: basePrice,
      addonsTotal: 0,
      lineTotal: basePrice,
      addons: [],
      specialInstructions: '',
    }]);
  };
  
  const updateItem = (index: number, updates: Partial<typeof selectedItems[0]>) => {
    setSelectedItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, ...updates };
      updated.lineTotal = (updated.unitPrice + updated.addonsTotal) * updated.quantity;
      return updated;
    }));
  };
  
  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };
  
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  
  const handleSubmit = () => {
    if (selectedItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    addItemsToOrder.mutate({ orderId, items: selectedItems });
  };
  
  return (
    <div className="space-y-4">
      {/* Search Products */}
      <div>
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      
      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
        {filteredProducts.slice(0, 20).map(productData => {
          const product = 'product' in productData ? productData.product : productData;
          return (
            <Button
              key={product.id}
              variant="outline"
              size="sm"
              className="h-auto py-2 px-3 text-left justify-start"
              onClick={() => addProduct(productData)}
            >
              <div>
                <div className="font-medium text-xs truncate">{product.name}</div>
                <div className="text-xs text-muted-foreground">{formatPrice(product.instorePrice ?? 0)}</div>
              </div>
            </Button>
          );
        })}
      </div>
      
      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <h4 className="font-semibold text-sm">Items to Add:</h4>
          {selectedItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-secondary rounded">
              <div className="flex-1">
                <div className="font-medium text-sm">{item.productName}</div>
                <div className="text-xs text-muted-foreground">
                  {item.size && `${item.size} `}
                  {formatPrice(item.unitPrice)} x {item.quantity} = {formatPrice(item.lineTotal)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                >
                  -
                </Button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => updateItem(index, { quantity: item.quantity + 1 })}
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-500"
                  onClick={() => removeItem(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Subtotal:</span>
            <span className="font-semibold">{formatPrice(totalAmount)}</span>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={selectedItems.length === 0 || addItemsToOrder.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {addItemsToOrder.isPending ? 'Adding...' : `Add ${selectedItems.length} Item(s)`}
        </Button>
      </div>
    </div>
  );
}

// Tables Tab - Table Status Dashboard for In-store Orders
function TablesTab() {
  const { data: activeOrders, refetch } = trpc.orders.getActiveInstoreOrders.useQuery();
  const updatePaymentStatus = trpc.orders.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast.success('Payment status updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Group orders by table number
  const tableOrders = useMemo(() => {
    if (!activeOrders) return [];
    const grouped = new Map<string, typeof activeOrders>();
    activeOrders.forEach(order => {
      const tableNum = order.tableNumber || 'No Table';
      if (!grouped.has(tableNum)) {
        grouped.set(tableNum, []);
      }
      grouped.get(tableNum)!.push(order);
    });
    return Array.from(grouped.entries());
  }, [activeOrders]);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    preparing: 'bg-orange-100 text-orange-800 border-orange-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
    completed: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const paymentStatusColors: Record<string, string> = {
    pending: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
  };

  // Calculate table total
  const getTableTotal = (orders: typeof activeOrders) => {
    if (!orders) return 0;
    return orders.reduce((sum, order) => sum + order.totalAmount, 0);
  };

  // Check if all orders on table are completed
  const isTableReady = (orders: typeof activeOrders) => {
    if (!orders || orders.length === 0) return false;
    return orders.every((order: any) => order.orderStatus === 'ready' || order.orderStatus === 'completed');
  };

  // Check if table needs payment
  const needsPayment = (orders: typeof activeOrders) => {
    if (!orders) return false;
    return orders.some((order: any) => order.paymentStatus === 'pending');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Table Status Dashboard</h2>
          <p className="text-sm text-muted-foreground">Monitor in-store orders by table</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tableOrders.map(([tableNum, orders]) => (
          <Card 
            key={tableNum} 
            className={`p-4 border-2 ${
              isTableReady(orders) 
                ? needsPayment(orders) 
                  ? 'border-amber-400 bg-amber-50' 
                  : 'border-green-400 bg-green-50'
                : 'border-blue-400 bg-blue-50'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-bold">Table {tableNum}</h3>
                <p className="text-sm text-muted-foreground">
                  {orders?.length || 0} order{(orders?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatPrice(getTableTotal(orders))}</p>
                {needsPayment(orders) && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">Unpaid</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {orders?.map((order: any) => (
                <div key={order.id} className="p-2 bg-white rounded border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">#{order.orderNumber.slice(-6)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[order.orderStatus] || ''}`}>
                      {order.orderStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm">{formatPrice(order.totalAmount)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${paymentStatusColors[order.paymentStatus] || ''}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  {order.paymentStatus === 'pending' && (
                    <Button 
                      size="sm" 
                      className="w-full mt-2 h-7 text-xs"
                      onClick={() => updatePaymentStatus.mutate({ orderId: order.id, paymentStatus: 'completed' })}
                    >
                      Mark as Paid
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {isTableReady(orders) && needsPayment(orders) && (
              <Button 
                className="w-full mt-3"
                onClick={() => {
                  orders?.forEach((order: any) => {
                    if (order.paymentStatus === 'pending') {
                      updatePaymentStatus.mutate({ orderId: order.id, paymentStatus: 'completed' });
                    }
                  });
                }}
              >
                Collect Payment ({formatPrice(getTableTotal(orders))})
              </Button>
            )}
          </Card>
        ))}
      </div>

      {tableOrders.length === 0 && (
        <Card className="p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active Tables</h3>
          <p className="text-muted-foreground">In-store orders will appear here when customers place orders.</p>
        </Card>
      )}
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
  const [availableAtPalladium, setAvailableAtPalladium] = useState((sub as any).availableAtPalladium !== false);
  const [availableAtTnagar, setAvailableAtTnagar] = useState((sub as any).availableAtTnagar !== false);

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
      availableAtPalladium,
      availableAtTnagar,
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
              <img src={imagePreview} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
        <div className="mt-3 pt-3 border-t border-muted-foreground/20">
          <Label className="text-xs text-muted-foreground mb-2 block">Outlet Availability</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`sub-avail-palladium-${sub.id}`}
                checked={availableAtPalladium}
                onChange={(e) => setAvailableAtPalladium(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor={`sub-avail-palladium-${sub.id}`} className="text-sm cursor-pointer">Palladium</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`sub-avail-tnagar-${sub.id}`}
                checked={availableAtTnagar}
                onChange={(e) => setAvailableAtTnagar(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor={`sub-avail-tnagar-${sub.id}`} className="text-sm cursor-pointer">T Nagar</Label>
            </div>
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
  
  const deleteDiscount = trpc.admin.deleteDiscount.useMutation({
    onSuccess: () => {
      toast.success('Discount deleted');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

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
                <th className="text-center p-3 text-sm font-medium">Action</th>
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
                  <td className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Delete discount code "${discount.code}"?`)) {
                          deleteDiscount.mutate({ id: discount.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

// Complaints Tab Component
function ComplaintsTab() {
  const { data: complaints, refetch } = trpc.complaints.getAll.useQuery();
  const { data: stats } = trpc.complaints.getStats.useQuery();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionType, setResolutionType] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState('');
  const [storeCreditAmount, setStoreCreditAmount] = useState('');

  const updateStatus = trpc.complaints.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Complaint status updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveComplaint = trpc.complaints.resolve.useMutation({
    onSuccess: () => {
      toast.success('Complaint resolved successfully');
      refetch();
      setResolvingId(null);
      setResolution('');
      setResolutionType('');
      setRefundAmount('');
      setStoreCreditAmount('');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteComplaint = trpc.complaints.delete.useMutation({
    onSuccess: () => {
      toast.success('Complaint deleted');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredComplaints = complaints?.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    return true;
  }) || [];

  const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const complaintTypeLabels: Record<string, string> = {
    delivery_issue: 'Delivery Issue',
    quality_issue: 'Quality Issue',
    missing_item: 'Missing Item',
    wrong_order: 'Wrong Order',
    late_delivery: 'Late Delivery',
    payment_issue: 'Payment Issue',
    staff_behavior: 'Staff Behavior',
    other: 'Other',
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="p-4 text-center border-red-200 bg-red-50">
            <p className="text-2xl font-bold text-red-600">{stats.open}</p>
            <p className="text-xs text-red-600">Open</p>
          </Card>
          <Card className="p-4 text-center border-yellow-200 bg-yellow-50">
            <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            <p className="text-xs text-yellow-600">In Progress</p>
          </Card>
          <Card className="p-4 text-center border-green-200 bg-green-50">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-green-600">Resolved</p>
          </Card>
          <Card className="p-4 text-center border-gray-200 bg-gray-50">
            <p className="text-2xl font-bold text-gray-600">{stats.closed}</p>
            <p className="text-xs text-gray-600">Closed</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-xl font-semibold">Customer Complaints</h2>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredComplaints.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No complaints found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((complaint) => (
            <Card key={complaint.id} className="p-4">
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{complaint.customerName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[complaint.status]}`}>
                        {complaint.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[complaint.priority]}`}>
                        {complaint.priority}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {complaint.customerEmail && <span>{complaint.customerEmail} • </span>}
                      {complaint.customerPhone && <span>{complaint.customerPhone} • </span>}
                      {complaint.orderNumber && <span>Order #{complaint.orderNumber}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Complaint Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium bg-secondary px-2 py-0.5 rounded">
                      {complaintTypeLabels[complaint.complaintType] || complaint.complaintType}
                    </span>
                  </div>
                  <p className="text-sm">{complaint.description}</p>
                </div>

                {/* Resolution (if resolved) */}
                {complaint.resolution && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Resolved</span>
                      {complaint.resolutionType && (
                        <span className="text-xs bg-green-100 px-2 py-0.5 rounded text-green-700">
                          {complaint.resolutionType.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-green-800">{complaint.resolution}</p>
                    {(complaint.refundAmount || complaint.storeCreditAmount) && (
                      <div className="mt-2 flex gap-4 text-sm">
                        {complaint.refundAmount && (
                          <span className="text-green-700">Refund: ₹{(complaint.refundAmount / 100).toFixed(2)}</span>
                        )}
                        {complaint.storeCreditAmount && (
                          <span className="text-green-700">Store Credit: ₹{(complaint.storeCreditAmount / 100).toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    {complaint.resolvedByName && (
                      <p className="text-xs text-green-600 mt-1">Resolved by {complaint.resolvedByName}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {complaint.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ complaintId: complaint.id, status: 'in_progress' })}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {(complaint.status === 'open' || complaint.status === 'in_progress') && (
                    <Dialog open={resolvingId === complaint.id} onOpenChange={(open) => { if (!open) setResolvingId(null); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="default" onClick={() => setResolvingId(complaint.id)}>
                          <Check className="w-4 h-4 mr-1" />
                          Resolve
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Resolve Complaint</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Resolution Type *</Label>
                            <Select value={resolutionType} onValueChange={setResolutionType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select resolution type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="refund">Issue Refund</SelectItem>
                                <SelectItem value="store_credit">Give Store Credit</SelectItem>
                                <SelectItem value="replacement">Replacement/Reorder</SelectItem>
                                <SelectItem value="apology">Apology Only</SelectItem>
                                <SelectItem value="no_action">No Action Needed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {resolutionType === 'refund' && (
                            <div>
                              <Label>Refund Amount (₹)</Label>
                              <Input
                                type="number"
                                placeholder="e.g., 250"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                              />
                            </div>
                          )}

                          {resolutionType === 'store_credit' && (
                            <div>
                              <Label>Store Credit Amount (₹)</Label>
                              <Input
                                type="number"
                                placeholder="e.g., 100"
                                value={storeCreditAmount}
                                onChange={(e) => setStoreCreditAmount(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                This will be added to the customer's account balance
                              </p>
                            </div>
                          )}

                          <div>
                            <Label>Resolution Notes *</Label>
                            <Textarea
                              value={resolution}
                              onChange={(e) => setResolution(e.target.value)}
                              placeholder="Describe how the complaint was resolved..."
                              rows={3}
                            />
                          </div>

                          <Button
                            className="w-full"
                            disabled={!resolutionType || !resolution.trim()}
                            onClick={() => {
                              resolveComplaint.mutate({
                                complaintId: complaint.id,
                                resolution,
                                resolutionType: resolutionType as any,
                                refundAmount: refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined,
                                storeCreditAmount: storeCreditAmount ? Math.round(parseFloat(storeCreditAmount) * 100) : undefined,
                              });
                            }}
                          >
                            Resolve Complaint
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {complaint.status === 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ complaintId: complaint.id, status: 'closed' })}
                    >
                      Close Complaint
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this complaint?')) {
                        deleteComplaint.mutate({ complaintId: complaint.id });
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

// Customers Tab Component
function CustomersTab() {
  const { data: customersData, refetch } = trpc.customers.getAll.useQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'registered' | 'guest'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [editingCustomer, setEditingCustomer] = useState<{ id: number; name: string; phone: string; email: string; storeCredit: number; notes: string } | null>(null);

  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success('Customer added successfully');
      setShowAddDialog(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateCustomer = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success('Customer updated successfully');
      setShowEditDialog(false);
      setEditingCustomer(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredCustomers = customersData?.customers?.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || customer.type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Customer Database</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="guest">Guests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Name</th>
                <th className="text-left p-3 text-sm font-medium">Phone</th>
                <th className="text-left p-3 text-sm font-medium">Email</th>
                <th className="text-center p-3 text-sm font-medium">Type</th>
                <th className="text-right p-3 text-sm font-medium">Orders</th>
                <th className="text-right p-3 text-sm font-medium">Total Spent</th>
                <th className="text-right p-3 text-sm font-medium">Store Credit</th>
                <th className="text-center p-3 text-sm font-medium">Stamps</th>
                <th className="text-left p-3 text-sm font-medium">Last Order</th>
                <th className="text-center p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer: any) => (
                <tr key={customer.id} className="border-b hover:bg-secondary/50">
                  <td className="p-3 font-medium">{customer.name || 'N/A'}</td>
                  <td className="p-3">{customer.phone || 'N/A'}</td>
                  <td className="p-3">{customer.email || 'N/A'}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${customer.type === 'registered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {customer.type === 'registered' ? 'Registered' : 'Guest'}
                    </span>
                  </td>
                  <td className="p-3 text-right">{customer.totalOrders}</td>
                  <td className="p-3 text-right">{formatPrice(customer.totalSpent)}</td>
                  <td className="p-3 text-right">{formatPrice(customer.storeCredit)}</td>
                  <td className="p-3 text-center">
                    {customer.type === 'registered' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        ⭐ {customer.stampCount || 0}/10
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    {customer.lastOrderDate 
                      ? new Date(customer.lastOrderDate).toLocaleDateString()
                      : 'N/A'
                    }
                  </td>
                  <td className="p-3 text-center">
                    {customer.type === 'registered' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCustomer({
                            id: customer.id,
                            name: customer.name || '',
                            phone: customer.phone || '',
                            email: customer.email || '',
                            storeCredit: customer.storeCredit || 0,
                            notes: customer.notes || '',
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredCustomers.length} of {customersData?.total || 0} customers
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="10-digit phone number"
              />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="customer@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              disabled={!newCustomer.name.trim() || !newCustomer.phone.trim()}
              onClick={() => createCustomer.mutate(newCustomer)}
            >
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setEditingCustomer(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={editingCustomer.phone}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  placeholder="10-digit phone number"
                />
              </div>
              <div>
                <Label>Email (Optional)</Label>
                <Input
                  value={editingCustomer.email}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  placeholder="customer@email.com"
                />
              </div>
              <div>
                <Label>Store Credit (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editingCustomer.storeCredit}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, storeCredit: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">Adjust store credit balance for this customer</p>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingCustomer.notes}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  placeholder="Special preferences, delivery instructions, etc."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingCustomer(null);
            }}>Cancel</Button>
            <Button
              disabled={!editingCustomer?.name.trim() || !editingCustomer?.phone.trim() || updateCustomer.isPending}
              onClick={() => {
                if (editingCustomer) {
                  updateCustomer.mutate({
                    id: editingCustomer.id,
                    name: editingCustomer.name,
                    phone: editingCustomer.phone,
                    email: editingCustomer.email || undefined,
                    storeCredit: editingCustomer.storeCredit,
                    notes: editingCustomer.notes || undefined,
                  });
                }
              }}
            >
              {updateCustomer.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [deliveryRadius, setDeliveryRadius] = useState('15');
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Category cards
  const [cat1Name, setCat1Name] = useState('Iced Beverages');
  const [cat1Desc, setCat1Desc] = useState('Authentic Taiwanese bubble tea & premium coffee');
  const [cat2Name, setCat2Name] = useState('Hot Beverages');
  const [cat2Desc, setCat2Desc] = useState('Warm & comforting traditional drinks');
  const [cat3Name, setCat3Name] = useState('Asian Rice-Noodles-Bread');
  const [cat3Desc, setCat3Desc] = useState('Savory Asian street food favorites');
  const [cat4Name, setCat4Name] = useState('Asian Sweet Bites');
  const [cat4Desc, setCat4Desc] = useState('Delicious mochis & desserts');
  
  // Location cards
  const [loc1Name, setLoc1Name] = useState('Taiwan Maami');
  const [loc1Subtitle, setLoc1Subtitle] = useState('Palladium Mall');
  const [loc1Address, setLoc1Address] = useState('First Floor, Palladium Mall, Velachery');
  const [loc1City, setLoc1City] = useState('Chennai - 600042');
  const [loc2Name, setLoc2Name] = useState('Moutan');
  const [loc2Subtitle, setLoc2Subtitle] = useState('T Nagar');
  const [loc2Address, setLoc2Address] = useState('New No. 29, Burkit Road, T Nagar');
  const [loc2City, setLoc2City] = useState('Chennai - 600017');
  
  // Company details
  const [companyName, setCompanyName] = useState('Thamarai Foods and Trading Private Limited');
  const [gstNumber, setGstNumber] = useState('33AAKCT4782H1Z1');

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
      setDeliveryRadius(settingsMap.delivery_radius || '15');
      setDeliveryEnabled(settingsMap.delivery_enabled !== 'false');
      
      // Category cards
      setCat1Name(settingsMap.cat1_name || 'Iced Beverages');
      setCat1Desc(settingsMap.cat1_desc || 'Authentic Taiwanese bubble tea & premium coffee');
      setCat2Name(settingsMap.cat2_name || 'Hot Beverages');
      setCat2Desc(settingsMap.cat2_desc || 'Warm & comforting traditional drinks');
      setCat3Name(settingsMap.cat3_name || 'Asian Rice-Noodles-Bread');
      setCat3Desc(settingsMap.cat3_desc || 'Savory Asian street food favorites');
      setCat4Name(settingsMap.cat4_name || 'Asian Sweet Bites');
      setCat4Desc(settingsMap.cat4_desc || 'Delicious mochis & desserts');
      
      // Location cards
      setLoc1Name(settingsMap.loc1_name || 'Taiwan Maami');
      setLoc1Subtitle(settingsMap.loc1_subtitle || 'Palladium Mall');
      setLoc1Address(settingsMap.loc1_address || 'First Floor, Palladium Mall, Velachery');
      setLoc1City(settingsMap.loc1_city || 'Chennai - 600042');
      setLoc2Name(settingsMap.loc2_name || 'Moutan');
      setLoc2Subtitle(settingsMap.loc2_subtitle || 'T Nagar');
      setLoc2Address(settingsMap.loc2_address || 'New No. 29, Burkit Road, T Nagar');
      setLoc2City(settingsMap.loc2_city || 'Chennai - 600017');
      
      // Company details
      setCompanyName(settingsMap.company_name || 'Thamarai Foods and Trading Private Limited');
      setGstNumber(settingsMap.gst_number || '33AAKCT4782H1Z1');
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
        { key: 'delivery_radius', value: deliveryRadius },
        { key: 'delivery_enabled', value: deliveryEnabled ? 'true' : 'false' },
        // Category cards
        { key: 'cat1_name', value: cat1Name },
        { key: 'cat1_desc', value: cat1Desc },
        { key: 'cat2_name', value: cat2Name },
        { key: 'cat2_desc', value: cat2Desc },
        { key: 'cat3_name', value: cat3Name },
        { key: 'cat3_desc', value: cat3Desc },
        { key: 'cat4_name', value: cat4Name },
        { key: 'cat4_desc', value: cat4Desc },
        // Location cards
        { key: 'loc1_name', value: loc1Name },
        { key: 'loc1_subtitle', value: loc1Subtitle },
        { key: 'loc1_address', value: loc1Address },
        { key: 'loc1_city', value: loc1City },
        { key: 'loc2_name', value: loc2Name },
        { key: 'loc2_subtitle', value: loc2Subtitle },
        { key: 'loc2_address', value: loc2Address },
        { key: 'loc2_city', value: loc2City },
        // Company details
        { key: 'company_name', value: companyName },
        { key: 'gst_number', value: gstNumber },
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

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Delivery Settings</h3>
        <div className="space-y-4">
          {/* Quick Delivery Toggle */}
          <div className={`p-4 rounded-lg border-2 ${deliveryEnabled ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Delivery Service</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {deliveryEnabled 
                    ? 'Delivery is currently ENABLED for customers' 
                    : 'Delivery is currently DISABLED - customers cannot place delivery orders'}
                </p>
              </div>
              <Switch
                checked={deliveryEnabled}
                onCheckedChange={setDeliveryEnabled}
              />
            </div>
            {!deliveryEnabled && (
              <p className="text-sm text-red-700 mt-2 font-medium">
                ⚠️ Use this to temporarily disable deliveries during bad weather, staff shortages, or high demand.
              </p>
            )}
          </div>

          <div>
            <Label>Delivery Radius (km)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Input
                type="number"
                min="1"
                max="50"
                value={deliveryRadius}
                onChange={(e) => setDeliveryRadius(e.target.value)}
                className="w-32"
                disabled={!deliveryEnabled}
              />
              <span className="text-muted-foreground">kilometers from T Nagar outlet</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Adjust based on weather conditions, traffic, or delivery partner availability.
              Customers outside this radius will see a notice that delivery is not available to their area.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Current setting:</strong> {deliveryEnabled ? `Delivery available within ${deliveryRadius}km of T Nagar outlet.` : 'Delivery is currently disabled.'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Category Cards</h3>
        <p className="text-sm text-muted-foreground mb-4">Edit the category cards shown on the homepage</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Category 1 (Iced Beverages)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={cat1Name} onChange={(e) => setCat1Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={cat1Desc} onChange={(e) => setCat1Desc(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Category 2 (Hot Beverages)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={cat2Name} onChange={(e) => setCat2Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={cat2Desc} onChange={(e) => setCat2Desc(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Category 3 (Food)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={cat3Name} onChange={(e) => setCat3Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={cat3Desc} onChange={(e) => setCat3Desc(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Category 4 (Desserts)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={cat4Name} onChange={(e) => setCat4Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={cat4Desc} onChange={(e) => setCat4Desc(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Location Cards</h3>
        <p className="text-sm text-muted-foreground mb-4">Edit the outlet locations shown on the homepage</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Location 1 (Palladium)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={loc1Name} onChange={(e) => setLoc1Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Subtitle</Label>
              <Input value={loc1Subtitle} onChange={(e) => setLoc1Subtitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Address</Label>
              <Input value={loc1Address} onChange={(e) => setLoc1Address(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">City</Label>
              <Input value={loc1City} onChange={(e) => setLoc1City(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Location 2 (T Nagar)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={loc2Name} onChange={(e) => setLoc2Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Subtitle</Label>
              <Input value={loc2Subtitle} onChange={(e) => setLoc2Subtitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Address</Label>
              <Input value={loc2Address} onChange={(e) => setLoc2Address(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">City</Label>
              <Input value={loc2City} onChange={(e) => setLoc2City(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Company & Invoice Details</h3>
        <p className="text-sm text-muted-foreground mb-4">These details appear on customer receipts and invoices</p>
        <div className="space-y-4">
          <div>
            <Label>Company Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-2" placeholder="Thamarai Foods and Trading Private Limited" />
          </div>
          <div>
            <Label>GST Number</Label>
            <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="mt-2" placeholder="33AAKCT4782H1Z1" />
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
function CMSTab() {
  const { data: cmsContent, refetch } = trpc.cms.getAllContent.useQuery();
  const updateContent = trpc.cms.updateContent.useMutation({
    onSuccess: () => {
      toast.success('Content saved successfully!');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [aboutUs, setAboutUs] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [faq, setFaq] = useState('');
  const [franchiseOpportunity, setFranchiseOpportunity] = useState('');
  const [shippingPolicy, setShippingPolicy] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (cmsContent) {
      const contentMap = cmsContent.reduce((acc: any, c: any) => {
        acc[c.key] = c.value;
        return acc;
      }, {});
      setAboutUs(contentMap.about_us || '');
      setTermsConditions(contentMap.terms_conditions || '');
      setPrivacyPolicy(contentMap.privacy_policy || '');
      setRefundPolicy(contentMap.refund_policy || '');
      setFaq(contentMap.faq || '');
      setFranchiseOpportunity(contentMap.franchise_opportunity || '');
      setShippingPolicy(contentMap.shipping_policy || '');
    }
  }, [cmsContent]);

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    try {
      await updateContent.mutateAsync({ key, value });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Content Pages</h2>
        <p className="text-muted-foreground">Edit content for About Us, Terms & Conditions, Privacy Policy, and other pages. Changes take effect immediately.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">About Us</h3>
          <Button onClick={() => handleSave('about_us', aboutUs)} disabled={saving === 'about_us'} size="sm">
            {saving === 'about_us' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={aboutUs}
          onChange={setAboutUs}
          placeholder="Tell your story... Who is Taiwan Maami? What makes your bubble tea special?"
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Terms & Conditions</h3>
          <Button onClick={() => handleSave('terms_conditions', termsConditions)} disabled={saving === 'terms_conditions'} size="sm">
            {saving === 'terms_conditions' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={termsConditions}
          onChange={setTermsConditions}
          placeholder="Your terms and conditions for using the website and ordering..."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Privacy Policy</h3>
          <Button onClick={() => handleSave('privacy_policy', privacyPolicy)} disabled={saving === 'privacy_policy'} size="sm">
            {saving === 'privacy_policy' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={privacyPolicy}
          onChange={setPrivacyPolicy}
          placeholder="How you collect, use, and protect customer data..."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Refund Policy</h3>
          <Button onClick={() => handleSave('refund_policy', refundPolicy)} disabled={saving === 'refund_policy'} size="sm">
            {saving === 'refund_policy' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={refundPolicy}
          onChange={setRefundPolicy}
          placeholder="Your refund and cancellation policy..."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">FAQ</h3>
          <Button onClick={() => handleSave('faq', faq)} disabled={saving === 'faq'} size="sm">
            {saving === 'faq' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={faq}
          onChange={setFaq}
          placeholder="Frequently asked questions and answers..."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Shipping Policy</h3>
          <Button onClick={() => handleSave('shipping_policy', shippingPolicy)} disabled={saving === 'shipping_policy'} size="sm">
            {saving === 'shipping_policy' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={shippingPolicy}
          onChange={setShippingPolicy}
          placeholder="Your shipping and delivery policy... Include delivery areas, times, and charges."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Franchise Opportunity</h3>
          <Button onClick={() => handleSave('franchise_opportunity', franchiseOpportunity)} disabled={saving === 'franchise_opportunity'} size="sm">
            {saving === 'franchise_opportunity' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={franchiseOpportunity}
          onChange={setFranchiseOpportunity}
          placeholder="Information about franchise opportunities... Include requirements, investment details, and contact information."
        />
      </Card>
    </div>
  );
}

// Admin PIN Tab - Set up PIN for discount authorization
function AdminPinTab() {
  const { data: hasPin, refetch: refetchHasPin } = trpc.adminPin.hasPin.useQuery();
  const setPin = trpc.adminPin.setPin.useMutation({
    onSuccess: () => {
      toast.success('PIN set successfully!');
      refetchHasPin();
      setNewPin('');
      setConfirmPin('');
    },
    onError: (err) => toast.error(err.message),
  });

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSetPin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }
    setPin.mutate({ pin: newPin });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Admin PIN</h2>
        <p className="text-muted-foreground">Set up a 4-digit PIN for authorizing discounts. Staff will need this PIN to apply discounts to orders.</p>
      </div>

      <Card className="p-6 max-w-md">
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${hasPin ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`font-medium ${hasPin ? 'text-green-800' : 'text-amber-800'}`}>
              {hasPin ? '✓ PIN is set' : '⚠️ No PIN set - discounts cannot be authorized'}
            </p>
          </div>

          <div>
            <Label>{hasPin ? 'Change PIN' : 'Set New PIN'}</Label>
            <Input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit PIN"
              className="mt-2 text-center text-2xl tracking-widest"
            />
          </div>

          <div>
            <Label>Confirm PIN</Label>
            <Input
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Confirm PIN"
              className="mt-2 text-center text-2xl tracking-widest"
            />
          </div>

          <Button 
            onClick={handleSetPin} 
            disabled={setPin.isPending || newPin.length !== 4 || confirmPin.length !== 4}
            className="w-full"
          >
            {setPin.isPending ? 'Setting PIN...' : hasPin ? 'Update PIN' : 'Set PIN'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">How it works</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• When staff apply a discount, they must enter an admin's PIN</li>
          <li>• Each admin can set their own PIN</li>
          <li>• All discount authorizations are logged for audit purposes</li>
          <li>• PINs are securely hashed and never stored in plain text</li>
        </ul>
      </Card>
    </div>
  );
}

// Refunds Tab - Approve/Reject refund requests
function RefundsTab() {
  const { data: pendingRefunds, refetch: refetchPending } = trpc.refunds.getPending.useQuery();
  const { data: allRefunds, refetch: refetchAll } = trpc.refunds.getAll.useQuery();
  const reviewRefund = trpc.refunds.review.useMutation({
    onSuccess: (data) => {
      toast.success(`Refund ${data.status}!`);
      refetchPending();
      refetchAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [activeView, setActiveView] = useState<'pending' | 'all'>('pending');

  const handleReview = (action: 'approve' | 'reject') => {
    if (!selectedRefund) return;
    reviewRefund.mutate({
      requestId: selectedRefund.id,
      action,
      reviewNotes,
    });
    setSelectedRefund(null);
    setReviewNotes('');
  };

  const formatDate = (date: any) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const refundsToShow = activeView === 'pending' ? pendingRefunds : allRefunds;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Refund Requests</h2>
          <p className="text-muted-foreground">Review and approve/reject refund requests from staff</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeView === 'pending' ? 'default' : 'outline'} 
            onClick={() => setActiveView('pending')}
            size="sm"
          >
            Pending ({pendingRefunds?.length || 0})
          </Button>
          <Button 
            variant={activeView === 'all' ? 'default' : 'outline'} 
            onClick={() => setActiveView('all')}
            size="sm"
          >
            All Requests
          </Button>
        </div>
      </div>

      {(!refundsToShow || refundsToShow.length === 0) ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {activeView === 'pending' ? 'No pending refund requests' : 'No refund requests yet'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {refundsToShow.map((refund: any) => (
            <Card key={refund.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Order #{refund.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      refund.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      refund.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {refund.status.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      refund.refundType === 'full' ? 'bg-blue-100 text-blue-800' :
                      refund.refundType === 'partial' ? 'bg-purple-100 text-purple-800' :
                      'bg-teal-100 text-teal-800'
                    }`}>
                      {refund.refundType === 'store_credit' ? 'Store Credit' : refund.refundType}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-primary">₹{(refund.refundAmount / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{refund.refundReason}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested by {refund.requestedByName} on {formatDate(refund.createdAt)}
                  </p>
                  {refund.reviewedByName && (
                    <p className="text-xs text-muted-foreground">
                      {refund.status === 'approved' ? 'Approved' : 'Rejected'} by {refund.reviewedByName} on {formatDate(refund.reviewedAt)}
                    </p>
                  )}
                  {refund.reviewNotes && (
                    <p className="text-sm italic mt-2">Notes: {refund.reviewNotes}</p>
                  )}
                </div>
                {refund.status === 'pending' && (
                  <Button onClick={() => setSelectedRefund(refund)} size="sm">
                    Review
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedRefund} onOpenChange={(open) => !open && setSelectedRefund(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Refund Request</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Order:</strong> #{selectedRefund.orderNumber}</p>
                <p><strong>Amount:</strong> ₹{(selectedRefund.refundAmount / 100).toFixed(2)}</p>
                <p><strong>Type:</strong> {selectedRefund.refundType === 'store_credit' ? 'Store Credit' : selectedRefund.refundType}</p>
                <p><strong>Reason:</strong> {selectedRefund.refundReason}</p>
                <p><strong>Requested by:</strong> {selectedRefund.requestedByName}</p>
              </div>
              <div>
                <Label>Review Notes (optional)</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedRefund(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleReview('reject')}
              disabled={reviewRefund.isPending}
            >
              Reject
            </Button>
            <Button 
              onClick={() => handleReview('approve')}
              disabled={reviewRefund.isPending}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Payment Report Tab
function PaymentReportTab() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [outletFilter, setOutletFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const { data: reportData, isLoading, refetch } = trpc.orders.getPaymentReport.useQuery({
    startDate,
    endDate,
    outlet: outletFilter as 'all' | 'palladium' | 'tnagar',
    paymentMethod: methodFilter,
  });

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    upi: 'GPay / UPI',
    card: 'Card',
    swiggy_dineout: 'Swiggy Dineout',
    zomato_dineout: 'Zomato Dineout',
    eazydiner: 'EazyDiner',
    other: 'Other',
    unknown: 'Not Recorded',
  };

  const paymentMethodIcons: Record<string, string> = {
    cash: '💵',
    upi: '📱',
    card: '💳',
    swiggy_dineout: '🟠',
    zomato_dineout: '🔴',
    eazydiner: '🟣',
    other: '📋',
    unknown: '❓',
  };

  const exportToCSV = () => {
    if (!reportData?.orders) return;
    
    const headers = ['Order #', 'Date', 'Customer', 'Amount', 'Payment Method', 'Outlet', 'Order Type'];
    const rows = reportData.orders.map(order => [
      order.orderNumber,
      new Date(order.createdAt).toLocaleString(),
      order.customerName || 'Guest',
      (order.totalAmount / 100).toFixed(2),
      paymentMethodLabels[order.paymentMethod || 'unknown'],
      'T Nagar',
      order.orderType,
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Report</h2>
        <Button onClick={exportToCSV} disabled={!reportData?.orders?.length}>
          <Upload className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Outlet</Label>
            <Select value={outletFilter} onValueChange={setOutletFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                <SelectItem value="tnagar">T Nagar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">GPay / UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="swiggy_dineout">Swiggy Dineout</SelectItem>
                <SelectItem value="zomato_dineout">Zomato Dineout</SelectItem>
                <SelectItem value="eazydiner">EazyDiner</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold">{reportData.totalOrders}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              ₹{(reportData.grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>
          {Object.entries(reportData.summary).slice(0, 2).map(([method, data]) => (
            <Card key={method} className="p-4">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span>{paymentMethodIcons[method] || '💰'}</span>
                {paymentMethodLabels[method] || method}
              </p>
              <p className="text-xl font-bold">
                {data.count} orders
              </p>
              <p className="text-sm text-muted-foreground">
                ₹{(data.total / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Method Breakdown */}
      {reportData && Object.keys(reportData.summary).length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Payment Method Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(reportData.summary).map(([method, data]) => {
              const percentage = reportData.grandTotal > 0 
                ? ((data.total / reportData.grandTotal) * 100).toFixed(1)
                : '0';
              return (
                <div key={method} className="flex items-center gap-4">
                  <span className="text-2xl">{paymentMethodIcons[method] || '💰'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{paymentMethodLabels[method] || method}</span>
                      <span className="text-muted-foreground">
                        {data.count} orders • ₹{(data.total / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Order Details</h3>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : !reportData?.orders?.length ? (
          <p className="text-center py-8 text-muted-foreground">No completed orders found for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Order #</th>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Customer</th>
                  <th className="text-right py-2 px-2">Amount</th>
                  <th className="text-left py-2 px-2">Method</th>
                  <th className="text-left py-2 px-2">Proof</th>
                  <th className="text-left py-2 px-2">Outlet</th>
                </tr>
              </thead>
              <tbody>
                {reportData.orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-mono">{order.orderNumber}</td>
                    <td className="py-2 px-2">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-2">{order.customerName || 'Guest'}</td>
                    <td className="py-2 px-2 text-right font-medium">
                      ₹{(order.totalAmount / 100).toFixed(2)}
                    </td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1">
                        <span>{paymentMethodIcons[order.paymentMethod || 'unknown']}</span>
                        <span>{paymentMethodLabels[order.paymentMethod || 'unknown']}</span>
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {order.paymentProofUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedProof(order.paymentProofUrl)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      T Nagar
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payment Proof Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <img 
              src={selectedProof} 
              alt="Payment proof" 
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
