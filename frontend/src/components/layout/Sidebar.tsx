"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Users,
  Package,
  Boxes,
  Factory,
  CreditCard,
  DollarSign,
  BookOpen,
  Receipt,
  UserCheck,
  BarChart3,
  Settings,
  Sprout,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  salesOfficerAllowed?: boolean;
  deliveryManAllowed?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, salesOfficerAllowed: true },
  { label: "Sales Orders", href: "/orders", icon: ShoppingCart, salesOfficerAllowed: true },
  { label: "Dealers Network", href: "/dealers", icon: Users, salesOfficerAllowed: true },
  { label: "Dealer Ledger", href: "/ledger", icon: BookOpen },
  { label: "Dealer Collections", href: "/collections", icon: DollarSign, salesOfficerAllowed: true },
  { label: "Agro Products", href: "/products", icon: Package },
  { label: "Cash & Bank Accounts", href: "/accounts", icon: CreditCard },
  { label: "Staff & Users", href: "/employees", icon: UserCheck },
  { label: "System Config", href: "/system", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, isSalesOfficer, isDeliveryMan } = useAuth();

  // Query pending collection count for Admin badge
  const { data: pendingData } = useQuery({
    queryKey: ["pending-collections-count"],
    queryFn: async () => {
      try {
        const res = await api.get("/accounts/collections/pending-count");
        return res.data.data;
      } catch (e) {
        return { pendingCount: 0 };
      }
    },
    enabled: !!user && (user.role === "Admin" || user.role === "ManagingDirector"),
    refetchInterval: 15000,
  });

  const filteredNav = navItems.filter((item) => {
    if (isSalesOfficer) {
      return item.salesOfficerAllowed === true;
    }
    if (isDeliveryMan) {
      return item.deliveryManAllowed === true;
    }
    return true;
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/50">
          <Sprout className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight tracking-tight">SUCCESS AGRO</h1>
          <p className="text-[11px] text-emerald-400 font-medium">ERP Management</p>
        </div>
      </div>

      {/* Role Badge Indicator */}
      <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-800/60">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Current Role:</span>
          <span className="font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
            {user?.role || "User"}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const showPendingBadge =
            item.href === "/collections" &&
            (user?.role === "Admin" || user?.role === "ManagingDirector") &&
            (pendingData?.pendingCount ?? 0) > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
              <span className="truncate">{item.label}</span>
              {showPendingBadge && (
                <span
                  title={`${pendingData?.pendingCount} collections pending verification`}
                  className="ml-auto text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full shadow-sm animate-pulse"
                >
                  {pendingData?.pendingCount} Pending
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="truncate mr-2">
          <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
          <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          title="Logout"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
