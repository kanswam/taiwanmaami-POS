import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  BarChart3,
  Wrench,
  Receipt,
  Package,
  Truck,
  Users,
  BookOpen,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/purchase-orders", icon: ShoppingCart, label: "Purchase Orders" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/assets", icon: Wrench, label: "Assets" },
  { href: "/direct-expenses", icon: Receipt, label: "Direct Expenses" },
  { href: "/items", icon: Package, label: "Item Master" },
  { href: "/suppliers", icon: Truck, label: "Suppliers" },
  { href: "/staff", icon: Users, label: "Staff Management" },
  { href: "/audit-ledger", icon: BookOpen, label: "Audit Ledger" },
  { href: "/production/manager", icon: Settings, label: "Production Manager" },
];

interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AdminDrawer({ open, onClose }: AdminDrawerProps) {
  const [location, navigate] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const utils = trpc.useUtils();

  const handleNavigate = (href: string) => {
    navigate(href);
    onClose();
  };

  const handleSignOut = async () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        utils.auth.me.invalidate();
        navigate("/");
        onClose();
      },
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 right-0 bottom-0 w-[280px] bg-white z-50 shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 shrink-0">
              <span className="text-lg font-bold text-gray-900">Admin</span>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-2">
              {adminNavItems.map(({ href, icon: Icon, label }) => {
                const isActive =
                  href === "/"
                    ? location === "/"
                    : location.startsWith(href);
                return (
                  <button
                    key={href}
                    onClick={() => handleNavigate(href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 h-12 text-sm transition-colors",
                      isActive
                        ? "text-teal-600 bg-teal-50 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Sign Out */}
            <div className="border-t border-gray-200 p-4 shrink-0">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 h-12 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}