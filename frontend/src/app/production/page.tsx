"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { formatBDT, formatDate } from "@/lib/utils";
import { Factory, Layers, CheckCircle } from "lucide-react";

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "boms">("orders");

  const { data: productionOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ["production-orders"],
    queryFn: async () => (await api.get("/production/orders")).data.data,
  });

  const { data: boms, isLoading: loadingBoms } = useQuery({
    queryKey: ["boms"],
    queryFn: async () => (await api.get("/production/boms")).data.data,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Factory Production & BOM</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bill of Materials formulation recipes, production batches & manufacturing costing
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "orders"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Production Batches
          </button>
          <button
            onClick={() => setActiveTab("boms")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "boms"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            BOM Recipes
          </button>
        </div>

        {/* Orders */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loadingOrders ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Batch Order #</th>
                      <th className="py-3.5 px-4">Finished Good Product</th>
                      <th className="py-3.5 px-4">Batch Code</th>
                      <th className="py-3.5 px-4 text-right">Target Qty</th>
                      <th className="py-3.5 px-4 text-right">Produced Qty</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!productionOrders || productionOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No production orders scheduled
                        </td>
                      </tr>
                    ) : (
                      productionOrders.map((ord: any) => (
                        <tr key={ord._id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-900">{ord.orderNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {ord.product?.name}
                            <span className="text-slate-400 text-[11px] block">{ord.product?.packSize}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{ord.batchNumber}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">{ord.targetQuantity}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {ord.producedQuantity || 0}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                ord.status === "COMPLETED"
                                  ? "success"
                                  : ord.status === "IN_PROGRESS"
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {ord.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BOM Recipes */}
        {activeTab === "boms" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {loadingBoms ? (
              <div className="flex justify-center p-12 col-span-2">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              boms?.map((bom: any) => (
                <div key={bom._id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Recipe v{bom.version}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-1.5">{bom.name}</h3>
                      <p className="text-xs text-slate-500">Product: {bom.product?.name}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Ingredients Per Unit:</p>
                    <div className="space-y-1.5">
                      {bom.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-700 bg-slate-50 p-2 rounded">
                          <span>{item.rawMaterial?.name}</span>
                          <span className="font-bold text-slate-900">
                            {item.quantityPerUnit} {item.rawMaterial?.unit?.symbol}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Est. Material Cost:</span>
                    <span className="text-emerald-700">{formatBDT(bom.estimatedTotalCostPerUnit)} / unit</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
