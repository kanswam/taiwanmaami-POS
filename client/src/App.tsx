import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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

function Router() {
  return (
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
      
      {/* Content Pages */}
      <Route path="/about" component={About} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/refund" component={Refund} />
      <Route path="/complaint" component={Complaint} />
      <Route path="/testimonials" component={Testimonials} />
      <Route path="/franchise" component={Franchise} />
      
      {/* Admin Routes */}
      <Route path="/staff/orders" component={StaffOrders} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/analytics" component={Analytics} />
      
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
