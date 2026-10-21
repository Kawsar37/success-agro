"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBDT } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Link from "next/link";
import {
  Users,
  Phone,
  MapPin,
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  Search,
  AlertTriangle,
  Building,
  UserCheck,
  BookOpen,
} from "lucide-react";

export default function DealersPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<any | null>(null);
  const [deletingDealer, setDeletingDealer] = useState<any | null>(null);

  // Form states
  const [newDealerForm, setNewDealerForm] = useState({
    businessName: "",
    proprietorName: "",
    phone: "",
    secondaryPhone: "",
    address: "",
    territory: "",
    assignedSalesOfficer: "",
    creditLimit: "100000",
    openingBalance: "0",
    status: "Active",
    tradeLicenseNumber: "",
    nidNumber: "",
  });

  const [editDealerForm, setEditDealerForm] = useState({
    businessName: "",
    proprietorName: "",
    phone: "",
    secondaryPhone: "",
    address: "",
    territory: "",
    assignedSalesOfficer: "",
    creditLimit: "0",
    currentBalance: "0",
    status: "Active",
    tradeLicenseNumber: "",
    nidNumber: "",
  });

  // Territory modal state
  const [isAddTerritoryModalOpen, setIsAddTerritoryModalOpen] = useState(false);
  const [newTerritoryForm, setNewTerritoryForm] = useState({
    name: "",
    region: "Rajshahi",
    district: "Bogura",
    thana: "",
    description: "",
  });

  // Queries
  const { data: dealers, isLoading } = useQuery({
    queryKey: ["dealers"],
    queryFn: async () => {
      const res = await api.get("/master-data/dealers");
      return res.data.data;
    },
  });

  const { data: territories } = useQuery({
    queryKey: ["territories"],
    queryFn: async () => {
      const res = await api.get("/master-data/territories");
      return res.data.data;
    },
    enabled: isAdmin,
  });

  const { data: salesOfficers } = useQuery({
    queryKey: ["sales-officers"],
    queryFn: async () => {
      const res = await api.get("/master-data/sales-officers");
      return res.data.data;
    },
    enabled: isAdmin,
  });

  // Mutations
  const createDealerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/master-data/dealers", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealers"] });
      toast.success("Dealer registered successfully!");
      setIsAddModalOpen(false);
      setNewDealerForm({
        businessName: "",
        proprietorName: "",
        phone: "",
        secondaryPhone: "",
        address: "",
        territory: "",
        assignedSalesOfficer: "",
        creditLimit: "100000",
        openingBalance: "0",
        status: "Active",
        tradeLicenseNumber: "",
        nidNumber: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create dealer");
    },
  });

  const updateDealerMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/master-data/dealers/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealers"] });
      toast.success("Dealer details updated successfully!");
      setEditingDealer(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update dealer");
    },
  });

  const deleteDealerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/master-data/dealers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealers"] });
      toast.success("Dealer deleted successfully!");
      setDeletingDealer(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete dealer");
    },
  });

  const createTerritoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/master-data/territories", payload);
      return res.data;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["territories"] });
      toast.success("Territory created successfully!");
      const newTerritory = res?.data;
      if (newTerritory?._id) {
        if (isAddModalOpen) {
          setNewDealerForm((prev) => ({ ...prev, territory: newTerritory._id }));
        }
        if (editingDealer) {
          setEditDealerForm((prev) => ({ ...prev, territory: newTerritory._id }));
        }
      }
      setIsAddTerritoryModalOpen(false);
      setNewTerritoryForm({
        name: "",
        region: "Rajshahi",
        district: "Bogura",
        thana: "",
        description: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create territory");
    },
  });

  // Handlers
  const handleOpenEdit = (dealer: any) => {
    setEditingDealer(dealer);
    setEditDealerForm({
      businessName: dealer.businessName || "",
      proprietorName: dealer.proprietorName || "",
      phone: dealer.phone || "",
      secondaryPhone: dealer.secondaryPhone || "",
      address: dealer.address || "",
      territory: dealer.territory?._id || dealer.territory || "",
      assignedSalesOfficer: dealer.assignedSalesOfficer?._id || dealer.assignedSalesOfficer || "",
      creditLimit: String(dealer.creditLimit ?? 0),
      currentBalance: String(dealer.currentBalance ?? 0),
      status: dealer.status || "Active",
      tradeLicenseNumber: dealer.tradeLicenseNumber || "",
      nidNumber: dealer.nidNumber || "",
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealerForm.businessName.trim() || !newDealerForm.proprietorName.trim() || !newDealerForm.phone.trim() || !newDealerForm.address.trim()) {
      toast.error("Please fill in Business Name, Proprietor Name, Phone, and Address");
      return;
    }

    createDealerMutation.mutate({
      ...newDealerForm,
      territory: newDealerForm.territory || undefined,
      assignedSalesOfficer: newDealerForm.assignedSalesOfficer || undefined,
      creditLimit: Number(newDealerForm.creditLimit) || 0,
      openingBalance: Number(newDealerForm.openingBalance) || 0,
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDealer) return;
    if (!editDealerForm.businessName.trim() || !editDealerForm.proprietorName.trim() || !editDealerForm.phone.trim() || !editDealerForm.address.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    updateDealerMutation.mutate({
      id: editingDealer._id,
      payload: {
        ...editDealerForm,
        territory: editDealerForm.territory || undefined,
        assignedSalesOfficer: editDealerForm.assignedSalesOfficer || undefined,
        creditLimit: Number(editDealerForm.creditLimit) || 0,
        currentBalance: Number(editDealerForm.currentBalance) || 0,
      },
    });
  };

  const filteredDealers = dealers?.filter((d: any) => {
    const term = searchTerm.toLowerCase();
    return (
      d.businessName?.toLowerCase().includes(term) ||
      d.dealerCode?.toLowerCase().includes(term) ||
      d.proprietorName?.toLowerCase().includes(term) ||
      d.phone?.includes(term)
    );
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dealer Distribution Network</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Authorized dealers, credit limits, outstanding balances & assigned sales officers
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, code or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAddTerritoryModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition whitespace-nowrap w-full sm:w-auto"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Add Territory
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition whitespace-nowrap w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add Dealer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dealer Grid Cards */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredDealers?.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No dealers found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or register a new dealer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDealers?.map((dealer: any) => {
              const isOverLimit = Number(dealer.currentBalance) > Number(dealer.creditLimit);
              return (
                <div
                  key={dealer._id}
                  className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {dealer.dealerCode}
                          </span>
                          <Badge
                            variant={
                              dealer.status === "Active"
                                ? "success"
                                : dealer.status === "Blacklisted"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {dealer.status}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-1.5">{dealer.businessName}</h3>
                        <p className="text-xs text-slate-600 font-medium">Proprietor: {dealer.proprietorName}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Link
                          href={`/ledger?dealerId=${dealer._id}`}
                          title="View Dealer Ledger"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <BookOpen className="w-4 h-4 text-emerald-600" />
                        </Link>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(dealer)}
                              title="Edit Dealer"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingDealer(dealer)}
                              title="Delete Dealer"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{dealer.phone}</span>
                        {dealer.secondaryPhone && (
                          <span className="text-slate-400">/ {dealer.secondaryPhone}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{dealer.address}</span>
                      </div>
                    </div>

                    {/* Financial Balances */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 text-xs flex justify-between items-center">
                      <div>
                        <p className="text-slate-500 font-medium text-[11px]">Outstanding Due</p>
                        <p className={`font-bold text-sm ${isOverLimit ? "text-rose-600 font-black" : "text-slate-900"}`}>
                          {formatBDT(dealer.currentBalance || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 font-medium text-[11px]">Credit Limit</p>
                        <p className="font-semibold text-slate-700">{formatBDT(dealer.creditLimit || 0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="truncate max-w-[150px]">
                      Officer: <strong className="text-slate-600 font-medium">{dealer.assignedSalesOfficer?.name || "Direct / None"}</strong>
                    </span>
                    <span className="truncate max-w-[120px]">
                      Territory: <strong className="text-slate-600 font-medium">{dealer.territory?.name || "Central"}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= ADD DEALER MODAL ================= */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Register New Dealer"
          maxWidth="xl"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bismillah Krishi Bhander"
                  value={newDealerForm.businessName}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, businessName: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proprietor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haji Nurul Islam"
                  value={newDealerForm.proprietorName}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, proprietorName: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 01711223344"
                  value={newDealerForm.phone}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, phone: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secondary Mobile (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 01811223344"
                  value={newDealerForm.secondaryPhone}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, secondaryPhone: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shop / Business Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Station Road, Bogura Sadar, Bogura"
                  value={newDealerForm.address}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, address: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Territory
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddTerritoryModalOpen(true)}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Territory
                  </button>
                </div>
                <select
                  value={newDealerForm.territory}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, territory: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="">Select Territory (Default)</option>
                  {territories?.map((t: any) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Sales Officer
                </label>
                <select
                  value={newDealerForm.assignedSalesOfficer}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, assignedSalesOfficer: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="">Select Sales Officer</option>
                  {salesOfficers?.map((so: any) => (
                    <option key={so._id} value={so._id}>
                      {so.name} ({so.officerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Limit (BDT)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={newDealerForm.creditLimit}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, creditLimit: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opening Outstanding Balance (BDT)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={newDealerForm.openingBalance}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, openingBalance: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trade License (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TRAD/BOG/2024/099"
                  value={newDealerForm.tradeLicenseNumber}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, tradeLicenseNumber: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={newDealerForm.status}
                  onChange={(e) => setNewDealerForm({ ...newDealerForm, status: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createDealerMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {createDealerMutation.isPending && <LoadingSpinner size="sm" />}
                Register Dealer
              </button>
            </div>
          </form>
        </Modal>

        {/* ================= EDIT DEALER MODAL ================= */}
        <Modal
          isOpen={!!editingDealer}
          onClose={() => setEditingDealer(null)}
          title={`Modify Dealer - ${editingDealer?.businessName || ""}`}
          maxWidth="xl"
        >
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={editDealerForm.businessName}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, businessName: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proprietor Name *
                </label>
                <input
                  type="text"
                  required
                  value={editDealerForm.proprietorName}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, proprietorName: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={editDealerForm.phone}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, phone: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secondary Mobile
                </label>
                <input
                  type="tel"
                  value={editDealerForm.secondaryPhone}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, secondaryPhone: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  required
                  value={editDealerForm.address}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, address: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Territory
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddTerritoryModalOpen(true)}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Territory
                  </button>
                </div>
                <select
                  value={editDealerForm.territory}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, territory: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="">Select Territory</option>
                  {territories?.map((t: any) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Sales Officer
                </label>
                <select
                  value={editDealerForm.assignedSalesOfficer}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, assignedSalesOfficer: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="">Unassigned</option>
                  {salesOfficers?.map((so: any) => (
                    <option key={so._id} value={so._id}>
                      {so.name} ({so.officerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Limit (BDT)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={editDealerForm.creditLimit}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, creditLimit: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Balance / Due (BDT)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={editDealerForm.currentBalance}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, currentBalance: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trade License
                </label>
                <input
                  type="text"
                  value={editDealerForm.tradeLicenseNumber}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, tradeLicenseNumber: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editDealerForm.status}
                  onChange={(e) => setEditDealerForm({ ...editDealerForm, status: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDealer(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateDealerMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {updateDealerMutation.isPending && <LoadingSpinner size="sm" />}
                Save Changes
              </button>
            </div>
          </form>
        </Modal>

        {/* ================= DELETE DEALER CONFIRMATION MODAL ================= */}
        <Modal
          isOpen={!!deletingDealer}
          onClose={() => setDeletingDealer(null)}
          title="Confirm Dealer Deletion"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 p-3.5 rounded-lg text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Irreversible Action</p>
                <p className="mt-0.5 text-rose-700">
                  Are you sure you want to remove{" "}
                  <strong>{deletingDealer?.businessName}</strong> (Code:{" "}
                  <span className="font-mono">{deletingDealer?.dealerCode}</span>)?
                  This will remove the dealer from active distribution networks.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 text-xs space-y-1">
              <p className="text-slate-500">Proprietor: <strong className="text-slate-800">{deletingDealer?.proprietorName}</strong></p>
              <p className="text-slate-500">Outstanding Due: <strong className="text-rose-600">{formatBDT(deletingDealer?.currentBalance || 0)}</strong></p>
              <p className="text-slate-500">Phone: <strong className="text-slate-800">{deletingDealer?.phone}</strong></p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingDealer(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteDealerMutation.isPending}
                onClick={() => deletingDealer && deleteDealerMutation.mutate(deletingDealer._id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleteDealerMutation.isPending && <LoadingSpinner size="sm" />}
                Delete Dealer
              </button>
            </div>
          </div>
        </Modal>

        {/* ================= ADD TERRITORY MODAL ================= */}
        <Modal
          isOpen={isAddTerritoryModalOpen}
          onClose={() => setIsAddTerritoryModalOpen(false)}
          title="Add New Territory"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTerritoryForm.name.trim()) {
                toast.error("Please enter a territory name");
                return;
              }
              createTerritoryMutation.mutate(newTerritoryForm);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Territory Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bogura Sadar, Shibganj, Sherpur"
                value={newTerritoryForm.name}
                onChange={(e) => setNewTerritoryForm({ ...newTerritoryForm, name: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  District <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bogura, Sirajganj"
                  value={newTerritoryForm.district}
                  onChange={(e) => setNewTerritoryForm({ ...newTerritoryForm, district: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Region <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajshahi, Rangpur, Dhaka"
                  value={newTerritoryForm.region}
                  onChange={(e) => setNewTerritoryForm({ ...newTerritoryForm, region: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thana / Upazila (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Bogura Sadar"
                value={newTerritoryForm.thana}
                onChange={(e) => setNewTerritoryForm({ ...newTerritoryForm, thana: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Notes about this sales territory..."
                value={newTerritoryForm.description}
                onChange={(e) => setNewTerritoryForm({ ...newTerritoryForm, description: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddTerritoryModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTerritoryMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                {createTerritoryMutation.isPending && <LoadingSpinner size="sm" />}
                Save Territory
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
