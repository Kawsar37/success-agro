"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { formatBDT, formatDate } from "@/lib/utils";
import { Printer, Download } from "lucide-react";

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tax Invoice Preview & Print" maxWidth="2xl">
      <div className="space-y-6">
        <div className="flex justify-end gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>

        {/* Printable Invoice Document */}
        <div className="border border-slate-200 rounded-lg p-3.5 sm:p-8 bg-white text-slate-800 print:border-0 print:p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">SUCCESS AGRO LIMITED</h1>
              <p className="text-xs text-slate-500 mt-1">
                Plot 42, BSCIC Industrial Estate, Bogura, Bangladesh
              </p>
              <p className="text-xs text-slate-500">Phone: +8801712345678 | Email: billing@successagro.com.bd</p>
              <p className="text-xs font-semibold text-emerald-700 mt-1">BIN: 123456789-0101 (VAT Registered)</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-sm rounded border border-emerald-200">
                COMMERCIAL INVOICE
              </span>
              <p className="text-sm font-bold text-slate-900 mt-2">#{invoice.invoiceNumber}</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: {formatDate(invoice.invoiceDate)}</p>
              <p className="text-xs text-slate-500">Due Date: {formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-6 border-b border-slate-200 text-xs">
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">BILLED TO (DEALER):</p>
              <h4 className="font-bold text-slate-900 text-sm">{invoice.dealer?.businessName}</h4>
              <p className="text-slate-600 mt-0.5">Proprietor: {invoice.dealer?.proprietorName}</p>
              <p className="text-slate-600">{invoice.dealer?.address}</p>
              <p className="text-slate-600">Phone: {invoice.dealer?.phone}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">DISPATCH WAREHOUSE:</p>
              <h4 className="font-bold text-slate-900 text-sm">{invoice.warehouse?.name}</h4>
              <p className="text-slate-600 mt-0.5">Assigned Officer: {invoice.salesOfficer?.name || "Direct"}</p>
              <p className="text-slate-600">Payment Status: <strong className="text-slate-800">{invoice.paymentStatus}</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs mt-6 min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-2.5 px-3 text-left font-semibold">#</th>
                <th className="py-2.5 px-3 text-left font-semibold">Product Description</th>
                <th className="py-2.5 px-3 text-right font-semibold">Qty</th>
                <th className="py-2.5 px-3 text-right font-semibold">Unit Price</th>
                <th className="py-2.5 px-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items?.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {item.product?.name || "Agro Item"}
                    <span className="text-slate-500 text-[11px] block">{item.product?.packSize}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{formatBDT(item.unitPrice)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatBDT(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-6 border-t border-slate-200 mt-4 text-xs">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900">{formatBDT(invoice.subtotal)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Special Discount:</span>
                  <span>-{formatBDT(invoice.discountAmount)}</span>
                </div>
              )}
              {invoice.transportCharge > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Transport Delivery:</span>
                  <span>+{formatBDT(invoice.transportCharge)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-2">
                <span>Grand Total:</span>
                <span className="text-emerald-700">{formatBDT(invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Paid Amount:</span>
                <span className="font-medium">{formatBDT(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-rose-600 border-t border-slate-200 pt-1">
                <span>Outstanding Balance:</span>
                <span>{formatBDT(invoice.dueAmount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 mt-16 pt-8 text-xs text-center border-t border-slate-200">
            <div>
              <div className="h-10"></div>
              <p className="border-t border-slate-400 font-semibold pt-1 text-slate-700">Dealer Acknowledged Signature</p>
            </div>
            <div>
              <div className="h-10"></div>
              <p className="border-t border-slate-400 font-semibold pt-1 text-slate-700">For Success Agro Limited (Authorized)</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
