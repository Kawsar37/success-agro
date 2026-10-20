"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isSalesOfficer } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Automatically close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
        return;
      }

      // Sales Officer route protection: strictly barred from non-sales modules
      if (isSalesOfficer) {
        const allowedPrefixes = ["/orders", "/dealers", "/collections"];
        const isAllowed = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
        if (!isAllowed) {
          router.push("/orders");
        }
      }

      // Delivery Man route protection: strictly barred from non-dispatch modules
      if (user?.role === "DeliveryMan") {
        const allowedPrefixes = ["/invoices", "/dealers"];
        const isAllowed = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
        if (!isAllowed) {
          router.push("/invoices");
        }
      }
    }
  }, [user, isLoading, isSalesOfficer, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 print:bg-white print:block print:min-h-0">
      <div className="print:hidden">
        <Sidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 print:block print:w-full">
        <div className="print:hidden">
          <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
        </div>
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto print:p-0 print:m-0 print:overflow-visible print:w-full print:block min-w-0">{children}</main>
      </div>
    </div>
  );
};
