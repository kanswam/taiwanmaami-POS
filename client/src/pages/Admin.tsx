import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, GST_RATE } from '@shared/types';
import { 
  Home, Package, ShoppingCart, Tag, Upload, Settings, LogOut, 
  Plus, Edit, Trash2, ImageIcon, RefreshCw, Check, X, Search,
  ChevronDown, ChevronUp, Eye, EyeOff, Store, ClipboardList, Star, Video, Play,
  BarChart3, TrendingUp, TrendingDown, Calendar, Download, Filter, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';

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
            <Link href="/pos">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                POS
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
          <TabsList className="grid w-full grid-cols-9 mb-6">
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="outlets" className="gap-2">
              <Store className="w-4 h-4" />
              Outlets
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              POS Audit
            </TabsTrigger>
            <TabsTrigger value="discounts" className="gap-2">
              <Tag className="w-4 h-4" />
              Discounts
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="w-4 h-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="w-4 h-4" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="bulk-upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Bulk Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="discounts">
            <DiscountsTab />
          </TabsContent>

          <TabsContent value="outlets">
            <OutletsTab />
          </TabsContent>

          <TabsContent value="audit">
            <POSAuditTab />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsTab />
          </TabsContent>

          <TabsContent value="videos">
            <VideosTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="bulk-upload">
            <BulkUploadTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Products Tab
function ProductsTab() {
  const { data: menuData, refetch } = trpc.menu.getFullMenu.useQuery({ isDelivery: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success('Product updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredProducts = menuData?.products.filter(p => {
    if (selectedCategory !== 'all') {
      const sub = menuData.subcategories.find(s => s.id === p.subcategoryId);
      const cat = menuData.categories.find(c => c.id === sub?.categoryId);
      if (cat?.slug !== selectedCategory) return false;
    }
    if (searchQuery) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  }) || [];

  const toggleStock = (productId: number, currentStatus: boolean) => {
    updateProduct.mutate({ id: productId, isInStock: !currentStatus });
  };

  const toggleActive = (productId: number, currentStatus: boolean) => {
    updateProduct.mutate({ id: productId, isActive: !currentStatus });
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
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Product</th>
                <th className="text-left p-3 text-sm font-medium">Category</th>
                <th className="text-right p-3 text-sm font-medium">In-Store Price</th>
                <th className="text-right p-3 text-sm font-medium">Delivery Price</th>
                <th className="text-center p-3 text-sm font-medium">In Stock</th>
                <th className="text-center p-3 text-sm font-medium">Active</th>
                <th className="text-center p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const sub = menuData?.subcategories.find(s => s.id === product.subcategoryId);
                const cat = menuData?.categories.find(c => c.id === sub?.categoryId);
                return (
                  <tr key={product.id} className="border-b hover:bg-secondary/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-secondary overflow-hidden">
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
                    <td className="p-3 text-sm text-muted-foreground">
                      {cat?.name} / {sub?.name}
                    </td>
                    <td className="p-3 text-right">
                      {product.instorePrice ? formatPrice(product.instorePrice) : '-'}
                    </td>
                    <td className="p-3 text-right">
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
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Product Edit Dialog
function ProductEditDialog({ product, onUpdate }: { product: any; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: product.name,
    chineseName: product.chineseName || '',
    description: product.description || '',
    instorePrice: product.instorePrice || 0,
    deliveryPrice: product.deliveryPrice || 0,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(product.imageUrl || null);
  const [uploading, setUploading] = useState(false);

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
      setImagePreview(data.imageUrl);
      onUpdate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be less than 20MB');
      return;
    }
    
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      await uploadImage.mutateAsync({
        productId: product.id,
        imageBase64: base64,
        mimeType: file.type,
        fileName: file.name,
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    updateProduct.mutate({
      id: product.id,
      name: formData.name,
      chineseName: formData.chineseName || null,
      description: formData.description || null,
      instorePrice: formData.instorePrice,
      deliveryPrice: formData.deliveryPrice,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Image Upload */}
          <div>
            <Label>Product Image</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border overflow-hidden bg-secondary flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id={`image-upload-${product.id}`}
                  disabled={uploading}
                />
                <label htmlFor={`image-upload-${product.id}`}>
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span className="cursor-pointer">
                      {uploading ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" />Upload Image</>
                      )}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-1">Max 20MB. JPG, PNG, WebP</p>
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
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
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
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateProduct.isPending}>
            {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Orders Tab
function OrdersTab() {
  const { data: orders, refetch } = trpc.orders.getRecent.useQuery({ limit: 100 });
  
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
                <tr key={order.id} className="border-b hover:bg-secondary/50">
                  <td className="p-3 font-medium">{order.orderNumber}</td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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


// Outlets Tab - Manage outlet-specific product availability and pricing
function OutletsTab() {
  const { data: outlets, refetch: refetchOutlets } = trpc.posAuth.getOutlets.useQuery();
  const { data: menuData } = trpc.menu.getFullMenu.useQuery({ isDelivery: false });
  const [selectedOutlet, setSelectedOutlet] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get outlet products configuration
  const { data: outletProducts, refetch: refetchOutletProducts } = trpc.admin.getOutletProducts.useQuery(
    { outletId: selectedOutlet! },
    { enabled: !!selectedOutlet }
  );

  const updateOutletProduct = trpc.admin.updateOutletProduct.useMutation({
    onSuccess: () => {
      toast.success('Product availability updated');
      refetchOutletProducts();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Create a map of product availability for the selected outlet
  const productAvailability = useMemo(() => {
    const map = new Map<number, { isAvailable: boolean; priceOverride?: number }>();
    outletProducts?.forEach((op: any) => {
      map.set(op.productId, { isAvailable: op.isAvailable, priceOverride: op.instorePriceOverride || undefined });
    });
    return map;
  }, [outletProducts]);

  const filteredProducts = menuData?.products.filter(p => {
    if (searchQuery) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  }) || [];

  const toggleProductAvailability = (productId: number) => {
    if (!selectedOutlet) return;
    const current = productAvailability.get(productId);
    updateOutletProduct.mutate({
      outletId: selectedOutlet,
      productId,
      isAvailable: !(current?.isAvailable ?? true),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-64">
          <Label className="mb-2 block">Select Outlet</Label>
          <Select
            value={selectedOutlet?.toString() || ''}
            onValueChange={(v) => setSelectedOutlet(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an outlet" />
            </SelectTrigger>
            <SelectContent>
              {outlets?.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id.toString()}>
                  {outlet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedOutlet && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      {!selectedOutlet ? (
        <Card className="p-8 text-center">
          <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Select an Outlet</h3>
          <p className="text-muted-foreground">
            Choose an outlet from the dropdown above to manage its product availability.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="p-4 border-b bg-secondary/50">
            <h3 className="font-medium">
              Product Availability for {outlets?.find(o => o.id === selectedOutlet)?.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Toggle products on/off for this outlet. Products turned off will not appear in POS for this location.
            </p>
          </div>
          <div className="divide-y max-h-[500px] overflow-auto">
            {filteredProducts.map((product) => {
              const availability = productAvailability.get(product.id);
              const isAvailable = availability?.isAvailable ?? true;
              const subcategory = menuData?.subcategories.find(s => s.id === product.subcategoryId);
              const category = menuData?.categories.find(c => c.id === subcategory?.categoryId);
              
              return (
                <div key={product.id} className="flex items-center justify-between p-4 hover:bg-secondary/30">
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {category?.name} → {subcategory?.name}
                    </p>
                    {product.instorePrice && (
                      <p className="text-sm text-muted-foreground">
                        Price: {formatPrice(product.instorePrice)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={isAvailable}
                      onCheckedChange={() => toggleProductAvailability(product.id)}
                    />
                    <span className={`text-sm ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// POS Audit Tab - View POS session logs and order history
function POSAuditTab() {
  const { data: outlets } = trpc.posAuth.getOutlets.useQuery();
  const [selectedOutlet, setSelectedOutlet] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  // Get audit logs
  const { data: auditLogs, refetch } = trpc.admin.getPOSAuditLogs.useQuery(
    { outletId: selectedOutlet || undefined, dateRange },
    { enabled: true }
  );

  const actionColors: Record<string, string> = {
    login: 'bg-blue-100 text-blue-800',
    logout: 'bg-gray-100 text-gray-800',
    create_order: 'bg-green-100 text-green-800',
    void_order: 'bg-red-100 text-red-800',
    apply_discount: 'bg-yellow-100 text-yellow-800',
    refund: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-64">
          <Label className="mb-2 block">Filter by Outlet</Label>
          <Select
            value={selectedOutlet?.toString() || 'all'}
            onValueChange={(v) => setSelectedOutlet(v === 'all' ? null : parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All outlets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {outlets?.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id.toString()}>
                  {outlet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Label className="mb-2 block">Date Range</Label>
          <Select value={dateRange} onValueChange={(v: 'today' | 'week' | 'month') => setDateRange(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Time</th>
                <th className="text-left p-3 text-sm font-medium">Employee</th>
                <th className="text-left p-3 text-sm font-medium">Outlet</th>
                <th className="text-center p-3 text-sm font-medium">Action</th>
                <th className="text-left p-3 text-sm font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No audit logs found for the selected filters.
                  </td>
                </tr>
              )}
              {auditLogs?.map((log: any) => (
                <tr key={log.id} className="border-b hover:bg-secondary/50">
                  <td className="p-3 text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{log.employeeCode}</p>
                  </td>
                  <td className="p-3">
                    {outlets?.find(o => o.id === log.outletId)?.name || `Outlet ${log.outletId}`}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-gray-100'}`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {log.orderId && `Order #${log.orderId}`}
                    {log.details && typeof log.details === 'object' && (
                      <span className="ml-2">
                        {(log.details as any).orderNumber && `(${(log.details as any).orderNumber})`}
                        {(log.details as any).totalAmount && ` - ${formatPrice((log.details as any).totalAmount)}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


// Reviews Tab - Admin moderation
function ReviewsTab() {
  const { data: reviews, refetch } = trpc.reviews.getAllAdmin.useQuery();
  
  const toggleVisibility = trpc.reviews.toggleVisibility.useMutation({
    onSuccess: () => {
      toast.success('Review visibility updated');
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Customer Reviews</h2>
        <p className="text-sm text-muted-foreground">
          {reviews?.length || 0} reviews
        </p>
      </div>

      {!reviews?.length ? (
        <Card className="p-8 text-center">
          <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No reviews yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className={`p-4 ${!review.isVisible ? 'opacity-60 bg-muted' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-muted-foreground">
                      Order #{review.orderNumber}
                    </span>
                    {review.productId && (
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                        Product Review
                      </span>
                    )}
                    {!review.productId && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Order Review
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm mb-2">
                    {review.reviewText || <span className="text-muted-foreground italic">No written review</span>}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>By: {review.userName || 'Anonymous'}</span>
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVisibility.mutate({ 
                      reviewId: review.id, 
                      isVisible: !review.isVisible 
                    })}
                    title={review.isVisible ? 'Hide review' : 'Show review'}
                  >
                    {review.isVisible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
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


// Videos Tab Component
function VideosTab() {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: products, refetch } = trpc.admin.getAllProducts.useQuery();
  const { data: featuredVideos } = trpc.admin.getFeaturedVideos.useQuery();
  
  const uploadVideo = trpc.admin.uploadProductVideo.useMutation({
    onSuccess: () => {
      toast.success('Video uploaded successfully');
      refetch();
      setVideoFile(null);
      setSelectedProduct(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload video');
    },
  });
  
  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success('Product updated');
      refetch();
    },
  });

  const handleVideoUpload = async () => {
    if (!selectedProduct || !videoFile) return;
    
    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await uploadVideo.mutateAsync({
          productId: selectedProduct,
          videoBase64: base64,
          mimeType: videoFile.type,
          fileName: videoFile.name,
        });
        setUploading(false);
      };
      reader.readAsDataURL(videoFile);
    } catch (error) {
      setUploading(false);
      toast.error('Failed to upload video');
    }
  };

  const toggleFeatured = (productId: number, currentValue: boolean) => {
    updateProduct.mutate({
      id: productId,
      isFeaturedVideo: !currentValue,
    });
  };

  const removeVideo = (productId: number) => {
    if (confirm('Are you sure you want to remove this video?')) {
      updateProduct.mutate({
        id: productId,
        videoUrl: null,
        videoThumbnail: null,
        isFeaturedVideo: false,
      });
    }
  };

  type Product = NonNullable<typeof products>[number];
  const productsWithVideos = products?.filter((p: Product) => p.videoUrl) || [];
  const productsWithoutVideos = products?.filter((p: Product) => !p.videoUrl && p.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Product Videos</h2>
        <div className="text-sm text-muted-foreground">
          {productsWithVideos.length} products with videos
        </div>
      </div>

      {/* Upload Section */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Upload New Video</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Select Product</Label>
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            <Select
              value={selectedProduct?.toString() || ''}
              onValueChange={(v) => setSelectedProduct(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {productsWithoutVideos.slice(0, 20).map((product: Product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Video File (MP4, WebM)</Label>
            <Input
              type="file"
              accept="video/mp4,video/webm"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            {videoFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleVideoUpload}
              disabled={!selectedProduct || !videoFile || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Video
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Featured Videos Section */}
      {featuredVideos && featuredVideos.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Featured Videos (Homepage Carousel)
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            {featuredVideos.map((product) => (
              <div key={product.id} className="relative group">
                <div className="aspect-video bg-secondary rounded-lg overflow-hidden">
                  {product.videoUrl ? (
                    <video
                      src={product.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.pause();
                        video.currentTime = 0;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium mt-2 truncate">{product.name}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Videos Grid */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">All Product Videos</h3>
        {productsWithVideos.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No product videos uploaded yet. Upload your first video above.
          </p>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {productsWithVideos.map((product: Product) => (
              <div key={product.id} className="relative group">
                <div className="aspect-video bg-secondary rounded-lg overflow-hidden relative">
                  {product.videoUrl ? (
                    <video
                      src={product.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.pause();
                        video.currentTime = 0;
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant={product.isFeaturedVideo ? 'default' : 'outline'}
                      className="bg-white/20 hover:bg-white/30"
                      onClick={() => toggleFeatured(product.id, product.isFeaturedVideo)}
                    >
                      <Star className={`w-4 h-4 ${product.isFeaturedVideo ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/20 hover:bg-white/30 text-red-500"
                      onClick={() => removeVideo(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {product.isFeaturedVideo && (
                    <div className="absolute top-2 right-2">
                      <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium mt-2 truncate">{product.name}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}


// Analytics Tab Component - Phase 1: Core Sales Reports
function AnalyticsTab() {
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('7d');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Calculate date range based on selection - memoized to prevent infinite re-renders
  const { startISO, endISO } = useMemo(() => {
    const end = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case 'today':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case 'custom':
        return { startISO: new Date(startDate).toISOString(), endISO: new Date(endDate).toISOString() };
    }
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, [dateRange, startDate, endDate]);
  
  const { data: salesSummary, isLoading: loadingSummary } = trpc.analytics.getSalesSummary.useQuery({
    startDate: startISO,
    endDate: endISO,
  });

  const { data: categoryBreakdown, isLoading: loadingCategories } = trpc.analytics.getCategoryBreakdown.useQuery({
    startDate: startISO,
    endDate: endISO,
  });

  const { data: topProducts, isLoading: loadingProducts } = trpc.analytics.getTopProducts.useQuery({
    startDate: startISO,
    endDate: endISO,
    limit: 10,
  });

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Sales Analytics</h2>
          <p className="text-muted-foreground">Track your business performance</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-lg p-1">
            {(['today', '7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(range)}
                className="px-3"
              >
                {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
          <Button
            variant={dateRange === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('custom')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Custom
          </Button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {dateRange === 'custom' && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">
                {loadingSummary ? '...' : formatCurrency(salesSummary?.totalRevenue || 0)}
              </p>
            </div>
            {salesSummary?.revenueChange !== undefined && (
              <div className={`flex items-center ${salesSummary.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {salesSummary.revenueChange >= 0 ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownRight className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{formatPercent(salesSummary.revenueChange)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">
                {loadingSummary ? '...' : (salesSummary?.totalOrders || 0).toLocaleString()}
              </p>
            </div>
            {salesSummary?.ordersChange !== undefined && (
              <div className={`flex items-center ${salesSummary.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {salesSummary.ordersChange >= 0 ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownRight className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{formatPercent(salesSummary.ordersChange)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold">
                {loadingSummary ? '...' : formatCurrency(salesSummary?.avgOrderValue || 0)}
              </p>
            </div>
            {salesSummary?.aovChange !== undefined && (
              <div className={`flex items-center ${salesSummary.aovChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {salesSummary.aovChange >= 0 ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownRight className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{formatPercent(salesSummary.aovChange)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Items Sold</p>
              <p className="text-2xl font-bold">
                {loadingSummary ? '...' : (salesSummary?.totalItems || 0).toLocaleString()}
              </p>
            </div>
            {salesSummary?.itemsChange !== undefined && (
              <div className={`flex items-center ${salesSummary.itemsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {salesSummary.itemsChange >= 0 ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownRight className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{formatPercent(salesSummary.itemsChange)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Sales by Category
          </h3>
          {loadingCategories ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : categoryBreakdown && categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {categoryBreakdown.map((cat: { categoryId: number; categoryName: string; revenue: number; orderCount: number; percentage: number }, index: number) => (
                <div key={cat.categoryId || index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat.categoryName}</span>
                    <span className="font-medium">{formatCurrency(cat.revenue)}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cat.orderCount} orders • {cat.percentage.toFixed(1)}% of total
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No sales data for this period
            </div>
          )}
        </Card>

        {/* Top Products */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top Selling Products
          </h3>
          {loadingProducts ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : topProducts && topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product: { productId: number; productName: string; quantity: number; revenue: number }, index: number) => (
                <div key={product.productId} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.productName}</p>
                    <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                  </div>
                  <span className="font-medium">{formatCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No sales data for this period
            </div>
          )}
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => toast.info('Export feature coming soon')}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>
    </div>
  );
}
