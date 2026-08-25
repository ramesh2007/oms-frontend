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
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* Table Header */}
        <div className="hidden md:grid md:grid-cols-[48px_2.5fr_1fr_1.5fr_1.2fr_1.2fr_2fr] items-center gap-4 border-b border-slate-100 dark:border-slate-800 bg-[#f8f9fa] dark:bg-slate-800/30 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <div className="flex items-center justify-center">
            <Checkbox
              checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
              onCheckedChange={toggleSelectAll}
              className="h-5 w-5 rounded-[6px] border border-slate-300 dark:border-slate-600 focus-visible:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>
          <div>Product</div>
          <div>Order</div>
          <div>Customer</div>
          <div>Status</div>
          <div>Scheduled At</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">No installations found</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              {activeTab === "Pending"
                ? "Schedule installations from the order details page."
                : "No assigned installations yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filtered.map((item) => (
              <ScheduledRow
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggle={() => toggleSelect(item.id)}
                onRemove={() => setPendingCancelItem(item)}
                onViewOrder={() =>
                  navigate({
                    to: "/orders/$orderId",
                    params: { orderId: item.orderId },
                  })
                }
                formatTime={formatAbsoluteTime}
              />
            ))}
          </div>
        )}
      </div>

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

function ScheduledRow({
  item,
  selected,
  onToggle,
  onRemove,
  onViewOrder,
  formatTime,
}: {
  item: ScheduledItem;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onViewOrder: () => void;
  formatTime: (iso: string) => string;
}) {
  return (
    <>
      {/* Desktop Row */}
      <div
        className={cn(
          "hidden md:grid md:grid-cols-[48px_2.5fr_1fr_1.5fr_1.2fr_1.2fr_2fr] items-center gap-4 px-6 py-[18px] transition-colors",
          selected ? "bg-slate-50 dark:bg-slate-800/40" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
        )}
      >
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="h-5 w-5 rounded-[6px] border border-slate-300 dark:border-slate-600 focus-visible:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>

        {/* Product */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-muted/20">
            <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{item.productName}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">SKU: {item.sku}</span>
              {item.installationMethod && (
                <span className="inline-flex items-center rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                  {item.installationMethod}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Order */}
        <div>
          <button
            type="button"
            onClick={onViewOrder}
            className="inline-flex items-center rounded-md border border-[#c6f6d5] dark:border-emerald-950 bg-[#e6f9f0] dark:bg-emerald-950/20 px-2.5 py-1 text-xs font-bold text-[#107c41] dark:text-emerald-400 transition-colors hover:bg-[#d4f5e2] hover:border-[#a3f0be] cursor-pointer"
          >
            #{item.orderId.replace("HM", "")}
          </button>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 min-w-0">
          <User className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="font-medium truncate">{item.customerName}</span>
        </div>

        {/* Status */}
        <div>
          {item.status === "Assigned" ? (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center w-fit rounded-full border border-blue-200 dark:border-blue-950 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Assigned
              </span>
              {item.assignedDriver && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  <Truck className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>{item.assignedDriver}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center rounded-full border border-[#fde68a] dark:border-amber-950 bg-[#fffbeb] dark:bg-amber-950/20 px-3 py-1 text-[11px] font-bold text-[#b45405] dark:text-amber-400 uppercase tracking-wider">
              Scheduled
            </span>
          )}
        </div>

        {/* Scheduled At */}
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {formatTime(item.scheduledAt)}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onViewOrder}
            className="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            View Order
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="grid h-8 w-8 place-items-center rounded-lg text-[#e3292b] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            aria-label="Remove scheduled installation"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Mobile Card */}
      <div
        className={cn(
          "md:hidden p-4 transition-colors border-b border-slate-100 dark:border-slate-800/50",
          selected ? "bg-slate-50 dark:bg-slate-800/40" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
        )}
      >
        <div className="flex items-start gap-3.5">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="mt-1 h-5 w-5 rounded-[6px] border border-slate-300 dark:border-slate-600 focus-visible:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-muted/20">
            <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{item.productName}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">SKU: {item.sku}</span>
                {item.installationMethod && (
                  <span className="inline-flex items-center rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                    {item.installationMethod}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onViewOrder}
                className="inline-flex items-center rounded-md border border-[#c6f6d5] dark:border-emerald-950 bg-[#e6f9f0] dark:bg-emerald-950/20 px-2.5 py-1 text-xs font-bold text-[#107c41] dark:text-emerald-400 transition-colors hover:bg-[#d4f5e2] hover:border-[#a3f0be] cursor-pointer"
              >
                #{item.orderId.replace("HM", "")}
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="font-semibold">{item.customerName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/40 pt-2.5">
              <div className="flex items-center gap-3">
                {item.status === "Assigned" ? (
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center w-fit rounded-full border border-blue-200 dark:border-blue-950 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Assigned
                    </span>
                    {item.assignedDriver && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        <Truck className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{item.assignedDriver}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-[#fde68a] dark:border-amber-950 bg-[#fffbeb] dark:bg-amber-950/20 px-2.5 py-0.5 text-[10px] font-bold text-[#b45405] dark:text-amber-400 uppercase tracking-wider">
                    Scheduled
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold self-center">
                  {formatTime(item.scheduledAt)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onViewOrder}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="text-xs font-bold text-[#e3292b] hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
