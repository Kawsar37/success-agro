"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBDT, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Factory,
  Boxes,
  Users,
  ShoppingCart,
  FileCheck,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const res = await api.get("/reports/dashboard-metrics");
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  const metrics = metricsData?.metrics || {};
  const recentInvoices = metricsData?.recentInvoices || [];
  const accounts = metricsData?.accounts || [];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Live operations & financial health across Bangladesh
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/orders"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Review Sales Orders</span>
            </Link>
          </div>
        </div>

        {/* Financial & Operational KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Monthly Sales (Turnover)"
            value={formatBDT(metrics.monthlySales || 0)}
            subtitle="Current calendar month"
            icon={TrendingUp}
            trend="+14.2%"
            trendPositive={true}
          />
          <StatCard
            title="Total Dealer Due (Receivables)"
            value={formatBDT(metrics.totalReceivables || 0)}
            subtitle="Across all dealer network"
            icon={AlertTriangle}
          />
          <StatCard
            title="Liquid Cash & Bank Reserves"
            value={formatBDT(metrics.totalCashBank || 0)}
            subtitle="Active company accounts"
            icon={CreditCard}
          />
          <StatCard
            title="Est. Gross Profit (Agro Margin)"
            value={formatBDT(metrics.grossProfit || 0)}
            subtitle="Based on formulation pricing"
            icon={FileCheck}
            trend="+8.5%"
            trendPositive={true}
          />
        </div>

        {/* Operational Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Orders</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{metrics.pendingOrders || 0}</p>
              <p className="text-xs text-amber-600 font-medium mt-0.5">Awaiting manager review</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dealers Network</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{metrics.activeDealers || 0}</p>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">Active retail distribution</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Ledger</p>
              <p className="text-xl font-bold text-slate-900 mt-1">Real-time</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Direct khata & SO ledgers</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Lower Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders / Invoices */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Recent Sales & Invoices</h3>
              <Link href="/orders" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                View Orders →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Dealer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No transactions recorded yet
                      </td>
                    </tr>
                  ) : (
                    recentInvoices.map((inv: any) => (
                      <tr key={inv._id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-700">{inv.dealer?.businessName}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{formatBDT(inv.grandTotal)}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              inv.paymentStatus === "PAID"
                                ? "success"
                                : inv.paymentStatus === "PARTIALLY_PAID"
                                ? "warning"
                                : "danger"
                            }
                          >
                            {inv.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Accounts Balance Snapshot */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Liquid Account Balances</h3>
              <Link href="/accounts" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                Accounts →
              </Link>
            </div>
            <div className="p-5 space-y-4">
              {accounts.map((acc: any) => (
                <div key={acc._id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{acc.name}</p>
                    <span className="text-xs text-slate-400">{acc.type}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">{formatBDT(acc.currentBalance)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
