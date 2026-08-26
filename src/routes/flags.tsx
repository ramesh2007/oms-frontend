import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { FlagsTable, FlaggedItemsTable, type FlaggedItem } from "@/components/orders/tables/FlagsTable";
import { type Order } from "@/lib/orders";
import { useFlaggedOrders, useFlaggedItems } from "@/hooks/useOrders";
import { PaginationControls } from "@/components/orders/PaginationControls";
import { useState, useMemo } from "react";
import {
  Flame,
  AlertTriangle,
  PackageX,
  Clock,
  ShieldAlert,
  Filter,
  Search,
  X,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/flags")({
  head: () => ({
    meta: [
      { title: "Flags & Exceptions - Halamama LMD" },
      {
        name: "description",
        content: "Monitor and resolve flagged orders, delivery exceptions, and flagged items.",
      },
    ],
  }),
  component: FlagsPage,
});

type FilterCategory = "all" | "delivery_failed" | "flagged" | "tat_exceeded" | "flagged_items";

const filterCategories: { id: FilterCategory; label: string; icon: typeof AlertTriangle }[] = [
  { id: "all", label: "All Exceptions", icon: Flame },
  { id: "delivery_failed", label: "Delivery Failed", icon: PackageX },
  { id: "flagged", label: "Flagged Orders", icon: ShieldAlert },
  { id: "tat_exceeded", label: "TAT Exceeded", icon: Clock },
  { id: "flagged_items", label: "Flagged Items", icon: Boxes },
];

function FlagsPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // GET /api/orders/status/flagged & GET /api/orders/flagged
  const { data: flaggedResult, isLoading: loadingOrders } = useFlaggedOrders(currentPage, 15);
  const flaggedOrders = flaggedResult?.orders || [];
  const pagination = flaggedResult?.pagination;

  // GET /api/orders/flagged-items
  const { data: flaggedItemsRes, isLoading: loadingItems } = useFlaggedItems();
  const flaggedItems: FlaggedItem[] = useMemo(() => {
    const rawData = Array.isArray(flaggedItemsRes?.data)
      ? flaggedItemsRes.data
      : Array.isArray(flaggedItemsRes)
      ? flaggedItemsRes
      : [];
    return rawData.map((item: any, idx: number) => ({
      id: item.id || idx + 1,
      order_id: item.order_id || item.order_number || `#${item.id || idx + 1}`,
      item_name: item.item_name || item.name || item.title || "Flagged Item",
      sku: item.sku || item.item_sku || "—",
      reason: item.reason || item.flag_reason || "Requires review",
      flagged_by: item.flagged_by || item.user_name || "Warehouse Staff",
      flagged_at: item.flagged_at || item.created_at || "—",
      status: item.status || "Flagged",
    }));
  }, [flaggedItemsRes]);

  const goToOrder = (order: Order) => {
    navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
  };

  const goToOrderById = (orderId: string) => {
    const cleanId = orderId.replace(/^#/, "");
    navigate({ to: "/orders/$orderId", params: { orderId: cleanId } });
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = flaggedOrders;

    if (activeFilter === "delivery_failed") {
      result = result.filter((o) => o.status === "Delivery Failed");
    } else if (activeFilter === "flagged") {
      result = result.filter((o) => o.status === "Flagged" || o.status === "Unfulfilled");
    } else if (activeFilter === "tat_exceeded") {
      result = result.filter((o) => {
        const m = o.tat.match(/(\d+)h/);
        return m ? parseInt(m[1], 10) > 24 : false;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.phone.includes(q) ||
          o.city.toLowerCase().includes(q) ||
          o.driver?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [flaggedOrders, activeFilter, searchQuery]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return flaggedItems;
    const q = searchQuery.toLowerCase();
    return flaggedItems.filter(
      (item) =>
        String(item.order_id).toLowerCase().includes(q) ||
        (item.item_name && item.item_name.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.reason && item.reason.toLowerCase().includes(q)),
    );
  }, [flaggedItems, searchQuery]);

  // Stat counts
  const deliveryFailedCount = flaggedOrders.filter((o) => o.status === "Delivery Failed").length;
  const flaggedCount = flaggedOrders.filter((o) => o.status === "Flagged").length;
  const tatExceededCount = flaggedOrders.filter((o) => {
    const m = o.tat.match(/(\d+)h/);
    return m ? parseInt(m[1], 10) > 24 : false;
  }).length;

  const statCards = [
    {
      label: "Total Exceptions",
      value: pagination?.total || flaggedOrders.length,
      icon: Flame,
      tone: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-500",
    },
    {
      label: "Delivery Failed",
      value: deliveryFailedCount,
      icon: PackageX,
      tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
    },
    {
      label: "Flagged Items",
      value: flaggedItems.length,
      icon: Boxes,
      tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-purple-500/20",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
    {
      label: "TAT Exceeded",
      value: tatExceededCount,
      icon: Clock,
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-5 p-4 md:p-6">
          {/* Page header */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 grid place-items-center">
                <Flame className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Flags & Exceptions
                </h1>
                <p className="text-sm text-muted-foreground">
                  Monitor and resolve flagged orders, delivery failures, and item exceptions.
                </p>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-soft transition-all hover:shadow-elevated"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold tracking-tight">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl grid place-items-center transition-transform group-hover:scale-110",
                        stat.iconBg,
                      )}
                    >
                      <Icon className={cn("h-5 w-5", stat.iconColor)} />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-destructive/30 to-transparent" />
                </div>
              );
            })}
          </div>

          {/* Filters + search row */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Category filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {filterCategories.map((cat) => {
                const Icon = cat.icon;
                const active = activeFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveFilter(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                      active
                        ? "bg-destructive/10 text-destructive ring-1 ring-destructive/20 shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                    <span
                      className={cn(
                        "ml-0.5 min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-bold grid place-items-center",
                        active
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted-foreground/10 text-muted-foreground",
                      )}
                    >
                      {cat.id === "all"
                        ? pagination?.total || flaggedOrders.length
                        : cat.id === "delivery_failed"
                        ? deliveryFailedCount
                        : cat.id === "flagged"
                        ? flaggedCount
                        : cat.id === "tat_exceeded"
                        ? tatExceededCount
                        : flaggedItems.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order, SKU, customer..."
                className="h-9 w-full rounded-lg border border-border bg-muted/30 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all md:w-[280px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Showing{" "}
            <span className="font-semibold text-foreground">
              {activeFilter === "flagged_items" ? filteredItems.length : filteredOrders.length}
            </span>{" "}
            {activeFilter === "flagged_items" ? "flagged item(s)" : "exception(s)"}
            {activeFilter !== "all" && (
              <>
                {" "}
                in{" "}
                <span className="font-semibold text-foreground">
                  {filterCategories.find((c) => c.id === activeFilter)?.label}
                </span>
              </>
            )}
          </div>

          {/* Table display */}
          {activeFilter === "flagged_items" ? (
            <FlaggedItemsTable
              items={filteredItems}
              loading={loadingItems}
              onViewOrder={goToOrderById}
            />
          ) : (
            <>
              <FlagsTable
                orders={filteredOrders}
                loading={loadingOrders}
                onViewOrder={goToOrder}
              />
              {!loadingOrders && (
                <PaginationControls
                  pagination={pagination}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  isLoading={loadingOrders}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
