"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { formatBDT, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Link from "next/link";
import { ShoppingCart, Plus, CheckCircle, XCircle, Edit3, Eye, Package } from "lucide-react";

export default function OrdersPage() {
  const { user, isSalesOfficer, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");

  // Review & Edit Modal State (Admin)
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [editableDiscount, setEditableDiscount] = useState<number>(0);

  // View Details Modal State (Sales Officer & Admin)
  const [viewDetailsOrder, setViewDetailsOrder] = useState<any | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: async () => {
      const res = await api.get(`/orders${statusFilter ? `?status=${statusFilter}` : ""}`);
      return res.data.data;
    },
  });

  // Approve / Reject Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      items,
      discountAmount,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
      items?: any[];
      discountAmount?: number;
    }) => {
      const res = await api.put(`/orders/${id}/status`, {
        status,
        items,
        discountAmount,
      });
      return res.data;
    },
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["dealers-ledger-summary"] });
      if (variables.status === "APPROVED") {
        toast.success("Order approved and automatically added to Dealer Customer Ledger!");
      } else {
        toast.success(`Order marked as ${variables.status}`);
      }
      setReviewOrder(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update order status");
    },
  });

  // Save Quantities without approving yet
  const saveQuantitiesMutation = useMutation({
    mutationFn: async ({ id, items, discountAmount }: { id: string; items: any[]; discountAmount: number }) => {
      const res = await api.put(`/orders/${id}`, { items, discountAmount });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Product counts and amounts updated successfully!");
      setReviewOrder(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save order changes");
    },
  });

  const handleOpenReview = (order: any) => {
    setReviewOrder(order);
    setEditableDiscount(order.discountAmount || 0);
    setEditableItems(
      (order.items || []).map((it: any) => ({
        product: it.product?._id || it.product,
        name: it.product?.name || "Product",
        packSize: it.product?.packSize || "",
        unitPrice: it.unitPrice || 0,
        quantity: it.quantity || 1,
        totalAmount: (it.unitPrice || 0) * (it.quantity || 1),
      }))
    );
  };

  const handleQuantityChange = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    setEditableItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return {
            ...item,
            quantity: qty,
            totalAmount: item.unitPrice * qty,
          };
        }
        return item;
      })
    );
  };

  const computedSubtotal = editableItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const computedGrandTotal = Math.max(0, computedSubtotal - (editableDiscount || 0));

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Orders</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isSalesOfficer
                ? "Your field sales bookings and dealer requisitions"
                : "Manage dealer order requisitions, edit product counts, and approve into ledger"}
            </p>
          </div>
          <Link
            href="/orders/create"
            className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Order</span>
          </Link>
        </div>

        {/* Filter Toolbar */}
        <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap">
          {["", "PENDING", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 whitespace-nowrap ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {st || "All Orders"}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[750px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Dealer</th>
                    <th className="py-3.5 px-4">Sales Officer</th>
                    <th className="py-3.5 px-4">Order Date</th>
                    <th className="py-3.5 px-4">Items / Total Qty</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!orders || orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No sales orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order: any) => {
                      const totalQuantity = (order.items || []).reduce(
                        (sum: number, it: any) => sum + (Number(it.quantity) || 0),
                        0
                      );
                      const productCount = order.items?.length || 0;

                      return (
                        <tr key={order._id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <button
                              onClick={() => setViewDetailsOrder(order)}
                              className="text-emerald-700 hover:underline font-bold"
                            >
                              {order.orderNumber}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800">{order.dealer?.businessName}</p>
                            <span className="text-slate-400 text-[11px]">{order.dealer?.phone}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {order.salesOfficer?.name || "Direct"}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{formatDate(order.orderDate)}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 text-xs block">
                              {totalQuantity} pcs
                            </span>
                            <span className="text-slate-400 text-[11px] block">
                              ({productCount} {productCount === 1 ? "product" : "products"})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatBDT(order.totalAmount)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                order.status === "APPROVED"
                                  ? "success"
                                  : order.status === "PENDING"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1.5 items-center">
                              {/* View Details Button for all users */}
                              <button
                                onClick={() => setViewDetailsOrder(order)}
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                                title="View Order Details & Product Breakdown"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {!isSalesOfficer && order.status === "PENDING" && (
                                <>
                                  <button
                                    onClick={() => handleOpenReview(order)}
                                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center gap-1 shadow-2xs transition"
                                    title="Edit quantities and review before approving"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit & Approve</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateStatusMutation.mutate({ id: order._id, status: "APPROVED" })
                                    }
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="Quick Approve without changes"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateStatusMutation.mutate({ id: order._id, status: "REJECTED" })
                                    }
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                                    title="Reject Order"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
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

        {/* Modal: View Order Details & Item Breakdown */}
        {viewDetailsOrder && (
          <Modal
            isOpen={!!viewDetailsOrder}
            onClose={() => setViewDetailsOrder(null)}
            title={`Order Details #${viewDetailsOrder.orderNumber}`}
            maxWidth="lg"
          >
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dealer</span>
                  <span className="font-bold text-slate-800 text-sm block">
                    {viewDetailsOrder.dealer?.businessName}
                  </span>
                  <span className="text-slate-400 text-[11px] block">{viewDetailsOrder.dealer?.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sales Officer</span>
                  <span className="font-semibold text-slate-700">
                    {viewDetailsOrder.salesOfficer?.name || "Direct"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Order Date</span>
                  <span className="font-semibold text-slate-700">
                    {formatDate(viewDetailsOrder.orderDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <Badge
                    variant={
                      viewDetailsOrder.status === "APPROVED"
                        ? "success"
                        : viewDetailsOrder.status === "PENDING"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {viewDetailsOrder.status}
                  </Badge>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[500px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Pack</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewDetailsOrder.items?.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {it.product?.name || "Product"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{it.product?.packSize || "-"}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatBDT(it.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                          {it.quantity} pcs
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatBDT(it.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Totals Summary */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Items Count (Quantity):</span>
                  <span className="font-bold text-slate-900">
                    {(viewDetailsOrder.items || []).reduce(
                      (s: number, i: any) => s + (Number(i.quantity) || 0),
                      0
                    )}{" "}
                    pcs ({viewDetailsOrder.items?.length || 0} product
                    {(viewDetailsOrder.items?.length || 0) === 1 ? "" : "s"})
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">
                    {formatBDT(viewDetailsOrder.subtotal)}
                  </span>
                </div>
                {(viewDetailsOrder.discountAmount || 0) > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Discount:</span>
                    <span className="font-semibold text-rose-600">
                      -{formatBDT(viewDetailsOrder.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700 text-base">
                    {formatBDT(viewDetailsOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {viewDetailsOrder.deliveryAddress && (
                <div className="text-slate-600 text-xs">
                  <span className="font-bold text-slate-700 block">Delivery Destination:</span>
                  <span>{viewDetailsOrder.deliveryAddress}</span>
                </div>
              )}

              {viewDetailsOrder.notes && (
                <div className="text-slate-600 text-xs">
                  <span className="font-bold text-slate-700 block">Notes:</span>
                  <span>{viewDetailsOrder.notes}</span>
                </div>
              )}

              {viewDetailsOrder.rejectionReason && (
                <div className="text-rose-700 text-xs bg-rose-50 p-2.5 rounded border border-rose-200">
                  <span className="font-bold block">Rejection Reason:</span>
                  <span>{viewDetailsOrder.rejectionReason}</span>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewDetailsOrder(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal: Review & Edit Product Quantities Before Approving (Admin) */}
        {reviewOrder && (
          <Modal
            isOpen={!!reviewOrder}
            onClose={() => setReviewOrder(null)}
            title={`Review Order #${reviewOrder.orderNumber} - ${reviewOrder.dealer?.businessName}`}
            maxWidth="lg"
          >
            <div className="space-y-4 text-xs">
              {/* Order Meta Header */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dealer / Customer</span>
                  <span className="font-bold text-slate-800 text-sm">{reviewOrder.dealer?.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sales Officer</span>
                  <span className="font-semibold text-slate-700">{reviewOrder.salesOfficer?.name || "Direct"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Order Date</span>
                  <span className="font-semibold text-slate-700">{formatDate(reviewOrder.orderDate)}</span>
                </div>
              </div>

              {/* Instructions banner */}
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  Admin can adjust product quantities below. Approving will automatically record this invoice into the Dealer Customer Ledger.
                </span>
              </div>

              {/* Products Table with Editable Quantities */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[550px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Pack Size</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center w-36">Quantity (Edit)</th>
                      <th className="py-2.5 px-3 text-right">Item Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editableItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{item.packSize || "-"}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                          {formatBDT(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                              className="w-6 h-6 rounded bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 flex items-center justify-center text-sm"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                              className="w-16 py-1 text-center font-bold text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                              className="w-6 h-6 rounded bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatBDT(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Discounts */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Items Count (Quantity):</span>
                  <span className="font-bold text-slate-800">
                    {editableItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} pcs (
                    {editableItems.length} product{editableItems.length === 1 ? "" : "s"})
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800">{formatBDT(computedSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Discount (BDT ৳):</span>
                  <input
                    type="number"
                    min="0"
                    value={editableDiscount}
                    onChange={(e) => setEditableDiscount(Number(e.target.value) || 0)}
                    className="w-24 py-1 px-2 text-right border border-slate-300 rounded text-xs font-semibold"
                  />
                </div>
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Net Total Amount:</span>
                  <span className="text-emerald-700 text-base">{formatBDT(computedGrandTotal)}</span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewOrder(null)}
                  className="w-full sm:w-auto px-3.5 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saveQuantitiesMutation.isPending}
                  onClick={() =>
                    saveQuantitiesMutation.mutate({
                      id: reviewOrder._id,
                      items: editableItems,
                      discountAmount: editableDiscount,
                    })
                  }
                  className="w-full sm:w-auto px-3.5 py-2 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{saveQuantitiesMutation.isPending ? "Saving..." : "Save Quantities Only"}</span>
                </button>
                <button
                  type="button"
                  disabled={updateStatusMutation.isPending}
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: reviewOrder._id,
                      status: "APPROVED",
                      items: editableItems,
                      discountAmount: editableDiscount,
                    })
                  }
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {updateStatusMutation.isPending ? "Approving..." : "Save & Approve into Ledger"}
                  </span>
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
