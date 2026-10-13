import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import {
  getSnapshot,
  subscribe,
  removeItem,
  assignDriver,
  AVAILABLE_DRIVERS,
  type ScheduledItem,
} from "@/lib/scheduled-installations";
import { getUsers } from "@/lib/sync";
import { ScheduledList } from "@/components/scheduled/ScheduledList";
import {
  Calendar,
  ChevronDown,
  ExternalLink,
  Package,
  Search,
  ShoppingCart,
  Truck,
  UserPlus,
  X,
  Check,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/scheduled")({
  head: () => ({
    meta: [
      { title: "Scheduled Installations - Halamama LMD" },
      {
        name: "description",
        content:
          "View and manage products scheduled for manual installation across all active orders.",
      },
    ],
  }),
  component: ScheduledInstallationsPage,
});

function ScheduledInstallationsPage() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground animate-fade-in">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-5 p-4 md:p-6 lg:p-8">
          <ScheduledInstallationsContent />
        </main>
      </div>
    </div>
  );
}

function ScheduledInstallationsContent() {
  const navigate = useNavigate();
  const items = useSyncExternalStore(subscribe, getSnapshot);

  const [driversList, setDriversList] = useState<string[]>(AVAILABLE_DRIVERS);

  useEffect(() => {
    getUsers()
      .then((users) => {
        if (Array.isArray(users)) {
          const activeDrivers = users
            .filter((u) => u.role === "driver" && u.status === "active")
            .map((u) => u.name);
          if (activeDrivers.length > 0) {
            setDriversList(Array.from(new Set(activeDrivers)));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch drivers:", err);
      });
  }, []);

  const [activeTab, setActiveTab] = useState<"Pending" | "Assigned">("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [driverFilterOpen, setDriverFilterOpen] = useState(false);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedAssignDriver, setSelectedAssignDriver] = useState<string | null>(null);

  // Filter items
  const filtered = useMemo(() => {
    let result = items.filter((i) => i.status === activeTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace("#", "").trim();
      result = result.filter(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.orderId.toLowerCase().replace("#", "").includes(q) ||
          i.customerName.toLowerCase().includes(q),
      );
    }

    // If filtering by a driver, only show that driver's items
    if (selectedDriver && activeTab === "Assigned") {
      result = result.filter((i) => i.assignedDriver === selectedDriver);
    }

    return result;
  }, [items, activeTab, searchQuery, selectedDriver]);

  // Stats
  const currentItems = items.filter((i) => i.status === activeTab);
  const tabItemCount = currentItems.length;
  const uniqueOrders = new Set(currentItems.map((i) => i.orderId)).size;

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));
  const someVisibleSelected =
    filtered.some((i) => selectedIds.has(i.id)) && !allVisibleSelected;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.add(i.id));
        return next;
      });
    }
  };

  const [pendingCancelItem, setPendingCancelItem] = useState<ScheduledItem | null>(null);

  const handleConfirmCancel = () => {
    if (!pendingCancelItem) return;
    const id = pendingCancelItem.id;
    removeItem(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.info("Installation removed");
    setPendingCancelItem(null);
  };

  const handleAssignDriver = () => {
    if (!selectedAssignDriver) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    assignDriver(ids, selectedAssignDriver);
    toast.success(`Assigned ${selectedAssignDriver} to ${ids.length} item(s)`);
    setSelectedIds(new Set());
    setAssignDropdownOpen(false);
    setSelectedAssignDriver(null);
  };

  const formatAbsoluteTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Scheduled Installations
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          View and manage products scheduled for manual installation across all active orders.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#85afae]/10 dark:bg-[#9fc7c6]/10">
            <Calendar className="h-5 w-5 text-[#85afae]" />
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {tabItemCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
              Total {activeTab} Items
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/10">
            <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {uniqueOrders}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
              Unique Orders
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar + Actions Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          {(["Pending", "Assigned"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setSelectedIds(new Set());
                setSelectedDriver(null);
              }}
              className={cn(
                "rounded-lg px-6 py-2 text-sm font-semibold transition-all cursor-pointer",
                activeTab === tab
                  ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Driver Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDriverFilterOpen(!driverFilterOpen)}
              className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Truck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              {selectedDriver ?? "All Drivers"}
              <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </button>

            {driverFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDriverFilterOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl animate-in fade-in slide-in-from-top-2">
                  <div className="max-h-64 overflow-y-auto py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDriver(null);
                        setDriverFilterOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors cursor-pointer",
                        selectedDriver === null
                          ? "bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 font-bold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                      )}
                    >
                      {selectedDriver === null && <Check className="h-3.5 w-3.5 text-primary" />}
                      All Drivers
                    </button>
                    {driversList.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setSelectedDriver(d);
                          setDriverFilterOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors cursor-pointer",
                          selectedDriver === d
                            ? "bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 font-bold"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                        )}
                      >
                        {selectedDriver === d && <Check className="h-3.5 w-3.5 text-primary" />}
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Assign Driver Button (visible when items selected) */}
          {selectedIds.size > 0 && activeTab === "Pending" && (
            <div className="relative">
              <Button
                onClick={() => setAssignDropdownOpen(true)}
                className="gap-2 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm font-bold h-[38px] px-5 transition-all cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Assign Driver ({selectedIds.size})
              </Button>

              <Dialog open={assignDropdownOpen} onOpenChange={setAssignDropdownOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Assign Driver</DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 mt-1">
                      Select a driver to assign to the {selectedIds.size} selected installation(s).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label className="font-bold text-sm text-slate-700 dark:text-slate-300">Select Driver</Label>
                      <Select value={selectedAssignDriver || ""} onValueChange={setSelectedAssignDriver}>
                        <SelectTrigger className="w-full h-11 rounded-xl">
                          <SelectValue placeholder="Choose a driver..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {driversList.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setAssignDropdownOpen(false)} className="rounded-xl h-11 cursor-pointer">
                      Cancel
                    </Button>
                    <Button onClick={handleAssignDriver} disabled={!selectedAssignDriver} className="rounded-xl h-11 cursor-pointer bg-primary hover:bg-primary/95">
                      Assign
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search by product, SKU, order number, or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
        />
      </div>

      {/* Table */}
      <ScheduledList
        items={filtered}
        selectedIds={selectedIds}
        activeTab={activeTab}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onRemoveItem={(item) => setPendingCancelItem(item)}
        onViewOrder={(orderId) =>
          navigate({
            to: "/orders/$orderId",
            params: { orderId },
          })
        }
        formatTime={formatAbsoluteTime}
      />

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
          <span>
            Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span>{" "}
            {activeTab.toLowerCase()} installation(s)
          </span>
        </div>
      )}

      {/* Cancel Installation Schedule Dialog */}
      <Dialog open={!!pendingCancelItem} onOpenChange={(open) => !open && setPendingCancelItem(null)}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl">
          <div className="p-5 sm:p-7">
            <DialogHeader className="mb-5 text-left">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                Cancel Installation Schedule
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                Are you sure you want to cancel the scheduled installation for this item?
              </DialogDescription>
            </DialogHeader>

            {pendingCancelItem && (
              <div className="flex items-center gap-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-100 dark:border-slate-700 bg-background overflow-hidden">
                  <img src={pendingCancelItem.image} alt={pendingCancelItem.productName} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{pendingCancelItem.productName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Order ID: {pendingCancelItem.orderId.replace("HM", "")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-800/10 px-5 sm:px-7 py-4 sm:py-5">
            <Button
              variant="outline"
              onClick={() => setPendingCancelItem(null)}
              className="w-full sm:w-auto rounded-xl font-bold h-11 text-sm shadow-sm border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              No, Keep It
            </Button>
            <Button
              onClick={handleConfirmCancel}
              className="w-full sm:w-auto rounded-xl bg-[#e3292b] hover:bg-[#c92426] text-white shadow-md font-bold h-11 text-sm px-6 transition-all cursor-pointer"
            >
              Yes, Cancel Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
