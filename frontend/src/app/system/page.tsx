"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Settings,
  Shield,
  Edit2,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Globe,
  CheckCircle2,
} from "lucide-react";

export default function SystemPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    tagline: "",
    address: "",
    phone: "",
    email: "",
    currency: "BDT",
    currencySymbol: "৳",
    timezone: "Asia/Dhaka",
    vatTaxRegistrationNumber: "",
    invoiceFooterMessage: "",
    termsAndConditions: "",
  });

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => (await api.get("/system/settings")).data.data,
  });

  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await api.get("/system/audit-logs")).data.data,
  });

  const openEditModal = () => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || "",
        tagline: settings.tagline || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        currency: settings.currency || "BDT",
        currencySymbol: settings.currencySymbol || "৳",
        timezone: settings.timezone || "Asia/Dhaka",
        vatTaxRegistrationNumber: settings.vatTaxRegistrationNumber || "",
        invoiceFooterMessage: settings.invoiceFooterMessage || "",
        termsAndConditions: settings.termsAndConditions || "",
      });
    }
    setIsEditModalOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (updatedData: typeof formData) => {
      const res = await api.put("/system/settings", updatedData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Company information updated successfully!");
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update company information");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      toast.error("Company Name is required");
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Configuration & Security</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              ERP metadata, company information, Bangladesh VAT registration & audit logs
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Company Information</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Details */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>Company Information</span>
              </h3>
              {isAdmin && (
                <button
                  onClick={openEditModal}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {loadingSettings ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-medium flex items-center gap-1 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Enterprise Name & Tagline
                  </span>
                  <span className="font-bold text-slate-900 text-sm block">
                    {settings?.companyName || "Success Agro Limited"}
                  </span>
                  {settings?.tagline && (
                    <span className="text-slate-500 italic block mt-0.5">
                      {settings.tagline}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-medium flex items-center gap-1 mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    VAT / BIN Registration
                  </span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block">
                    {settings?.vatTaxRegistrationNumber || "Not specified"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-medium flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Factory & Office Address
                  </span>
                  <span className="text-slate-700 leading-relaxed block">
                    {settings?.address || "Plot 42, BSCIC Industrial Estate, Bogura, Bangladesh"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-medium flex items-center gap-1 mb-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Contact Phone & Email
                  </span>
                  <div className="space-y-0.5 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{settings?.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-emerald-600" />
                      <span>{settings?.email || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-medium flex items-center gap-1 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    Currency & Timezone
                  </span>
                  <span className="text-slate-700 font-medium">
                    {settings?.currency || "BDT"} ({settings?.currencySymbol || "৳"}) | {settings?.timezone || "Asia/Dhaka"}
                  </span>
                </div>

                {settings?.invoiceFooterMessage && (
                  <div>
                    <span className="text-slate-400 block uppercase font-medium mb-1">Invoice Footer</span>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                      "{settings.invoiceFooterMessage}"
                    </p>
                  </div>
                )}

                {settings?.termsAndConditions && (
                  <div>
                    <span className="text-slate-400 block uppercase font-medium mb-1">Terms & Conditions</span>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] leading-relaxed">
                      {settings.termsAndConditions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audit Logs */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Security & Activity Audit Trail</span>
              </h3>
              <span className="text-xs text-slate-400">Latest 200 system events</span>
            </div>

            {loadingLogs ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto flex-1 max-h-[520px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Module</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!logs || logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No audit events recorded
                        </td>
                      </tr>
                    ) : (
                      logs.map((log: any) => (
                        <tr key={log._id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{log.userName}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-mono">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">{log.module}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Company Information Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit System Config & Company Information"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Enterprise Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Success Agro Limited"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline / Slogan
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Quality Agro Solutions for Bangladesh"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +8801712345678"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. info@successagro.com.bd"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Factory & Office Address
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Plot 42, BSCIC Industrial Estate, Bogura, Bangladesh"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VAT / BIN / TIN Registration No.
              </label>
              <input
                type="text"
                value={formData.vatTaxRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, vatTaxRegistrationNumber: e.target.value })}
                placeholder="e.g. BIN-123456789-0101"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Timezone
              </label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                placeholder="e.g. Asia/Dhaka"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="e.g. BDT"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                placeholder="e.g. ৳"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice / Bill Footer Message
              </label>
              <input
                type="text"
                value={formData.invoiceFooterMessage}
                onChange={(e) => setFormData({ ...formData, invoiceFooterMessage: e.target.value })}
                placeholder="e.g. Thank you for your business. For queries, contact customer care."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={formData.termsAndConditions}
                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                placeholder="e.g. Goods once sold cannot be returned without prior written factory approval."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
