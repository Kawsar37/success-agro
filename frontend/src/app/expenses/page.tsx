"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBDT, formatDate } from "@/lib/utils";
import { Receipt } from "lucide-react";

export default function ExpensesPage() {
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await api.get("/accounts/expenses")).data.data,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Factory & Corporate Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational expenses, plant maintenance, raw material transport & utility bills
          </p>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Expense #</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Paid From Account</th>
                    <th className="py-3.5 px-4">Payee / Remarks</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!expenses || expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No expenses logged yet
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp: any) => (
                      <tr key={exp._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">{exp.expenseNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{exp.category?.name}</td>
                        <td className="py-3 px-4 text-slate-600">{exp.account?.name}</td>
                        <td className="py-3 px-4 text-slate-600">{exp.payeeName || exp.notes || "-"}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(exp.expenseDate)}</td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 text-sm">
                          {formatBDT(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
