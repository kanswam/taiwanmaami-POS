import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";

// Pages
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderTracking from "./pages/OrderTracking";
import Orders from "./pages/Orders";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import Admin from "./pages/Admin";
import StaffOrders from "./pages/StaffOrders";
import MenuCategories from "./pages/MenuCategories";
import CategorySubcategories from "./pages/CategorySubcategories";
import Analytics from "./pages/Analytics";
import Complaint from "./pages/Complaint";
import Testimonials from "./pages/Testimonials";
import Franchise from "./pages/Franchise";
import Shipping from "./pages/Shipping";
import FAQ from "./pages/FAQ";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import Events from "./pages/Events";
import Profile from "./pages/Profile";
import AdminEvents from "./pages/AdminEvents";
import AdminBlog from "./pages/AdminBlog";
import { CookieConsent } from "./components/CookieConsent";
import { WhatsAppButton } from "./components/WhatsAppButton";
import { BirthdayPromptWrapper } from "./components/BirthdayPromptWrapper";
import { WholesaleAuthProvider } from "./contexts/WholesaleAuthContext";

// Wholesale Pages
import WholesaleLanding from "./pages/wholesale/WholesaleLanding";
import WholesaleLogin from "./pages/wholesale/WholesaleLogin";
import WholesaleRegister from "./pages/wholesale/WholesaleRegister";
import WholesaleProducts from "./pages/wholesale/WholesaleProducts";
import WholesaleCart from "./pages/wholesale/WholesaleCart";
import WholesaleOrders from "./pages/wholesale/WholesaleOrders";
import WholesaleAdmin from "./pages/admin/WholesaleAdmin";

// Scroll to top on route change
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
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
      <Route path="/admin/events" component={AdminEvents} />
      <Route path="/admin/blog" component={AdminBlog} />
      <Route path="/admin/wholesale" component={WholesaleAdmin} />
      
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
            <WhatsAppButton />
          </TooltipProvider>
        </CartProvider>
        </WholesaleAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
