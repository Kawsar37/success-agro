"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { formatBDT } from "@/lib/utils";
import { Boxes, Warehouse as WhIcon, History } from "lucide-react";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"balances" | "movements">("balances");

  const { data: balances, isLoading: loadingBalances } = useQuery({
    queryKey: ["inventory-balances"],
    queryFn: async () => (await api.get("/inventory/balances")).data.data,
  });

  const { data: movements, isLoading: loadingMovements } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: async () => (await api.get("/inventory/movements")).data.data,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory & Warehouses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Central factory & regional depot stock levels with multi-warehouse movement audit trail
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("balances")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "balances"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Current Stock Balances
          </button>
          <button
            onClick={() => setActiveTab("movements")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "movements"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Audit Stock Movements
          </button>
        </div>

        {/* Balances View */}
        {activeTab === "balances" && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loadingBalances ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Warehouse Depot</th>
                      <th className="py-3.5 px-4">Item Type</th>
                      <th className="py-3.5 px-4">Item Name / Code</th>
                      <th className="py-3.5 px-4 text-right">Physical Qty On Hand</th>
                      <th className="py-3.5 px-4 text-right">Available Qty</th>
                      <th className="py-3.5 px-4">Status Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!balances || balances.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No stock balances recorded
                        </td>
                      </tr>
                    ) : (
                      balances.map((b: any) => {
                        const isFinishedGood = b.itemType === "FinishedGood";
                        const name = isFinishedGood ? b.product?.name : b.rawMaterial?.name;
                        const code = isFinishedGood ? b.product?.productCode : b.rawMaterial?.materialCode;
                        const minAlert = isFinishedGood
                          ? b.product?.minimumStockAlert || 50
                          : b.rawMaterial?.minimumStockAlert || 100;
                        const isLow = b.quantityOnHand <= minAlert;

                        return (
                          <tr key={b._id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {b.warehouse?.name}
                              <span className="text-slate-400 text-[11px] block">{b.warehouse?.location}</span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={isFinishedGood ? "success" : "info"}>
                                {b.itemType}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{name}</p>
                              <span className="text-slate-400 text-[11px]">{code}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                              {b.quantityOnHand}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                              {b.availableQuantity}
                            </td>
                            <td className="py-3 px-4">
                              {isLow ? (
                                <Badge variant="danger">Low Stock Alert</Badge>
                              ) : (
                                <Badge variant="success">Normal</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Movements View */}
        {activeTab === "movements" && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loadingMovements ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Movement #</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Item</th>
                      <th className="py-3.5 px-4 text-right">Quantity</th>
                      <th className="py-3.5 px-4">Reference</th>
                      <th className="py-3.5 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements?.map((m: any) => (
                      <tr key={m._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">{m.movementNumber}</td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral">{m.type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {m.product?.name || m.rawMaterial?.name}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{m.quantity}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{m.referenceId || "-"}</td>
                        <td className="py-3 px-4 text-slate-500">{m.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
