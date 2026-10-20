"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatBDT, formatDate, getFileUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Search,
  Building,
  CreditCard,
  FileCheck2,
  Receipt,
  User,
  ShieldCheck,
  Check,
  X,
  Filter,
  Camera,
  UploadCloud,
  ImageIcon,
  ExternalLink,
  FileText,
  Eye,
} from "lucide-react";

export default function CollectionsPage() {
  const { user, isAdmin, isSalesOfficer } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // "ALL", "Pending", "Approved", "Rejected"
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [approvingCollection, setApprovingCollection] = useState<any | null>(null);
  const [rejectingCollection, setRejectingCollection] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [deletingCollection, setDeletingCollection] = useState<any | null>(null);

  // Form State
  const initialFormState = {
    dealerId: "",
    accountId: "",
    amount: "",
    paymentMethod: "BankTransfer",
    moneyReceiptNumber: "",
    depositSlipNumber: "",
    receiptImageUrl: "",
    collectionDate: new Date().toISOString().split("T")[0],
    depositDate: new Date().toISOString().split("T")[0],
    chequeNumber: "",
    chequeBank: "",
    chequeDate: "",
    transactionId: "",
    remarks: "",
  };

  const [collectionForm, setCollectionForm] = useState(initialFormState);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    title: string;
    colNumber?: string;
    mrNo?: string;
    dealerName?: string;
    amount?: number;
  } | null>(null);

  // 1. Fetch Collections
  const { data: collections, isLoading: loadingCollections } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => (await api.get("/accounts/collections")).data.data,
  });

  // 2. Fetch Dealers (scoped automatically to sales officer if SO)
  const { data: dealers } = useQuery({
    queryKey: ["dealers-for-collections"],
    queryFn: async () => (await api.get("/master-data/dealers")).data.data,
  });

  // 3. Fetch Deposit Accounts (Bank & Cash accounts available for deposit)
  const { data: depositAccounts } = useQuery({
    queryKey: ["deposit-accounts"],
    queryFn: async () => (await api.get("/accounts/collections/deposit-accounts")).data.data,
  });

  // 4. Record Collection Mutation
  const recordCollectionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/accounts/collections", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["pending-collections-count"] });
      queryClient.invalidateQueries({ queryKey: ["dealers"] });
      queryClient.invalidateQueries({ queryKey: ["dealers-for-collections"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(
        isSalesOfficer
          ? "Payment collection and bank deposit slip submitted! Awaiting Admin approval."
          : "Collection recorded and ledger updated successfully!"
      );
      setIsRecordModalOpen(false);
      setCollectionForm(initialFormState);
      setReceiptFile(null);
      setReceiptPreview(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to record collection");
    },
  });

  // 5. Approve Collection Mutation (Admin Only)
  const approveCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/accounts/collections/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["pending-collections-count"] });
      queryClient.invalidateQueries({ queryKey: ["dealers"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Collection approved! Dealer due credited and posted to General Ledger.");
      setApprovingCollection(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to approve collection");
    },
  });

  // 6. Reject Collection Mutation (Admin Only)
  const rejectCollectionMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.patch(`/accounts/collections/${id}/reject`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["pending-collections-count"] });
      toast.success("Collection rejected");
      setRejectingCollection(null);
      setRejectionReason("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to reject collection");
    },
  });

  // 7. Delete Collection Mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/accounts/collections/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["pending-collections-count"] });
      queryClient.invalidateQueries({ queryKey: ["dealers"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Collection deleted successfully");
      setDeletingCollection(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete collection");
    },
  });

  // Handle Form Submission with Receipt Upload
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionForm.dealerId) {
      toast.error("Please select a dealer");
      return;
    }
    if (!collectionForm.accountId) {
      toast.error("Please select the target bank/cash account");
      return;
    }
    if (!collectionForm.amount || Number(collectionForm.amount) <= 0) {
      toast.error("Please enter a valid collection amount");
      return;
    }
    if (!collectionForm.moneyReceiptNumber?.trim()) {
      toast.error("Please enter the Money Receipt Number (M.R. No)");
      return;
    }

    let finalImageUrl = collectionForm.receiptImageUrl;

    // Upload receipt file if attached
    if (receiptFile) {
      try {
        setIsUploadingReceipt(true);
        const uploadData = new FormData();
        uploadData.append("receipt", receiptFile);
        const res = await api.post("/uploads/receipt", uploadData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalImageUrl = res.data.data.fileUrl;
      } catch (err: any) {
        setIsUploadingReceipt(false);
        toast.error(err.response?.data?.message || "Failed to upload bank receipt image");
        return;
      } finally {
        setIsUploadingReceipt(false);
      }
    }

    recordCollectionMutation.mutate({
      dealerId: collectionForm.dealerId,
      accountId: collectionForm.accountId,
      amount: Number(collectionForm.amount),
      paymentMethod: collectionForm.paymentMethod,
      moneyReceiptNumber: collectionForm.moneyReceiptNumber,
      depositSlipNumber: collectionForm.depositSlipNumber,
      receiptImageUrl: finalImageUrl || undefined,
      collectionDate: collectionForm.collectionDate,
      depositDate: collectionForm.depositDate,
      chequeNumber: collectionForm.chequeNumber,
      chequeBank: collectionForm.chequeBank,
      chequeDate: collectionForm.chequeDate,
      transactionId: collectionForm.transactionId,
      remarks: collectionForm.remarks,
    });
  };

  // Pending Collections for Admin Approval
  const pendingCollections = useMemo(() => {
    if (!collections) return [];
    return collections.filter((c: any) => c.status === "Pending");
  }, [collections]);

  // Filtered Collections for table
  const filteredCollections = useMemo(() => {
    if (!collections) return [];
    return collections.filter((col: any) => {
      const matchesSearch =
        col.collectionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.moneyReceiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.depositSlipNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.dealer?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.dealer?.dealerCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.salesOfficer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.account?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || col.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [collections, searchTerm, statusFilter]);

  const selectedDealerObj = dealers?.find((d: any) => d._id === collectionForm.dealerId);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* ================= TOP HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
                <DollarSign className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Dealer Collections & Bank Deposits
              </h1>
              {isAdmin && pendingCollections.length > 0 && (
                <span className="bg-amber-100 text-amber-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                  {pendingCollections.length} Pending Approval
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {isSalesOfficer
                ? "Enter collected taka from your assigned dealers, attach Money Receipt (M.R.) numbers, and submit bank deposit slips for verification"
                : "Manage field collections, verify Sales Officer bank deposit slips, and approve credit entries to Dealer General Ledgers"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCollectionForm(initialFormState);
                setIsRecordModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              {isSalesOfficer ? "Submit Collection & Deposit" : "Record Collection"}
            </button>
          </div>
        </div>

        {/* ================= ADMIN PENDING APPROVAL QUEUE BANNER ================= */}
        {isAdmin && pendingCollections.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Clock className="w-5 h-5 text-amber-600 animate-spin" />
                <span>Pending Verification Queue ({pendingCollections.length} submissions)</span>
              </div>
              <span className="text-xs text-amber-700 font-medium">
                Verify Money Receipt & Bank Deposit before posting to ledger
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {pendingCollections.map((col: any) => (
                <div
                  key={col._id}
                  className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {col.collectionNumber}
                      </span>
                      <span className="bg-amber-100 text-amber-800 font-mono font-bold px-2 py-0.5 rounded text-[10px] border border-amber-300">
                        M.R. #{col.moneyReceiptNumber || "N/A"}
                      </span>
                    </div>

                    <div className="pt-1">
                      <p className="font-bold text-slate-900 text-sm">{col.dealer?.businessName}</p>
                      <p className="text-[11px] text-slate-500">
                        {col.dealer?.proprietorName} ({col.dealer?.dealerCode}) • Current Due:{" "}
                        <strong className="text-rose-600">{formatBDT(col.dealer?.currentBalance || 0)}</strong>
                      </p>
                    </div>

                    <div className="p-2 bg-slate-50 rounded border border-slate-200 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Collected Amount:</span>
                        <strong className="text-emerald-700 font-black text-sm">{formatBDT(col.amount)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bank Deposited:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[150px]">{col.account?.name}</span>
                      </div>
                      {col.depositSlipNumber && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Deposit Slip / Ref:</span>
                          <span className="font-mono font-medium text-slate-800">{col.depositSlipNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400 text-[10px]">
                        <span>Submitted by:</span>
                        <span className="text-slate-600 font-medium">{col.collectedBy?.name || col.salesOfficer?.name}</span>
                      </div>
                    </div>

                    {col.receiptImageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewReceipt({
                            url: getFileUrl(col.receiptImageUrl),
                            title: "Bank Deposit Slip / Money Receipt",
                            colNumber: col.collectionNumber,
                            mrNo: col.moneyReceiptNumber,
                            dealerName: col.dealer?.businessName,
                            amount: col.amount,
                          })
                        }
                        className="w-full flex items-center justify-between p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-bold transition group"
                      >
                        <span className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          Bank Slip / M.R. Attached
                        </span>
                        <span className="text-[10px] text-emerald-700 underline group-hover:text-emerald-900 flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> Inspect Photo
                        </span>
                      </button>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic px-1">
                        No receipt photo attached
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setApprovingCollection(col)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Post
                    </button>
                    <button
                      onClick={() => setRejectingCollection(col)}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition active:scale-95"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= CONTROLS & FILTERS ================= */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Records ({collections?.length || 0})
            </button>
            <button
              onClick={() => setStatusFilter("Pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "Pending"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <Clock className="w-3 h-3" />
              Pending Approval ({collections?.filter((c: any) => c.status === "Pending").length || 0})
            </button>
            <button
              onClick={() => setStatusFilter("Approved")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "Approved"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Approved ({collections?.filter((c: any) => c.status === "Approved").length || 0})
            </button>
            <button
              onClick={() => setStatusFilter("Rejected")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "Rejected"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              <XCircle className="w-3 h-3" />
              Rejected ({collections?.filter((c: any) => c.status === "Rejected").length || 0})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search M.R. #, Slip, Dealer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* ================= COLLECTIONS TABLE ================= */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loadingCollections ? (
            <div className="flex justify-center items-center p-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              <DollarSign className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">No collection records found.</p>
              <p className="text-xs text-slate-400 mt-1">
                {isSalesOfficer
                  ? "Click 'Submit Collection & Deposit' to record payments collected from your dealers."
                  : "No submissions match your active filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Receipt / Col #</th>
                    <th className="py-3 px-4">Money Receipt (M.R. No)</th>
                    <th className="py-3 px-4">Dealer / Customer</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4 text-right">Amount (৳)</th>
                    <th className="py-3 px-4">Bank / Cash Account</th>
                    <th className="py-3 px-4">Deposit Slip / Ref</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredCollections.map((col: any) => {
                    const isPending = col.status === "Pending";
                    const isApproved = col.status === "Approved";
                    const isRejected = col.status === "Rejected";

                    return (
                      <tr key={col._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {col.collectionNumber}
                        </td>

                        <td className="py-3 px-4">
                          {col.moneyReceiptNumber ? (
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              M.R. #{col.moneyReceiptNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block truncate max-w-[180px]">
                            {col.dealer?.businessName}
                          </strong>
                          <span className="text-slate-500 text-[11px] block">
                            {col.dealer?.proprietorName} ({col.dealer?.dealerCode})
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-medium text-slate-800 block">
                            {col.collectedBy?.name || col.salesOfficer?.name || "Direct Admin"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {col.salesOfficer?.officerCode || col.collectedBy?.role}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                          {formatBDT(col.amount)}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{col.account?.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {col.account?.accountNumber ? `A/C: ${col.account.accountNumber}` : col.paymentMethod}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-700">
                          <div>{col.depositSlipNumber || col.transactionId || "-"}</div>
                          {col.receiptImageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewReceipt({
                                  url: getFileUrl(col.receiptImageUrl),
                                  title: "Bank Deposit Slip / Money Receipt",
                                  colNumber: col.collectionNumber,
                                  mrNo: col.moneyReceiptNumber,
                                  dealerName: col.dealer?.businessName,
                                  amount: col.amount,
                                })
                              }
                              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded transition"
                              title="View uploaded bank slip / receipt"
                            >
                              <ImageIcon className="w-3 h-3" />
                              Slip Image
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-4 text-[11px] text-slate-600 whitespace-nowrap">
                          <div>
                            <span className="text-slate-400 text-[10px]">Collected: </span>
                            {formatDate(col.collectionDate)}
                          </div>
                          {col.depositDate && (
                            <div>
                              <span className="text-slate-400 text-[10px]">Deposited: </span>
                              {formatDate(col.depositDate)}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                              <Clock className="w-3 h-3" />
                              Pending Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved & Posted
                            </span>
                          )}
                          {isRejected && (
                            <span
                              title={col.rejectionReason}
                              className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-300"
                            >
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isAdmin && isPending && (
                              <>
                                <button
                                  onClick={() => setApprovingCollection(col)}
                                  title="Approve Collection"
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setRejectingCollection(col)}
                                  title="Reject Collection"
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => setDeletingCollection(col)}
                                title="Delete / Void Collection"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================= RECORD / SUBMIT COLLECTION MODAL ================= */}
        <Modal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          title={isSalesOfficer ? "Submit Dealer Collection & Bank Deposit Slip" : "Record Dealer Payment Collection"}
          maxWidth="xl"
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-800">
              {isSalesOfficer
                ? "Enter the payment collected from your dealer. Provide the Money Receipt (M.R. No) and Bank Deposit slip details. Upon Admin verification, your dealer's due will be credited automatically."
                : "Record dealer collection directly. Approving will automatically update the dealer's balance, post to their General Ledger, and credit the bank account."}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dealer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dealer / Customer *
                </label>
                <select
                  required
                  value={collectionForm.dealerId}
                  onChange={(e) => setCollectionForm({ ...collectionForm, dealerId: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="" disabled>
                    -- Select Dealer --
                  </option>
                  {dealers?.map((d: any) => (
                    <option key={d._id} value={d._id}>
                      {d.dealerCode} - {d.businessName} ({d.proprietorName}) • Due: {formatBDT(d.currentBalance || 0)}
                    </option>
                  ))}
                </select>
                {selectedDealerObj && (
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Current Outstanding Due:{" "}
                    <strong className="text-rose-600 font-bold">
                      {formatBDT(selectedDealerObj.currentBalance || 0)}
                    </strong>
                  </span>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Collected Amount (BDT ৳) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={collectionForm.amount}
                  onChange={(e) => setCollectionForm({ ...collectionForm, amount: e.target.value })}
                  className="w-full text-sm font-black text-emerald-700 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Money Receipt Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Money Receipt Number (M.R. No) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 71751, MR-4645, 173.BL"
                  value={collectionForm.moneyReceiptNumber}
                  onChange={(e) => setCollectionForm({ ...collectionForm, moneyReceiptNumber: e.target.value })}
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Official M.R. number issued to dealer
                </span>
              </div>

              {/* Collection Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Collection Date *
                </label>
                <input
                  type="date"
                  required
                  value={collectionForm.collectionDate}
                  onChange={(e) => setCollectionForm({ ...collectionForm, collectionDate: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Target Bank / Cash Account */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deposited Into Bank / Account *
                </label>
                <select
                  required
                  value={collectionForm.accountId}
                  onChange={(e) => setCollectionForm({ ...collectionForm, accountId: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="" disabled>
                    -- Select Company Bank Account --
                  </option>
                  {depositAccounts?.map((acc: any) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.bankName || acc.type} {acc.accountNumber ? `- ${acc.accountNumber}` : ""})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Select company account receiving the taka
                </span>
              </div>

              {/* Bank Deposit Slip / Ref No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Deposit Slip No / Ref #
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEP-2026-901, Trx ID, Slip #"
                  value={collectionForm.depositSlipNumber}
                  onChange={(e) => setCollectionForm({ ...collectionForm, depositSlipNumber: e.target.value })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Deposit Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Deposit Date
                </label>
                <input
                  type="date"
                  value={collectionForm.depositDate}
                  onChange={(e) => setCollectionForm({ ...collectionForm, depositDate: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={collectionForm.paymentMethod}
                  onChange={(e) => setCollectionForm({ ...collectionForm, paymentMethod: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="BankTransfer">Bank Deposit / Transfer</option>
                  <option value="Cash">Cash Handover</option>
                  <option value="Cheque">Bank Cheque</option>
                  <option value="bKash">bKash Merchant</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                </select>
              </div>

              {/* Remarks */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional delivery or bank deposit details..."
                  value={collectionForm.remarks}
                  onChange={(e) => setCollectionForm({ ...collectionForm, remarks: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Bank Deposit Slip / Money Receipt Image Upload */}
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Bank Deposit Slip / Money Receipt Photo
                  </label>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WebP, PDF (Max 5MB)</span>
                </div>

                {receiptPreview ? (
                  <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/60 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {receiptFile?.type === "application/pdf" ? (
                        <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      ) : (
                        <img
                          src={receiptPreview}
                          alt="Receipt Preview"
                          className="w-14 h-14 object-cover rounded-lg border border-emerald-300 shadow-sm shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {receiptFile?.name || "Bank Deposit Slip"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {receiptFile ? `${(receiptFile.size / 1024).toFixed(1)} KB` : "Attached"} • Ready for submission
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                        setCollectionForm({ ...collectionForm, receiptImageUrl: "" });
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center group">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("File size exceeds 5MB limit");
                          return;
                        }
                        setReceiptFile(file);
                        if (file.type.startsWith("image/")) {
                          setReceiptPreview(URL.createObjectURL(file));
                        } else {
                          setReceiptPreview("/pdf-placeholder");
                        }
                      }}
                    />
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-full group-hover:bg-emerald-100 group-hover:text-emerald-700 transition">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-emerald-800">
                        Click to take photo with camera or browse file
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Snap Bank Deposit Slip, M.R. copy, or transfer receipt
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsRecordModalOpen(false);
                  setReceiptFile(null);
                  setReceiptPreview(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={recordCollectionMutation.isPending || isUploadingReceipt}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isUploadingReceipt
                  ? "Uploading Receipt Image..."
                  : recordCollectionMutation.isPending
                  ? "Submitting..."
                  : isSalesOfficer
                  ? "Submit for Admin Approval"
                  : "Record & Approve Collection"}
              </button>
            </div>
          </form>
        </Modal>

        {/* ================= APPROVE CONFIRMATION MODAL ================= */}
        <Modal
          isOpen={!!approvingCollection}
          onClose={() => setApprovingCollection(null)}
          title="Approve Dealer Collection & Post to Ledger"
          maxWidth="md"
        >
          {approvingCollection && (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-lg text-emerald-900 space-y-1">
                <p className="font-bold text-sm">
                  Approve Collection #{approvingCollection.collectionNumber}?
                </p>
                <p className="text-[11px] text-emerald-700">
                  This will deduct <strong>{formatBDT(approvingCollection.amount)}</strong> from{" "}
                  <strong>{approvingCollection.dealer?.businessName}</strong>, post a credit entry into their Customer General Ledger with M.R. #{approvingCollection.moneyReceiptNumber || "N/A"}, and credit the company&apos;s bank account.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Money Receipt (M.R. No):</span>
                  <strong className="font-mono text-emerald-800 font-bold">
                    #{approvingCollection.moneyReceiptNumber || "N/A"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dealer Name:</span>
                  <strong className="text-slate-800">{approvingCollection.dealer?.businessName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <strong className="text-emerald-700 text-sm font-black">
                    {formatBDT(approvingCollection.amount)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Deposited:</span>
                  <span className="font-semibold text-slate-800">{approvingCollection.account?.name}</span>
                </div>
                {approvingCollection.depositSlipNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank Deposit Slip:</span>
                    <span className="font-mono font-medium text-slate-800">
                      {approvingCollection.depositSlipNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted by:</span>
                  <span className="text-slate-800 font-medium">
                    {approvingCollection.collectedBy?.name || approvingCollection.salesOfficer?.name}
                  </span>
                </div>

                {approvingCollection.receiptImageUrl && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>Bank Deposit Slip Attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewReceipt({
                          url: getFileUrl(approvingCollection.receiptImageUrl),
                          title: "Bank Deposit Slip / Money Receipt",
                          colNumber: approvingCollection.collectionNumber,
                          mrNo: approvingCollection.moneyReceiptNumber,
                          dealerName: approvingCollection.dealer?.businessName,
                          amount: approvingCollection.amount,
                        })
                      }
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect Photo
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApprovingCollection(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={approveCollectionMutation.isPending}
                  onClick={() => approveCollectionMutation.mutate(approvingCollection._id)}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {approveCollectionMutation.isPending ? "Approving..." : "Yes, Approve & Post"}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ================= REJECT MODAL ================= */}
        <Modal
          isOpen={!!rejectingCollection}
          onClose={() => setRejectingCollection(null)}
          title="Reject Collection Submission"
          maxWidth="sm"
        >
          {rejectingCollection && (
            <div className="space-y-4 text-xs">
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-800">
                Are you sure you want to reject this collection? The submitting Sales Officer will be notified with your reason.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Deposit slip mismatch, invalid M.R. number, bank deposit not yet credited..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingCollection(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rejectCollectionMutation.isPending || !rejectionReason.trim()}
                  onClick={() =>
                    rejectCollectionMutation.mutate({
                      id: rejectingCollection._id,
                      reason: rejectionReason,
                    })
                  }
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {rejectCollectionMutation.isPending ? "Rejecting..." : "Reject Submission"}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ================= DELETE CONFIRMATION MODAL ================= */}
        <Modal
          isOpen={!!deletingCollection}
          onClose={() => setDeletingCollection(null)}
          title="Delete Collection Record"
          maxWidth="sm"
        >
          {deletingCollection && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3 text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-medium">
                  Are you sure you want to delete collection #{deletingCollection.collectionNumber}?
                  {deletingCollection.status === "Approved" && (
                    <span className="block mt-1 font-bold">
                      The dealer&apos;s due balance and bank balance will be automatically reversed.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingCollection(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteCollectionMutation.isPending}
                  onClick={() => deleteCollectionMutation.mutate(deletingCollection._id)}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {deleteCollectionMutation.isPending ? "Deleting..." : "Delete Record"}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ================= RECEIPT IMAGE / DOCUMENT VIEWER MODAL ================= */}
        <Modal
          isOpen={!!previewReceipt}
          onClose={() => setPreviewReceipt(null)}
          title={previewReceipt?.title || "Bank Deposit Slip"}
          maxWidth="2xl"
        >
          {previewReceipt && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <p className="font-bold text-slate-900">{previewReceipt.dealerName || "Dealer Collection"}</p>
                  <p className="text-slate-500 text-[11px]">
                    Collection: <span className="font-mono font-medium">{previewReceipt.colNumber}</span> • M.R. #{previewReceipt.mrNo || "N/A"}
                  </p>
                </div>
                {previewReceipt.amount !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Collected Amount</span>
                    <span className="font-black text-emerald-700 text-base">{formatBDT(previewReceipt.amount)}</span>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center min-h-[320px] max-h-[500px]">
                {previewReceipt.url.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={previewReceipt.url}
                    className="w-full h-[450px]"
                    title="PDF Receipt Preview"
                  />
                ) : (
                  <img
                    src={previewReceipt.url}
                    alt="Bank Deposit Slip"
                    className="max-h-[480px] w-auto object-contain mx-auto"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <a
                  href={previewReceipt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Original File in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewReceipt(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
