"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatBDT } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { UserPlus, Plus, Trash2, Users, DollarSign, UserCheck, Briefcase } from "lucide-react";

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"staff" | "users" | "payroll">("staff");

  // Add User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<"SalesOfficer" | "DeliveryMan">("SalesOfficer");
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    vehicleNumber: "",
    assignedArea: "",
  });

  // Add Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    name: "",
    phone: "",
    designation: "",
    department: "Management",
    monthlySalary: "",
    joiningDate: new Date().toISOString().split("T")[0],
    bankAccountNumber: "",
    notes: "",
  });

  // Query System Users
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data.data,
  });

  // Query Employees (Factory workforce)
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await api.get("/employees")).data.data,
  });

  // Query Salaries
  const { data: salaries, isLoading: loadingSalaries } = useQuery({
    queryKey: ["salaries"],
    queryFn: async () => (await api.get("/employees/salaries")).data.data,
  });

  // Create Staff Mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof staffFormData) => {
      const res = await api.post("/employees", {
        ...data,
        monthlySalary: Number(data.monthlySalary) || 0,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Staff member registered with salary successfully!");
      setIsStaffModalOpen(false);
      setStaffFormData({
        name: "",
        phone: "",
        designation: "",
        department: "Management",
        monthlySalary: "",
        joiningDate: new Date().toISOString().split("T")[0],
        bankAccountNumber: "",
        notes: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to add staff member");
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userFormData) => {
      const res = await api.post("/users", {
        ...data,
        role: modalRole,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`${modalRole === "SalesOfficer" ? "Sales Officer" : "Delivery Man"} created successfully!`);
      setIsUserModalOpen(false);
      setUserFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        vehicleNumber: "",
        assignedArea: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create user");
    },
  });

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User account removed");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete user");
    },
  });

  const handleOpenAddUser = (role: "SalesOfficer" | "DeliveryMan") => {
    setModalRole(role);
    setUserFormData({
      name: "",
      email: "",
      phone: "",
      password: "password123",
      vehicleNumber: "",
      assignedArea: "",
    });
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.email || !userFormData.phone || !userFormData.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    createUserMutation.mutate(userFormData);
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.name || !staffFormData.phone || !staffFormData.designation || !staffFormData.monthlySalary) {
      toast.error("Please enter Name, Phone, Designation, and Monthly Salary");
      return;
    }
    createStaffMutation.mutate(staffFormData);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff & Users</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Add and manage company staff with monthly salary, Sales Officers, and administrator accounts
            </p>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Staff with Salary</span>
              </button>
              <button
                onClick={() => handleOpenAddUser("SalesOfficer")}
                className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Sales Officer</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("staff")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "staff"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Staff Directory & Salaries
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            System App Accounts
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "payroll"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Salary Disbursements Log
          </button>
        </div>

        {/* Factory Staff Directory */}
        {activeTab === "staff" && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                Active Staff Workforce ({employees?.length || 0})
              </span>
              {isAdmin && (
                <button
                  onClick={() => setIsStaffModalOpen(true)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Staff
                </button>
              )}
            </div>

            {loadingEmployees ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">EMP ID</th>
                      <th className="py-3.5 px-4">Full Name</th>
                      <th className="py-3.5 px-4">Designation</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4 text-right">Monthly Salary (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!employees || employees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No staff added yet. Click "+ Add Staff with Salary" to add.
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp: any) => (
                        <tr key={emp._id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{emp.employeeId}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{emp.name}</td>
                          <td className="py-3 px-4 text-slate-700 font-medium">{emp.designation}</td>
                          <td className="py-3 px-4">
                            <Badge variant="neutral">{emp.department}</Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{emp.phone}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-800 text-sm">
                            {formatBDT(emp.monthlySalary)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* App Users Table */}
        {activeTab === "users" && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loadingUsers ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Name</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Details / Assignment</th>
                      {isAdmin && <th className="py-3.5 px-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users?.map((u: any) => {
                      const isSO = u.role === "SalesOfficer";
                      const isDM = u.role === "DeliveryMan";
                      const isAdminRole = u.role === "Admin" || u.role === "ManagingDirector";

                      return (
                        <tr key={u._id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                isAdminRole
                                  ? "danger"
                                  : isSO
                                  ? "success"
                                  : isDM
                                  ? "info"
                                  : "neutral"
                              }
                            >
                              {u.role === "SalesOfficer"
                                ? "🌾 Sales Officer"
                                : u.role === "DeliveryMan"
                                ? "🚚 Delivery Man"
                                : "👑 " + u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{u.email}</td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{u.phone}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {isDM && (
                              <span>
                                Vehicle: <strong>{u.vehicleNumber || "Not assigned"}</strong>
                                {u.assignedArea && ` (${u.assignedArea})`}
                              </span>
                            )}
                            {isSO && (
                              <span>
                                Code: <strong>{u.salesOfficerProfile?.officerCode || "Assigned"}</strong>
                              </span>
                            )}
                            {isAdminRole && <span className="text-slate-400">System Administrator</span>}
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-4 text-right">
                              {!isAdminRole && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${u.name}?`)) {
                                      deleteUserMutation.mutate(u._id);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payroll Disbursements */}
        {activeTab === "payroll" && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loadingSalaries ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Payment #</th>
                      <th className="py-3.5 px-4">Employee</th>
                      <th className="py-3.5 px-4">Month</th>
                      <th className="py-3.5 px-4">Disbursed From Account</th>
                      <th className="py-3.5 px-4 text-right">Net Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!salaries || salaries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No salary payments logged yet
                        </td>
                      </tr>
                    ) : (
                      salaries.map((sal: any) => (
                        <tr key={sal._id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-900">{sal.paymentNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{sal.employee?.name}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{sal.salaryMonth}</td>
                          <td className="py-3 px-4 text-slate-600">{sal.account?.name}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {formatBDT(sal.netPayable)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Add Staff with Salary */}
        <Modal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          title="Add Staff Member with Salary"
          maxWidth="md"
        >
          <form onSubmit={handleStaffSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Md. Rafiqul Islam"
                value={staffFormData.name}
                onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="017xxxxxxxx"
                  value={staffFormData.phone}
                  onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Designation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Factory Supervisor / Operator"
                  value={staffFormData.designation}
                  onChange={(e) => setStaffFormData({ ...staffFormData, designation: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Monthly Salary (BDT ৳) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 25000"
                  value={staffFormData.monthlySalary}
                  onChange={(e) => setStaffFormData({ ...staffFormData, monthlySalary: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Department</label>
                <select
                  value={staffFormData.department}
                  onChange={(e) => setStaffFormData({ ...staffFormData, department: e.target.value as any })}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Production">Production / Factory</option>
                  <option value="Management">Management</option>
                  <option value="Sales">Sales</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="General">General / Security</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Joining Date</label>
                <input
                  type="date"
                  value={staffFormData.joiningDate}
                  onChange={(e) => setStaffFormData({ ...staffFormData, joiningDate: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Bank / bKash (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. bKash: 017... or Bank AC"
                  value={staffFormData.bankAccountNumber}
                  onChange={(e) => setStaffFormData({ ...staffFormData, bankAccountNumber: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createStaffMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm disabled:opacity-50"
              >
                {createStaffMutation.isPending ? "Adding Staff..." : "Save Staff with Salary"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Sales Officer */}
        <Modal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          title={`Register New ${modalRole === "SalesOfficer" ? "Sales Officer" : "Delivery Man"}`}
          maxWidth="md"
        >
          <form onSubmit={handleUserSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Md. Kamal Hossain"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="name@successagro.com"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="017xxxxxxxx"
                  value={userFormData.phone}
                  onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Login Password *</label>
              <input
                type="text"
                required
                placeholder="password123 or Agro@2026"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createUserMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {createUserMutation.isPending ? "Registering..." : "Create Account"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
