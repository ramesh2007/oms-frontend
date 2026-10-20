import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { ReturnsTable } from "@/components/orders/tables/ReturnsTable";
import { type Order } from "@/lib/orders";
import { useOrders } from "@/hooks/useOrders";
import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Returns & Replacements - Halamama LMD" },
    ],
  }),
  component: ReturnsPage,
});

type ReturnFilterStatus = "all" | "pending" | "picked up" | "completed";

function ReturnsPage() {
  const navigate = useNavigate();
  const { data: allOrders = [], isLoading: loading } = useOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnFilterStatus>("all");

  const goToOrder = (order: Order) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("last_orders_tab", "Returns & Replacements");
      sessionStorage.setItem("last_orders_from", "/returns");
    }
    navigate({
      to: "/orders/$orderId",
      params: { orderId: order.id },
      search: { tab: "Returns & Replacements", from: "/returns" } as any,
    });
  };

  // Filter to orders that have returns/replacements/exchanges
  const returnOrders = useMemo(() => {
    let filtered = allOrders.filter(
      (o) =>
        Boolean(o.returns) ||
        Boolean(o.returnItems?.length) ||
        o.status === "Replacement" ||
        o.status === "Exchange",
    );

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.phone.includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => {
        const items = o.returnItems ?? [];
        if (items.length === 0) return statusFilter === "pending"; // legacy orders with returns badge but no details
        return items.some((r) => r.status === statusFilter);
      });
    }

    return filtered;
  }, [allOrders, search, statusFilter]);

  // Counts for filter tabs
  const counts = useMemo(() => {
    const base = allOrders.filter(
      (o) =>
        Boolean(o.returns) ||
        Boolean(o.returnItems?.length) ||
        o.status === "Replacement" ||
        o.status === "Exchange",
    );
    const pending = base.filter((o) =>
      (o.returnItems ?? []).some((r) => r.status === "pending"),
    ).length;
    const pickedUp = base.filter((o) =>
      (o.returnItems ?? []).some((r) => r.status === "picked up"),
    ).length;
    const completed = base.filter((o) =>
      (o.returnItems ?? []).every((r) => r.status === "completed") && (o.returnItems?.length ?? 0) > 0,
    ).length;
    return { all: base.length, pending, pickedUp, completed };
  }, [allOrders]);

  const filterTabs: { id: ReturnFilterStatus; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "picked up", label: "Collected", count: counts.pickedUp },
    { id: "completed", label: "Completed", count: counts.completed },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-4 p-4 md:space-y-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Returns & Replacements</h1>
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by order or customer..."
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none ring-ring/30 transition-all focus:ring-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 p-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    statusFilter === tab.id
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <ReturnsTable orders={returnOrders} loading={loading} onViewOrder={goToOrder} />
        </main>
      </div>
    </div>
  );
}
