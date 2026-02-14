import { useState, useMemo, useEffect } from "react";
import PredictionsTab from "./PredictionsTab";
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
  FileSpreadsheet,
  BarChart3,
  Lightbulb,
  Layers,
  Globe,
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

  // Business recommendations
  const { data: recommendationsData, isLoading: loadingRecommendations } = 
    trpc.analytics.getBusinessRecommendations.useQuery({
      startDate,
      endDate,
    });

  // Item-level analytics queries
  const [insightMetric, setInsightMetric] = useState<'quantity' | 'revenue'>('quantity');

  const { data: itemDayData, isLoading: loadingItemDay } = 
    trpc.analytics.getItemDayAnalysis.useQuery({
      startDate,
      endDate,
      categoryId: selectedCategory ?? undefined,
      subcategoryId: selectedSubcategory ?? undefined,
      orderType,
      metric: insightMetric,
      limit: 15,
    });

  const { data: productMixData, isLoading: loadingProductMix } = 
    trpc.analytics.getProductMixAnalysis.useQuery({
      startDate,
      endDate,
      minOccurrences: 2,
      limit: 15,
    });

  const { data: hourlyProductData, isLoading: loadingHourlyProduct } = 
    trpc.analytics.getHourlyProductAnalysis.useQuery({
      startDate,
      endDate,
      orderType,
    });

  // Channel analytics - separate date range for period selection
  const [channelPeriod, setChannelPeriod] = useState<string>('current'); // 'current' | 'all_time' | 'ytd' | period id
  const [channelStartDate, setChannelStartDate] = useState(startDate);
  const [channelEndDate, setChannelEndDate] = useState(endDate);

  // Fetch all delivery periods for the period selector
  const { data: deliveryPeriods, refetch: refetchPeriods } = trpc.analytics.getDeliveryPeriods.useQuery();

  // Update channel dates when period changes
  useEffect(() => {
    if (channelPeriod === 'current') {
      setChannelStartDate(startDate);
      setChannelEndDate(endDate);
    } else if (channelPeriod === 'all_time') {
      // Go back to business start (April 2024)
      setChannelStartDate('2024-04-01');
      setChannelEndDate(new Date().toISOString().split('T')[0]);
    } else if (channelPeriod === 'ytd') {
      const year = new Date().getFullYear();
      setChannelStartDate(`${year}-01-01`);
      setChannelEndDate(new Date().toISOString().split('T')[0]);
    } else {
      // Specific period - find it in deliveryPeriods
      const period = deliveryPeriods?.find(p => String(p.id) === channelPeriod);
      if (period) {
        setChannelStartDate(new Date(period.periodStart).toISOString().split('T')[0]);
        setChannelEndDate(new Date(period.periodEnd).toISOString().split('T')[0]);
      }
    }
  }, [channelPeriod, startDate, endDate, deliveryPeriods]);

  // Combined channel analytics
  const { data: channelData, isLoading: loadingChannels, refetch: refetchChannels } = 
    trpc.analytics.getCombinedChannelAnalytics.useQuery({
      startDate: channelStartDate,
      endDate: channelEndDate,
    });

  // Delivery upload state
  const [uploadingDelivery, setUploadingDelivery] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

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
        if (typeof val === 'number' && (h.toLowerCase().includes('revenue') || h.toLowerCase().includes('spent') || h.toLowerCase().includes('value') || h === 'cgst' || h === 'sgst' || h === 'gst' || h.toLowerCase().includes('amount') || h.toLowerCase().includes('price'))) {
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
          <div className="flex items-center gap-2">
            <Link href="/admin/traffic">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Globe className="h-4 w-4 mr-2" />
                Website Traffic
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={async () => {
                try {
                  const url = `/api/export/sales-report?startDate=${startDate}&endDate=${endDate}`;
                  const response = await fetch(url, { credentials: 'include' });
                  if (!response.ok) throw new Error('Export failed');
                  const blob = await response.blob();
                  const downloadUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = `Taiwan_Maami_Sales_Report_${startDate}_to_${endDate}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(downloadUrl);
                } catch (err) {
                  alert('Failed to export report. Please try again.');
                }
              }}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => refetchSummary()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
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
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="sales" className="text-xs sm:text-sm">Sales</TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm">Products</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs sm:text-sm">Customers</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs sm:text-sm">Insights</TabsTrigger>
            <TabsTrigger value="channels" className="text-xs sm:text-sm">Channels</TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs sm:text-sm">Predictions</TabsTrigger>
            <TabsTrigger value="gst" className="text-xs sm:text-sm">GST</TabsTrigger>
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

          {/* Product Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {/* Business Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Business Recommendations
                </CardTitle>
                <CardDescription>Data-driven suggestions to improve sales and operations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRecommendations ? (
                  <div className="text-center py-8 text-muted-foreground">Analyzing your data...</div>
                ) : recommendationsData?.recommendations && recommendationsData.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendationsData.recommendations.map((rec, idx) => {
                      const priorityColors = {
                        high: 'border-l-red-500 bg-red-50 dark:bg-red-950/20',
                        medium: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
                        low: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
                      };
                      const priorityLabels = {
                        high: 'High Priority',
                        medium: 'Medium Priority',
                        low: 'Good Standing',
                      };
                      const typeIcons: Record<string, string> = {
                        opportunity: '\uD83C\uDFAF',
                        insight: '\uD83D\uDCA1',
                        focus: '\uD83D\uDD2D',
                        action: '\u26A1',
                      };
                      return (
                        <div key={idx} className={`border-l-4 rounded-lg p-4 ${priorityColors[rec.priority]}`}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <span>{typeIcons[rec.type] || '\uD83D\uDCCA'}</span>
                              {rec.title}
                            </h4>
                            <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'} className="text-xs shrink-0">
                              {priorityLabels[rec.priority]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Not enough data to generate recommendations</div>
                )}
              </CardContent>
            </Card>

            {/* Metric Toggle */}
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm font-medium text-muted-foreground">View by:</span>
              <div className="flex gap-2">
                <Button 
                  variant={insightMetric === 'quantity' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setInsightMetric('quantity')}
                >
                  Quantity Sold
                </Button>
                <Button 
                  variant={insightMetric === 'revenue' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setInsightMetric('revenue')}
                >
                  Revenue
                </Button>
              </div>
            </div>

            {/* Product x Day-of-Week Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Product Sales by Day of Week
                </CardTitle>
                <CardDescription>Which products sell on which days — darker = higher {insightMetric === 'revenue' ? 'revenue' : 'quantity'}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingItemDay ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : itemDayData?.products && itemDayData.products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium min-w-[180px]">Product</th>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <th key={day} className="text-center py-2 px-2 font-medium w-16">{day}</th>
                          ))}
                          <th className="text-right py-2 px-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemDayData.products.map((product, idx) => {
                          const maxVal = Math.max(...product.days);
                          return (
                            <tr key={product.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                              <td className="py-2 px-3 font-medium truncate max-w-[200px]" title={product.name}>{product.name}</td>
                              {product.days.map((val, dayIdx) => {
                                const intensity = maxVal > 0 ? val / maxVal : 0;
                                const bgColor = intensity === 0 ? '' : 
                                  intensity < 0.25 ? 'bg-green-100 dark:bg-green-900/30' :
                                  intensity < 0.5 ? 'bg-green-200 dark:bg-green-800/40' :
                                  intensity < 0.75 ? 'bg-green-300 dark:bg-green-700/50' :
                                  'bg-green-500 dark:bg-green-600/60 text-white';
                                return (
                                  <td key={dayIdx} className={`text-center py-2 px-2 ${bgColor} rounded-sm`}>
                                    {val > 0 ? val : '-'}
                                  </td>
                                );
                              })}
                              <td className="text-right py-2 px-3 font-bold">
                                {insightMetric === 'revenue' ? formatCurrency(product.totalRevenue) : product.totalQuantity}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-bold">
                          <td className="py-2 px-3">Day Total</td>
                          {itemDayData.dayTotals.map((dt, idx) => (
                            <td key={idx} className="text-center py-2 px-2">{dt.total}</td>
                          ))}
                          <td className="text-right py-2 px-3">
                            {itemDayData.dayTotals.reduce((s, d) => s + d.total, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Day performance summary */}
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Day-of-Week Insights
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {(() => {
                          const sorted = [...itemDayData.dayTotals].sort((a, b) => b.total - a.total);
                          const best = sorted[0];
                          const worst = sorted[sorted.length - 1];
                          return (
                            <>
                              <p><strong>Best day:</strong> {best?.day} ({best?.total} items sold)</p>
                              <p><strong>Slowest day:</strong> {worst?.day} ({worst?.total} items sold)</p>
                              <p><strong>Weekend vs Weekday:</strong> {(() => {
                                const weekend = (itemDayData.dayTotals[0]?.total || 0) + (itemDayData.dayTotals[6]?.total || 0);
                                const weekday = itemDayData.dayTotals.slice(1, 6).reduce((s, d) => s + d.total, 0);
                                const weekendAvg = weekend / 2;
                                const weekdayAvg = weekday / 5;
                                return weekendAvg > weekdayAvg 
                                  ? `Weekends avg ${weekendAvg.toFixed(0)} items/day vs weekdays ${weekdayAvg.toFixed(0)}`
                                  : `Weekdays avg ${weekdayAvg.toFixed(0)} items/day vs weekends ${weekendAvg.toFixed(0)}`;
                              })()}</p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available for the selected period</div>
                )}
              </CardContent>
            </Card>

            {/* Hourly Category Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Sales by Hour of Day
                </CardTitle>
                <CardDescription>When each category sells throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHourlyProduct ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : hourlyProductData?.hourlyData && hourlyProductData.hourlyData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Hour</th>
                          {hourlyProductData.categoryNames.map(cat => (
                            <th key={cat.id} className="text-center py-2 px-2 font-medium">{cat.name}</th>
                          ))}
                          <th className="text-right py-2 px-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hourlyProductData.hourlyData
                          .filter(h => h.totalQuantity > 0)
                          .map((hourRow, idx) => {
                            const maxCatVal = Math.max(...hourRow.categories.map(c => c.quantity));
                            return (
                              <tr key={hourRow.hour} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                                <td className="py-2 px-3 font-medium">{hourRow.hourLabel}</td>
                                {hourRow.categories.map(cat => {
                                  const intensity = maxCatVal > 0 ? cat.quantity / maxCatVal : 0;
                                  const bgColor = intensity === 0 ? '' : 
                                    intensity < 0.3 ? 'bg-blue-100 dark:bg-blue-900/30' :
                                    intensity < 0.6 ? 'bg-blue-200 dark:bg-blue-800/40' :
                                    'bg-blue-400 dark:bg-blue-600/60 text-white';
                                  return (
                                    <td key={cat.categoryId} className={`text-center py-2 px-2 ${bgColor} rounded-sm`}>
                                      {cat.quantity > 0 ? cat.quantity : '-'}
                                    </td>
                                  );
                                })}
                                <td className="text-right py-2 px-3 font-bold">{hourRow.totalQuantity}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>

                    {/* Peak hours insight */}
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Time-of-Day Insights
                      </h4>
                      <div className="text-sm space-y-1">
                        {(() => {
                          const activeHours = hourlyProductData.hourlyData.filter(h => h.totalQuantity > 0).sort((a, b) => b.totalQuantity - a.totalQuantity);
                          const peak = activeHours[0];
                          const lunchHours = hourlyProductData.hourlyData.filter(h => h.hour >= 11 && h.hour <= 14);
                          const dinnerHours = hourlyProductData.hourlyData.filter(h => h.hour >= 18 && h.hour <= 21);
                          const lunchTotal = lunchHours.reduce((s, h) => s + h.totalQuantity, 0);
                          const dinnerTotal = dinnerHours.reduce((s, h) => s + h.totalQuantity, 0);
                          return (
                            <>
                              {peak && <p><strong>Peak hour:</strong> {peak.hourLabel} ({peak.totalQuantity} items)</p>}
                              <p><strong>Lunch rush (11-14):</strong> {lunchTotal} items | <strong>Dinner rush (18-21):</strong> {dinnerTotal} items</p>
                              <p>{lunchTotal > dinnerTotal ? 'Lunch is your stronger period.' : dinnerTotal > lunchTotal ? 'Dinner is your stronger period.' : 'Lunch and dinner are equally busy.'}</p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available for the selected period</div>
                )}
              </CardContent>
            </Card>

            {/* Product Mix / Co-occurrence Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Product Mix Analysis
                </CardTitle>
                <CardDescription>Which products are frequently ordered together — use for combo deals and upselling</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProductMix ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : productMixData?.pairs && productMixData.pairs.length > 0 ? (
                  <div>
                    {/* Insights box */}
                    {productMixData.insights && productMixData.insights.length > 0 && (
                      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <h4 className="font-semibold flex items-center gap-2 mb-2 text-yellow-800 dark:text-yellow-200">
                          <Lightbulb className="h-4 w-4" />
                          Key Insights
                        </h4>
                        <ul className="text-sm space-y-1 text-yellow-700 dark:text-yellow-300">
                          {productMixData.insights.map((insight, idx) => (
                            <li key={idx}>• {insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Pairs table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Product A</th>
                          <th className="text-center py-2 px-1 font-medium">+</th>
                          <th className="text-left py-2 px-3 font-medium">Product B</th>
                          <th className="text-right py-2 px-3 font-medium">Times Ordered Together</th>
                          <th className="text-right py-2 px-3 font-medium">Strength</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productMixData.pairs.map((pair, idx) => {
                          const maxCount = productMixData.pairs[0]?.count || 1;
                          const strength = pair.count / maxCount;
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                              <td className="py-2 px-3">{pair.productA}</td>
                              <td className="text-center py-2 px-1 text-muted-foreground">+</td>
                              <td className="py-2 px-3">{pair.productB}</td>
                              <td className="text-right py-2 px-3 font-bold">{pair.count}</td>
                              <td className="text-right py-2 px-3">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary rounded-full" 
                                      style={{ width: `${strength * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8">{Math.round(strength * 100)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Not enough data to detect product combinations (need at least 2 co-occurrences)</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channels Tab - Combined Analytics */}
          <TabsContent value="channels" className="space-y-4">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Delivery Data Upload
                    </CardTitle>
                    <CardDescription>Upload Petpooja Excel reports (Itemwise & Summary) to combine with website analytics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Period Label</Label>
                      <Input id="deliveryPeriodLabel" placeholder="e.g., January 2026" defaultValue={`${new Date(startDate).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`} />
                    </div>
                    <div>
                      <Label>Itemwise Sales Excel</Label>
                      <Input id="itemwiseFile" type="file" accept=".xlsx,.xls,.csv" />
                    </div>
                    <div>
                      <Label>Summary Sales Excel</Label>
                      <Input id="summaryFile" type="file" accept=".xlsx,.xls,.csv" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button 
                      disabled={uploadingDelivery}
                      onClick={async () => {
                        setUploadingDelivery(true);
                        setUploadMessage('');
                        try {
                          const periodLabel = (document.getElementById('deliveryPeriodLabel') as HTMLInputElement)?.value;
                          const itemwiseInput = document.getElementById('itemwiseFile') as HTMLInputElement;
                          const summaryInput = document.getElementById('summaryFile') as HTMLInputElement;
                          
                          if (!periodLabel) { setUploadMessage('Please enter a period label'); setUploadingDelivery(false); return; }
                          if (!itemwiseInput?.files?.[0] && !summaryInput?.files?.[0]) { setUploadMessage('Please select at least one file'); setUploadingDelivery(false); return; }

                          // Send files as multipart form data — server parses with ExcelJS
                          const formData = new FormData();
                          formData.append('periodLabel', periodLabel);
                          formData.append('periodStart', startDate);
                          formData.append('periodEnd', endDate);
                          if (itemwiseInput?.files?.[0]) formData.append('itemwiseFile', itemwiseInput.files[0]);
                          if (summaryInput?.files?.[0]) formData.append('summaryFile', summaryInput.files[0]);

                          const response = await fetch('/api/delivery/upload', {
                            method: 'POST',
                            credentials: 'include',
                            body: formData,
                          });
                          
                          const result = await response.json();
                          if (result.success) {
                            setUploadMessage(`Uploaded ${result.itemCount} items for ${periodLabel}. ${result.updated ? 'Updated existing data.' : 'New period added.'}`);
                            refetchChannels();
                            refetchPeriods();
                          } else {
                            setUploadMessage(`Error: ${result.error}`);
                          }
                        } catch (err: any) {
                          setUploadMessage(`Error: ${err.message}`);
                        } finally {
                          setUploadingDelivery(false);
                        }
                      }}
                    >
                      {uploadingDelivery ? 'Processing...' : 'Upload & Process'}
                    </Button>
                    {uploadMessage && (
                      <span className={`text-sm ${uploadMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {uploadMessage}
                      </span>
                    )}
                  </div>
                  {channelData?.deliveryPeriods && channelData.deliveryPeriods.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Delivery data loaded for: {channelData.deliveryPeriods.join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Period Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  View Period
                </CardTitle>
                <CardDescription>Select a time period to view channel analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={channelPeriod === 'current' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChannelPeriod('current')}
                  >
                    Current Range ({startDate} to {endDate})
                  </Button>
                  <Button
                    variant={channelPeriod === 'all_time' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChannelPeriod('all_time')}
                  >
                    All Time
                  </Button>
                  <Button
                    variant={channelPeriod === 'ytd' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChannelPeriod('ytd')}
                  >
                    Year to Date ({new Date().getFullYear()})
                  </Button>
                  {deliveryPeriods && deliveryPeriods.length > 0 && (
                    <Select value={channelPeriod.match(/^\d+$/) ? channelPeriod : ''} onValueChange={(val) => setChannelPeriod(val)}>
                      <SelectTrigger className="w-[220px] h-9">
                        <SelectValue placeholder="Select uploaded period..." />
                      </SelectTrigger>
                      <SelectContent>
                        {deliveryPeriods.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.periodLabel} ({p.totalOrders} orders)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Showing data from <span className="font-medium">{channelStartDate}</span> to <span className="font-medium">{channelEndDate}</span>
                </div>
              </CardContent>
            </Card>

            {/* Upload History */}
            {deliveryPeriods && deliveryPeriods.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Upload History
                  </CardTitle>
                  <CardDescription>All uploaded Petpooja data periods — click to view</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Period</th>
                          <th className="text-right py-2 font-medium">Delivery Orders</th>
                          <th className="text-right py-2 font-medium">Zomato</th>
                          <th className="text-right py-2 font-medium">Swiggy</th>
                          <th className="text-right py-2 font-medium">Dine-in</th>
                          <th className="text-right py-2 font-medium">Petpooja Total</th>
                          <th className="text-right py-2 font-medium">Website</th>
                          <th className="text-right py-2 font-medium font-bold">Grand Total</th>
                          <th className="text-right py-2 font-medium">Uploaded</th>
                          <th className="text-center py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryPeriods.map((p) => (
                          <tr 
                            key={p.id} 
                            className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                              channelPeriod === String(p.id) ? 'bg-primary/5 font-medium' : ''
                            }`}
                            onClick={() => setChannelPeriod(String(p.id))}
                          >
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                {channelPeriod === String(p.id) && (
                                  <span className="w-2 h-2 rounded-full bg-primary" />
                                )}
                                {p.periodLabel}
                              </div>
                            </td>
                            <td className="text-right py-2">{p.totalOrders}</td>
                            <td className="text-right py-2 text-red-600">{p.zomatoOrders || 0}</td>
                            <td className="text-right py-2 text-orange-600">{p.swiggyOrders || 0}</td>
                            <td className="text-right py-2 text-gray-600">{p.dineInOrders || 0}</td>
                            <td className="text-right py-2">
                              ₹{((p.grandTotal || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </td>
                            <td className="text-right py-2 text-blue-600">
                              {p.websiteOrders ? `${p.websiteOrders} ord · ` : ''}₹{((p.websiteAmount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </td>
                            <td className="text-right py-2 font-bold">
                              ₹{((p.combinedTotal || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </td>
                            <td className="text-right py-2 text-muted-foreground text-xs">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="text-center py-2">
                              <Button
                                variant={channelPeriod === String(p.id) ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => { e.stopPropagation(); setChannelPeriod(String(p.id)); }}
                              >
                                {channelPeriod === String(p.id) ? 'Viewing' : 'View'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Channel Overview */}
            {loadingChannels ? (
              <div className="text-center py-8 text-muted-foreground">Loading channel data...</div>
            ) : channelData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Revenue (All Channels)</div>
                      <div className="text-2xl font-bold mt-1">₹{(channelData.totalRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                      <div className="text-xs text-muted-foreground mt-1">{channelData.totalOrders} orders</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Average Order Value</div>
                      <div className="text-2xl font-bold mt-1">₹{channelData.totalOrders > 0 ? Math.round(channelData.totalRevenue / channelData.totalOrders / 100).toLocaleString('en-IN') : '0'}</div>
                      <div className="text-xs text-muted-foreground mt-1">Across all channels</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Active Channels</div>
                      <div className="text-2xl font-bold mt-1">{channelData.channels.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">{channelData.hasDeliveryData ? 'Delivery data included' : 'Upload delivery data for full picture'}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Channel Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Channel</CardTitle>
                    <CardDescription>Breakdown of revenue across all sales channels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {channelData.channels.map((channel, idx) => {
                        const pct = channelData.totalRevenue > 0 ? (channel.revenue / channelData.totalRevenue * 100) : 0;
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channel.color }} />
                                <span className="font-medium">{channel.name}</span>
                                <Badge variant="outline" className="text-xs">{channel.orders} orders</Badge>
                              </div>
                              <div className="text-right">
                                <span className="font-bold">₹{(channel.revenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                                <span className="text-muted-foreground text-sm ml-2">({pct.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3">
                              <div 
                                className="h-3 rounded-full transition-all" 
                                style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: channel.color }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>AOV: ₹{(channel.avgOrderValue / 100).toLocaleString('en-IN')}</span>
                              {channel.gst > 0 && <span>GST: ₹{(channel.gst / 100).toLocaleString('en-IN')}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Product Comparison Across Channels */}
                {channelData.productComparison.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Performance Across Channels</CardTitle>
                      <CardDescription>Top products compared: Website vs Delivery platforms</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 font-medium">Product</th>
                              <th className="text-left py-2 font-medium">Category</th>
                              <th className="text-right py-2 font-medium">Website Qty</th>
                              <th className="text-right py-2 font-medium">Delivery Qty</th>
                              <th className="text-right py-2 font-medium">Total Qty</th>
                              <th className="text-right py-2 font-medium">Total Revenue</th>
                              <th className="text-center py-2 font-medium">Channel Split</th>
                            </tr>
                          </thead>
                          <tbody>
                            {channelData.productComparison.map((product, idx) => (
                              <tr key={idx} className="border-b hover:bg-muted/50">
                                <td className="py-2 font-medium">{product.name}</td>
                                <td className="py-2 text-muted-foreground">{product.category}</td>
                                <td className="py-2 text-right">{product.websiteQty}</td>
                                <td className="py-2 text-right">{product.deliveryQty}</td>
                                <td className="py-2 text-right font-medium">{product.totalQty}</td>
                                <td className="py-2 text-right">₹{(product.totalRevenue / 100).toLocaleString('en-IN')}</td>
                                <td className="py-2">
                                  <div className="flex items-center gap-1">
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
                                      <div className="h-full bg-amber-700" style={{ width: `${product.websiteShare}%` }} />
                                      <div className="h-full bg-red-500" style={{ width: `${product.deliveryShare}%` }} />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-16 text-right">
                                      {product.websiteShare}:{product.deliveryShare}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><div className="w-3 h-2 bg-amber-700 rounded" /> Website</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-2 bg-red-500 rounded" /> Delivery</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cross-Channel Insights */}
                {channelData.insights.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        Cross-Channel Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {channelData.insights.map((insight, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <TrendingUp className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" />
                            <p className="text-sm">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!channelData.hasDeliveryData && (
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="text-center py-4">
                        <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Upload your Petpooja delivery reports above to see combined channel analytics including Zomato and Swiggy data.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <PredictionsTab />
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
                    onClick={async () => {
                      try {
                        const url = `/api/export/sales-report?startDate=${startDate}&endDate=${endDate}`;
                        const response = await fetch(url, { credentials: 'include' });
                        if (!response.ok) throw new Error('Export failed');
                        const blob = await response.blob();
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = `Taiwan_Maami_GST_Report_${startDate}_to_${endDate}.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(downloadUrl);
                      } catch (err) {
                        alert('Failed to export GST report. Please try again.');
                      }
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
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
