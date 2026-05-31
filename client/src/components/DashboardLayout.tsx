import { useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  ArrowRightLeft,
  FlameKindling,
  ShoppingCart,
  BarChart3,
  Wrench,
  Receipt,
  Truck,
  Users,
  BookOpen,
  Settings,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const coreNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/outlet-stock-take", icon: ClipboardList, label: "Stock Take" },
  { href: "/receive/new", icon: Package, label: "Receive" },
  { href: "/issue", icon: ArrowRightLeft, label: "Issue" },
  { href: "/production", icon: FlameKindling, label: "Production" },
];

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();
  const utils = trpc.useUtils();

  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        utils.auth.me.invalidate();
        window.location.href = "/";
      },
    });
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="hidden md:flex h-screen bg-gray-50">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "bg-white border-r border-gray-200 flex flex-col transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Header: Logo + Toggle */}
        <div className="flex items-center gap-2 px-3 h-14 border-b border-gray-100 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="w-4 h-4 text-gray-500" />
          </button>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/114675165/duVAiyDqAsEnfQtX.jpg"
                alt="Thamarai Foods"
                className="h-7 w-auto object-contain rounded"
              />
              <span className="text-sm font-bold text-gray-900 truncate">
                Thamarai Foods
              </span>
            </div>
          )}
        </div>

        {/* ── Core nav items ── */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <ul className="space-y-0.5">
            {coreNavItems.map(({ href, icon: Icon, label }) => {
              const isActive =
                href === "/"
                  ? location === "/"
                  : location.startsWith(href);
              return (
                <li key={href}>
                  <NavButton
                    href={href}
                    icon={<Icon className="w-5 h-5 shrink-0" />}
                    label={label}
                    isActive={isActive}
                    collapsed={collapsed}
                  />
                </li>
              );
            })}
          </ul>

          {/* ── Separator + Admin section ── */}
          {isAdmin && (
            <>
              <div className="my-2 border-t border-gray-200" />
              {!collapsed && (
                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Admin
                </p>
              )}
              <ul className="space-y-0.5">
                {adminNavItems.map(({ href, icon: Icon, label }) => {
                  const isActive =
                    href === "/"
                      ? location === "/"
                      : location.startsWith(href);
                  return (
                    <li key={href}>
                      <NavButton
                        href={href}
                        icon={<Icon className="w-5 h-5 shrink-0" />}
                        label={label}
                        isActive={isActive}
                        collapsed={collapsed}
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>

        {/* ── Footer: Avatar + Sign out ── */}
        <div className="border-t border-gray-200 p-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-bold shrink-0">
              {user?.name?.charAt(0) || "?"}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.email || ""}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

/* ── Sub-component: individual nav button ── */
function NavButton({
  href,
  icon,
  label,
  isActive,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  collapsed: boolean;
}) {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(href)}
      title={collapsed ? label : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-teal-50 text-teal-600 font-medium"
          : "text-gray-500 hover:bg-gray-50"
      )}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}