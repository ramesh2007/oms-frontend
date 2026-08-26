import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  countForLegacyTab,
  matchesLegacyTab,
  matchesSearch,
  LEGACY_TABS,
  parseTatHours,
  type LegacyTabId,
  type Order,
  type EnrichedOrder,
} from "@/lib/orders";
import { getEnrichedOrder } from "@/lib/orders";
import { useOrders, useOrdersByStatus, useFlaggedOrders } from "@/hooks/useOrders";
import { PrintInvoiceDialog } from "./PrintInvoiceDialog";
import { ViewExportDialog } from "./ViewExportDialog";
import { BulkActionBar } from "./BulkActionBar";
import { OrderCard } from "./OrderCard";
import { OrderTable } from "./OrderTable";
import { OrdersTabs } from "./OrdersTabs";
import { OrdersToolbar, ViewToggle, type ViewMode } from "./OrdersToolbar";
import { AssignDriverDialog } from "./AssignDriverDialog";
import { AssignZoneDialog } from "./AssignZoneDialog";
import { PaginationControls } from "./PaginationControls";
import { toast } from "sonner";

export function OrderList({ initialTab }: { initialTab?: LegacyTabId }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LegacyTabId>(initialTab || "New");

  const statusSlug = useMemo(() => {
    switch (activeTab) {
      case "New":
      case "Unfulfilled":
        return "new";
      case "Ready to Assign":
        return "ready-to-assign";
      case "Picking":
        return "picking";
      case "Picked":
        return "picked";
      case "Packing":
        return "packing";
      case "In Delivery":
        return "in-delivery";
      case "Delivered":
        return "delivered";
      case "Flags & Exceptions":
        return "flagged";
      default:
        return "all";
    }
  }, [activeTab]);

  const [currentPage, setCurrentPage] = useState(1);
  const { data: allOrders = [] } = useOrders();
  const { data: statusResult, refetch, isLoading: isStatusLoading } = useOrdersByStatus(statusSlug, currentPage, 15);
  const { data: flaggedResult } = useFlaggedOrders(1, 1);
  const statusOrders = statusResult?.orders || [];
  const pagination = statusResult?.pagination;

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [giftPrintDialogOpen, setGiftPrintDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>(statusOrders);
  const [days, setDays] = useState("30");
  const [filters, setFilters] = useState({
    status: "All",
    paymentStatus: "All",
    customer: "",
  });
  
  const [sortColumn, setSortColumn] = useState<"id" | "date" | "customer" | "tat" | "total" | null>("tat");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (col: "id" | "date" | "customer" | "tat" | "total") => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  // Single action states for quick menu actions
  const [singleActionOrder, setSingleActionOrder] = useState<Order | null>(null);

  useEffect(() => {
    setLoading(isStatusLoading);
  }, [isStatusLoading]);

  // Sync orders whenever statusOrders changes
  useEffect(() => {
    if (Array.isArray(statusOrders)) {
      setOrders(statusOrders);
    } else if (Array.isArray(allOrders)) {
      setOrders(allOrders);
    }
  }, [statusOrders, allOrders]);


  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [activeTab]);

  const baseOrders = useMemo(() => {
    let result = orders.length > 0 ? [...orders] : [...allOrders];

    if (search.trim()) {
      result = result.filter((o) => matchesSearch(o, search));
    }
    
    if (filters.customer.trim()) {
      const cSearch = filters.customer.toLowerCase();
      result = result.filter((o) => o.customer.name.toLowerCase().includes(cSearch));
    }

    const d = parseInt(days) || 1;
    if (d < 30 && result.length > 2) {
       result = result.slice(0, Math.max(1, result.length - Math.floor((30 - d) / 2)));
    }

    return result;
  }, [orders, allOrders, search, filters.customer, days]);

  const filtered = useMemo(() => {
    let result = baseOrders;
    if (activeTab !== "All" && activeTab !== "Flags & Exceptions") {
      result = result.filter((o) => matchesLegacyTab(o, activeTab));
    }

    if (filters.status !== "All") {
      result = result.filter((o) => o.status === filters.status);
    }

    if (activeTab === "Cancelled") {
      result = [...result].sort((a, b) => parseTatHours(b.tat) - parseTatHours(a.tat));
    }
    
    return result;
  }, [baseOrders, activeTab, filters.status]);

  const sortedFiltered = useMemo(() => {
    const result = [...filtered];
    if (sortColumn) {
      result.sort((a, b) => {
        let valA: any = "";
        let valB: any = "";

        if (sortColumn === "id") {
          valA = a.id;
          valB = b.id;
        } else if (sortColumn === "customer") {
          valA = a.customer.name;
          valB = b.customer.name;
        } else if (sortColumn === "tat") {
          valA = parseTatHours(a.tat);
          valB = parseTatHours(b.tat);
        } else if (sortColumn === "total") {
          valA = a.total;
          valB = b.total;
        } else if (sortColumn === "date") {
          const year = new Date().getFullYear();
          const timeAStr = a.time ? ` ${a.time}` : "";
          const timeBStr = b.time ? ` ${b.time}` : "";
          valA = new Date(`${a.date}, ${year}${timeAStr}`).getTime();
          valB = new Date(`${b.date}, ${year}${timeBStr}`).getTime();
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filtered, sortColumn, sortDirection]);

  const tabCounts = useMemo(() => {
    const counts = {} as Record<LegacyTabId, number>;
    const dataset = allOrders.length > 0 ? allOrders : orders;
    for (const tab of LEGACY_TABS) {
      if (tab.id === "Flags & Exceptions" && flaggedResult?.pagination?.total !== undefined) {
        counts[tab.id] = flaggedResult.pagination.total;
      } else if (tab.id === activeTab && pagination?.total !== undefined && activeTab !== "All") {
        counts[tab.id] = pagination.total;
      } else {
        counts[tab.id] = countForLegacyTab(dataset, tab.id);
      }
    }
    return counts;
  }, [allOrders, orders, flaggedResult, activeTab, pagination]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id));
  const someVisibleSelected =
    filtered.some((o) => selectedIds.has(o.id)) && !allVisibleSelected;

  const onSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const onSelectAllVisible = (select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) filtered.forEach((o) => next.add(o.id));
      else filtered.forEach((o) => next.delete(o.id));
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  const goToOrder = (order: Order) => {
    navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
  };

  const handleRefresh = () => {
    setLoading(true);
    toast.info("Refreshing orders...");
    refetch().then(() => {
      setLoading(false);
      toast.success("Orders refreshed");
    });
  };

  const handlePullRecent = () => {
    setLoading(true);
    toast.info("Fetching recent orders...");
    refetch().then(() => {
      setLoading(false);
      toast.success("Orders refreshed");
    });
  };

  // Get current state values in enriched format
  const getEnrichedOrderFromState = (id: string): EnrichedOrder | undefined => {
    const baseEnriched = getEnrichedOrder(id);
    if (!baseEnriched) return undefined;
    const currentStateOrder = orders.find((o) => o.id === id);
    if (!currentStateOrder) return baseEnriched;
    return {
      ...baseEnriched,
      status: currentStateOrder.status,
      driver: currentStateOrder.driver,
      city: currentStateOrder.city,
      zone: currentStateOrder.city,
    };
  };

  // Handle single action card triggers
  const handleCardAction = (
    action: "zone" | "driver" | "print" | "giftPrint" | "export",
    order: Order
  ) => {
    setSingleActionOrder(order);
    if (action === "zone") setZoneDialogOpen(true);
    else if (action === "driver") setDriverDialogOpen(true);
    else if (action === "print") setPrintDialogOpen(true);
    else if (action === "giftPrint") setGiftPrintDialogOpen(true);
    else if (action === "export") setExportDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <OrdersToolbar
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        days={days}
        onDaysChange={setDays}
        onRefresh={handleRefresh}
        onPullRecent={handlePullRecent}
        onFiltersOpen={() => setFiltersOpen(true)}
      />

      {/* Tabs + View Toggle row */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-2">
          <OrdersTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabCounts={tabCounts}
          />
        </div>
        <div className="hidden shrink-0 md:block">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{pagination?.from ?? 1}</span> to{" "}
          <span className="font-medium text-foreground">{pagination?.to ?? filtered.length}</span> of{" "}
          {pagination?.total ?? orders.length} orders
        </span>
      </div>

      {loading ? (
        <>
          <div className="rounded-lg border border-border bg-card p-4 md:hidden">
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3 max-w-xs" />
                    <Skeleton className="h-3 w-full max-w-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:block">
            <OrderTable
              orders={[]}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onSelectAllVisible={onSelectAllVisible}
              allVisibleSelected={false}
              someVisibleSelected={false}
              expandedId={null}
              onExpandedChange={() => {}}
              onViewOrder={goToOrder}
              loading
              activeTab={activeTab}
            />
          </div>
        </>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No orders match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another status tab or clear search.</p>
        </div>
      ) : (
        <>
          <div className="md:hidden">
            <div className="space-y-3">
              {sortedFiltered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  selected={selectedIds.has(order.id)}
                  onSelectChange={(sel) => onSelect(order.id, sel)}
                  expanded={expandedId === order.id}
                  onToggleExpand={() =>
                    setExpandedId((id) => (id === order.id ? null : order.id))
                  }
                  onViewOrder={goToOrder}
                  onAction={handleCardAction}
                />
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            {viewMode === "grid" ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedFiltered.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    selected={selectedIds.has(order.id)}
                    onSelectChange={(sel) => onSelect(order.id, sel)}
                    expanded={expandedId === order.id}
                    onToggleExpand={() =>
                      setExpandedId((id) => (id === order.id ? null : order.id))
                    }
                    onViewOrder={goToOrder}
                    onAction={handleCardAction}
                  />
                ))}
              </div>
            ) : (
              <OrderTable
                orders={sortedFiltered}
                selectedIds={selectedIds}
                onSelect={onSelect}
                onSelectAllVisible={onSelectAllVisible}
                allVisibleSelected={allVisibleSelected}
                someVisibleSelected={someVisibleSelected}
                expandedId={expandedId}
                onExpandedChange={setExpandedId}
                onViewOrder={goToOrder}
                loading={false}
                activeTab={activeTab}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}
          </div>
        </>
      )}

      {!loading && (
        <PaginationControls
          pagination={pagination}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isLoading={loading}
        />
      )}

      <BulkActionBar
        count={selectedCount}
        onClear={() => setSelectedIds(new Set())}
        onAssignZone={() => setZoneDialogOpen(true)}
        onAssignDriver={activeTab === "Ready to Assign" ? () => setDriverDialogOpen(true) : undefined}
        onPrintInvoices={() => setPrintDialogOpen(true)}
        onPrintGiftInvoices={() => setGiftPrintDialogOpen(true)}
        onViewExport={() => setExportDialogOpen(true)}
      />

      <AssignZoneDialog
        open={zoneDialogOpen}
        onOpenChange={(open) => {
          setZoneDialogOpen(open);
          if (!open) setSingleActionOrder(null);
        }}
        selectedCount={singleActionOrder ? 1 : selectedCount}
        onAssign={(zone, zoneName, overrideExisting) => {
          const targetIds = singleActionOrder ? [singleActionOrder.id] : Array.from(selectedIds);
          setOrders((prev) =>
            prev.map((o) => (targetIds.includes(o.id) ? { ...o, city: zoneName } : o))
          );
          toast.success(
            `Assigned zone "${zoneName}" to ${targetIds.length} order(s)${
              overrideExisting ? " (Override)" : ""
            }`
          );
          setSelectedIds(new Set());
          setSingleActionOrder(null);
        }}
      />
      <AssignDriverDialog
        open={driverDialogOpen}
        onOpenChange={(open) => {
          setDriverDialogOpen(open);
          if (!open) setSingleActionOrder(null);
        }}
        selectedCount={singleActionOrder ? 1 : selectedCount}
        selectedOrders={
          singleActionOrder
            ? [singleActionOrder]
            : orders.filter((o) => selectedIds.has(o.id))
        }
        onAssign={(driver) => {
          const targetIds = singleActionOrder ? [singleActionOrder.id] : Array.from(selectedIds);
          setOrders((prev) =>
            prev.map((o) =>
              targetIds.includes(o.id)
                ? { ...o, driver: driver, status: "Driver Accepted" as const }
                : o
            )
          );
          toast.success(
            `Assigned driver ${driver} to ${targetIds.length} order(s)`
          );
          setSelectedIds(new Set());
          setSingleActionOrder(null);
        }}
      />
      <PrintInvoiceDialog
        open={printDialogOpen}
        onOpenChange={(open) => {
          setPrintDialogOpen(open);
          if (!open) setSingleActionOrder(null);
        }}
        orders={
          singleActionOrder
            ? ([getEnrichedOrderFromState(singleActionOrder.id)].filter(Boolean) as any)
            : (Array.from(selectedIds)
                .map((id) => getEnrichedOrderFromState(id))
                .filter(Boolean) as any)
        }
      />
      <PrintInvoiceDialog
        open={giftPrintDialogOpen}
        onOpenChange={(open) => {
          setGiftPrintDialogOpen(open);
          if (!open) setSingleActionOrder(null);
        }}
        orders={
          singleActionOrder
            ? ([getEnrichedOrderFromState(singleActionOrder.id)].filter(Boolean) as any)
            : (Array.from(selectedIds)
                .map((id) => getEnrichedOrderFromState(id))
                .filter(Boolean) as any)
        }
        isGift
      />
      <ViewExportDialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          setExportDialogOpen(open);
          if (!open) setSingleActionOrder(null);
        }}
        orders={
          singleActionOrder
            ? ([getEnrichedOrderFromState(singleActionOrder.id)].filter(Boolean) as any)
            : (Array.from(selectedIds)
                .map((id) => getEnrichedOrderFromState(id))
                .filter(Boolean) as any)
        }
        activeTab={activeTab}
      />
    
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] sm:max-w-md p-0 flex flex-col bg-card border-border shadow-2xl">
          <div className="px-6 py-5 border-b border-border bg-muted/10">
            <SheetHeader className="text-left space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
                  <Filter className="h-4 w-4 text-primary" />
                </div>
                <SheetTitle className="text-xl font-bold tracking-tight">Filter Orders</SheetTitle>
              </div>
              <SheetDescription className="text-sm">
                Narrow down your order list based on specific criteria.
              </SheetDescription>
            </SheetHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-7">
            {/* Order Status */}
            <div className="space-y-3">
              <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Order Status
              </Label>
              <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger id="status" className="h-11 w-full bg-muted/20 border-border rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-md">
                  <SelectItem value="All" className="font-medium">All Statuses</SelectItem>
                  {LEGACY_TABS.filter(t => t.id !== "All").map(t => (
                    <SelectItem key={t.id} value={t.id} className="font-medium">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status */}
            <div className="space-y-3">
              <Label htmlFor="paymentStatus" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payment Status
              </Label>
              <Select value={filters.paymentStatus} onValueChange={(v) => setFilters(f => ({ ...f, paymentStatus: v }))}>
                <SelectTrigger id="paymentStatus" className="h-11 w-full bg-muted/20 border-border rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-md">
                  <SelectItem value="All" className="font-medium">All Payments</SelectItem>
                  <SelectItem value="Paid" className="font-medium text-emerald-600 dark:text-emerald-400">Paid</SelectItem>
                  <SelectItem value="Unpaid" className="font-medium text-amber-600 dark:text-amber-400">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Customer Name */}
            <div className="space-y-3">
              <Label htmlFor="customer" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Customer Name
              </Label>
              <Input 
                id="customer"
                value={filters.customer}
                onChange={(e) => setFilters(f => ({ ...f, customer: e.target.value }))}
                placeholder="E.g. John Doe"
                className="h-11 bg-muted/20 border-border rounded-xl shadow-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          
          <div className="p-6 border-t border-border bg-muted/10 backdrop-blur-sm">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl h-11 font-semibold text-slate-800 dark:text-slate-200 border-border shadow-sm hover:bg-muted/50 transition-colors"
                onClick={() => setFilters({ status: "All", paymentStatus: "All", customer: "" })}
              >
                Clear All
              </Button>
              <Button 
                className="flex-1 rounded-xl h-11 bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/95 hover:shadow-lg transition-all active:scale-[0.98]"
                onClick={() => setFiltersOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
