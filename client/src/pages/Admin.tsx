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
  ChevronDown, ChevronUp, Eye, EyeOff, Star, MessageSquare, Reply, Printer
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

            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8 mb-6">
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
            <TabsTrigger value="discounts" className="gap-2">
              <Tag className="w-4 h-4" />
              Discounts
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

          <TabsContent value="kot-reports">
            <KOTReportsTab />
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
  const { data: menuData } = trpc.menu.getFullMenu.useQuery({ isDelivery: false });
  const [formData, setFormData] = useState({
    name: product.name,
    chineseName: product.chineseName || '',
    description: product.description || '',
    instorePrice: product.instorePrice || 0,
    deliveryPrice: product.deliveryPrice || 0,
    subcategoryId: product.subcategoryId,
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
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Image must be less than 50MB');
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
      subcategoryId: formData.subcategoryId,
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
                <p className="text-xs text-muted-foreground mt-1">Max 50MB. JPG, PNG, WebP</p>
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

// Categories Tab
function CategoriesTab() {
  const { data: menuData, refetch } = trpc.menu.getFullMenu.useQuery({ isDelivery: false });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryData, setNewSubcategoryData] = useState({ name: '', categoryId: 0 });

  const updateCategory = trpc.admin.updateCategory.useMutation({
    onSuccess: () => { toast.success('Category updated'); refetch(); },
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
    onSuccess: () => { toast.success('Subcategory updated'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const createSubcategory = trpc.admin.createSubcategory.useMutation({
    onSuccess: () => { toast.success('Subcategory created'); refetch(); setNewSubcategoryData({ name: '', categoryId: 0 }); },
    onError: (err) => toast.error(err.message),
  });

  const deleteSubcategory = trpc.admin.deleteSubcategory.useMutation({
    onSuccess: () => { toast.success('Subcategory deleted'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Categories</h3>
        <div className="space-y-2">
          {menuData?.categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <>
                <span className="font-medium">{cat.name}</span>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
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
                        <Button onClick={() => {
                          const name = (document.getElementById(`cat-name-${cat.id}`) as HTMLInputElement).value;
                          const description = (document.getElementById(`cat-desc-${cat.id}`) as HTMLInputElement).value;
                          updateCategory.mutate({ id: cat.id, name, description });
                        }}>
                          Save Changes
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
              </>
            </div>
          ))}
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
        </div>
      </Card>

      {/* Subcategories Section */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Subcategories</h3>
        <div className="space-y-4">
          {menuData?.categories.map((cat) => (
            <div key={cat.id} className="border rounded-lg p-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">{cat.name}</h4>
              <div className="space-y-2">
                {menuData.subcategories
                  .filter(sub => sub.categoryId === cat.id)
                  .map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                        <>
                          <div>
                            <span>{sub.name}</span>
                            {sub.chineseName && <span className="text-xs text-muted-foreground ml-2">{sub.chineseName}</span>}
                          </div>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Edit Subcategory: {sub.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Subcategory Name</Label>
                                      <Input defaultValue={sub.name} id={`sub-name-${sub.id}`} />
                                    </div>
                                    <div>
                                      <Label>Chinese Name (Optional)</Label>
                                      <Input defaultValue={sub.chineseName || ''} id={`sub-chinese-${sub.id}`} />
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Description (Optional)</Label>
                                    <Input defaultValue={sub.description || ''} id={`sub-desc-${sub.id}`} />
                                  </div>
                                  <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">In-Store Base Pricing (₹)</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <Label className="text-xs">Petite + Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.basePricePetiteWithBoba || 0) / 100} id={`sub-petite-boba-${sub.id}`} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Regular + Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.basePriceRegularWithBoba || 0) / 100} id={`sub-reg-boba-${sub.id}`} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Large + Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.basePriceLargeWithBoba || 0) / 100} id={`sub-large-boba-${sub.id}`} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Petite No Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.basePricePetiteNoBoba || 0) / 100} id={`sub-petite-no-${sub.id}`} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Regular No Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.basePriceRegularNoBoba || 0) / 100} id={`sub-reg-no-${sub.id}`} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Large No Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.basePriceLargeNoBoba || 0) / 100} id={`sub-large-no-${sub.id}`} />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">Delivery Base Pricing (₹)</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">Regular + Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.deliveryPriceRegularWithBoba || 0) / 100} id={`sub-del-reg-boba-${sub.id}`} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Large + Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.deliveryPriceLargeWithBoba || 0) / 100} id={`sub-del-large-boba-${sub.id}`} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Regular No Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.deliveryPriceRegularNoBoba || 0) / 100} id={`sub-del-reg-no-${sub.id}`} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Large No Boba</Label>
                                        <Input type="number" step="0.01" defaultValue={(sub.deliveryPriceLargeNoBoba || 0) / 100} id={`sub-del-large-no-${sub.id}`} />
                                      </div>
                                    </div>
                                  </div>
                                  <Button onClick={() => {
                                    const name = (document.getElementById(`sub-name-${sub.id}`) as HTMLInputElement).value;
                                    const chineseName = (document.getElementById(`sub-chinese-${sub.id}`) as HTMLInputElement).value || null;
                                    const description = (document.getElementById(`sub-desc-${sub.id}`) as HTMLInputElement).value || null;
                                    const basePricePetiteWithBoba = Math.round(parseFloat((document.getElementById(`sub-petite-boba-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    const basePriceRegularWithBoba = Math.round(parseFloat((document.getElementById(`sub-reg-boba-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    const basePriceLargeWithBoba = Math.round(parseFloat((document.getElementById(`sub-large-boba-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    const basePricePetiteNoBoba = Math.round(parseFloat((document.getElementById(`sub-petite-no-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    const basePriceRegularNoBoba = Math.round(parseFloat((document.getElementById(`sub-reg-no-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    const basePriceLargeNoBoba = Math.round(parseFloat((document.getElementById(`sub-large-no-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    const deliveryPriceRegularWithBoba = Math.round(parseFloat((document.getElementById(`sub-del-reg-boba-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    const deliveryPriceLargeWithBoba = Math.round(parseFloat((document.getElementById(`sub-del-large-boba-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    const deliveryPriceRegularNoBoba = Math.round(parseFloat((document.getElementById(`sub-del-reg-no-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    const deliveryPriceLargeNoBoba = Math.round(parseFloat((document.getElementById(`sub-del-large-no-${sub.id}`) as HTMLInputElement).value || '0') * 100);
                                    updateSubcategory.mutate({
                                      id: sub.id,
                                      name,
                                      chineseName,
                                      description,
                                      basePricePetiteWithBoba,
                                      basePriceRegularWithBoba,
                                      basePriceLargeWithBoba,
                                      basePricePetiteNoBoba,
                                      basePriceRegularNoBoba,
                                      basePriceLargeNoBoba,
                                      deliveryPriceRegularWithBoba,
                                      deliveryPriceLargeWithBoba,
                                      deliveryPriceRegularNoBoba,
                                      deliveryPriceLargeNoBoba,
                                    } as any);
                                  }}>
                                    Save Changes
                                  </Button>
                                </div>
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
                        </>
                    </div>
                  ))}
              </div>
            </div>
          ))}
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
                  {summary.orderTypeBreakdown.PICKUP || 0}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {summary.totalKots > 0 ? Math.round(((summary.orderTypeBreakdown.PICKUP || 0) / summary.totalKots) * 100) : 0}% of total
                </div>
              </Card>

              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Delivery Orders</div>
                <div className="text-3xl font-bold text-purple-900 mt-2">
                  {summary.orderTypeBreakdown.DELIVERY || 0}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {summary.totalKots > 0 ? Math.round(((summary.orderTypeBreakdown.DELIVERY || 0) / summary.totalKots) * 100) : 0}% of total
                </div>
              </Card>

              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="text-sm text-amber-600 font-medium">Dine-In Orders</div>
                <div className="text-3xl font-bold text-amber-900 mt-2">
                  {summary.orderTypeBreakdown.INSTORE || 0}
                </div>
                <div className="text-xs text-amber-600 mt-1">
                  {summary.totalKots > 0 ? Math.round(((summary.orderTypeBreakdown.INSTORE || 0) / summary.totalKots) * 100) : 0}% of total
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
                            {order.items.map((item, idx) => (
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
                  <p>• Order type distribution: {summary.orderTypeBreakdown.PICKUP || 0} Pickup, {summary.orderTypeBreakdown.DELIVERY || 0} Delivery, {summary.orderTypeBreakdown.INSTORE || 0} Dine-in</p>
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
