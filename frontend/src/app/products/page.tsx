"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBDT } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Edit3,
  X,
  DollarSign,
  Tag,
  CheckCircle,
  Search,
} from "lucide-react";

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form state for adding new item
  const [newProduct, setNewProduct] = useState<{
    name: string;
    banglaName: string;
    packSize: string;
    cartonSize: string | number;
    tradePrice: string;
    mrp: string;
    productCode: string;
  }>({
    name: "",
    banglaName: "",
    packSize: "500 ml",
    cartonSize: "20",
    tradePrice: "",
    mrp: "",
    productCode: "",
  });

  // Form state for editing price / details
  const [editPriceForm, setEditPriceForm] = useState({
    tradePrice: "",
    mrp: "",
    packSize: "",
    cartonSize: "",
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/master-data/products")).data.data,
  });

  // Create Product Mutation
  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/master-data/products", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("New product item added successfully!");
      setIsAddModalOpen(false);
      setNewProduct({
        name: "",
        banglaName: "",
        packSize: "500 ml",
        cartonSize: "20",
        tradePrice: "",
        mrp: "",
        productCode: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to add product item");
    },
  });

  // Update Price / Product Mutation
  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/master-data/products/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product prices updated successfully!");
      setEditingProduct(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update prices");
    },
  });

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setEditPriceForm({
      tradePrice: String(prod.tradePrice || ""),
      mrp: String(prod.mrp || ""),
      packSize: prod.packSize || "",
      cartonSize: String(prod.cartonSize || "1"),
    });
  };

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editPriceForm.tradePrice || !editPriceForm.mrp) {
      toast.error("Both Dealer Price and Retail MRP are required");
      return;
    }
    updatePriceMutation.mutate({
      id: editingProduct._id,
      payload: {
        tradePrice: Number(editPriceForm.tradePrice),
        mrp: Number(editPriceForm.mrp),
        packSize: editPriceForm.packSize,
        cartonSize: Number(editPriceForm.cartonSize) || 1,
      },
    });
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!newProduct.tradePrice || !newProduct.mrp) {
      toast.error("Dealer price and Retail MRP are required");
      return;
    }

    createProductMutation.mutate({
      name: newProduct.name.trim(),
      banglaName: newProduct.banglaName.trim() || undefined,
      packSize: newProduct.packSize.trim() || "1 unit",
      cartonSize: Number(newProduct.cartonSize) || 1,
      tradePrice: Number(newProduct.tradePrice),
      mrp: Number(newProduct.mrp),
      productCode: newProduct.productCode.trim() || undefined,
    });
  };

  const filtered = products?.filter((p: any) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agro Products & Pricing</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manufactured agrochemicals, pack sizes & official dealer trade pricing
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-9 pr-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Cards */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filtered?.map((prod: any) => (
              <div
                key={prod._id}
                className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {prod.productCode}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{prod.category?.name || "Agro"}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mt-2">{prod.name}</h3>
                  {prod.banglaName && (
                    <p className="text-xs text-slate-500 font-medium">{prod.banglaName}</p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium">
                      Pack: {prod.packSize}
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium">
                      Carton: {prod.cartonSize || 1} units
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-baseline mb-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block uppercase font-semibold">Dealer Price</span>
                      <span className="text-lg font-bold text-emerald-700">{formatBDT(prod.tradePrice)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block uppercase font-semibold">MRP Retail</span>
                      <span className="text-sm font-semibold text-slate-600">{formatBDT(prod.mrp)}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="w-full mt-2 py-1.5 px-3 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Set Prices / Details</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: ADD PRODUCT ITEM (ADMIN ONLY) */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Add New Product Item</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. Bio-Gro 500ml or Agro-Shield"
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Bangla Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newProduct.banglaName}
                    onChange={(e) => setNewProduct({ ...newProduct, banglaName: e.target.value })}
                    placeholder="e.g. বায়ো-গ্রো"
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Pack Size *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProduct.packSize}
                      onChange={(e) => setNewProduct({ ...newProduct, packSize: e.target.value })}
                      placeholder="e.g. 500 ml, 1 L, 100 gm"
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Carton Size (Units)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newProduct.cartonSize}
                      onChange={(e) => setNewProduct({ ...newProduct, cartonSize: e.target.value })}
                      placeholder="e.g. 20"
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Dealer Price (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={newProduct.tradePrice}
                      onChange={(e) => setNewProduct({ ...newProduct, tradePrice: e.target.value })}
                      placeholder="e.g. 320"
                      className="w-full py-2 px-3 border border-emerald-300 bg-emerald-50/50 rounded-lg text-xs font-bold text-emerald-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Price sold to dealers</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Retail MRP (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={newProduct.mrp}
                      onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })}
                      placeholder="e.g. 380"
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Printed retail price</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Custom Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={newProduct.productCode}
                    onChange={(e) => setNewProduct({ ...newProduct, productCode: e.target.value })}
                    placeholder="Leave blank for auto PRD-xxx"
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs uppercase"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProductMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {createProductMutation.isPending ? "Adding..." : "Add Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: SET PRICES & DETAILS (ADMIN ONLY) */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Set Prices: {editingProduct.name}</h3>
                  <span className="text-xs text-slate-500 font-medium">{editingProduct.productCode}</span>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePrices} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Dealer Price (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={editPriceForm.tradePrice}
                      onChange={(e) => setEditPriceForm({ ...editPriceForm, tradePrice: e.target.value })}
                      className="w-full py-2 px-3 border border-emerald-300 bg-emerald-50/50 rounded-lg text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Price charged to dealers</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Retail MRP (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={editPriceForm.mrp}
                      onChange={(e) => setEditPriceForm({ ...editPriceForm, mrp: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Maximum retail price</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Pack Size
                    </label>
                    <input
                      type="text"
                      value={editPriceForm.packSize}
                      onChange={(e) => setEditPriceForm({ ...editPriceForm, packSize: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Carton Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editPriceForm.cartonSize}
                      onChange={(e) => setEditPriceForm({ ...editPriceForm, cartonSize: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatePriceMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {updatePriceMutation.isPending ? "Saving..." : "Save Prices"}
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
