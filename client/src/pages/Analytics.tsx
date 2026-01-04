import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Percent,
  Clock,
  ArrowLeft,
} from "lucide-react";

// Helper to format currency
const formatCurrency = (paise: number) => {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

// Helper to get date range presets
const getDatePreset = (preset: string) => {
  const today = new Date();
  const startDate = new Date();
  
  switch (preset) {
    case 'today':
      return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    case 'yesterday':
      startDate.setDate(today.getDate() - 1);
      return { start: startDate.toISOString().split('T')[0], end: startDate.toISOString().split('T')[0] };
    case 'last7days':
      startDate.setDate(today.getDate() - 7);
      return { start: startDate.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    case 'last30days':
      startDate.setDate(today.getDate() - 30);
      return { start: startDate.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    case 'thisMonth':
      startDate.setDate(1);
      return { start: startDate.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    case 'lastMonth':
      startDate.setMonth(today.getMonth() - 1);
      startDate.setDate(1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: startDate.toISOString().split('T')[0], end: endOfLastMonth.toISOString().split('T')[0] };
    default:
      startDate.setDate(today.getDate() - 30);
      return { start: startDate.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
  }
};

export default function Analytics() {
  const { user, isAuthenticated } = useAuth();
  
  // Filter states
  const [datePreset, setDatePreset] = useState('last30days');
  const [startDate, setStartDate] = useState(getDatePreset('last30days').start);
  const [endDate, setEndDate] = useState(getDatePreset('last30days').end);
  const [orderType, setOrderType] = useState<'all' | 'instore' | 'delivery' | 'pickup'>('all');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);

  // Fetch categories for filter dropdowns
  const { data: categories } = trpc.menu.getCategories.useQuery();
  const { data: subcategories } = trpc.menu.getSubcategories.useQuery(
    selectedCategory ? { categoryId: selectedCategory } : undefined,
    { enabled: !!selectedCategory }
  );

  // Analytics queries using actual API procedures
  const { data: salesOverview, isLoading: loadingSummary, refetch: refetchSummary } = 
    trpc.analytics.getSalesOverview.useQuery({
      startDate,
      endDate,
      orderType,
      categoryId: selectedCategory ?? undefined,
      subcategoryId: selectedSubcategory ?? undefined,
    });
  
  const { data: categoryStats, isLoading: loadingCategory } = 
    trpc.analytics.getSalesByCategory.useQuery({
      startDate,
      endDate,
      orderType,
    });
  
  const { data: subcategoryStats, isLoading: loadingSubcategory } = 
    trpc.analytics.getSalesBySubcategory.useQuery({
      startDate,
      endDate,
      categoryId: selectedCategory ?? undefined,
      orderType,
    });
  
  const { data: topProducts, isLoading: loadingTopProducts } = 
    trpc.analytics.getProductPerformance.useQuery({
      startDate,
      endDate,
      categoryId: selectedCategory ?? undefined,
      subcategoryId: selectedSubcategory ?? undefined,
      orderType,
      limit: 10,
      sortBy: 'revenue',
      order: 'top',
    });
  
  const { data: poorProducts, isLoading: loadingPoorProducts } = 
    trpc.analytics.getProductPerformance.useQuery({
      startDate,
      endDate,
      categoryId: selectedCategory ?? undefined,
      subcategoryId: selectedSubcategory ?? undefined,
      orderType,
      limit: 10,
      sortBy: 'quantity',
      order: 'bottom',
    });
  
  const { data: customerAnalytics, isLoading: loadingCustomer } = 
    trpc.analytics.getCustomerAnalytics.useQuery({
      startDate,
      endDate,
    });
  
  const { data: topCustomers, isLoading: loadingTopCustomers } = 
    trpc.analytics.getTopCustomers.useQuery({
      startDate,
      endDate,
      limit: 10,
      sortBy: 'totalSpent',
    });
  
  const { data: dayOfWeekStats, isLoading: loadingDayOfWeek } = 
    trpc.analytics.getDayOfWeekAnalysis.useQuery({
      startDate,
      endDate,
      categoryId: selectedCategory ?? undefined,
      subcategoryId: selectedSubcategory ?? undefined,
    });
  
  const { data: peakHours, isLoading: loadingPeakHours } = 
    trpc.analytics.getPeakHoursAnalysis.useQuery({
      startDate,
      endDate,
    });
  
  const { data: dailyTrend, isLoading: loadingDailyTrend } = 
    trpc.analytics.getDailySalesTrend.useQuery({
      startDate,
      endDate,
      categoryId: selectedCategory ?? undefined,
      subcategoryId: selectedSubcategory ?? undefined,
      orderType,
    });
  
  const { data: gstReport, isLoading: loadingGst } = 
    trpc.analytics.getGstReport.useQuery({
      startDate,
      endDate,
      groupBy: 'daily',
    });

  // Handle date preset change
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { start, end } = getDatePreset(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setDatePreset('last30days');
    const { start, end } = getDatePreset('last30days');
    setStartDate(start);
    setEndDate(end);
    setOrderType('all');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  // Export to CSV
  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (typeof val === 'number' && (h.toLowerCase().includes('revenue') || h.toLowerCase().includes('spent') || h.toLowerCase().includes('value'))) {
          return (val / 100).toFixed(2);
        }
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '');
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="font-bold text-lg">Analytics Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => refetchSummary()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="container py-6">
        <div className="mb-6">
          <p className="text-muted-foreground">Sales reports, customer insights, and GST compliance</p>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Date Preset */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={datePreset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                />
              </div>

              {/* Order Type */}
              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={(v) => setOrderType(v as typeof orderType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="instore">In-store</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={selectedCategory?.toString() || 'all'} 
                  onValueChange={(v) => { 
                    setSelectedCategory(v === 'all' ? null : parseInt(v)); 
                    setSelectedSubcategory(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory */}
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select 
                  value={selectedSubcategory?.toString() || 'all'} 
                  onValueChange={(v) => { 
                    setSelectedSubcategory(v === 'all' ? null : parseInt(v));
                  }}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All subcategories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subcategories</SelectItem>
                    {subcategories?.map(sub => (
                      <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingSummary ? '...' : formatCurrency(salesOverview?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {salesOverview?.totalOrders || 0} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingSummary ? '...' : formatCurrency(salesOverview?.avgOrderValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Per order</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GST Collected</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingSummary ? '...' : formatCurrency(salesOverview?.totalGst || 0)}
              </div>
              <p className="text-xs text-muted-foreground">CGST + SGST</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repeat Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingCustomer ? '...' : `${customerAnalytics?.repeatRate?.toFixed(1) || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                {customerAnalytics?.repeatCustomers || 0} of {customerAnalytics?.totalCustomers || 0} customers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different reports */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="gst">GST Report</TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sales by Category */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Sales by Category</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => exportToCSV(categoryStats as Record<string, unknown>[] || [], 'category_sales')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCategory ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : categoryStats && categoryStats.length > 0 ? (
                    <div className="space-y-3">
                      {categoryStats.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{cat.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {cat.quantity} items • {cat.orderCount} orders
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(cat.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>

              {/* Sales by Subcategory */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Sales by Subcategory</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => exportToCSV(subcategoryStats as Record<string, unknown>[] || [], 'subcategory_sales')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSubcategory ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : subcategoryStats && subcategoryStats.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {subcategoryStats.map((sub, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{sub.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {sub.quantity} items • {sub.orderCount} orders
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(sub.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Selling Products */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Top Selling Products
                      </CardTitle>
                      <CardDescription>By revenue</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => exportToCSV(topProducts as Record<string, unknown>[] || [], 'top_products')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingTopProducts ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : topProducts && topProducts.length > 0 ? (
                    <div className="space-y-3">
                      {topProducts.map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                              {idx + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.quantity} sold</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>

              {/* Poor Selling Products */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        Low Selling Products
                      </CardTitle>
                      <CardDescription>Consider promoting or discontinuing</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => exportToCSV(poorProducts as Record<string, unknown>[] || [], 'low_products')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingPoorProducts ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : poorProducts && poorProducts.length > 0 ? (
                    <div className="space-y-3">
                      {poorProducts.map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="destructive" className="w-8 h-8 rounded-full flex items-center justify-center">
                              {idx + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.quantity} sold</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">{formatCurrency(product.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{customerAnalytics?.totalCustomers || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Orders per Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{customerAnalytics?.avgOrdersPerCustomer?.toFixed(1) || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Lifetime Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(customerAnalytics?.avgLifetimeValue || 0)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customer Retention</CardTitle>
                <CardDescription>Percentage of customers who ordered more than once</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all"
                      style={{ width: `${customerAnalytics?.repeatRate || 0}%` }}
                    />
                  </div>
                  <span className="font-bold text-lg">{customerAnalytics?.repeatRate?.toFixed(1) || 0}%</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {customerAnalytics?.repeatCustomers || 0} repeat customers out of {customerAnalytics?.totalCustomers || 0} total
                </p>
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top Customers</CardTitle>
                    <CardDescription>By total spending</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => exportToCSV(topCustomers as Record<string, unknown>[] || [], 'top_customers')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTopCustomers ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : topCustomers && topCustomers.length > 0 ? (
                  <div className="space-y-3">
                    {topCustomers.map((customer, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                            {idx + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.orders} orders • {customer.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(customer.totalSpent)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Day of Week Performance */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Sales by Day of Week
                      </CardTitle>
                      <CardDescription>Best performing days</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => exportToCSV(dayOfWeekStats as Record<string, unknown>[] || [], 'day_of_week')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingDayOfWeek ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : dayOfWeekStats && dayOfWeekStats.length > 0 ? (
                    <div className="space-y-3">
                      {[...dayOfWeekStats].sort((a, b) => b.revenue - a.revenue).map((day, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {idx === 0 && <Badge className="bg-green-500">Best</Badge>}
                            <div>
                              <p className="font-medium">{day.day}</p>
                              <p className="text-sm text-muted-foreground">{day.orders} orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(day.revenue)}</p>
                            <p className="text-sm text-muted-foreground">avg {formatCurrency(day.avgOrderValue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>

              {/* Peak Hours */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Peak Hours
                      </CardTitle>
                      <CardDescription>Busiest ordering times</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => exportToCSV(peakHours as Record<string, unknown>[] || [], 'peak_hours')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingPeakHours ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : peakHours && peakHours.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {[...peakHours].filter(h => h.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 12).map((hour, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {idx < 3 && <Badge className="bg-amber-500">Peak</Badge>}
                            <div>
                              <p className="font-medium">{hour.hourLabel}</p>
                              <p className="text-sm text-muted-foreground">{hour.orders} orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(hour.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Daily Trend */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daily Revenue Trend</CardTitle>
                    <CardDescription>Revenue over time</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => exportToCSV(dailyTrend as Record<string, unknown>[] || [], 'daily_trend')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDailyTrend ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : dailyTrend && dailyTrend.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-1">
                      {dailyTrend.slice(-28).map((day, idx) => {
                        const maxRevenue = Math.max(...dailyTrend.map(d => d.revenue));
                        const intensity = maxRevenue > 0 ? (day.revenue / maxRevenue) : 0;
                        return (
                          <div 
                            key={idx}
                            className="aspect-square rounded flex items-center justify-center text-xs"
                            style={{ 
                              backgroundColor: `rgba(34, 197, 94, ${0.1 + intensity * 0.9})`,
                              color: intensity > 0.5 ? 'white' : 'inherit'
                            }}
                            title={`${day.date}: ${formatCurrency(day.revenue)} (${day.orders} orders)`}
                          >
                            {new Date(day.date).getDate()}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Less</span>
                      <div className="flex gap-1">
                        {[0.1, 0.3, 0.5, 0.7, 0.9].map((i, idx) => (
                          <div 
                            key={idx}
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: `rgba(34, 197, 94, ${i})` }}
                          />
                        ))}
                      </div>
                      <span>More</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GST Report Tab */}
          <TabsContent value="gst" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>GST Summary Report</CardTitle>
                    <CardDescription>For GSTR-1/GSTR-3B filing ({startDate} to {endDate})</CardDescription>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => exportToCSV(gstReport?.details as Record<string, unknown>[] || [], 'gst_report')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export for CA
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingGst ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : gstReport && gstReport.details && gstReport.details.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">Total Taxable Value</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(gstReport.summary.totalTaxableValue)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">CGST (2.5%)</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(gstReport.summary.totalCgst)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">SGST (2.5%)</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(gstReport.summary.totalSgst)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">Total GST</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(gstReport.summary.totalGst)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3">Period</th>
                            <th className="text-right p-3">Orders</th>
                            <th className="text-right p-3">Taxable Value</th>
                            <th className="text-right p-3">CGST</th>
                            <th className="text-right p-3">SGST</th>
                            <th className="text-right p-3">Total GST</th>
                            <th className="text-right p-3">Invoice Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gstReport.details.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-3">{row.period}</td>
                              <td className="text-right p-3">{row.orderCount}</td>
                              <td className="text-right p-3">{formatCurrency(row.taxableValue)}</td>
                              <td className="text-right p-3">{formatCurrency(row.cgst)}</td>
                              <td className="text-right p-3">{formatCurrency(row.sgst)}</td>
                              <td className="text-right p-3">{formatCurrency(row.gst)}</td>
                              <td className="text-right p-3 font-medium">{formatCurrency(row.taxableValue + row.gst)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted font-bold">
                          <tr>
                            <td className="p-3">Total</td>
                            <td className="text-right p-3">{gstReport.details.reduce((sum, r) => sum + r.orderCount, 0)}</td>
                            <td className="text-right p-3">{formatCurrency(gstReport.summary.totalTaxableValue)}</td>
                            <td className="text-right p-3">{formatCurrency(gstReport.summary.totalCgst)}</td>
                            <td className="text-right p-3">{formatCurrency(gstReport.summary.totalSgst)}</td>
                            <td className="text-right p-3">{formatCurrency(gstReport.summary.totalGst)}</td>
                            <td className="text-right p-3">{formatCurrency(gstReport.summary.totalTaxableValue + gstReport.summary.totalGst)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p>* HSN Code: 9963 (Restaurant Services)</p>
                      <p>* GST Rate: 5% (2.5% CGST + 2.5% SGST) - applicable for restaurants without ITC</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available for the selected period</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
