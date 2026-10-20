"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBDT } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import Link from "next/link";

export default function CreateInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dealerId, setDealerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [transportCharge, setTransportCharge] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const { data: dealers } = useQuery({
    queryKey: ["dealers-for-inv"],
    queryFn: async () => (await api.get("/master-data/dealers")).data.data,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-inv"],
    queryFn: async () => (await api.get("/master-data/warehouses")).data.data,
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-inv"],
    queryFn: async () => (await api.get("/master-data/products")).data.data,
  });

  const handleAddItem = (productId: string) => {
    if (!productId) return;
    const prod = products?.find((p: any) => p._id === productId);
    if (!prod) return;

    setItems([
      ...items,
      {
        productId: prod._id,
        productName: prod.name,
        packSize: prod.packSize,
        unitPrice: prod.tradePrice,
        quantity: 1,
        totalAmount: prod.tradePrice,
      },
    ]);
  };

  const handleQuantityChange = (idx: number, qty: number) => {
    if (qty < 1) return;
    const updated = [...items];
    updated[idx].quantity = qty;
    updated[idx].totalAmount = qty * updated[idx].unitPrice;
    setItems(updated);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, i) => sum + i.totalAmount, 0);
  const grandTotal = Math.max(0, subtotal - discountAmount + transportCharge);

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!dealerId) throw new Error("Please select a dealer");
      if (!warehouseId) throw new Error("Please select a dispatch warehouse");
      if (items.length === 0) throw new Error("Please add at least one line item");

      const res = await api.post("/invoices", {
        dealerId,
        warehouseId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discountAmount,
        transportCharge,
        notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created & warehouse stock deducted!");
      router.push("/invoices");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to create invoice");
    },
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Direct Tax Invoice</h1>
            <p className="text-sm text-slate-500">
              Create commercial invoice, adjust dealer balance & post inventory movement
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                1. Invoice Parties & Warehouse
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select Dealer
                  </label>
                  <select
                    value={dealerId}
                    onChange={(e) => setDealerId(e.target.value)}
                    className="w-full py-2.5 px-3 border border-slate-300 rounded-lg text-sm text-slate-800"
                  >
                    <option value="">-- Choose Dealer --</option>
                    {dealers?.map((d: any) => (
                      <option key={d._id} value={d._id}>
                        {d.dealerCode} - {d.businessName} (Due: {formatBDT(d.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Dispatch Warehouse
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full py-2.5 px-3 border border-slate-300 rounded-lg text-sm text-slate-800"
                  >
                    <option value="">-- Select Depot / Plant --</option>
                    {warehouses?.map((w: any) => (
                      <option key={w._id} value={w._id}>
                        {w.code} - {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  2. Invoiced Agro Products
                </h3>
                <div className="w-64">
                  <select
                    onChange={(e) => {
                      handleAddItem(e.target.value);
                      e.target.value = "";
                    }}
                    className="w-full py-2 px-3 border border-emerald-300 bg-emerald-50 rounded-lg text-xs font-semibold text-emerald-800"
                  >
                    <option value="">+ Add Product</option>
                    {products?.map((p: any) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.packSize}) - {formatBDT(p.tradePrice)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[500px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-100 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Trade Price</th>
                      <th className="py-2.5 px-3 w-24">Qty</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No products added to invoice
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {item.productName}
                            <span className="text-slate-400 text-[11px] block">{item.packSize}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{formatBDT(item.unitPrice)}</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                              className="w-20 py-1 px-2 border border-slate-300 rounded text-center text-xs font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatBDT(item.totalAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Calculations */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Invoice Financials</h3>

              <div className="space-y-3 text-xs border-b border-slate-100 pb-4">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatBDT(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Discount:</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    className="w-24 py-1 px-2 border border-slate-300 rounded text-right text-xs"
                  />
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Transport Freight:</span>
                  <input
                    type="number"
                    min="0"
                    value={transportCharge}
                    onChange={(e) => setTransportCharge(Number(e.target.value) || 0)}
                    className="w-24 py-1 px-2 border border-slate-300 rounded text-right text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2">
                <span>Grand Total:</span>
                <span className="text-lg text-emerald-700">{formatBDT(grandTotal)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Dispatch Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Truck driver details, delivery chalans, etc."
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => createInvoiceMutation.mutate()}
                disabled={createInvoiceMutation.isPending || items.length === 0 || !dealerId || !warehouseId}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{createInvoiceMutation.isPending ? "Generating Invoice..." : "Dispatch & Generate Invoice"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
