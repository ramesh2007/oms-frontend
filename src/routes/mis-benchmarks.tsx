import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useOrders } from "@/hooks/useOrders";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Timer,
  AlertTriangle,
  ExternalLink,
  PackageSearch,
  Boxes,
  Truck,
  UserCheck,
  Info,
} from "lucide-react";
import { misDataProvider } from "@/lib/mis/mis-data-service";
import { formatDuration, formatDurationCompact } from "@/lib/mis/sla-config";
import { formatOvershoot } from "@/lib/mis/sla-evaluator";
import type { MisSummary, SlaSummary, DelayedOrderEntry, MisFilters } from "@/lib/mis/mis-types";
import type { SlaType } from "@/lib/mis/sla-config";

export const Route = createFileRoute("/mis-benchmarks")({
  head: () => ({
    meta: [
      { title: "MIS Benchmarks - Halamama LMD" },
      {
        name: "description",
        content: "Track operational SLAs across picking, packing, driver assignment, and delivery.",
      },
    ],
  }),
  component: MisBenchmarksPage,
});

const WAREHOUSES = [
  { value: "all", label: "All Warehouses" },
  { value: "F01", label: "F01 - Fulfillment Center Hilal" },
  { value: "F02", label: "F02 - Main Warehouse - Safety Stock" },
  { value: "MWO", label: "MWO - Main Warehouse Outdoor" },
  { value: "VS", label: "VS - Virtual Stock" },
];

function getDefaultDateRange(): [string, string] {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return [start.toISOString().split("T")[0], end];
}

function formatTargetDisplay(minutes: number): string {
  if (minutes >= 60) {
    const hrs = minutes / 60;
    return Number.isInteger(hrs) ? `${hrs}.0 hours` : `${hrs.toFixed(1)} hours`;
  }
  return `${minutes} min`;
}

/* ── KPI Card ──────────────────────────────────────────────────────── */

function SlaCard({
  title,
  icon: Icon,
  summary,
}: {
  title: string;
  icon: React.ElementType;
  summary: SlaSummary;
}) {
  const metPct =
    summary.totalOrders > 0
      ? Math.min(100, Math.max(0, (summary.metCount / summary.totalOrders) * 100))
      : 0;
  const isHighMet = summary.metPercent >= 90;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
      {/* Top: Title & Icon */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Icon className="h-4.5 w-4.5 text-muted-foreground/70" />
      </div>

      {/* Main Metric & Target */}
      <div>
        <div className="text-3xl font-bold tabular-nums text-foreground tracking-tight">
          {summary.metPercent.toFixed(1)}%
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Target: {formatTargetDisplay(summary.benchmarkMinutes)}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Avg Time</p>
          <p className="text-sm font-bold text-foreground mt-0.5">
            {formatDuration(summary.avgDurationMinutes)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Orders</p>
          <p className="text-sm font-bold text-foreground mt-0.5">
            {summary.totalOrders.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/60">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isHighMet ? "bg-emerald-500" : "bg-red-500",
            )}
            style={{ width: `${metPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground font-medium pt-0.5">
          <span>{summary.metCount.toLocaleString()} met</span>
          <span>{summary.missedCount.toLocaleString()} missed</span>
        </div>
      </div>
    </div>
  );
}

/* ── Delayed Orders Table ──────────────────────────────────────────── */

function DelayedOrdersTable({
  entries,
  slaType,
  search,
  setSearch,
  page,
  setPage,
}: {
  entries: DelayedOrderEntry[];
  slaType: SlaType | "packedToDriver";
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
}) {
  const PAGE_SIZE = 20;
  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.orderId.toLowerCase().includes(q) ||
        e.assignedTo.toLowerCase().includes(q) ||
        e.warehouse.toLowerCase().includes(q),
    );
  }, [entries, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showWarehouse = slaType !== "delivery";

  return (
    <div className="space-y-0">
      {/* Search + count */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search orders…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-8 pl-9 pr-3 rounded-lg bg-muted/50 border border-transparent text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="font-bold text-primary">{filtered.length}</span> delayed orders
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Order
              </th>
              {showWarehouse && (
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                  Outlet / Warehouse
                </th>
              )}
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned To
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Duration
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Benchmark
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Overshoot
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Reason
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={showWarehouse ? 8 : 7}
                  className="px-5 py-12 text-center text-sm text-muted-foreground"
                >
                  {filtered.length === 0 && entries.length === 0
                    ? "No delayed orders found for this SLA type."
                    : "No results match your search."}
                </td>
              </tr>
            ) : (
              paged.map((entry) => (
                <tr
                  key={entry.orderId}
                  className="border-b border-border hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: entry.orderId }}
                      className="font-mono font-semibold text-primary hover:underline"
                    >
                      {entry.orderId}
                    </Link>
                  </td>
                  {showWarehouse && (
                    <td className="px-4 py-3 text-muted-foreground">{entry.warehouse}</td>
                  )}
                  <td className="px-4 py-3 font-medium text-foreground">{entry.assignedTo}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                      <Clock className="h-3 w-3" />
                      {formatDurationCompact(entry.businessDurationMinutes)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                      <Target className="h-3 w-3" />
                      {formatDurationCompact(entry.benchmarkMinutes)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                      {formatOvershoot(entry.overshootFactor)}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-muted-foreground max-w-[160px] truncate"
                    title={entry.delayReason}
                  >
                    {entry.delayReason}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: entry.orderId }}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className="h-7 w-7 rounded-lg border border-border grid place-items-center hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              className="h-7 w-7 rounded-lg border border-border grid place-items-center hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Gap Analytics Card ────────────────────────────────────────────── */

function GapCard({
  title,
  icon: Icon,
  avg,
  max,
  count,
}: {
  title: string;
  icon: React.ElementType;
  avg: number;
  max: number;
  count: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-muted grid place-items-center">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Average
          </p>
          <p className="text-sm font-bold text-foreground mt-0.5">{formatDuration(avg)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Longest
          </p>
          <p className="text-sm font-bold text-foreground mt-0.5">{formatDuration(max)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Orders
          </p>
          <p className="text-sm font-bold text-foreground mt-0.5">{count}</p>
        </div>
      </div>
    </div>
  );
}

/* ── CSV Export ─────────────────────────────────────────────────────── */

function exportDelayedCSV(entries: DelayedOrderEntry[], slaType: string) {
  const headers = [
    "Order ID",
    "Warehouse",
    "Assigned To",
    "Duration (min)",
    "Benchmark (min)",
    "Overshoot",
    "Delay (min)",
    "Reason",
  ];
  const rows = entries.map((e) => [
    e.orderId,
    e.warehouse,
    e.assignedTo,
    e.businessDurationMinutes.toFixed(1),
    e.benchmarkMinutes.toString(),
    e.overshootFactor.toFixed(1) + "x",
    e.delayMinutes.toFixed(1),
    e.delayReason,
  ]);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join(
    "\n",
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mis_${slaType}_delays.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Main Page ─────────────────────────────────────────────────────── */

function MisBenchmarksPage() {
  const [defaultStart, defaultEnd] = getDefaultDateRange();
  const [dateStart, setDateStart] = useState(defaultStart);
  const [dateEnd, setDateEnd] = useState(defaultEnd);
  const [warehouse, setWarehouse] = useState("all");
  const [includeReturns, setIncludeReturns] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [delayTab, setDelayTab] = useState<SlaType | "packedToDriver">("picking");
  const [delaySearch, setDelaySearch] = useState("");
  const [delayPage, setDelayPage] = useState(1);

  const { data: allOrders = [], refetch, isRefetching } = useOrders();

  const filters: MisFilters = useMemo(
    () => ({
      dateStart,
      dateEnd,
      warehouse,
    }),
    [dateStart, dateEnd, warehouse],
  );

  const displayOrders = useMemo(() => {
    if (includeReturns) return allOrders;
    return allOrders.filter((o) => !o.returns && (!o.returnItems || o.returnItems.length === 0));
  }, [allOrders, includeReturns]);

  const summary: MisSummary = useMemo(
    () => misDataProvider.getSummary(filters, displayOrders),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, displayOrders, refreshKey],
  );

  const delayedOrders = useMemo(
    () => misDataProvider.getDelayedOrders(filters, delayTab, displayOrders),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, delayTab, displayOrders, refreshKey],
  );

  const handleRefresh = async () => {
    await refetch();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-6 p-4 md:p-6">
          {/* ── Header & Filter Controls ── */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center shadow-soft">
                <TrendingUp className="h-5.5 w-5.5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">MIS Benchmarks</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Track operational SLAs across picking, packing, driver assignment, and delivery.
                </p>
              </div>
            </div>

            {/* Filters Bar matching screenshot */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Warehouse selector */}
              <div className="w-44">
                <Select value={warehouse} onValueChange={setWarehouse}>
                  <SelectTrigger className="h-10 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all font-medium text-xs shadow-2xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border shadow-elevated bg-popover">
                    {WAREHOUSES.map((w) => (
                      <SelectItem key={w.value} value={w.value} className="rounded-lg text-xs">
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date pickers */}
              <div className="flex items-center gap-1.5">
                <div className="w-36">
                  <DatePicker
                    dateString={dateStart}
                    setDateString={setDateStart}
                    placeholder="Start date"
                  />
                </div>
                <span className="text-muted-foreground text-xs">—</span>
                <div className="w-36">
                  <DatePicker
                    dateString={dateEnd}
                    setDateString={setDateEnd}
                    placeholder="End date"
                  />
                </div>
              </div>

              {/* Include return orders switch */}
              <div className="flex items-center gap-2 px-3 h-10 rounded-xl border border-border bg-card text-xs font-medium select-none shadow-2xs">
                <Switch
                  id="include-returns"
                  checked={includeReturns}
                  onCheckedChange={setIncludeReturns}
                />
                <label
                  htmlFor="include-returns"
                  className="cursor-pointer text-foreground text-xs font-medium"
                >
                  Include return orders
                </label>
              </div>

              {/* Actions: Refresh & Export */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefetching}
                  className="h-10 w-10 rounded-xl border border-border bg-card grid place-items-center hover:bg-muted transition-colors cursor-pointer shadow-soft disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw
                    className={cn("h-4 w-4 text-muted-foreground", isRefetching && "animate-spin")}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => exportDelayedCSV(delayedOrders, delayTab)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-soft"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* ── Shift Info Banner matching screenshot ── */}
          <div className="rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Shift Info (Asia/Qatar)</span>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefetching}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    isRefetching && "animate-spin",
                  )}
                />
                Force Recalculate
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Picking freeze:{" "}
              <strong className="text-foreground font-semibold">01:00–06:00 (same day)</strong> ·
              Packing freeze:{" "}
              <strong className="text-foreground font-semibold">01:00–06:00 (same day)</strong> ·
              Packed → driver uses{" "}
              <strong className="text-foreground font-semibold">packing freeze</strong> · Delivery
              starts on <strong className="text-foreground font-semibold">driver assignment</strong>{" "}
              · Delivery freeze:{" "}
              <strong className="text-foreground font-semibold">01:00–09:00 (same day)</strong>
            </p>
          </div>

          {/* ── 4 KPI Cards (Picking, Packing, Packed → Driver, Delivery) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <SlaCard title="Picking" icon={PackageSearch} summary={summary.picking} />
            <SlaCard title="Packing" icon={Boxes} summary={summary.packing} />
            <SlaCard title="Packed → Driver" icon={UserCheck} summary={summary.packedToDriver} />
            <SlaCard title="Delivery" icon={Truck} summary={summary.delivery} />
          </div>

          {/* ── Delayed Orders ── */}
          <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <Tabs
              value={delayTab}
              onValueChange={(v) => {
                setDelayTab(v as SlaType | "packedToDriver");
                setDelaySearch("");
                setDelayPage(1);
              }}
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Delayed Orders
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Orders that missed their SLA benchmark, sorted by overshoot.
                  </p>
                </div>
                <TabsList className="h-auto gap-0 rounded-xl bg-muted/50 border border-border p-1 flex-wrap">
                  <TabsTrigger
                    value="picking"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-soft transition-all"
                  >
                    Picking Delays
                  </TabsTrigger>
                  <TabsTrigger
                    value="packing"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-soft transition-all"
                  >
                    Packing Delays
                  </TabsTrigger>
                  <TabsTrigger
                    value="packedToDriver"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-soft transition-all"
                  >
                    Packed → Driver Delays
                  </TabsTrigger>
                  <TabsTrigger
                    value="delivery"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-soft transition-all"
                  >
                    Delivery Delays
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="picking" className="mt-0">
                <DelayedOrdersTable
                  entries={delayedOrders}
                  slaType="picking"
                  search={delaySearch}
                  setSearch={setDelaySearch}
                  page={delayPage}
                  setPage={setDelayPage}
                />
              </TabsContent>
              <TabsContent value="packing" className="mt-0">
                <DelayedOrdersTable
                  entries={delayedOrders}
                  slaType="packing"
                  search={delaySearch}
                  setSearch={setDelaySearch}
                  page={delayPage}
                  setPage={setDelayPage}
                />
              </TabsContent>
              <TabsContent value="packedToDriver" className="mt-0">
                <DelayedOrdersTable
                  entries={delayedOrders}
                  slaType="packedToDriver"
                  search={delaySearch}
                  setSearch={setDelaySearch}
                  page={delayPage}
                  setPage={setDelayPage}
                />
              </TabsContent>
              <TabsContent value="delivery" className="mt-0">
                <DelayedOrdersTable
                  entries={delayedOrders}
                  slaType="delivery"
                  search={delaySearch}
                  setSearch={setDelaySearch}
                  page={delayPage}
                  setPage={setDelayPage}
                />
              </TabsContent>
            </Tabs>
          </section>

          {/* ── Operational Gap Analytics ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Operational Gap Analytics</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold">
                Preview
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GapCard
                title="Picking Complete → Packing Start"
                icon={ArrowRight}
                avg={summary.operationalGaps.pickToPack.avgMinutes}
                max={summary.operationalGaps.pickToPack.maxMinutes}
                count={summary.operationalGaps.pickToPack.count}
              />
              <GapCard
                title="Packing Complete → Driver Assignment"
                icon={ArrowRight}
                avg={summary.operationalGaps.packToDriver.avgMinutes}
                max={summary.operationalGaps.packToDriver.maxMinutes}
                count={summary.operationalGaps.packToDriver.count}
              />
            </div>
          </section>

          {/* ── Footer ── */}
          <div className="text-center text-[10px] text-muted-foreground py-4">
            Halamama · MIS Benchmarks Engine · v1.0.0 · Business Time Engine with SLA freeze
            protection
          </div>
        </main>
      </div>
    </div>
  );
}
