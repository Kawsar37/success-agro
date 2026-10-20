"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { formatBDT, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  BookOpen,
  Users,
  Printer,
  Plus,
  Search,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";

export default function LedgerPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        </AppShell>
      }
    >
      <LedgerContent />
    </Suspense>
  );
}

function LedgerContent() {
  const { user, isAdmin, isSalesOfficer } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const urlDealerId = searchParams.get("dealerId") || "";

  // Main Tab: "customer" (Image 1) or "salesOfficer" (Image 2)
  const [activeTab, setActiveTab] = useState<"customer" | "salesOfficer">("customer");

  // ================= TAB 1: CUSTOMER LEDGER STATE =================
  const [selectedDealerId, setSelectedDealerId] = useState<string>(urlDealerId);
  const [periodNote, setPeriodNote] = useState<string>("পীরগাছা - জুলাই / ডিসেম্বর - ২০২৪");
  const [dealerSearchTerm, setDealerSearchTerm] = useState<string>("");

  // Modals for Customer Ledger
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<"INVOICE" | "PAYMENT" | "BONUS" | "RETURN">("INVOICE");
  const [editingEntry, setEditingEntry] = useState<any | null>(null);

  const initialForm = {
    date: new Date().toISOString().split("T")[0],
    invoiceSlNo: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    moneyReceiptNumber: "",
    notes: "",
  };
  const [formData, setFormData] = useState(initialForm);

  // ================= TAB 2: SALES OFFICER LEDGER STATE =================
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("");

  // 1. Fetch Dealers List
  const { data: dealers, isLoading: loadingDealers } = useQuery({
    queryKey: ["dealers-ledger-summary"],
    queryFn: async () => (await api.get("/accounts/dealers-ledger-summary")).data.data,
  });

  // Auto-select dealer
  React.useEffect(() => {
    if (!selectedDealerId && dealers && dealers.length > 0) {
      if (urlDealerId && dealers.some((d: any) => d._id === urlDealerId)) {
        setSelectedDealerId(urlDealerId);
      } else {
        setSelectedDealerId(dealers[0]._id);
      }
    }
  }, [dealers, selectedDealerId, urlDealerId]);

  // 2. Fetch Selected Dealer Customer Ledger
  const {
    data: dealerLedgerData,
    isLoading: loadingDealerLedger,
  } = useQuery({
    queryKey: ["dealer-ledger", selectedDealerId],
    queryFn: async () => {
      if (!selectedDealerId) return null;
      return (await api.get(`/accounts/dealer-ledger/${selectedDealerId}`)).data.data;
    },
    enabled: !!selectedDealerId,
  });

  // 3. Fetch Sales Officers List
  const { data: salesOfficers, isLoading: loadingOfficers } = useQuery({
    queryKey: ["sales-officers-list"],
    queryFn: async () => (await api.get("/accounts/sales-officers-list")).data.data,
  });

  // Auto-select Sales Officer
  React.useEffect(() => {
    if (!selectedOfficerId && salesOfficers && salesOfficers.length > 0) {
      if (isSalesOfficer && user?.salesOfficerProfile) {
        const found = salesOfficers.find((so: any) => so._id === user.salesOfficerProfile);
        if (found) setSelectedOfficerId(found._id);
        else setSelectedOfficerId(salesOfficers[0]._id);
      } else {
        setSelectedOfficerId(salesOfficers[0]._id);
      }
    }
  }, [salesOfficers, selectedOfficerId, isSalesOfficer, user]);

  // 4. Fetch Sales Officer Dealer Ledger Data
  const {
    data: officerLedgerData,
    isLoading: loadingOfficerLedger,
  } = useQuery({
    queryKey: ["sales-officer-ledger", selectedOfficerId],
    queryFn: async () => {
      if (!selectedOfficerId) return null;
      return (await api.get(`/accounts/sales-officer-ledger/${selectedOfficerId}`)).data.data;
    },
    enabled: !!selectedOfficerId && activeTab === "salesOfficer",
  });

  // 5. Add Manual Entry Mutation
  const addEntryMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post("/accounts/dealer-ledger", payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["dealers-ledger-summary"] });
      queryClient.invalidateQueries({ queryKey: ["sales-officer-ledger"] });
      toast.success("Ledger entry added successfully!");
      setIsManualModalOpen(false);
      setFormData(initialForm);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to add ledger entry");
    },
  });

  // 6. Delete Entry Mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/accounts/dealer-ledger/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["dealers-ledger-summary"] });
      queryClient.invalidateQueries({ queryKey: ["sales-officer-ledger"] });
      toast.success("Ledger entry removed and balance updated");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete entry");
    },
  });

  // Filtered dealers for selector
  const filteredDealers = useMemo(() => {
    if (!dealers) return [];
    if (!dealerSearchTerm.trim()) return dealers;
    const term = dealerSearchTerm.toLowerCase();
    return dealers.filter(
      (d: any) =>
        d.businessName?.toLowerCase().includes(term) ||
        d.dealerCode?.toLowerCase().includes(term) ||
        d.phone?.includes(term)
    );
  }, [dealers, dealerSearchTerm]);

  const currentDealer = dealerLedgerData?.dealer || dealers?.find((d: any) => d._id === selectedDealerId);
  const ledgerEntries = dealerLedgerData?.entries || [];
  const ledgerSummary = dealerLedgerData?.summary || {};

  const handleOpenAddModal = (type: "INVOICE" | "PAYMENT" | "BONUS" | "RETURN") => {
    setEntryType(type);
    setEditingEntry(null);
    const count = ledgerEntries.length + 1;
    setFormData({
      date: new Date().toISOString().split("T")[0],
      invoiceSlNo: String(count),
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      moneyReceiptNumber: "",
      notes: "",
    });
    setIsManualModalOpen(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealerId) {
      toast.error("Please select a dealer");
      return;
    }
    const numAmt = Number(formData.amount);
    if (!numAmt || numAmt <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    const payload: any = {
      dealerId: selectedDealerId,
      date: formData.date,
      notes: formData.notes,
    };

    if (entryType === "INVOICE") {
      payload.transactionType = "INVOICE";
      payload.invoiceNumber = formData.invoiceSlNo?.trim() || String(ledgerEntries.length + 1);
      payload.invoiceAmount = numAmt;
    } else if (entryType === "PAYMENT") {
      payload.transactionType = "COLLECTION";
      payload.paymentAmount = numAmt;
      payload.paymentDate = formData.paymentDate || formData.date;
      payload.moneyReceiptNumber = formData.moneyReceiptNumber?.trim();
    } else if (entryType === "BONUS") {
      payload.transactionType = "ADJUSTMENT";
      payload.bonusAmount = numAmt;
    } else if (entryType === "RETURN") {
      payload.transactionType = "SALES_RETURN";
      payload.returnAmount = numAmt;
    }

    addEntryMutation.mutate(payload);
  };

  return (
    <AppShell>
      <div className="space-y-6 print:space-y-0 print:m-0 print:p-0">
        {/* ================= TOP HEADER & TABS ================= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dealer Ledger</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Simple, authentic Customer Ledger and Sales Officer territory reports
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Ledger Area Only</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-slate-200 print:hidden overflow-x-auto no-scrollbar flex-nowrap pb-1">
          <button
            onClick={() => setActiveTab("customer")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === "customer"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Customer Ledger (গ্রাহক খতিয়ান)</span>
          </button>
          <button
            onClick={() => setActiveTab("salesOfficer")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === "salesOfficer"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Sales Officer Dealer Ledger (এস ও খতিয়ান)</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: CUSTOMER LEDGER (EXACTLY MATCHING IMAGE 1)                   */}
        {/* =================================================================== */}
        {activeTab === "customer" && (
          <div className="space-y-4 print:space-y-0 print:m-0 print:p-0">
            {/* Dealer Select Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-start md:items-center justify-between print:hidden">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full md:w-auto">
                <div className="w-full sm:w-80">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Dealer / Customer
                  </label>
                  <select
                    value={selectedDealerId}
                    onChange={(e) => setSelectedDealerId(e.target.value)}
                    className="w-full text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                  >
                    {dealers?.map((d: any) => (
                      <option key={d._id} value={d._id}>
                        {d.dealerCode} - {d.businessName} ({d.address})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Period Note / সেশন
                  </label>
                  <input
                    type="text"
                    value={periodNote}
                    onChange={(e) => setPeriodNote(e.target.value)}
                    placeholder="e.g. পীরগাছা - জুলাই / ডিসেম্বর - ২০২৪"
                    className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg w-full sm:w-64 bg-slate-50"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleOpenAddModal("INVOICE")}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Invoice
                  </button>
                  <button
                    onClick={() => handleOpenAddModal("PAYMENT")}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Payment
                  </button>
                  <button
                    onClick={() => handleOpenAddModal("BONUS")}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Bonus
                  </button>
                </div>
              )}
            </div>

            {/* Authentic Customer Ledger Sheet (Matches Image 1) */}
            <div id="printable-customer-ledger" className="printable-ledger-sheet bg-white rounded-xl border border-slate-300 shadow-sm p-3.5 sm:p-8 print:p-0 print:m-0 print:border-none print:shadow-none text-slate-900 font-sans">
              {/* Top Handwritten Note Banner */}
              <div className="flex justify-center mb-2">
                <span className="bg-amber-100 text-amber-950 font-bold px-6 py-1 rounded text-sm sm:text-base border border-amber-300 shadow-2xs font-serif">
                  {periodNote}
                </span>
              </div>

              {/* Title Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Customer Ledger
                </h2>
              </div>

              {/* Customer Metadata Header Block (Matching Image 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200 text-xs sm:text-sm font-medium">
                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-36 text-slate-600 font-semibold">Customer Name :</span>
                    <strong className="text-slate-900">{currentDealer?.businessName || "-"}</strong>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-slate-600 font-semibold">Address :</span>
                    <span className="text-slate-800">{currentDealer?.address || "-"}</span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:text-right">
                  <div className="flex sm:justify-end">
                    <span className="w-36 text-slate-600 font-semibold text-left sm:text-right sm:mr-2">Date :</span>
                    <strong className="text-slate-900">{formatDate(new Date())}</strong>
                  </div>
                  <div className="flex sm:justify-end">
                    <span className="w-36 text-slate-600 font-semibold text-left sm:text-right sm:mr-2">Mobile No :</span>
                    <span className="text-slate-800">{currentDealer?.phone || "-"}</span>
                  </div>
                  <div className="flex sm:justify-end">
                    <span className="w-36 text-slate-600 font-semibold text-left sm:text-right sm:mr-2">Customer Code :</span>
                    <strong className="text-slate-900">{currentDealer?.dealerCode || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* The 3-Section Customer Ledger Table (Exact Match to Image 1) */}
              {loadingDealerLedger ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-xs border-collapse border border-slate-700 min-w-[780px]">
                    {/* Top Multi-Header */}
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-700">
                        <th colSpan={3} className="py-2 px-3 text-center border-r border-slate-700 uppercase tracking-wider">
                          INVOICE
                        </th>
                        <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-700 uppercase tracking-wider">
                          PAYMENT
                        </th>
                        <th className="py-2 px-3 text-center uppercase tracking-wider">
                          Bonus
                        </th>
                        {isAdmin && (
                          <th className="py-2 px-2 text-center w-12 border-l border-slate-700 print:hidden">
                            Action
                          </th>
                        )}
                      </tr>
                      <tr className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-700 text-[11px]">
                        {/* Invoice Side */}
                        <th className="py-2 px-3 text-center border-r border-slate-400 w-24">Invoice SL NO</th>
                        <th className="py-2 px-3 text-center border-r border-slate-400 w-32">Invoice Date</th>
                        <th className="py-2 px-3 text-right border-r border-slate-700 w-32">Total Amount</th>

                        {/* Payment Side */}
                        <th className="py-2 px-3 text-center border-r border-slate-400 w-32">Payment Date</th>
                        <th className="py-2 px-3 text-right border-r border-slate-700 w-32">Amount</th>

                        {/* Bonus Side */}
                        <th className="py-2 px-3 text-right w-28">Amount</th>

                        {isAdmin && <th className="py-2 px-2 border-l border-slate-700 print:hidden"></th>}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-300 font-mono">
                      {ledgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-slate-400 font-sans">
                            No ledger transactions recorded yet. Add an invoice or payment above.
                          </td>
                        </tr>
                      ) : (
                        ledgerEntries.map((row: any, idx: number) => {
                          const isInvoice = (row.debit || 0) > 0;
                          const isPayment = (row.credit || 0) > 0;
                          const isBonus = (row.bonusAmount || 0) > 0;

                          return (
                            <tr key={row._id} className="hover:bg-slate-50/70">
                              {/* Invoice Side */}
                              <td className="py-1.5 px-3 text-center border-r border-slate-400 font-semibold">
                                {isInvoice ? row.invoiceNumber || row.slNo || idx + 1 : ""}
                              </td>
                              <td className="py-1.5 px-3 text-center border-r border-slate-400">
                                {isInvoice && row.date ? formatDate(row.date) : ""}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold border-r border-slate-700">
                                {isInvoice ? (row.debit).toLocaleString() : ""}
                              </td>

                              {/* Payment Side */}
                              <td className="py-1.5 px-3 text-center border-r border-slate-400">
                                {isPayment && row.paymentDate ? formatDate(row.paymentDate) : ""}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold border-r border-slate-700 text-emerald-800">
                                {isPayment ? (row.credit).toLocaleString() : ""}
                              </td>

                              {/* Bonus Side */}
                              <td className="py-1.5 px-3 text-right font-bold text-amber-800">
                                {isBonus ? (row.bonusAmount).toLocaleString() : ""}
                              </td>

                              {isAdmin && (
                                <td className="py-1 px-2 text-center border-l border-slate-700 print:hidden">
                                  <button
                                    onClick={() => {
                                      if (confirm("Delete this ledger entry and reverse balance?")) {
                                        deleteEntryMutation.mutate(row._id);
                                      }
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                    title="Delete entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Footer Summary Rows (Matches Image 1) */}
                    <tfoot>
                      {/* Balance Row */}
                      <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-700">
                        <td colSpan={2} className="py-2 px-3 text-right border-r border-slate-400 font-sans uppercase">
                          Balance :
                        </td>
                        <td className="py-2 px-3 text-right border-r border-slate-700 font-mono text-sm">
                          {(ledgerSummary.totalInvoiced || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-slate-400 font-mono">
                          0
                        </td>
                        <td className="py-2 px-3 text-right border-r border-slate-700 font-mono text-emerald-800 text-sm">
                          {(ledgerSummary.totalPaid || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-900 text-sm">
                          {(ledgerSummary.totalBonus || 0).toLocaleString()}
                        </td>
                        {isAdmin && <td className="border-l border-slate-700 print:hidden"></td>}
                      </tr>

                      {/* Closing Balance Row */}
                      <tr className="bg-slate-200/90 font-black text-slate-900 border-t border-slate-400">
                        <td colSpan={2} className="py-2.5 px-3 text-right border-r border-slate-400 font-sans uppercase text-sm">
                          Closing Balance :
                        </td>
                        <td className="py-2.5 px-3 text-right border-r border-slate-700 font-mono text-sm">
                          {/* Left blank / total */}
                        </td>
                        <td colSpan={2} className="py-2.5 px-3 text-center border-r border-slate-700 font-mono text-base font-black text-rose-900">
                          {(ledgerSummary.closingBalance || 0).toLocaleString()} ৳
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          0
                        </td>
                        {isAdmin && <td className="border-l border-slate-700 print:hidden"></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Signatures Footer for Print */}
              <div className="mt-16 pt-8 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-700 hidden print:grid">
                <div>
                  <div className="border-t border-slate-400 pt-1">Prepared By</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1">Sales Officer Signature</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1">Authorized Management</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SALES OFFICER DEALER LEDGER (EXACTLY MATCHING IMAGE 2)        */}
        {/* =================================================================== */}
        {activeTab === "salesOfficer" && (
          <div className="space-y-4 print:space-y-0 print:m-0 print:p-0">
            {/* Sales Officer Select Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between print:hidden">
              <div className="w-full sm:w-80">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Select Sales Officer
                </label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                >
                  {salesOfficers?.map((so: any) => (
                    <option key={so._id} value={so._id}>
                      {so.officerCode} - {so.name} (Area: {so.territory?.name || "N/A"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500">
                Dealers in Territory: <strong className="text-slate-900">{officerLedgerData?.rows?.length || 0}</strong>
              </div>
            </div>

            {/* Authentic Sales Officer Customer Ledger Sheet (Matches Image 2) */}
            <div id="printable-officer-ledger" className="printable-ledger-sheet bg-white rounded-xl border border-slate-300 shadow-sm p-3.5 sm:p-8 print:p-0 print:m-0 print:border-none print:shadow-none text-slate-900 font-sans">
              {/* Title Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Customer Ledger
                </h2>
              </div>

              {/* Officer Metadata Header (Matches Image 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 border-b border-slate-300 text-xs sm:text-sm font-medium">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 text-slate-600 font-bold">Officer Name:</span>
                    <strong className="text-slate-900">{officerLedgerData?.officer?.name || "N/A"}</strong>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-600 font-bold">Name / Area:</span>
                    <span className="text-slate-800 font-semibold">{officerLedgerData?.officer?.territory || "N/A"}</span>
                  </div>
                </div>

                <div className="space-y-1 sm:text-right">
                  <div className="flex sm:justify-end">
                    <span className="w-28 text-slate-600 font-bold text-left sm:text-right sm:mr-2">Date:</span>
                    <strong className="text-slate-900">{formatDate(new Date())}</strong>
                  </div>
                  <div className="flex sm:justify-end">
                    <span className="w-28 text-slate-600 font-bold text-left sm:text-right sm:mr-2">Mobile No:</span>
                    <span className="text-slate-800">{officerLedgerData?.officer?.phone || "N/A"}</span>
                  </div>
                </div>

                <div className="space-y-1 sm:text-right">
                  <div className="flex sm:justify-end">
                    <span className="w-32 text-slate-600 font-bold text-left sm:text-right sm:mr-2">Customer Code:</span>
                    <strong className="text-slate-900">{officerLedgerData?.officer?.officerCode || "N/A"}</strong>
                  </div>
                </div>
              </div>

              {/* 11-Column Table (Exact Columns of Image 2) */}
              {loadingOfficerLedger ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-[11px] border-collapse border border-slate-700 min-w-[850px]">
                    <thead className="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-700">
                      <tr className="divide-x divide-slate-400">
                        <th className="py-2 px-2 text-center w-12">Code</th>
                        <th className="py-2 px-3 text-left">Customer Name</th>
                        <th className="py-2 px-3 text-left">Address</th>
                        <th className="py-2 px-2 text-right">Total Inv. Amo. Tk</th>
                        <th className="py-2 px-2 text-right">Return</th>
                        <th className="py-2 px-2 text-right bg-slate-50">Net Sales</th>
                        <th className="py-2 px-2 text-right">Payment</th>
                        <th className="py-2 px-2 text-right">Bonus</th>
                        <th className="py-2 px-2 text-right bg-slate-50">Balance</th>
                        <th className="py-2 px-2 text-right">Over Dues</th>
                        <th className="py-2 px-2 text-right bg-slate-200/90 font-black">Grand Total</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-300 font-mono">
                      {!officerLedgerData?.rows || officerLedgerData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400 font-sans">
                            No dealers assigned to this sales officer yet.
                          </td>
                        </tr>
                      ) : (
                        officerLedgerData.rows.map((row: any) => (
                          <tr key={row._id} className="hover:bg-slate-50/70 divide-x divide-slate-300">
                            <td className="py-1 px-2 text-center font-bold text-slate-900 font-sans">
                              {row.code}
                            </td>
                            <td className="py-1 px-3 font-semibold text-slate-900 font-sans truncate max-w-xs">
                              {row.customerName}
                            </td>
                            <td className="py-1 px-3 text-slate-600 font-sans truncate max-w-xs">
                              {row.address}
                            </td>
                            <td className="py-1 px-2 text-right font-bold">
                              {row.totalInvAmoTk ? row.totalInvAmoTk.toLocaleString() : "0"}
                            </td>
                            <td className="py-1 px-2 text-right text-rose-700">
                              {row.returnAmount ? row.returnAmount.toLocaleString() : "0"}
                            </td>
                            <td className="py-1 px-2 text-right font-bold bg-slate-50/50">
                              {row.netSales ? row.netSales.toLocaleString() : "0"}
                            </td>
                            <td className="py-1 px-2 text-right text-emerald-800 font-bold">
                              {row.payment ? row.payment.toLocaleString() : "0"}
                            </td>
                            <td className="py-1 px-2 text-right text-amber-800">
                              {row.bonus ? row.bonus.toLocaleString() : "0"}
                            </td>
                            <td className="py-1 px-2 text-right font-bold bg-slate-50/50">
                              {row.balance ? row.balance.toLocaleString() : "0"}
                            </td>
                            <td className="py-1 px-2 text-right text-slate-600">
                              {row.overDues ? row.overDues.toLocaleString() : "0"}
                            </td>
                            <td className="py-1 px-2 text-right font-black text-slate-900 bg-slate-100">
                              {row.grandTotal ? row.grandTotal.toLocaleString() : "0"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>

                    {/* Bottom Summary Totals Row (Matches Image 2) */}
                    <tfoot>
                      <tr className="bg-slate-200/95 font-black text-slate-900 border-t-2 border-slate-700 divide-x divide-slate-400">
                        <td colSpan={3} className="py-2.5 px-3 text-right font-sans uppercase text-xs">
                          Total:
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {(officerLedgerData?.totals?.totalInvAmoTk || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right text-rose-800">
                          {(officerLedgerData?.totals?.returnAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold">
                          {(officerLedgerData?.totals?.netSales || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right text-emerald-800">
                          {(officerLedgerData?.totals?.payment || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right text-amber-800">
                          {(officerLedgerData?.totals?.bonus || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold">
                          {(officerLedgerData?.totals?.balance || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {(officerLedgerData?.totals?.overDues || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-sm bg-slate-300/80">
                          {(officerLedgerData?.totals?.grandTotal || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Signatures Footer for Print */}
              <div className="mt-16 pt-8 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-700 hidden print:grid">
                <div>
                  <div className="border-t border-slate-400 pt-1">Sales Officer Signature</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1">Accounts Verification</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1">Managing Director / Admin</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Manual Customer Ledger Entry (Invoice, Payment, Bonus, Return) */}
        <Modal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          title={`Add ${
            entryType === "INVOICE"
              ? "Invoice Entry"
              : entryType === "PAYMENT"
              ? "Payment Entry"
              : entryType === "BONUS"
              ? "Bonus Entry"
              : "Product Return Entry"
          } to Ledger`}
          maxWidth="md"
        >
          <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
              <strong className="text-slate-900 text-sm">{currentDealer?.businessName}</strong>
              <span className="text-slate-500 text-xs block">Code: {currentDealer?.dealerCode}</span>
            </div>

            {/* Entry Type Selector */}
            <div className="flex gap-2">
              {(["INVOICE", "PAYMENT", "BONUS", "RETURN"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntryType(t)}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs border transition ${
                    entryType === t
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Date Input */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  {entryType === "PAYMENT" ? "Payment Date *" : "Entry Date *"}
                </label>
                <input
                  type="date"
                  required
                  value={entryType === "PAYMENT" ? formData.paymentDate : formData.date}
                  onChange={(e) =>
                    entryType === "PAYMENT"
                      ? setFormData({ ...formData, paymentDate: e.target.value })
                      : setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {entryType === "INVOICE" && (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Invoice SL NO *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1, 2, 3..."
                    value={formData.invoiceSlNo}
                    onChange={(e) => setFormData({ ...formData, invoiceSlNo: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              )}

              {entryType === "PAYMENT" && (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    M.R. No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MR-1045"
                    value={formData.moneyReceiptNumber}
                    onChange={(e) => setFormData({ ...formData, moneyReceiptNumber: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                {entryType === "INVOICE"
                  ? "Total Invoice Amount (BDT ৳) *"
                  : entryType === "PAYMENT"
                  ? "Payment Amount (BDT ৳) *"
                  : entryType === "BONUS"
                  ? "Bonus Amount (BDT ৳) *"
                  : "Return Amount (BDT ৳) *"}
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 50000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-base font-bold text-slate-900"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Description / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cheque / Cash / Rebate / Adjustment notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addEntryMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm disabled:opacity-50"
              >
                {addEntryMutation.isPending ? "Adding..." : "Add to Customer Ledger"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
