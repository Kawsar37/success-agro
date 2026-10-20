"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import {
  Bell,
  MapPin,
  Calendar,
  Truck,
  ShoppingBag,
  Banknote,
  CheckCircle2,
  CheckCheck,
  Inbox,
  ArrowRight,
  Clock,
  Menu,
} from "lucide-react";

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Query notifications every 10 seconds for real-time movement monitoring
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications?limit=30");
      return res.data.data;
    },
    enabled: !!isAdmin,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch("/notifications/read-all");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return "Just now";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "ORDER_CREATED":
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case "DELIVERY_PICKED_UP":
        return <Truck className="w-4 h-4 text-blue-600" />;
      case "DELIVERY_COMPLETED":
        return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
      case "PAYMENT_COLLECTED":
        return <Banknote className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getNotifBg = (type: string) => {
    switch (type) {
      case "ORDER_CREATED":
        return "bg-emerald-50 border-emerald-200";
      case "DELIVERY_PICKED_UP":
        return "bg-blue-50 border-blue-200";
      case "DELIVERY_COMPLETED":
        return "bg-teal-50 border-teal-200";
      case "PAYMENT_COLLECTED":
        return "bg-amber-50 border-amber-200";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-2 sm:gap-6">
        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-slate-500 bg-slate-100/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-none">{today}</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Bogura Industrial Plant & National Distribution</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification Bell Menu (Admin Only) */}
        {isAdmin ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 relative transition-colors focus:outline-none"
              title="Movement & System Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <>
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full absolute top-1 right-1 animate-pulse" />
                  <span className="min-w-4 h-4 px-1 bg-rose-600 text-[10px] text-white font-bold rounded-full absolute -top-1 -right-1 flex items-center justify-center shadow-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </>
              )}
            </button>

            {/* Notifications Popover Dropdown */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm bg-white rounded-xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* Header */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Live Activity Feed</span>
                    {unreadCount > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsReadMutation.mutate()}
                      disabled={markAllAsReadMutation.isPending}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">No movements recorded yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Orders, dispatches and payments will appear here in real-time
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif: any) => (
                      <div
                        key={notif._id}
                        className={`p-3.5 transition-colors flex items-start gap-3 hover:bg-slate-50/80 ${
                          !notif.isRead ? "bg-emerald-50/20" : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${getNotifBg(
                            notif.type
                          )}`}
                        >
                          {getNotifIcon(notif.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={`text-xs font-semibold truncate ${
                                !notif.isRead ? "text-slate-900 font-bold" : "text-slate-700"
                              }`}
                            >
                              {notif.title}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                            {notif.message}
                          </p>

                          <div className="mt-2 flex items-center gap-3">
                            {notif.link && (
                              <Link
                                href={notif.link}
                                onClick={() => {
                                  if (!notif.isRead) markAsReadMutation.mutate(notif._id);
                                  setIsOpen(false);
                                }}
                                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                              >
                                <span>View details</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}

                            {!notif.isRead && (
                              <button
                                onClick={() => markAsReadMutation.mutate(notif._id)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 transition"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>

                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <span className="text-[11px] text-slate-400">
                    Auto-refreshes every 10 seconds with field activities
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 text-slate-400 rounded-full">
            <Bell className="w-5 h-5 text-slate-300" />
          </div>
        )}

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 font-bold text-sm">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
            <p className="text-[11px] text-emerald-600 font-medium leading-tight">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
