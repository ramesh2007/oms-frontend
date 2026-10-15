import { useEffect, useMemo, useState } from "react";
import { Filter, User, Search, AlertCircle, ArrowRight, CheckCircle2, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  countForLegacyTab,
  matchesLegacyTab,
  matchesSearch,
  getOrderPrimaryTab,
  getCustomerOrdersBreakdown,
  LEGACY_TABS,
  parseTatHours,
  toEnrichedOrder,
  getEnrichedOrder,
  MOCK_ORDERS,
  type LegacyTabId,
  type Order,
  type EnrichedOrder,
  type CustomerStageSummary,
} from "@/lib/orders";
import { getSharedOrders } from "@/lib/sync";
import { ordersApi } from "@/lib/api";
import {
  useOrders,
  useOrdersByStatus,
  useFlaggedOrders,
  orderKeys,
  type OrdersByStatusResult,
  type PaginationMeta,
} from "@/hooks/useOrders";
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

const EMPTY_ORDERS: Order[] = [];

export function OrderList({ initialTab }: { initialTab?: LegacyTabId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<LegacyTabId>(initialTab || "New");

  const statusSlug = useMemo(() => {
    switch (activeTab) {
      case "New":
      case "Unfulfilled":
        return "new";
      case "Express":
        return "express";
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
      case "Cancelled":
        return "cancelled-delivery";
      case "Installation":
        return "installation";
      case "Flags & Exceptions":
        return "flagged";
      default:
        return "all";
    }
  }, [activeTab]);

  const [currentPage, setCurrentPage] = useState(1);
  const { data: allOrders = EMPTY_ORDERS } = useOrders();
  const { data: statusResult, refetch, isLoading: isStatusLoading, isFetching: isStatusFetching } = useOrdersByStatus(statusSlug, currentPage, 15);
  const { data: flaggedResult } = useFlaggedOrders(1, 1);
  const statusOrders = statusResult?.orders;

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [giftPrintDialogOpen, setGiftPrintDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<Order>>>({});
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [days, setDays] = useState("30");
  const [filters, setFilters] = useState({
    status: "All",
    paymentStatus: "All",
    customer: "",
    orderId: "",
  });
  const [showCrossTabOrders, setShowCrossTabOrders] = useState(false);
  
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
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    setShowCrossTabOrders(false);
  }, [activeTab]);

  // Prime status queries into queryClient so that clicking any tab has instantaneous data
  useEffect(() => {
    const sourceOrders = (allOrders && allOrders.length > 0) ? allOrders : getSharedOrders();
    if (!sourceOrders || sourceOrders.length === 0) return;

    const tabsToPrime: { slug: string; tab: LegacyTabId }[] = [
      { slug: "all", tab: "All" },
      { slug: "new", tab: "New" },
      { slug: "express", tab: "Express" },
      { slug: "picking", tab: "Picking" },
      { slug: "picked", tab: "Picked" },
      { slug: "packing", tab: "Packing" },
      { slug: "ready-to-assign", tab: "Ready to Assign" },
      { slug: "in-delivery", tab: "In Delivery" },
      { slug: "delivered", tab: "Delivered" },
      { slug: "cancelled-delivery", tab: "Cancelled" },
      { slug: "cancelled", tab: "Cancelled" },
      { slug: "installation", tab: "Installation" },
    ];

    for (const { slug, tab } of tabsToPrime) {
      const queryKey = orderKeys.status(slug, 1);
      const existing = queryClient.getQueryData<OrdersByStatusResult>(queryKey);
      if (!existing || !existing.orders || existing.orders.length === 0) {
        const filteredOrders = tab === "All" ? sourceOrders : sourceOrders.filter((o) => matchesLegacyTab(o, tab));
        const total = filteredOrders.length;
        queryClient.setQueryData<OrdersByStatusResult>(queryKey, {
          orders: filteredOrders.slice(0, 15),
          pagination: {
            current_page: 1,
            per_page: 15,
            total,
            last_page: Math.max(1, Math.ceil(total / 15)),
            from: total > 0 ? 1 : 0,
            to: Math.min(15, total),
            has_more_pages: total > 15,
            next_page_url: null,
            prev_page_url: null,
          },
          statusFilter: slug,
        });
      }
    }
  }, [allOrders, queryClient]);

  // Background prefetch top tabs to ensure live server data is ready
  useEffect(() => {
    ["new", "picking", "ready-to-assign"].forEach((slug) => {
      queryClient.prefetchQuery({
        queryKey: orderKeys.status(slug, 1),
        queryFn: () => ordersApi.fetchOrdersByStatus(slug, 1, 15),
        staleTime: 30 * 1000,
      });
    });
  }, [queryClient]);

  const sourceOrders = useMemo(() => {
    return (allOrders && allOrders.length > 0) ? allOrders : getSharedOrders();
  }, [allOrders]);

  const activeQuery = search.trim();
  const activeCustomerFilter = filters.customer.trim();
  const activeOrderIdFilter = filters.orderId.trim();
  const isSearchActive = Boolean(activeQuery || activeCustomerFilter || activeOrderIdFilter);

  // Global matching across all orders in the system regardless of tab
  const globalMatchingOrders = useMemo(() => {
    if (!isSearchActive) return EMPTY_ORDERS;
    return sourceOrders.filter((o) => {
      if (activeQuery && !matchesSearch(o, activeQuery)) return false;
      if (activeOrderIdFilter) {
        const cleanId = activeOrderIdFilter.replace(/^#/, "").toLowerCase();
        const oId = (o.id || "").toLowerCase().replace(/^#/, "");
        const oNum = (o.orderNumber || "").toLowerCase().replace(/^#/, "");
        const idMatches = oId === cleanId || oNum === cleanId || oId.includes(cleanId) || oNum.includes(cleanId);
        if (!idMatches) return false;
      }
      if (activeCustomerFilter) {
        const cLower = activeCustomerFilter.toLowerCase();
        const cMatches = (o.customer?.name || "").toLowerCase().includes(cLower) || (o.customer?.phone || "").includes(cLower);
        if (!cMatches) return false;
      }
      return true;
    });
  }, [sourceOrders, isSearchActive, activeQuery, activeOrderIdFilter, activeCustomerFilter]);

  // Breakdown of search matches per tab for smart tab badges
  const searchTabCounts = useMemo(() => {
    if (!isSearchActive) return null;
    const counts = {} as Record<LegacyTabId, number>;
    for (const tab of LEGACY_TABS) {
      counts[tab.id] = globalMatchingOrders.filter((o) => matchesLegacyTab(o, tab.id)).length;
    }
    return counts;
  }, [isSearchActive, globalMatchingOrders]);

  // Orders matching search that exist outside the current activeTab
  const otherStageOrders = useMemo(() => {
    if (!isSearchActive) return EMPTY_ORDERS;
    return globalMatchingOrders.filter((o) => !matchesLegacyTab(o, activeTab));
  }, [isSearchActive, globalMatchingOrders, activeTab]);

  // Multi-stage customer overview: breakdown of this customer's orders across each stage
  const customerBreakdown = useMemo<CustomerStageSummary | null>(() => {
    if (!isSearchActive) return null;
    let custKey = activeCustomerFilter;
    if (!custKey && globalMatchingOrders.length > 0) {
      custKey = globalMatchingOrders[0].customer?.name || "";
    }
    if (!custKey && activeQuery) {
      const directCust = sourceOrders.find((o) => (o.customer?.name || "").toLowerCase().includes(activeQuery.toLowerCase()));
      if (directCust) {
        custKey = directCust.customer.name;
      }
    }
    if (!custKey) return null;
    return getCustomerOrdersBreakdown(sourceOrders, custKey);
  }, [isSearchActive, activeCustomerFilter, globalMatchingOrders, activeQuery, sourceOrders]);

  // 1. Instantly available orders from client in-memory cache for 0ms tab switching
  const instantTabOrders = useMemo(() => {
    if (!sourceOrders || sourceOrders.length === 0) return EMPTY_ORDERS;
    if (activeTab === "All") return sourceOrders;
    if (activeTab === "Flags & Exceptions") {
      return sourceOrders.filter((o) => o.status === "Flagged" || o.status === "Delivery Failed");
    }
    return sourceOrders.filter((o) => matchesLegacyTab(o, activeTab));
  }, [sourceOrders, activeTab]);

  const hasFreshServerDataForTab = Boolean(
    statusResult &&
    statusResult.orders &&
    (!statusResult.statusFilter ||
     statusResult.statusFilter.replace(/[-_]/g, "").toLowerCase() === statusSlug.replace(/[-_]/g, "").toLowerCase() ||
     (statusSlug === "cancelled-delivery" && (statusResult.statusFilter === "cancelled" || statusResult.statusFilter === "cancelled_delivery")) ||
     (statusSlug === "installation" && (statusResult.statusFilter === "installation" || statusResult.statusFilter === "installation_orders")) ||
     (statusSlug === "express" && (statusResult.statusFilter === "express" || statusResult.statusFilter === "express_orders")))
  );

  const rawTabOrders = (hasFreshServerDataForTab && statusOrders && statusOrders.length > 0)
    ? statusOrders
    : ((statusOrders && statusOrders.length > 0) ? statusOrders : instantTabOrders);

  // Apply any optimistic manual overrides (driver, zone)
  const tabOrders = useMemo(() => {
    if (Object.keys(localOverrides).length === 0) return rawTabOrders;
    return rawTabOrders.map((o) => {
      const override = localOverrides[o.id];
      return override ? { ...o, ...override } : o;
    });
  }, [rawTabOrders, localOverrides]);

  const baseOrders = useMemo(() => {
    let result = tabOrders;

    if (activeQuery) {
      result = result.filter((o) => matchesSearch(o, activeQuery));
    }
    
    if (activeOrderIdFilter) {
      const cleanId = activeOrderIdFilter.replace(/^#/, "").toLowerCase();
      result = result.filter((o) => {
        const oId = (o.id || "").toLowerCase().replace(/^#/, "");
        const oNum = (o.orderNumber || "").toLowerCase().replace(/^#/, "");
        return oId === cleanId || oNum === cleanId || oId.includes(cleanId) || oNum.includes(cleanId);
      });
    }

    if (activeCustomerFilter) {
      const cSearch = activeCustomerFilter.toLowerCase();
      result = result.filter((o) => o.customer.name.toLowerCase().includes(cSearch));
    }

    // If 0 matches in current tab, but otherStageOrders exist and user wants to view them here:
    if (result.length === 0 && otherStageOrders.length > 0 && showCrossTabOrders) {
      result = otherStageOrders;
    }

    const d = parseInt(days) || 1;
    if (d < 30 && result.length > 2 && !isSearchActive) {
       result = result.slice(0, Math.max(1, result.length - Math.floor((30 - d) / 2)));
    }

    return result;
  }, [tabOrders, activeQuery, activeOrderIdFilter, activeCustomerFilter, otherStageOrders, showCrossTabOrders, days, isSearchActive]);

  const isShowingCrossTab = showCrossTabOrders && otherStageOrders.length > 0 && baseOrders === otherStageOrders;

  const filtered = useMemo(() => {
    let result = baseOrders;
    // Only filter with matchesLegacyTab if we fell back to instantTabOrders (and not showing cross-stage results)
    if (!hasFreshServerDataForTab && activeTab !== "All" && activeTab !== "Flags & Exceptions" && !isShowingCrossTab) {
      result = result.filter((o) => matchesLegacyTab(o, activeTab));
    }

    if (filters.status !== "All") {
      result = result.filter((o) => o.status === filters.status);
    }

    if (activeTab === "Cancelled") {
      result = [...result].sort((a, b) => parseTatHours(b.tat) - parseTatHours(a.tat));
    }
    
    return result;
  }, [baseOrders, hasFreshServerDataForTab, activeTab, filters.status, isShowingCrossTab]);

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

  const activePagination = useMemo<PaginationMeta>(() => {
    if (isSearchActive) {
      const total = filtered.length;
      return {
        current_page: 1,
        per_page: 15,
        total,
        last_page: 1,
        from: total > 0 ? 1 : 0,
        to: total,
        has_more_pages: false,
        next_page_url: null,
        prev_page_url: null,
      };
    }
    if (hasFreshServerDataForTab && statusResult?.pagination) {
      return statusResult.pagination;
    }
    const total = instantTabOrders.length;
    return {
      current_page: currentPage,
      per_page: 15,
      total,
      last_page: Math.max(1, Math.ceil(total / 15)),
      from: total > 0 ? (currentPage - 1) * 15 + 1 : 0,
      to: Math.min(currentPage * 15, total),
      has_more_pages: total > currentPage * 15,
      next_page_url: null,
      prev_page_url: null,
    };
  }, [isSearchActive, filtered.length, hasFreshServerDataForTab, statusResult?.pagination, instantTabOrders.length, currentPage]);

  const tabCounts = useMemo(() => {
    const counts = {} as Record<LegacyTabId, number>;
    for (const tab of LEGACY_TABS) {
      if (tab.id === "Flags & Exceptions" && flaggedResult?.pagination?.total !== undefined) {
        counts[tab.id] = flaggedResult.pagination.total;
      } else if (tab.id === activeTab && hasFreshServerDataForTab && statusResult?.pagination?.total !== undefined && activeTab !== "All") {
        counts[tab.id] = statusResult.pagination.total;
      } else {
        counts[tab.id] = countForLegacyTab(sourceOrders, tab.id);
      }
    }
    return counts;
  }, [sourceOrders, flaggedResult, activeTab, hasFreshServerDataForTab, statusResult?.pagination?.total]);

  const sheetMatchedOrder = useMemo(() => {
    if (!filters.orderId?.trim()) return null;
    const clean = filters.orderId.trim().replace(/^#/, "").toLowerCase();
    return sourceOrders.find((o) => {
      const oId = (o.id || "").toLowerCase().replace(/^#/, "");
      const oNum = (o.orderNumber || "").toLowerCase().replace(/^#/, "");
      return oId === clean || oNum === clean || oId.includes(clean) || oNum.includes(clean);
    });
  }, [filters.orderId, sourceOrders]);

  const sheetCustomerBreakdown = useMemo(() => {
    const custName = sheetMatchedOrder?.customer?.name || filters.customer?.trim();
    if (!custName) return null;
    return getCustomerOrdersBreakdown(sourceOrders, custName);
  }, [sheetMatchedOrder, filters.customer, sourceOrders]);

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
    setManualRefreshing(true);
    toast.info("Refreshing orders...");
    refetch().finally(() => {
      setManualRefreshing(false);
      toast.success("Orders refreshed");
    });
  };

  const handlePullRecent = () => {
    setManualRefreshing(true);
    toast.info("Fetching recent orders...");
    refetch().finally(() => {
      setManualRefreshing(false);
      toast.success("Orders refreshed");
    });
  };

  // Get current state values in enriched format
  const getEnrichedOrderFromState = (id: string): EnrichedOrder | undefined => {
    const currentStateOrder =
      sortedFiltered.find((o) => o.id === id) ||
      baseOrders.find((o) => o.id === id) ||
      tabOrders.find((o) => o.id === id) ||
      allOrders.find((o) => o.id === id) ||
      MOCK_ORDERS.find((o) => o.id === id);

    if (currentStateOrder) {
      return toEnrichedOrder(currentStateOrder);
    }
    return getEnrichedOrder(id);
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

  const showSkeleton =
    (isStatusLoading && filtered.length === 0 && allOrders.length === 0 && (!statusOrders || statusOrders.length === 0)) ||
    manualRefreshing;

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
            onTabChange={(tab) => {
              setActiveTab(tab);
              setShowCrossTabOrders(false);
            }}
            tabCounts={tabCounts}
            searchActive={isSearchActive}
            searchTabCounts={searchTabCounts}
          />
        </div>
        <div className="hidden shrink-0 md:block">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Customer Multi-Stage Overview Ribbon */}
      {customerBreakdown && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 shadow-soft transition-all animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-primary/10">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-7 w-7 rounded-lg bg-primary/15 grid place-items-center text-primary shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-foreground">Customer:</span>
                <span className="text-xs font-extrabold text-primary">{customerBreakdown.customerName}</span>
                {customerBreakdown.customerPhone && (
                  <span className="text-[11px] text-muted-foreground font-mono">({customerBreakdown.customerPhone})</span>
                )}
                <span className="text-xs text-muted-foreground ml-1">
                  • <strong className="text-foreground">{customerBreakdown.totalOrders}</strong> total orders across stages:
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("All");
                  setFilters((f) => ({ ...f, customer: customerBreakdown.customerName }));
                  setShowCrossTabOrders(false);
                }}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View all {customerBreakdown.totalOrders} in "All" Tab →
              </button>
              {filters.customer && (
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, customer: "" }))}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-2"
                >
                  <X className="h-3 w-3" /> Clear customer
                </button>
              )}
            </div>
          </div>

          {/* Stage Breakdown Chips */}
          <div className="flex items-center gap-1.5 pt-2.5 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
              Filter by Stage:
            </span>
            {customerBreakdown.stages.map((st) => {
              const isCurrentActiveTab = activeTab === st.tab;
              return (
                <button
                  key={st.tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(st.tab);
                    if (!filters.customer) {
                      setFilters((f) => ({ ...f, customer: customerBreakdown.customerName }));
                    }
                    setShowCrossTabOrders(false);
                    toast.info(`Switched to "${st.label}" tab (${st.count} orders for ${customerBreakdown.customerName})`);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer shadow-xs",
                    isCurrentActiveTab
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                      : "bg-background border border-border text-foreground hover:bg-muted hover:border-primary/40"
                  )}
                >
                  <span>{st.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                      isCurrentActiveTab
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-Tab Order Discovery Banner */}
      {otherStageOrders.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 p-4 shadow-soft transition-all animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  {otherStageOrders.length === 1 ? (
                    <>
                      Order <span className="font-mono text-primary font-bold">#{String(otherStageOrders[0].orderNumber || otherStageOrders[0].id).replace(/^#+/, "")}</span> was found in the{" "}
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-extrabold bg-primary text-primary-foreground shadow-xs">
                        {getOrderPrimaryTab(otherStageOrders[0])}
                      </span>{" "}
                      stage (not in active tab "{activeTab}")
                    </>
                  ) : (
                    <>
                      Found {otherStageOrders.length} matching order{otherStageOrders.length > 1 ? "s" : ""} in other stages ({Array.from(new Set(otherStageOrders.map((o) => getOrderPrimaryTab(o)))).join(", ")})
                    </>
                  )}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                {otherStageOrders.length === 1 ? (
                  <>
                    Customer: <strong className="text-foreground">{otherStageOrders[0].customer.name}</strong>
                    {otherStageOrders[0].customer.phone && ` • Phone: ${otherStageOrders[0].customer.phone}`}
                    {otherStageOrders[0].total && ` • Total: QAR ${otherStageOrders[0].total.toLocaleString()}`}
                  </>
                ) : (
                  "Switch tabs or toggle below to view orders from other fulfillment stages."
                )}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0 ml-6 sm:ml-0">
              {otherStageOrders.length === 1 && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-sm h-8 px-3 text-xs gap-1"
                  onClick={() => {
                    const target = getOrderPrimaryTab(otherStageOrders[0]);
                    setActiveTab(target);
                    setShowCrossTabOrders(false);
                    toast.success(`Switched to "${target}" tab for order #${String(otherStageOrders[0].orderNumber || otherStageOrders[0].id).replace(/^#+/, "")}`);
                  }}
                >
                  <span>Switch to {getOrderPrimaryTab(otherStageOrders[0])} Tab</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCrossTabOrders((prev) => !prev)}
                className="font-semibold text-xs h-8 px-3 border-border hover:bg-card"
              >
                {showCrossTabOrders ? "Hide Cross-Stage Orders" : `Show ${otherStageOrders.length} Order${otherStageOrders.length > 1 ? "s" : ""} Here`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{activePagination.from ?? 1}</span> to{" "}
          <span className="font-medium text-foreground">{activePagination.to ?? filtered.length}</span> of{" "}
          {activePagination.total ?? filtered.length} orders
        </span>
        {isStatusFetching && !showSkeleton && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            Updating...
          </span>
        )}
      </div>

      {showSkeleton ? (
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
        otherStageOrders.length > 0 ? (
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-6 py-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 grid place-items-center text-primary">
              <Search className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">
                No matching orders in the "{activeTab}" tab
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {otherStageOrders.length === 1 ? (
                  <>
                    Order <strong className="text-foreground">#{String(otherStageOrders[0].orderNumber || otherStageOrders[0].id).replace(/^#+/, "")}</strong> exists in the{" "}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-primary text-primary-foreground shadow-xs">
                      {getOrderPrimaryTab(otherStageOrders[0])}
                    </span>{" "}
                    stage.
                  </>
                ) : (
                  `Found ${otherStageOrders.length} matching order(s) in other fulfillment stages.`
                )}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {otherStageOrders.length === 1 ? (
                <Button
                  type="button"
                  className="font-bold shadow-md bg-primary text-primary-foreground gap-1.5"
                  onClick={() => {
                    const target = getOrderPrimaryTab(otherStageOrders[0]);
                    setActiveTab(target);
                    setShowCrossTabOrders(false);
                    toast.success(`Switched to "${target}" tab for order #${String(otherStageOrders[0].orderNumber || otherStageOrders[0].id).replace(/^#+/, "")}`);
                  }}
                >
                  <span>Open in {getOrderPrimaryTab(otherStageOrders[0])} Tab</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="font-bold shadow-md bg-primary text-primary-foreground gap-1.5"
                  onClick={() => {
                    setActiveTab("All");
                    setShowCrossTabOrders(false);
                  }}
                >
                  <span>View in "All" Tab</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCrossTabOrders(true)}
                className="font-semibold"
              >
                Show {otherStageOrders.length > 1 ? "Orders" : "Order"} Here
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No orders match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try another status tab or clear search.</p>
          </div>
        )
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

      {!showSkeleton && (
        <PaginationControls
          pagination={activePagination}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isLoading={isStatusLoading}
        />
      )}

      <BulkActionBar
        count={selectedCount}
        onClear={() => setSelectedIds(new Set())}
        onAssignZone={() => {
          if (selectedCount === 0) {
            toast.error("Please select at least one order to assign zone");
            return;
          }
          setZoneDialogOpen(true);
        }}
        onAssignDriver={activeTab === "Ready to Assign" ? () => setDriverDialogOpen(true) : undefined}
        onPrintInvoices={() => {
          if (selectedCount === 0) {
            toast.error("Please select at least one order to print");
            return;
          }
          setPrintDialogOpen(true);
        }}
        onPrintGiftInvoices={() => {
          if (selectedCount === 0) {
            toast.error("Please select at least one order to print gift invoice");
            return;
          }
          setGiftPrintDialogOpen(true);
        }}
        onViewExport={() => {
          if (selectedCount === 0) {
            toast.error("Please select at least one order to export");
            return;
          }
          setExportDialogOpen(true);
        }}
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
          setLocalOverrides((prev) => {
            const next = { ...prev };
            for (const id of targetIds) {
              next[id] = { ...next[id], city: zoneName };
            }
            return next;
          });
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
            : baseOrders.filter((o) => selectedIds.has(o.id))
        }
        onAssign={(driver) => {
          const targetIds = singleActionOrder ? [singleActionOrder.id] : Array.from(selectedIds);
          setLocalOverrides((prev) => {
            const next = { ...prev };
            for (const id of targetIds) {
              next[id] = { ...next[id], driver: driver, status: "Driver Accepted" as const };
            }
            return next;
          });
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
            ? [toEnrichedOrder(singleActionOrder)]
            : (Array.from(selectedIds)
                .map((id) => getEnrichedOrderFromState(id))
                .filter(Boolean) as EnrichedOrder[])
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
            ? [toEnrichedOrder(singleActionOrder)]
            : (Array.from(selectedIds)
                .map((id) => getEnrichedOrderFromState(id))
                .filter(Boolean) as EnrichedOrder[])
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
            ? [toEnrichedOrder(singleActionOrder)]
            : (Array.from(selectedIds)
                .map((id) => getEnrichedOrderFromState(id))
                .filter(Boolean) as EnrichedOrder[])
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
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Order ID / Number */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="orderId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Order ID / Order #
                </Label>
                {filters.orderId && (
                  <button
                    type="button"
                    onClick={() => setFilters(f => ({ ...f, orderId: "" }))}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Input 
                id="orderId"
                value={filters.orderId}
                onChange={(e) => setFilters(f => ({ ...f, orderId: e.target.value }))}
                placeholder="E.g. 1012 or #1012"
                className="h-11 bg-muted/20 border-border rounded-xl shadow-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
              />
            </div>

            {/* Live Filter Order Match Intelligence Card */}
            {sheetMatchedOrder && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Order #{String(sheetMatchedOrder.orderNumber || sheetMatchedOrder.id).replace(/^#+/, "")}</span>
                  </div>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-extrabold bg-primary text-primary-foreground shadow-xs">
                    {getOrderPrimaryTab(sheetMatchedOrder)}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground border-y border-primary/10 py-2">
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <strong className="text-foreground">{sheetMatchedOrder.customer.name}</strong>
                  </div>
                  {sheetMatchedOrder.customer.phone && (
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span className="font-mono text-foreground">{sheetMatchedOrder.customer.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <strong className="text-foreground">QAR {sheetMatchedOrder.total?.toLocaleString()}</strong>
                  </div>
                </div>

                {sheetCustomerBreakdown && sheetCustomerBreakdown.stages.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Customer Orders Across Stages ({sheetCustomerBreakdown.totalOrders} total):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sheetCustomerBreakdown.stages.map((st) => (
                        <button
                          key={st.tab}
                          type="button"
                          onClick={() => {
                            setActiveTab(st.tab);
                            setFilters(f => ({ ...f, customer: sheetCustomerBreakdown.customerName }));
                            setFiltersOpen(false);
                            toast.info(`Switched to "${st.label}" tab for ${sheetCustomerBreakdown.customerName}`);
                          }}
                          className="px-2 py-1 rounded-md text-xs font-semibold bg-background border border-border hover:border-primary text-foreground flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <span>{st.label}</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-muted">{st.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-9 rounded-lg font-bold bg-primary text-primary-foreground shadow-sm gap-1.5"
                    onClick={() => {
                      const target = getOrderPrimaryTab(sheetMatchedOrder);
                      setActiveTab(target);
                      setSearch(sheetMatchedOrder.orderNumber || sheetMatchedOrder.id);
                      setFiltersOpen(false);
                      toast.success(`Switched to "${target}" tab for order #${String(sheetMatchedOrder.orderNumber || sheetMatchedOrder.id).replace(/^#+/, "")}`);
                    }}
                  >
                    <span>Jump to {getOrderPrimaryTab(sheetMatchedOrder)} Tab</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Customer Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customer" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Customer Name
                </Label>
                {filters.customer && (
                  <button
                    type="button"
                    onClick={() => setFilters(f => ({ ...f, customer: "" }))}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Input 
                id="customer"
                value={filters.customer}
                onChange={(e) => setFilters(f => ({ ...f, customer: e.target.value }))}
                placeholder="E.g. Rakonex Dev"
                className="h-11 bg-muted/20 border-border rounded-xl shadow-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              />
            </div>

            {/* When searching customer in filter sheet, show their stage breakdown */}
            {!sheetMatchedOrder && sheetCustomerBreakdown && sheetCustomerBreakdown.stages.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    {sheetCustomerBreakdown.customerName} ({sheetCustomerBreakdown.totalOrders} total orders)
                  </span>
                </div>
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Select stage to view:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sheetCustomerBreakdown.stages.map((st) => (
                    <button
                      key={st.tab}
                      type="button"
                      onClick={() => {
                        setActiveTab(st.tab);
                        setFiltersOpen(false);
                        toast.info(`Showing "${st.label}" orders for ${sheetCustomerBreakdown.customerName}`);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-background border border-border hover:border-primary text-foreground flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{st.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-muted">{st.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Order Status */}
            <div className="space-y-2">
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
            <div className="space-y-2">
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
          </div>
          
          <div className="p-6 border-t border-border bg-muted/10 backdrop-blur-sm">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl h-11 font-semibold text-slate-800 dark:text-slate-200 border-border shadow-sm hover:bg-muted/50 transition-colors"
                onClick={() => setFilters({ status: "All", paymentStatus: "All", customer: "", orderId: "" })}
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
