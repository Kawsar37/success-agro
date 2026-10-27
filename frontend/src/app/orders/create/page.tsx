"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBDT } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Send, Lock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface OrderLineItem {
  productId: string;
  productName: string;
  packSize: string;
  unitPrice: number;
  quantity: number | string;
  totalAmount: number;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSalesOfficer } = useAuth();

  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number | string>(0);

  // Load Dealers
  const { data: dealers, isLoading: loadingDealers } = useQuery({
    queryKey: ["dealers-for-order"],
    queryFn: async () => {
      const res = await api.get("/master-data/dealers");
      return res.data.data;
    },
  });

  // Load Products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products-for-order"],
    queryFn: async () => {
      const res = await api.get("/master-data/products");
      return res.data.data;
    },
  });

  const handleAddItem = (productId: string) => {
    if (!productId) return;
    const prod = products?.find((p: any) => p._id === productId);
    if (!prod) return;

    const existingIdx = items.findIndex((i) => i.productId === productId);
    if (existingIdx >= 0) {
      const updated = [...items];
      const newQty = (Number(updated[existingIdx].quantity) || 0) + 1;
      updated[existingIdx].quantity = newQty;
      updated[existingIdx].totalAmount = newQty * updated[existingIdx].unitPrice;
      setItems(updated);
    } else {
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
    }
  };

  const handleQuantityChange = (idx: number, val: number | string) => {
    const updated = [...items];
    if (val === "" || val === undefined) {
      updated[idx].quantity = "";
      updated[idx].totalAmount = 0;
    } else {
      const qty = Math.max(0, Number(val));
      updated[idx].quantity = isNaN(qty) ? "" : qty;
      updated[idx].totalAmount = (isNaN(qty) ? 0 : qty) * updated[idx].unitPrice;
    }
    setItems(updated);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  const grandTotal = Math.max(0, subtotal - (Number(discountAmount) || 0));

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDealerId) throw new Error("Please select a dealer");
      if (items.length === 0) throw new Error("Please add at least one product item");

      const res = await api.post("/orders", {
        dealerId: selectedDealerId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Math.max(1, Number(i.quantity) || 1),
          unitPrice: i.unitPrice,
        })),
        discountAmount: Math.max(0, Number(discountAmount) || 0),
        deliveryAddress,
        notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Sales Order submitted successfully!");
      router.push("/orders");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to create order");
    },
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Sales Order Requisition</h1>
            <p className="text-sm text-slate-500">Book field orders with instant pricing calculation</p>
          </div>
        </div>

        {isSalesOfficer && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-emerald-800">
            <span className="font-bold bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
              Sales Officer
            </span>
            <span>
              Orders are booked with official Admin-approved dealer prices. Prices and discounts cannot be altered.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form: Dealer & Item details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                1. Select Registered Dealer
              </h3>
              {loadingDealers ? (
                <LoadingSpinner size="sm" />
              ) : (
                <div>
                  <select
                    value={selectedDealerId}
                    onChange={(e) => {
                      setSelectedDealerId(e.target.value);
                      const dlr = dealers?.find((d: any) => d._id === e.target.value);
                      if (dlr) setDeliveryAddress(dlr.address);
                    }}
                    className="w-full py-2.5 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Dealer / Agency --</option>
                    {dealers?.map((d: any) => (
                      <option key={d._id} value={d._id}>
                        {d.dealerCode} - {d.businessName} ({d.proprietorName}, {d.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Delivery Destination
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Dealer shop address or local upazila ghat"
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Product Items Selection */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  2. Order Line Items
                </h3>
                <div className="w-64">
                  <select
                    onChange={(e) => {
                      handleAddItem(e.target.value);
                      e.target.value = "";
                    }}
                    className="w-full py-2 px-3 border border-emerald-300 bg-emerald-50 rounded-lg text-xs text-emerald-800 font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">+ Add Product to Cart</option>
                    {products?.map((p: any) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.packSize}) - {formatBDT(p.tradePrice)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[550px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-100 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Pack</th>
                      <th className="py-2.5 px-3">Trade Price</th>
                      <th className="py-2.5 px-3 w-24">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No products added yet. Select products from the dropdown above.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{item.productName}</td>
                          <td className="py-2.5 px-3 text-slate-500">{item.packSize}</td>
                          <td className="py-2.5 px-3 text-slate-700">{formatBDT(item.unitPrice)}</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                              onBlur={() => {
                                if (!item.quantity || Number(item.quantity) < 1) {
                                  handleQuantityChange(idx, 1);
                                }
                              }}
                              placeholder="1"
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

          {/* Right Summary Card */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Order Summary</h3>

              <div className="space-y-3 text-xs border-b border-slate-100 pb-4">
                <div className="flex justify-between text-slate-600">
                  <span>Total Items (Quantity):</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} pcs
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Product Lines:</span>
                  <span className="font-medium text-slate-700">
                    {items.length} {items.length === 1 ? "product" : "products"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatBDT(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Discount:</span>
                  {isSalesOfficer ? (
                    <span className="text-slate-400 font-medium italic text-[11px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> ৳0 (Admin Only)
                    </span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                      onBlur={() => {
                        if (discountAmount === "") setDiscountAmount(0);
                      }}
                      placeholder="0"
                      className="w-24 py-1 px-2 border border-slate-300 rounded text-right text-xs"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2">
                <span>Grand Total:</span>
                <span className="text-lg text-emerald-700">{formatBDT(grandTotal)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Order Notes / Remarks
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special dealer packaging, urgent delivery date, etc."
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => createOrderMutation.mutate()}
                disabled={createOrderMutation.isPending || items.length === 0 || !selectedDealerId}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{createOrderMutation.isPending ? "Submitting..." : "Submit Requisition"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
