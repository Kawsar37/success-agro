"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatCard } from "@/components/ui/StatCard";
import { formatBDT } from "@/lib/utils";
import { BarChart3, TrendingUp, DollarSign, Wallet, FileText } from "lucide-react";

export default function ReportsPage() {
  const { data: finData, isLoading } = useQuery({
    queryKey: ["financial-report"],
    queryFn: async () => (await api.get("/reports/financial")).data.data,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Business Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Consolidated financial turnover, gross collections, operating expenses & net cash flow
          </p>
        </div>

        {/* Financial KPI Summary */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <StatCard
                title="Gross Dispatched Sales"
                value={formatBDT(finData?.totalSales || 0)}
                subtitle="Total invoices generated"
                icon={TrendingUp}
              />
              <StatCard
                title="Realized Cash Collections"
                value={formatBDT(finData?.totalCollected || 0)}
                subtitle="Collected from dealers"
                icon={DollarSign}
              />
              <StatCard
                title="Operating Expenses (OpEx)"
                value={formatBDT(finData?.totalExpenses || 0)}
                subtitle="Factory, logistics & admin"
                icon={Wallet}
              />
              <StatCard
                title="Net Operational Cash Flow"
                value={formatBDT(finData?.netCashFlow || 0)}
                subtitle="Collections minus expenses"
                icon={BarChart3}
                trend="+11.4%"
                trendPositive={true}
              />
            </div>

            {/* Financial Performance Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-800">Profit & Cash Flow Breakdown (Bangladesh BDT)</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Total Billed Invoices (Grand Turnover):</span>
                  <span className="font-bold text-slate-900">{formatBDT(finData?.totalSales || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Total Payments Deposited into Bank/Cash:</span>
                  <span className="font-bold text-emerald-700">{formatBDT(finData?.totalCollected || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Operating Expenses & Factory Overheads:</span>
                  <span className="font-bold text-rose-600">-{formatBDT(finData?.totalExpenses || 0)}</span>
                </div>
                <div className="flex justify-between py-3 border-t border-slate-200 text-base font-bold">
                  <span className="text-slate-900">Net Retained Cash Surplus:</span>
                  <span className="text-emerald-700">{formatBDT(finData?.netCashFlow || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
