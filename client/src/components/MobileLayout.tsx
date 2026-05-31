import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  ArrowRightLeft,
  FlameKindling,
  Settings,
  LogOut,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { AdminDrawer } from "./AdminDrawer";

const mainNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/outlet-stock-take", icon: ClipboardList, label: "Stock Take" },
  { href: "/receive/new", icon: Package, label: "Receive" },
  { href: "/issue", icon: ArrowRightLeft, label: "Issue" },
  { href: "/production", icon: FlameKindling, label: "Production" },
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, navigate] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();
  const utils = trpc.useUtils();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const handleSignOut = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        utils.auth.me.invalidate();
        window.location.href = "/";
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm h-[52px] md:h-14 flex items-center px-4 shrink-0">
        {/* Left: Brand (mobile only) */}
        <div className="flex-1 md:hidden">
          <div className="text-sm font-bold text-gray-900 leading-tight">
            Thamarai Foods
          </div>
          <div className="text-[10px] text-gray-400 leading-tight">
            Inventory System
          </div>
        </div>

        {/* Desktop spacer */}
        <div className="hidden md:block flex-1" />

        {/* Right: Gear + Avatar */}
        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Admin menu"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
          )}

          {/* Avatar with dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-bold hover:bg-teal-200 transition-colors"
            >
              {user?.name?.charAt(0) || "?"}
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                >
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.email || ""}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop: Sign out text link */}
          <button
            onClick={handleSignOut}
            className="hidden md:block text-sm text-gray-500 hover:text-gray-700 transition-colors ml-1"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>

      {/* ── Bottom nav — MOBILE ONLY ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center justify-around h-16">
          {mainNavItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/" ? location === "/" : location.startsWith(href);
            return (
              <button
                key={href}
                onClick={() => navigate(href)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 min-h-[56px] gap-0.5 transition-all",
                  isActive && "bg-teal-50 rounded-t-lg"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all",
                    isActive ? "text-teal-600 scale-110" : "text-gray-400"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] transition-all",
                    isActive
                      ? "text-teal-600 font-semibold"
                      : "text-gray-400"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 md:hidden shrink-0" />

      {/* ── Admin Drawer ── */}
      <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}