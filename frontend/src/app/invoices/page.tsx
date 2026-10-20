"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBDT, formatDate } from "@/lib/utils";
import { InvoicePrintModal } from "@/components/invoice/InvoicePrintModal";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Printer, CheckCircle, Truck, MapPin } from "lucide-react";

export default function InvoicesPage() {
  const { isDeliveryMan, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await api.get("/invoices");
      return res.data.data;
    },
  });

  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/invoices/${id}/delivery-status`, { status });
      return res.data;
    },
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (variables.status === "Dispatched") {
        toast.success("Shipment marked as Picked Up / Dispatched 🚚");
      } else {
        toast.success("Shipment marked as Delivered 🎉");
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update delivery status");
    },
  });

  const handleOpenPrint = (inv: any) => {
    setSelectedInvoice(inv);
    setIsPrintOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isDeliveryMan ? "Dispatches & Delivery Runs" : "Tax & Commercial Invoices"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isDeliveryMan
                ? "Track assigned dealer shipments and confirm successful parcel delivery"
                : "Official sales dispatch bills with automatic warehouse stock deduction"}
            </p>
          </div>

          {!isDeliveryMan && (
            <Link
              href="/invoices/create"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Direct Invoice</span>
            </Link>
          )}
        </div>

        {/* Invoices List Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Dealer / Destination</th>
                    <th className="py-3.5 px-4">Warehouse Depot</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Delivery Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!invoices || invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No invoices created yet
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv: any) => {
                      const isDelivered = inv.deliveryStatus === "Delivered";

                      return (
                        <tr key={inv._id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800">{inv.dealer?.businessName}</p>
                            <span className="text-slate-500 text-[11px] block">{inv.dealer?.phone}</span>
                            <span className="text-slate-400 text-[10px] block truncate max-w-xs">
                              {inv.dealer?.address}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{inv.warehouse?.name}</td>
                          <td className="py-3 px-4 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatBDT(inv.grandTotal)}
                          </td>
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
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                inv.deliveryStatus === "Delivered"
                                  ? "success"
                                  : inv.deliveryStatus === "Dispatched"
                                  ? "info"
                                  : "warning"
                              }
                            >
                              {inv.deliveryStatus || "Pending"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {(isDeliveryMan || isAdmin) && (!inv.deliveryStatus || inv.deliveryStatus === "Pending") && (
                                <button
                                  onClick={() =>
                                    updateDeliveryMutation.mutate({ id: inv._id, status: "Dispatched" })
                                  }
                                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                                  title="Pickup item and set out for delivery"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Pickup</span>
                                </button>
                              )}

                              {(isDeliveryMan || isAdmin) && inv.deliveryStatus !== "Delivered" && (
                                <button
                                  onClick={() =>
                                    updateDeliveryMutation.mutate({ id: inv._id, status: "Delivered" })
                                  }
                                  className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                                  title="Mark as Delivered to dealer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Delivered</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenPrint(inv)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                title="Print Invoice"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
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
      </div>

      <InvoicePrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        invoice={selectedInvoice}
      />
    </AppShell>
  );
}
