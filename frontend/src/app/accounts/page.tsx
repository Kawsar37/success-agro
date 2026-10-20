"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBDT, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Landmark,
  Smartphone,
  Wallet,
  Plus,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  X,
  History,
  CheckCircle,
} from "lucide-react";

export default function AccountsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  // Add Account Form
  const [addAccountForm, setAddAccountForm] = useState({
    name: "",
    type: "Cash",
    bankName: "",
    branchName: "",
    accountNumber: "",
    openingBalance: "",
    notes: "",
  });

  // Manual Adjustment (Cash In / Out) Form
  const [adjustmentForm, setAdjustmentForm] = useState({
    accountId: "",
    type: "DEPOSIT", // "DEPOSIT" | "WITHDRAWAL"
    amount: "",
    reason: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Transfer Form
  const [transferForm, setTransferForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    referenceNumber: "",
    remarks: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Edit Account Form
  const [editAccountForm, setEditAccountForm] = useState({
    name: "",
    bankName: "",
    branchName: "",
    accountNumber: "",
    currentBalance: "",
    notes: "",
  });

  // Fetch Accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => (await api.get("/accounts/accounts")).data.data,
  });

  // Fetch Recent Transfers
  const { data: transfers } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => (await api.get("/accounts/transfers")).data.data,
  });

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/accounts/accounts", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created successfully!");
      setIsAddAccountOpen(false);
      setAddAccountForm({
        name: "",
        type: "Cash",
        bankName: "",
        branchName: "",
        accountNumber: "",
        openingBalance: "",
        notes: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create account");
    },
  });

  const adjustmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/accounts/manual-adjustment", payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(
        variables.type === "DEPOSIT"
          ? "Cash/Fund deposited successfully!"
          : "Cash/Fund withdrawn successfully!"
      );
      setIsAdjustmentOpen(false);
      setAdjustmentForm({
        accountId: "",
        type: "DEPOSIT",
        amount: "",
        reason: "",
        date: new Date().toISOString().split("T")[0],
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Manual adjustment failed");
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/accounts/transfer", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast.success("Funds transferred successfully between accounts!");
      setIsTransferOpen(false);
      setTransferForm({
        fromAccountId: "",
        toAccountId: "",
        amount: "",
        referenceNumber: "",
        remarks: "",
        date: new Date().toISOString().split("T")[0],
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Fund transfer failed");
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/accounts/accounts/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account details & balance updated successfully!");
      setEditingAccount(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update account");
    },
  });

  const handleOpenEdit = (acc: any) => {
    setEditingAccount(acc);
    setEditAccountForm({
      name: acc.name,
      bankName: acc.bankName || "",
      branchName: acc.branchName || "",
      accountNumber: acc.accountNumber || "",
      currentBalance: String(acc.currentBalance),
      notes: acc.notes || "",
    });
  };

  const handleOpenQuickAdjust = (accId: string, defaultType: "DEPOSIT" | "WITHDRAWAL") => {
    setAdjustmentForm({
      accountId: accId,
      type: defaultType,
      amount: "",
      reason: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsAdjustmentOpen(true);
  };

  const totalLiquid = accounts?.reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0) || 0;
  const totalCash = accounts?.filter((a: any) => a.type === "Cash").reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0) || 0;
  const totalBank = accounts?.filter((a: any) => a.type === "Bank").reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0) || 0;
  const totalMobile = accounts?.filter((a: any) => a.type === "MobileBanking").reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0) || 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header & Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Cash & Bank Accounts Management
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manual control of factory cash, corporate bank reserves & funds movement
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setIsAdjustmentOpen(true)}
                className="flex-1 sm:flex-none justify-center bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Manual Cash In / Out</span>
              </button>

              <button
                onClick={() => setIsTransferOpen(true)}
                className="flex-1 sm:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Transfer Funds</span>
              </button>

              <button
                onClick={() => setIsAddAccountOpen(true)}
                className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Account</span>
              </button>
            </div>
          )}
        </div>

        {/* Reserves Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
            <span className="text-[11px] font-bold text-emerald-700 uppercase block">Total Liquid Reserves</span>
            <span className="text-2xl font-bold text-emerald-900 mt-1 block">{formatBDT(totalLiquid)}</span>
            <span className="text-[11px] text-emerald-600">All cash, bank & mobile funds</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase block flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-slate-600" /> Factory Petty Cash
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{formatBDT(totalCash)}</span>
            <span className="text-[11px] text-slate-400">On-hand physical cash</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase block flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-indigo-600" /> Bank Deposits
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{formatBDT(totalBank)}</span>
            <span className="text-[11px] text-slate-400">Corporate checking & CD A/Cs</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase block flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-pink-600" /> Mobile Banking
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{formatBDT(totalMobile)}</span>
            <span className="text-[11px] text-slate-400">bKash, Nagad & Rocket</span>
          </div>
        </div>

        {/* Account Cards */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {accounts?.map((acc: any) => {
              const isBank = acc.type === "Bank";
              const isMobile = acc.type === "MobileBanking";

              return (
                <div
                  key={acc._id}
                  className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        {isBank ? (
                          <Landmark className="w-5 h-5 text-indigo-600" />
                        ) : isMobile ? (
                          <Smartphone className="w-5 h-5 text-pink-600" />
                        ) : (
                          <Wallet className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {acc.type}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{acc.name}</h3>
                      {acc.bankName && (
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          {acc.bankName} {acc.branchName && `(${acc.branchName})`}
                        </p>
                      )}
                      {acc.accountNumber && (
                        <p className="text-xs text-slate-400 font-mono mt-0.5">A/C: {acc.accountNumber}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-baseline mb-3">
                      <span className="text-xs text-slate-500 font-medium">Current Balance:</span>
                      <span className="text-xl font-bold text-emerald-700">{formatBDT(acc.currentBalance)}</span>
                    </div>

                    {isAdmin && (
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-50">
                        <button
                          onClick={() => handleOpenQuickAdjust(acc._id, "DEPOSIT")}
                          className="py-1 px-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded text-center transition-colors flex items-center justify-center gap-1"
                        >
                          <ArrowDownLeft className="w-3 h-3" /> Cash In
                        </button>
                        <button
                          onClick={() => handleOpenQuickAdjust(acc._id, "WITHDRAWAL")}
                          className="py-1 px-2 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded text-center transition-colors flex items-center justify-center gap-1"
                        >
                          <ArrowUpRight className="w-3 h-3" /> Cash Out
                        </button>
                        <button
                          onClick={() => handleOpenEdit(acc)}
                          className="py-1 px-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded text-center transition-colors flex items-center justify-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Fund Transfers Section */}
        {transfers && transfers.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-800 text-sm">Recent Account Transfers Log</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Transfer #</th>
                    <th className="py-2.5 px-3">From Account</th>
                    <th className="py-2.5 px-3">To Account</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Remarks</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.slice(0, 5).map((t: any) => (
                    <tr key={t._id}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{t.transferNumber}</td>
                      <td className="py-2 px-3 text-rose-600 font-medium">{t.fromAccount?.name}</td>
                      <td className="py-2 px-3 text-emerald-600 font-medium">{t.toAccount?.name}</td>
                      <td className="py-2 px-3 text-slate-500">{formatDate(t.transferDate)}</td>
                      <td className="py-2 px-3 text-slate-500">{t.remarks || "-"}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatBDT(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: ADD ACCOUNT */}
        {isAddAccountOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Create New Financial Account</h3>
                <button onClick={() => setIsAddAccountOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!addAccountForm.name.trim()) return toast.error("Account name is required");
                  createAccountMutation.mutate({
                    ...addAccountForm,
                    openingBalance: Number(addAccountForm.openingBalance) || 0,
                    currentBalance: Number(addAccountForm.openingBalance) || 0,
                  });
                }}
                className="p-5 space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Account Name *</label>
                  <input
                    type="text"
                    required
                    value={addAccountForm.name}
                    onChange={(e) => setAddAccountForm({ ...addAccountForm, name: e.target.value })}
                    placeholder="e.g. Factory Petty Cash or Sonali Bank CD"
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Account Type *</label>
                  <select
                    value={addAccountForm.type}
                    onChange={(e) => setAddAccountForm({ ...addAccountForm, type: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                  >
                    <option value="Cash">Cash (Physical Register / Safe)</option>
                    <option value="Bank">Bank Account (Commercial Bank)</option>
                    <option value="MobileBanking">Mobile Banking (bKash / Nagad / Rocket)</option>
                  </select>
                </div>

                {addAccountForm.type === "Bank" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={addAccountForm.bankName}
                        onChange={(e) => setAddAccountForm({ ...addAccountForm, bankName: e.target.value })}
                        placeholder="e.g. Islami Bank"
                        className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">Branch</label>
                      <input
                        type="text"
                        value={addAccountForm.branchName}
                        onChange={(e) => setAddAccountForm({ ...addAccountForm, branchName: e.target.value })}
                        placeholder="e.g. Bogura Branch"
                        className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {addAccountForm.type !== "Cash" && (
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Account / Wallet Number</label>
                    <input
                      type="text"
                      value={addAccountForm.accountNumber}
                      onChange={(e) => setAddAccountForm({ ...addAccountForm, accountNumber: e.target.value })}
                      placeholder="e.g. 2050123456789 or 017xxxxxxxx"
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Opening Cash Balance (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={addAccountForm.openingBalance}
                    onChange={(e) => setAddAccountForm({ ...addAccountForm, openingBalance: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddAccountOpen(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAccountMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    {createAccountMutation.isPending ? "Creating..." : "Save Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: MANUAL ADJUSTMENT (CASH IN / CASH OUT) */}
        {isAdjustmentOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Manual Cash In / Cash Out</h3>
                <button onClick={() => setIsAdjustmentOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adjustmentForm.accountId) return toast.error("Please select an account");
                  if (!adjustmentForm.amount || Number(adjustmentForm.amount) <= 0)
                    return toast.error("Please enter a valid amount");
                  adjustmentMutation.mutate({
                    ...adjustmentForm,
                    amount: Number(adjustmentForm.amount),
                  });
                }}
                className="p-5 space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Target Account *</label>
                  <select
                    required
                    value={adjustmentForm.accountId}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, accountId: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="">-- Choose Cash or Bank Account --</option>
                    {accounts?.map((a: any) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.type}) - Balance: {formatBDT(a.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Action Type</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustmentForm({ ...adjustmentForm, type: "DEPOSIT" })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                          adjustmentForm.type === "DEPOSIT"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" /> Cash In (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustmentForm({ ...adjustmentForm, type: "WITHDRAWAL" })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                          adjustmentForm.type === "WITHDRAWAL"
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Cash Out (-)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Amount (৳) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={adjustmentForm.amount}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                      placeholder="e.g. 15000"
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Entry Reason / Particulars *</label>
                  <input
                    type="text"
                    required
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                    placeholder="e.g. Capital injection, emergency factory cash, bank profit"
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={adjustmentForm.date}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdjustmentOpen(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustmentMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    {adjustmentMutation.isPending ? "Recording..." : "Confirm Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: TRANSFER FUNDS BETWEEN ACCOUNTS */}
        {isTransferOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Transfer Funds Between Accounts</h3>
                <button onClick={() => setIsTransferOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!transferForm.fromAccountId || !transferForm.toAccountId)
                    return toast.error("Please select both source and destination accounts");
                  if (transferForm.fromAccountId === transferForm.toAccountId)
                    return toast.error("Source and destination accounts must be different");
                  if (!transferForm.amount || Number(transferForm.amount) <= 0)
                    return toast.error("Please enter a valid amount");
                  transferMutation.mutate({
                    ...transferForm,
                    amount: Number(transferForm.amount),
                  });
                }}
                className="p-5 space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">From Account (Source) *</label>
                  <select
                    required
                    value={transferForm.fromAccountId}
                    onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="">-- Choose Account to Deduct From --</option>
                    {accounts?.map((a: any) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.type}) - Balance: {formatBDT(a.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">To Account (Destination) *</label>
                  <select
                    required
                    value={transferForm.toAccountId}
                    onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="">-- Choose Account to Credit Into --</option>
                    {accounts
                      ?.filter((a: any) => a._id !== transferForm.fromAccountId)
                      .map((a: any) => (
                        <option key={a._id} value={a._id}>
                          {a.name} ({a.type}) - Balance: {formatBDT(a.currentBalance)}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Transfer Amount (৳) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                      placeholder="e.g. 50000"
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm font-bold text-indigo-700"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Transfer Date</label>
                    <input
                      type="date"
                      value={transferForm.date}
                      onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Reference / Slip Number</label>
                  <input
                    type="text"
                    value={transferForm.referenceNumber}
                    onChange={(e) => setTransferForm({ ...transferForm, referenceNumber: e.target.value })}
                    placeholder="e.g. Bank deposit slip #, TxID"
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Remarks / Note</label>
                  <input
                    type="text"
                    value={transferForm.remarks}
                    onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
                    placeholder="e.g. Cash withdrawn for factory payroll"
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsTransferOpen(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={transferMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    {transferMutation.isPending ? "Transferring..." : "Complete Transfer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT ACCOUNT / OVERRIDE BALANCE */}
        {editingAccount && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Edit Account: {editingAccount.name}</h3>
                <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateAccountMutation.mutate({
                    id: editingAccount._id,
                    payload: {
                      ...editAccountForm,
                      currentBalance: Number(editAccountForm.currentBalance),
                    },
                  });
                }}
                className="p-5 space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Account Name</label>
                  <input
                    type="text"
                    required
                    value={editAccountForm.name}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, name: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Manual Balance Override (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={editAccountForm.currentBalance}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, currentBalance: e.target.value })}
                    className="w-full py-2 px-3 border border-emerald-300 bg-emerald-50/50 rounded-lg text-sm font-bold text-emerald-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Admin direct balance adjustment
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Notes / Description</label>
                  <textarea
                    rows={2}
                    value={editAccountForm.notes}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, notes: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateAccountMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    {updateAccountMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
