import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, Users, ShoppingCart, DollarSign, Plus, Edit, Trash2,
  Eye, CheckCircle, Clock, XCircle, Truck, ArrowLeft, RefreshCw
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

export default function WholesaleAdmin() {
  // Using sonner toast
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id?: number; name: string; slug: string; description: string; isActive: boolean } | null>(null);
  const [editingProduct, setEditingProduct] = useState<{
    id?: number;
    categoryId: number;
    name: string;
    slug: string;
    description: string;
    specifications: string;
    imageUrl: string;
    basePrice: number;
    unit: string;
    stockQuantity: number;
    isActive: boolean;
    isFeatured: boolean;
  } | null>(null);

  // Queries
  const { data: summary, isLoading: summaryLoading } = trpc.wholesale.admin.getSalesSummary.useQuery();
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = trpc.wholesale.admin.getOrders.useQuery();
  const { data: categories, isLoading: categoriesLoading, refetch: refetchCategories } = trpc.wholesale.admin.getCategories.useQuery();
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = trpc.wholesale.admin.getProducts.useQuery();
  const { data: customers, isLoading: customersLoading } = trpc.wholesale.admin.getCustomers.useQuery();
  const { data: orderDetails } = trpc.wholesale.admin.getOrderDetails.useQuery(
    { orderId: selectedOrder! },
    { enabled: !!selectedOrder }
  );

  // Mutations
  const createCategoryMutation = trpc.wholesale.admin.createCategory.useMutation({
    onSuccess: () => {
      toast.success('Category created');
      refetchCategories();
      setEditingCategory(null);
    },
    onError: (err: { message?: string }) => toast.error(err.message || 'Error'),
  });

  const updateCategoryMutation = trpc.wholesale.admin.updateCategory.useMutation({
    onSuccess: () => {
      toast.success('Category updated');
      refetchCategories();
      setEditingCategory(null);
    },
    onError: (err: { message?: string }) => toast.error(err.message || 'Error'),
  });

  const deleteCategoryMutation = trpc.wholesale.admin.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success('Category deleted');
      refetchCategories();
    },
    onError: (err: { message?: string }) => toast.error(err.message || 'Error'),
  });

  const createProductMutation = trpc.wholesale.admin.createProduct.useMutation({
    onSuccess: () => {
      toast.success('Product created');
      refetchProducts();
      setEditingProduct(null);
    },
    onError: (err: { message?: string }) => toast.error(err.message || 'Error'),
  });

  const updateProductMutation = trpc.wholesale.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success('Product updated');
      refetchProducts();
      setEditingProduct(null);
    },
    onError: (err: { message?: string }) => toast.error(err.message || 'Error'),
  });

  const deleteProductMutation = trpc.wholesale.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success('Product deleted');
      refetchProducts();
    },
    onError: (err: { message?: string }) => toast.error(err.message || 'Error'),
  });

  const updateOrderStatusMutation = trpc.wholesale.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success('Order status updated');
      refetchOrders();
    },
    onError: (err: { message?: string }) => toast.error(err.message || 'Error'),
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Wholesale Management</h1>
                <p className="text-sm text-gray-500">Manage B2B products, orders, and customers</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold">{summary?.totalOrders || 0}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatPrice(summary?.totalRevenue || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Orders</p>
                  <p className="text-2xl font-bold">{summary?.pendingOrders || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Customers</p>
                  <p className="text-2xl font-bold">{customers?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Wholesale Orders</CardTitle>
                <Button variant="outline" size="sm" onClick={() => refetchOrders()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !orders || orders.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No orders yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: {
                        id: number;
                        orderNumber: string;
                        businessName: string;
                        totalAmount: number;
                        paymentStatus: string;
                        orderStatus: string;
                        createdAt: Date | string;
                      }) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.businessName}</TableCell>
                          <TableCell>{formatPrice(order.totalAmount)}</TableCell>
                          <TableCell>
                            <Badge className={order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.orderStatus}
                              onValueChange={(value) => updateOrderStatusMutation.mutate({
                                orderId: order.id,
                                orderStatus: value as 'pending' | 'confirmed' | 'processing' | 'ready' | 'completed' | 'cancelled',
                              })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="ready">Ready</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Wholesale Products</CardTitle>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => setEditingProduct({
                    categoryId: categories?.[0]?.id || 0,
                    name: '',
                    slug: '',
                    description: '',
                    specifications: '',
                    imageUrl: '',
                    basePrice: 0,
                    unit: 'kg',
                    stockQuantity: 0,
                    isActive: true,
                    isFeatured: false,
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !products || products.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No products yet. Add your first product.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product: {
                        id: number;
                        name: string;
                        slug: string;
                        description?: string | null;
                        specifications?: string | null;
                        imageUrl?: string | null;
                        categoryId: number;
                        basePrice: number;
                        unit: string;
                        stockQuantity: number;
                        isActive: boolean;
                        isFeatured?: boolean;
                      }) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.isFeatured && <Badge className="bg-amber-100 text-amber-800 text-xs">Featured</Badge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {categories?.find((c: { id: number }) => c.id === product.categoryId)?.name || '-'}
                          </TableCell>
                          <TableCell>{formatPrice(product.basePrice)} / {product.unit}</TableCell>
                          <TableCell>
                            <span className={product.stockQuantity <= 10 ? 'text-red-600 font-medium' : ''}>
                              {product.stockQuantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingProduct({
                                  id: product.id,
                                  categoryId: product.categoryId,
                                  name: product.name,
                                  slug: product.slug,
                                  description: product.description || '',
                                  specifications: product.specifications || '',
                                  imageUrl: product.imageUrl || '',
                                  basePrice: product.basePrice,
                                  unit: product.unit,
                                  stockQuantity: product.stockQuantity,
                                  isActive: product.isActive,
                                  isFeatured: product.isFeatured || false,
                                })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  if (confirm('Delete this product?')) {
                                    deleteProductMutation.mutate({ id: product.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Categories</CardTitle>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => setEditingCategory({ name: '', slug: '', description: '', isActive: true })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !categories || categories.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No categories yet. Add your first category.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category: {
                        id: number;
                        name: string;
                        slug: string;
                        description?: string | null;
                        isActive: boolean;
                      }) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell className="text-gray-500">{category.slug}</TableCell>
                          <TableCell className="max-w-xs truncate">{category.description || '-'}</TableCell>
                          <TableCell>
                            <Badge className={category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {category.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingCategory({
                                  id: category.id,
                                  name: category.name,
                                  slug: category.slug,
                                  description: category.description || '',
                                  isActive: category.isActive,
                                })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  if (confirm('Delete this category? Products in this category must be moved first.')) {
                                    deleteCategoryMutation.mutate({ id: category.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Wholesale Customers</CardTitle>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !customers || customers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No customers registered yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer: {
                        id: number;
                        businessName: string;
                        contactPerson: string;
                        email: string;
                        phone: string;
                        businessType?: string | null;
                        gstNumber?: string | null;
                        isActive: boolean;
                        createdAt: Date | string;
                      }) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{customer.businessName}</p>
                              <p className="text-sm text-gray-500">{customer.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{customer.contactPerson}</p>
                              <p className="text-sm text-gray-500">{customer.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{customer.businessType || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{customer.gstNumber || '-'}</TableCell>
                          <TableCell>
                            <Badge className={customer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {customer.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(customer.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Category Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory?.id ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editingCategory?.name || ''}
                onChange={(e) => setEditingCategory(prev => prev ? {
                  ...prev,
                  name: e.target.value,
                  slug: prev.id ? prev.slug : generateSlug(e.target.value),
                } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={editingCategory?.slug || ''}
                onChange={(e) => setEditingCategory(prev => prev ? { ...prev, slug: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingCategory?.description || ''}
                onChange={(e) => setEditingCategory(prev => prev ? { ...prev, description: e.target.value } : null)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="categoryActive"
                checked={editingCategory?.isActive || false}
                onChange={(e) => setEditingCategory(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
              />
              <Label htmlFor="categoryActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (!editingCategory) return;
                if (editingCategory.id) {
                  updateCategoryMutation.mutate(editingCategory as { id: number; name?: string; slug?: string; description?: string; isActive?: boolean });
                } else {
                  createCategoryMutation.mutate(editingCategory);
                }
              }}
            >
              {editingCategory?.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct?.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editingProduct?.name || ''}
                onChange={(e) => setEditingProduct(prev => prev ? {
                  ...prev,
                  name: e.target.value,
                  slug: prev.id ? prev.slug : generateSlug(e.target.value),
                } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={editingProduct?.slug || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, slug: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editingProduct?.categoryId?.toString() || ''}
                onValueChange={(value) => setEditingProduct(prev => prev ? { ...prev, categoryId: parseInt(value) } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat: { id: number; name: string }) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                value={editingProduct?.unit || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, unit: e.target.value } : null)}
                placeholder="e.g., kg, pack, box"
              />
            </div>
            <div className="space-y-2">
              <Label>Base Price (in paise)</Label>
              <Input
                type="number"
                value={editingProduct?.basePrice || 0}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, basePrice: parseInt(e.target.value) || 0 } : null)}
              />
              <p className="text-xs text-gray-500">Enter in paise (e.g., 10000 = ₹100)</p>
            </div>
            <div className="space-y-2">
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={editingProduct?.stockQuantity || 0}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, stockQuantity: parseInt(e.target.value) || 0 } : null)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Image URL</Label>
              <Input
                value={editingProduct?.imageUrl || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, imageUrl: e.target.value } : null)}
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingProduct?.description || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Specifications</Label>
              <Textarea
                value={editingProduct?.specifications || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, specifications: e.target.value } : null)}
                placeholder="Weight, dimensions, ingredients, etc."
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="productActive"
                  checked={editingProduct?.isActive || false}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                />
                <Label htmlFor="productActive">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="productFeatured"
                  checked={editingProduct?.isFeatured || false}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, isFeatured: e.target.checked } : null)}
                />
                <Label htmlFor="productFeatured">Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (!editingProduct) return;
                if (editingProduct.id) {
                  updateProductMutation.mutate(editingProduct as { id: number; categoryId?: number; name?: string; slug?: string; description?: string; specifications?: string; imageUrl?: string; basePrice?: number; unit?: string; stockQuantity?: number; isActive?: boolean; isFeatured?: boolean });
                } else {
                  createProductMutation.mutate(editingProduct);
                }
              }}
            >
              {editingProduct?.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - {orderDetails?.order?.orderNumber}</DialogTitle>
          </DialogHeader>
          {orderDetails && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{orderDetails.order.businessName}</p>
                  <p className="text-sm">{orderDetails.order.contactPerson}</p>
                  <p className="text-sm">{orderDetails.order.email}</p>
                  <p className="text-sm">{orderDetails.order.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">GST Number</p>
                  <p className="font-mono">{orderDetails.order.gstNumber || 'Not provided'}</p>
                  <p className="text-sm text-gray-500 mt-2">Order Date</p>
                  <p>{formatDate(orderDetails.order.createdAt)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-2">Order Items</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderDetails.items.map((item: {
                      id: number;
                      productName: string;
                      unit: string;
                      quantity: number;
                      unitPrice: number;
                      lineTotal: number;
                    }) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>{formatPrice(item.unitPrice)}</TableCell>
                        <TableCell>{formatPrice(item.lineTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="border-t pt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(orderDetails.order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (9%)</span>
                  <span>{formatPrice(orderDetails.order.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (9%)</span>
                  <span>{formatPrice(orderDetails.order.sgst)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(orderDetails.order.totalAmount)}</span>
                </div>
              </div>
              
              {orderDetails.order.customerNotes && (
                <div>
                  <p className="text-sm text-gray-500">Customer Notes</p>
                  <p className="bg-gray-50 p-2 rounded">{orderDetails.order.customerNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
