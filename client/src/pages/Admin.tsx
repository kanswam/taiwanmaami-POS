import { useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/_core/hooks/useAuth';
import { 
  Home, Package, ShoppingCart, Tag, LogOut, Plus,
  ChevronDown, UtensilsCrossed, AlertCircle, DollarSign, CreditCard, Users,
  Settings, Layers, TrendingUp, Calendar, Ticket, Mail, Printer,
  ClipboardList, BarChart3, BookOpen, Star, Bot, Crown, MapPin, FileText, Download, Upload, History, Clock, RotateCcw
} from 'lucide-react';
import OutletAvailabilityTab from '@/components/OutletAvailabilityTab';
import HomepageSettingsTab from '@/components/HomepageSettingsTab';
import { BotAnalyticsTab } from '@/components/BotAnalyticsTab';

// Lazy-loaded admin tab components
const ProductsTab = lazy(() => import('./admin/tabs/ProductsTab'));
const CategoriesTab = lazy(() => import('./admin/tabs/CategoriesTab'));
const OrdersTab = lazy(() => import('./admin/tabs/OrdersTab'));
const TablesTab = lazy(() => import('./admin/tabs/TablesTab'));
const AddonsTab = lazy(() => import('./admin/tabs/AddonsTab'));
const DiscountsTab = lazy(() => import('./admin/tabs/DiscountsTab'));
const BulkUploadTab = lazy(() => import('./admin/tabs/BulkUploadTab'));
const ReviewsTab = lazy(() => import('./admin/tabs/ReviewsTab'));
const ComplaintsTab = lazy(() => import('./admin/tabs/ComplaintsTab'));
const CustomersTab = lazy(() => import('./admin/tabs/CustomersTab'));
const FoodScheduleTab = lazy(() => import('./admin/tabs/FoodScheduleTab'));
const SiteSettingsTab = lazy(() => import('./admin/tabs/SiteSettingsTab'));
const BulkPricingTab = lazy(() => import('./admin/tabs/BulkPricingTab'));
const KOTReportsTab = lazy(() => import('./admin/tabs/KOTReportsTab'));
const AuditTab = lazy(() => import('./admin/tabs/AuditTab'));
const CMSTab = lazy(() => import('./admin/tabs/CMSTab'));
const AdminPinTab = lazy(() => import('./admin/tabs/AdminPinTab'));
const RefundsTab = lazy(() => import('./admin/tabs/RefundsTab'));
const PaymentReportTab = lazy(() => import('./admin/tabs/PaymentReportTab'));
const EventInquiriesTab = lazy(() => import('./admin/tabs/EventInquiriesTab'));
const EventOrdersTab = lazy(() => import('./admin/tabs/EventOrdersTab'));
const WorkshopsTab = lazy(() => import('./admin/tabs/WorkshopsTab'));
const WorkshopBookingsTab = lazy(() => import('./admin/tabs/WorkshopBookingsTab'));
const BackupTab = lazy(() => import('./admin/tabs/BackupTab'));
const ReconciliationTab = lazy(() => import('./admin/tabs/ReconciliationTab'));
const LeelaRegistrationsTab = lazy(() => import('./admin/tabs/LeelaRegistrationsTab'));

// Loading fallback for tabs
function TabLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab('outlet-availability')} className={activeTab === 'outlet-availability' ? 'bg-accent' : ''}>
                  <MapPin className="w-4 h-4 mr-2" /> Outlet Availability
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

            {/* Events & Workshops */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={['event-inquiries', 'event-orders', 'workshops', 'workshop-bookings', 'leela-registrations'].includes(activeTab) ? 'default' : 'outline'} 
                  size="sm" 
                  className={`gap-2 ${!['event-inquiries', 'event-orders', 'workshops', 'workshop-bookings', 'leela-registrations'].includes(activeTab) ? 'border-transparent hover:bg-accent' : ''}`}
                >
                  <Calendar className="w-4 h-4" />
                  Events
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setActiveTab('event-inquiries')} className={activeTab === 'event-inquiries' ? 'bg-accent' : ''}>
                  <Mail className="w-4 h-4 mr-2" /> Event Inquiries
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('event-orders')} className={activeTab === 'event-orders' ? 'bg-accent' : ''}>
                  <ClipboardList className="w-4 h-4 mr-2" /> Event Orders
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab('workshops')} className={activeTab === 'workshops' ? 'bg-accent' : ''}>
                  <BookOpen className="w-4 h-4 mr-2" /> Workshops
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('workshop-bookings')} className={activeTab === 'workshop-bookings' ? 'bg-accent' : ''}>
                  <Ticket className="w-4 h-4 mr-2" /> Workshop Bookings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab('leela-registrations')} className={activeTab === 'leela-registrations' ? 'bg-accent' : ''}>
                  <Star className="w-4 h-4 mr-2" /> Leela Registrations
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
                  variant={['analytics', 'audit', 'payment-report', 'reconciliation', 'bot-analytics'].includes(activeTab) ? 'default' : 'outline'} 
                  size="sm" 
                  className={`gap-2 ${!['analytics', 'audit', 'payment-report', 'reconciliation', 'bot-analytics'].includes(activeTab) ? 'border-transparent hover:bg-accent' : ''}`}
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
                <DropdownMenuItem onClick={() => setActiveTab('bot-analytics')} className={activeTab === 'bot-analytics' ? 'bg-accent' : ''}>
                  <Bot className="w-4 h-4 mr-2" /> Bot Analytics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab('reconciliation')} className={activeTab === 'reconciliation' ? 'bg-accent' : ''}>
                  <AlertCircle className="w-4 h-4 mr-2" /> Razorpay Reconciliation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings & Tools */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={['settings', 'bulk-upload', 'cms', 'admin-pin', 'refunds', 'homepage-settings', 'food-schedule'].includes(activeTab) ? 'default' : 'outline'} 
                  size="sm" 
                  className={`gap-2 ${!['settings', 'bulk-upload', 'cms', 'admin-pin', 'refunds', 'backup', 'homepage-settings', 'food-schedule'].includes(activeTab) ? 'border-transparent hover:bg-accent' : ''}`}
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
                <DropdownMenuItem onClick={() => setActiveTab('food-schedule')} className={activeTab === 'food-schedule' ? 'bg-accent' : ''}>
                  <Clock className="w-4 h-4 mr-2" /> Food Schedule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('homepage-settings')} className={activeTab === 'homepage-settings' ? 'bg-accent' : ''}>
                  <Home className="w-4 h-4 mr-2" /> Homepage Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('cms')} className={activeTab === 'cms' ? 'bg-accent' : ''}>
                  <FileText className="w-4 h-4 mr-2" /> Content Pages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/blog')}>
                  <BookOpen className="w-4 h-4 mr-2" /> Blog Management
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('admin-pin')} className={activeTab === 'admin-pin' ? 'bg-accent' : ''}>
                  <CreditCard className="w-4 h-4 mr-2" /> Admin PIN
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('refunds')} className={activeTab === 'refunds' ? 'bg-accent' : ''}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Refund Requests
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('backup')} className={activeTab === 'backup' ? 'bg-accent' : ''}>
                  <History className="w-4 h-4 mr-2" /> Database Backup
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab('bulk-upload')} className={activeTab === 'bulk-upload' ? 'bg-accent' : ''}>
                  <Upload className="w-4 h-4 mr-2" /> Bulk Upload
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin/wholesale')}>
                  <Package className="w-4 h-4 mr-2" /> Wholesale Portal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/partners')}>
                  <Crown className="w-4 h-4 mr-2" /> Partner Programme
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>

          <TabsContent value="products">
            <Suspense fallback={<TabLoader />}><ProductsTab /></Suspense>
          </TabsContent>

          <TabsContent value="categories">
            <Suspense fallback={<TabLoader />}><CategoriesTab /></Suspense>
          </TabsContent>

          <TabsContent value="orders">
            <Suspense fallback={<TabLoader />}><OrdersTab /></Suspense>
          </TabsContent>

          <TabsContent value="tables">
            <Suspense fallback={<TabLoader />}><TablesTab /></Suspense>
          </TabsContent>

          <TabsContent value="addons">
            <Suspense fallback={<TabLoader />}><AddonsTab /></Suspense>
          </TabsContent>

          <TabsContent value="discounts">
            <Suspense fallback={<TabLoader />}><DiscountsTab /></Suspense>
          </TabsContent>



          <TabsContent value="bulk-upload">
            <Suspense fallback={<TabLoader />}><BulkUploadTab /></Suspense>
          </TabsContent>

          <TabsContent value="reviews">
            <Suspense fallback={<TabLoader />}><ReviewsTab /></Suspense>
          </TabsContent>

          <TabsContent value="complaints">
            <Suspense fallback={<TabLoader />}><ComplaintsTab /></Suspense>
          </TabsContent>

          <TabsContent value="customers">
            <Suspense fallback={<TabLoader />}><CustomersTab /></Suspense>
          </TabsContent>

          <TabsContent value="settings">
            <Suspense fallback={<TabLoader />}><SiteSettingsTab /></Suspense>
          </TabsContent>
          <TabsContent value="food-schedule">
            <Suspense fallback={<TabLoader />}><FoodScheduleTab /></Suspense>
          </TabsContent>

          <TabsContent value="bulk-pricing">
            <Suspense fallback={<TabLoader />}><BulkPricingTab /></Suspense>
          </TabsContent>

          <TabsContent value="kot-reports">
            <Suspense fallback={<TabLoader />}><KOTReportsTab /></Suspense>
          </TabsContent>

          <TabsContent value="audit">
            <Suspense fallback={<TabLoader />}><AuditTab /></Suspense>
          </TabsContent>

          <TabsContent value="cms">
            <Suspense fallback={<TabLoader />}><CMSTab /></Suspense>
          </TabsContent>

          <TabsContent value="admin-pin">
            <Suspense fallback={<TabLoader />}><AdminPinTab /></Suspense>
          </TabsContent>

          <TabsContent value="refunds">
            <Suspense fallback={<TabLoader />}><RefundsTab /></Suspense>
          </TabsContent>

          <TabsContent value="payment-report">
            <Suspense fallback={<TabLoader />}><PaymentReportTab /></Suspense>
          </TabsContent>

          <TabsContent value="reconciliation">
            <Suspense fallback={<TabLoader />}><ReconciliationTab /></Suspense>
          </TabsContent>

          <TabsContent value="bot-analytics">
            <BotAnalyticsTab />
          </TabsContent>

          <TabsContent value="event-inquiries">
            <Suspense fallback={<TabLoader />}><EventInquiriesTab /></Suspense>
          </TabsContent>

          <TabsContent value="event-orders">
            <Suspense fallback={<TabLoader />}><EventOrdersTab /></Suspense>
          </TabsContent>

          <TabsContent value="workshops">
            <Suspense fallback={<TabLoader />}><WorkshopsTab /></Suspense>
          </TabsContent>

          <TabsContent value="workshop-bookings">
            <Suspense fallback={<TabLoader />}><WorkshopBookingsTab /></Suspense>
          </TabsContent>

          <TabsContent value="leela-registrations">
            <Suspense fallback={<TabLoader />}><LeelaRegistrationsTab /></Suspense>
          </TabsContent>

          <TabsContent value="homepage-settings">
            <HomepageSettingsTab />
          </TabsContent>

          <TabsContent value="backup">
            <Suspense fallback={<TabLoader />}><BackupTab /></Suspense>
          </TabsContent>

          <TabsContent value="outlet-availability">
            <OutletAvailabilityTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Products Tab
