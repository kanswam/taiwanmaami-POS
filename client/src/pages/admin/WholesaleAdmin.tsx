import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, Users, ShoppingCart, DollarSign, Plus, Edit, Trash2,
  Eye, Clock, ArrowLeft, RefreshCw, Upload, X, Image, Video, Loader2
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

interface CategoryForm {
  id?: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

interface ProductForm {
  id?: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  specifications: string;
  imageUrl: string;
  imageUrl2: string;
  imageUrl3: string;
  videoUrl: string;
  basePrice: number;
  unit: string;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
}

export default function WholesaleAdmin() {
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryForm | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  
  const categoryImageRef = useRef<HTMLInputElement>(null);
  const productImageRef1 = useRef<HTMLInputElement>(null);
  const productImageRef2 = useRef<HTMLInputElement>(null);
  const productImageRef3 = useRef<HTMLInputElement>(null);
  const productVideoRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: summary } = trpc.wholesale.admin.getSalesSummary.useQuery();
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = trpc.wholesale.admin.getOrders.useQuery();
  const { data: categories, isLoading: categoriesLoading, refetch: refetchCategories } = trpc.wholesale.admin.getCategories.useQuery();
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = trpc.wholesale.admin.getProducts.useQuery();
  const { data: customers, isLoading: customersLoading } = trpc.wholesale.admin.getCustomers.useQuery();
  const { data: orderDetails } = trpc.wholesale.admin.getOrderDetails.useQuery(
    { orderId: selectedOrder! },
    { enabled: !!selectedOrder }
  );

  // Category Mutations
  const createCategoryMutation = trpc.wholesale.admin.createCategory.useMutation({
    onSuccess: () => {
      toast.success('Category created');
      refetchCategories();
      setEditingCategory(null);
    },
    onError: (err) => toast.error(err.message || 'Error creating category'),
  });

  const updateCategoryMutation = trpc.wholesale.admin.updateCategory.useMutation({
    onSuccess: () => {
      toast.success('Category updated');
      refetchCategories();
      setEditingCategory(null);
    },
    onError: (err) => toast.error(err.message || 'Error updating category'),
  });

  const deleteCategoryMutation = trpc.wholesale.admin.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success('Category deleted');
      refetchCategories();
    },
    onError: (err) => toast.error(err.message || 'Error deleting category'),
  });

  const uploadCategoryImageMutation = trpc.wholesale.admin.uploadCategoryImage.useMutation({
    onSuccess: (data) => {
      toast.success('Image uploaded');
      if (editingCategory) {
        setEditingCategory({ ...editingCategory, imageUrl: data.imageUrl });
      }
      refetchCategories();
      setUploadingImage(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Error uploading image');
      setUploadingImage(null);
    },
  });

  // Product Mutations
  const createProductMutation = trpc.wholesale.admin.createProduct.useMutation({
    onSuccess: () => {
      toast.success('Product created');
      refetchProducts();
      setEditingProduct(null);
    },
    onError: (err) => toast.error(err.message || 'Error creating product'),
  });

  const updateProductMutation = trpc.wholesale.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success('Product updated');
      refetchProducts();
      setEditingProduct(null);
    },
    onError: (err) => toast.error(err.message || 'Error updating product'),
  });

  const deleteProductMutation = trpc.wholesale.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success('Product deleted');
      refetchProducts();
    },
    onError: (err) => toast.error(err.message || 'Error deleting product'),
  });

  const uploadProductImageMutation = trpc.wholesale.admin.uploadProductImage.useMutation({
    onSuccess: (data, variables) => {
      toast.success('Image uploaded');
      if (editingProduct) {
        const key = variables.imageIndex === 0 ? 'imageUrl' : variables.imageIndex === 1 ? 'imageUrl2' : 'imageUrl3';
        setEditingProduct({ ...editingProduct, [key]: data.imageUrl });
      }
      refetchProducts();
      setUploadingImage(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Error uploading image');
      setUploadingImage(null);
    },
  });

  const uploadProductVideoMutation = trpc.wholesale.admin.uploadProductVideo.useMutation({
    onSuccess: (data) => {
      toast.success('Video uploaded');
      if (editingProduct) {
        setEditingProduct({ ...editingProduct, videoUrl: data.videoUrl });
      }
      refetchProducts();
      setUploadingImage(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Error uploading video');
      setUploadingImage(null);
    },
  });

  const updateOrderStatusMutation = trpc.wholesale.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success('Order status updated');
      refetchOrders();
    },
    onError: (err) => toast.error(err.message || 'Error updating order'),
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

  // Handle file upload for category image
  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCategory?.id) return;
    
    setUploadingImage('category');
    const reader = new FileReader();
    reader.onload = () => {
      uploadCategoryImageMutation.mutate({
        categoryId: editingCategory.id!,
        imageBase64: reader.result as string,
        mimeType: file.type,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle file upload for product images
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, imageIndex: number) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct?.id) return;
    
    setUploadingImage(`product-${imageIndex}`);
    const reader = new FileReader();
    reader.onload = () => {
      uploadProductImageMutation.mutate({
        productId: editingProduct.id!,
        imageBase64: reader.result as string,
        mimeType: file.type,
        fileName: file.name,
        imageIndex,
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle file upload for product video
  const handleProductVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct?.id) return;
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be under 50MB');
      return;
    }
    
    setUploadingImage('video');
    const reader = new FileReader();
    reader.onload = () => {
      uploadProductVideoMutation.mutate({
        productId: editingProduct.id!,
        videoBase64: reader.result as string,
        mimeType: file.type,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Initialize new category form
  const openNewCategory = () => {
    setEditingCategory({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      isActive: true,
    });
  };

  // Initialize edit category form
  const openEditCategory = (category: { id: number; name: string; slug: string; description?: string | null; imageUrl?: string | null; isActive: boolean }) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      isActive: category.isActive,
    });
  };

  // Initialize new product form
  const openNewProduct = () => {
    setEditingProduct({
      categoryId: categories?.[0]?.id || 0,
      name: '',
      slug: '',
      description: '',
      specifications: '',
      imageUrl: '',
      imageUrl2: '',
      imageUrl3: '',
      videoUrl: '',
      basePrice: 0,
      unit: 'pack',
      stockQuantity: 0,
      isActive: true,
      isFeatured: false,
    });
  };

  // Initialize edit product form
  const openEditProduct = (product: {
    id: number;
    categoryId: number;
    name: string;
    slug: string;
    description?: string | null;
    specifications?: string | null;
    imageUrl?: string | null;
    imageUrl2?: string | null;
    imageUrl3?: string | null;
    videoUrl?: string | null;
    basePrice: number;
    unit: string;
    stockQuantity: number;
    isActive: boolean;
    isFeatured?: boolean | null;
  }) => {
    setEditingProduct({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      specifications: product.specifications || '',
      imageUrl: product.imageUrl || '',
      imageUrl2: product.imageUrl2 || '',
      imageUrl3: product.imageUrl3 || '',
      videoUrl: product.videoUrl || '',
      basePrice: product.basePrice,
      unit: product.unit,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
      isFeatured: product.isFeatured || false,
    });
  };

  // Save category
  const saveCategory = () => {
    if (!editingCategory) return;
    if (editingCategory.id) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        name: editingCategory.name,
        slug: editingCategory.slug,
        description: editingCategory.description,
        imageUrl: editingCategory.imageUrl,
        isActive: editingCategory.isActive,
      });
    } else {
      createCategoryMutation.mutate({
        name: editingCategory.name,
        slug: editingCategory.slug,
        description: editingCategory.description,
        imageUrl: editingCategory.imageUrl,
        isActive: editingCategory.isActive,
      });
    }
  };

  // Save product
  const saveProduct = () => {
    if (!editingProduct) return;
    if (editingProduct.id) {
      updateProductMutation.mutate({
        id: editingProduct.id,
        categoryId: editingProduct.categoryId,
        name: editingProduct.name,
        slug: editingProduct.slug,
        description: editingProduct.description,
        specifications: editingProduct.specifications,
        imageUrl: editingProduct.imageUrl,
        imageUrl2: editingProduct.imageUrl2,
        imageUrl3: editingProduct.imageUrl3,
        videoUrl: editingProduct.videoUrl,
        basePrice: editingProduct.basePrice,
        unit: editingProduct.unit,
        stockQuantity: editingProduct.stockQuantity,
        isActive: editingProduct.isActive,
        isFeatured: editingProduct.isFeatured,
      });
    } else {
      createProductMutation.mutate({
        categoryId: editingProduct.categoryId,
        name: editingProduct.name,
        slug: editingProduct.slug,
        description: editingProduct.description,
        specifications: editingProduct.specifications,
        imageUrl: editingProduct.imageUrl,
        imageUrl2: editingProduct.imageUrl2,
        imageUrl3: editingProduct.imageUrl3,
        videoUrl: editingProduct.videoUrl,
        basePrice: editingProduct.basePrice,
        unit: editingProduct.unit,
        stockQuantity: editingProduct.stockQuantity,
        isActive: editingProduct.isActive,
        isFeatured: editingProduct.isFeatured,
      });
    }
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
                          <TableCell className="font-mono">{order.orderNumber}</TableCell>
                          <TableCell>{order.businessName}</TableCell>
                          <TableCell>{formatPrice(order.totalAmount)}</TableCell>
                          <TableCell>
                            <Badge className={order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[order.orderStatus]?.color || 'bg-gray-100'}>
                              {statusConfig[order.orderStatus]?.label || order.orderStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Select
                                value={order.orderStatus}
                                onValueChange={(value) => updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  orderStatus: value as 'pending' | 'confirmed' | 'processing' | 'ready' | 'completed' | 'cancelled',
                                })}
                              >
                                <SelectTrigger className="w-[120px] h-8">
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

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Wholesale Products</CardTitle>
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={openNewProduct}>
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
                        <TableHead>Image</TableHead>
                        <TableHead>Name</TableHead>
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
                        categoryId: number;
                        name: string;
                        slug: string;
                        description?: string | null;
                        specifications?: string | null;
                        imageUrl?: string | null;
                        imageUrl2?: string | null;
                        imageUrl3?: string | null;
                        videoUrl?: string | null;
                        basePrice: number;
                        unit: string;
                        stockQuantity: number;
                        isActive: boolean;
                        isFeatured?: boolean | null;
                      }) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-gray-500">/{product.unit}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {categories?.find((c: { id: number }) => c.id === product.categoryId)?.name || '-'}
                          </TableCell>
                          <TableCell>{formatPrice(product.basePrice)}</TableCell>
                          <TableCell>
                            <Badge className={product.stockQuantity > 10 ? 'bg-green-100 text-green-800' : product.stockQuantity > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                              {product.stockQuantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditProduct(product)}>
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
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={openNewCategory}>
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
                        <TableHead>Image</TableHead>
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
                        imageUrl?: string | null;
                        isActive: boolean;
                      }) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            {category.imageUrl ? (
                              <img src={category.imageUrl} alt={category.name} className="w-12 h-12 object-cover rounded" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                <Image className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
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
                              <Button variant="ghost" size="sm" onClick={() => openEditCategory(category)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory?.id ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Category Image */}
            <div className="space-y-2">
              <Label>Category Image</Label>
              <div className="flex items-start gap-4">
                {editingCategory?.imageUrl ? (
                  <div className="relative">
                    <img src={editingCategory.imageUrl} alt="Category" className="w-24 h-24 object-cover rounded-lg" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setEditingCategory({ ...editingCategory, imageUrl: '' })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Image className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    ref={categoryImageRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleCategoryImageUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => categoryImageRef.current?.click()}
                    disabled={!editingCategory?.id || uploadingImage === 'category'}
                  >
                    {uploadingImage === 'category' ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" /> Upload Image</>
                    )}
                  </Button>
                  {!editingCategory?.id && (
                    <p className="text-xs text-gray-500 mt-1">Save category first to upload image</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name *</Label>
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
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={saveCategory}>
              {editingCategory?.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct?.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Product Images */}
            <div className="space-y-2">
              <Label>Product Images</Label>
              <div className="grid grid-cols-3 gap-4">
                {/* Image 1 */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Main Image</p>
                  {editingProduct?.imageUrl ? (
                    <div className="relative">
                      <img src={editingProduct.imageUrl} alt="Product" className="w-full aspect-square object-cover rounded-lg" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <input type="file" ref={productImageRef1} className="hidden" accept="image/*" onChange={(e) => handleProductImageUpload(e, 0)} />
                  <Button variant="outline" size="sm" className="w-full" onClick={() => productImageRef1.current?.click()} disabled={!editingProduct?.id || uploadingImage === 'product-0'}>
                    {uploadingImage === 'product-0' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Image 2 */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Image 2</p>
                  {editingProduct?.imageUrl2 ? (
                    <div className="relative">
                      <img src={editingProduct.imageUrl2} alt="Product" className="w-full aspect-square object-cover rounded-lg" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setEditingProduct({ ...editingProduct, imageUrl2: '' })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <input type="file" ref={productImageRef2} className="hidden" accept="image/*" onChange={(e) => handleProductImageUpload(e, 1)} />
                  <Button variant="outline" size="sm" className="w-full" onClick={() => productImageRef2.current?.click()} disabled={!editingProduct?.id || uploadingImage === 'product-1'}>
                    {uploadingImage === 'product-1' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Image 3 */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Image 3</p>
                  {editingProduct?.imageUrl3 ? (
                    <div className="relative">
                      <img src={editingProduct.imageUrl3} alt="Product" className="w-full aspect-square object-cover rounded-lg" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setEditingProduct({ ...editingProduct, imageUrl3: '' })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <input type="file" ref={productImageRef3} className="hidden" accept="image/*" onChange={(e) => handleProductImageUpload(e, 2)} />
                  <Button variant="outline" size="sm" className="w-full" onClick={() => productImageRef3.current?.click()} disabled={!editingProduct?.id || uploadingImage === 'product-2'}>
                    {uploadingImage === 'product-2' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {!editingProduct?.id && (
                <p className="text-xs text-gray-500">Save product first to upload images</p>
              )}
            </div>

            {/* Product Video */}
            <div className="space-y-2">
              <Label>Product Video</Label>
              <div className="flex items-start gap-4">
                {editingProduct?.videoUrl ? (
                  <div className="relative">
                    <video src={editingProduct.videoUrl} className="w-32 h-24 object-cover rounded-lg" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setEditingProduct({ ...editingProduct, videoUrl: '' })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    ref={productVideoRef}
                    className="hidden"
                    accept="video/*"
                    onChange={handleProductVideoUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => productVideoRef.current?.click()}
                    disabled={!editingProduct?.id || uploadingImage === 'video'}
                  >
                    {uploadingImage === 'video' ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" /> Upload Video</>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">Max 50MB. MP4 recommended.</p>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
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
                <Label>Category *</Label>
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
                <Label>Unit *</Label>
                <Input
                  value={editingProduct?.unit || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, unit: e.target.value } : null)}
                  placeholder="e.g., kg, pack, box"
                />
              </div>
              <div className="space-y-2">
                <Label>Base Price (₹) *</Label>
                <Input
                  type="number"
                  value={(editingProduct?.basePrice || 0) / 100}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, basePrice: Math.round(parseFloat(e.target.value) * 100) || 0 } : null)}
                  step="0.01"
                />
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
                <Label>Description</Label>
                <Textarea
                  value={editingProduct?.description || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Specifications</Label>
                <Textarea
                  value={editingProduct?.specifications || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, specifications: e.target.value } : null)}
                  placeholder="Weight, dimensions, ingredients, etc."
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-6">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={saveProduct}>
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
