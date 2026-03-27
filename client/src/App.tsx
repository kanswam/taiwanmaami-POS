import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";

// Lightweight pages - loaded eagerly (small bundle impact)
import Home from "./pages/Home";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import Complaint from "./pages/Complaint";
import Testimonials from "./pages/Testimonials";
import Franchise from "./pages/Franchise";
import Shipping from "./pages/Shipping";
import FAQ from "./pages/FAQ";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import Partner from "./pages/Partner";

// Heavy pages - lazy loaded (large bundle impact)
const Menu = lazy(() => import("./pages/Menu"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Orders = lazy(() => import("./pages/Orders"));
const Profile = lazy(() => import("./pages/Profile"));
const Events = lazy(() => import("./pages/Events"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const MenuCategories = lazy(() => import("./pages/MenuCategories"));
const CategorySubcategories = lazy(() => import("./pages/CategorySubcategories"));

// Admin pages - lazy loaded (very large)
const Admin = lazy(() => import("./pages/Admin"));
const StaffOrders = lazy(() => import("./pages/StaffOrders"));
const Analytics = lazy(() => import("./pages/Analytics"));
const WebTraffic = lazy(() => import("./pages/WebTraffic"));
const AdminEvents = lazy(() => import("./pages/AdminEvents"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const WholesaleAdmin = lazy(() => import("./pages/admin/WholesaleAdmin"));
const AdminPartners = lazy(() => import("./pages/admin/AdminPartners"));

// Wholesale pages - lazy loaded
const WholesaleLanding = lazy(() => import("./pages/wholesale/WholesaleLanding"));
const WholesaleLogin = lazy(() => import("./pages/wholesale/WholesaleLogin"));
const WholesaleRegister = lazy(() => import("./pages/wholesale/WholesaleRegister"));
const WholesaleProducts = lazy(() => import("./pages/wholesale/WholesaleProducts"));
const WholesaleCart = lazy(() => import("./pages/wholesale/WholesaleCart"));
const WholesaleOrders = lazy(() => import("./pages/wholesale/WholesaleOrders"));

import { CookieConsent } from "./components/CookieConsent";
import { VoiceChatWidget } from "./components/VoiceChatWidget";
import { usePageTracking } from "./hooks/usePageTracking";
import { BirthdayPromptWrapper } from "./components/BirthdayPromptWrapper";
import { WholesaleAuthProvider } from "./contexts/WholesaleAuthContext";

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Scroll to top on route change
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

// Track pageviews for analytics
function PageTracker() {
  usePageTracking();
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <PageTracker />
      <Suspense fallback={<PageLoader />}>
        <Switch>
        {/* Public Routes */}
        <Route path="/" component={Home} />
        <Route path="/menu" component={Menu} />
        <Route path="/categories" component={MenuCategories} />
        <Route path="/category/:category" component={CategorySubcategories} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/order-confirmation/:orderId" component={OrderConfirmation} />
        <Route path="/track" component={OrderTracking} />
        <Route path="/orders" component={Orders} />
        <Route path="/profile" component={Profile} />
        <Route path="/partner" component={Partner} />
        <Route path="/partner/dashboard" component={PartnerDashboard} />
        <Route path="/events" component={Events} />
        
        {/* Content Pages */}
        <Route path="/about" component={About} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/refund" component={Refund} />
        <Route path="/complaint" component={Complaint} />
        <Route path="/testimonials" component={Testimonials} />
        <Route path="/franchise" component={Franchise} />
        <Route path="/shipping" component={Shipping} />
        <Route path="/faq" component={FAQ} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:id" component={BlogArticle} />
        
        {/* Wholesale Routes */}
        <Route path="/wholesale" component={WholesaleLanding} />
        <Route path="/wholesale/login" component={WholesaleLogin} />
        <Route path="/wholesale/register" component={WholesaleRegister} />
        <Route path="/wholesale/products" component={WholesaleProducts} />
        <Route path="/wholesale/cart" component={WholesaleCart} />
        <Route path="/wholesale/orders" component={WholesaleOrders} />
        
        {/* Admin Routes */}
        <Route path="/staff/orders" component={StaffOrders} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/analytics" component={Analytics} />
        <Route path="/admin/traffic" component={WebTraffic} />
        <Route path="/admin/events" component={AdminEvents} />
        <Route path="/admin/blog" component={AdminBlog} />
        <Route path="/admin/wholesale" component={WholesaleAdmin} />
        <Route path="/admin/partners" component={AdminPartners} />
        
        {/* Fallback */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <WholesaleAuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <CookieConsent />
            <BirthdayPromptWrapper />
            <VoiceChatWidget />
          </TooltipProvider>
        </CartProvider>
        </WholesaleAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
