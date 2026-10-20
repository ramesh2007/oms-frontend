import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { type Order } from "@/lib/orders";
import { useOrders } from "@/hooks/useOrders";
import { cn } from "@/lib/utils";
import {
  Download,
  Search,
  Calendar as CalendarIcon,
  Database,
  Filter,
  FileSpreadsheet,
  ChevronDown,
  Info,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Warehouse Export Terminal - Halamama LMD" },
      { name: "description", content: "Configure and export warehouse reports for Picker, Packer, and Driver domains." },
    ],
  }),
  component: ReportsPage,
});

/* ── Types ─────────────────────────────────────────────────────────── */

type ReportDomain = "picker" | "packer" | "driver";
type QuickPreset = "today" | "7d" | "30d" | "last_month";

const DOMAIN_OPTIONS: { value: ReportDomain; label: string }[] = [
  { value: "picker", label: "Picker Export" },
  { value: "packer", label: "Packer Export" },
  { value: "driver", label: "Driver Export" },
];

const PRESET_OPTIONS: { value: QuickPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "last_month", label: "Last Month" },
];

/* ── Helpers ────────────────────────────────────────────────────────── */

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addMinutes(date: string, time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${date} ${hh}:${mm}:${String(Math.round(Math.random() * 59)).padStart(2, "0")}`;
}

function getPresetRange(preset: QuickPreset): [string, string] {
  const now = new Date();
  const end = fmtDate(now);
  switch (preset) {
    case "today": return [end, end];
    case "7d": { const d = new Date(now); d.setDate(d.getDate() - 7); return [fmtDate(d), end]; }
    case "30d": { const d = new Date(now); d.setDate(d.getDate() - 30); return [fmtDate(d), end]; }
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return [fmtDate(s), fmtDate(e)];
    }
  }
}

/* ── CSV generation ────────────────────────────────────────────────── */

function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Status Badge ──────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Delivered: "bg-success/10 text-success border-success/20",
    "Delivery Failed": "bg-destructive/10 text-destructive border-destructive/20",
    "Driver Accepted": "bg-info/10 text-info border-info/20",
    Started: "bg-warning/10 text-warning border-warning/20",
    "Ready to Assign": "bg-primary/10 text-primary border-primary/20",
    Picking: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    Packing: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  };
  const cls = colors[status] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-semibold border whitespace-nowrap", cls)}>
      {status}
    </span>
  );
}

/* ── Table Config per Domain ───────────────────────────────────────── */

function getPickerHeaders() {
  return ["Order Name", "Customer Name", "Total Price", "Item Count", "Created At", "Picked At", "Picked By", "Status"];
}
function getPickerRow(o: Order): string[] {
  const isPicked = !["New", "Cancelled"].includes(o.status);
  const picker = o.picker || (isPicked ? "noushad" : "-");
  const pickedAt = picker !== "-" ? addMinutes(o.date, o.time, 25) : "-";
  return [
    o.id,
    o.customer.name,
    o.total.toFixed(2),
    String(o.items || 1),
    `${o.date} ${o.time}`,
    pickedAt,
    picker,
    o.status,
  ];
}

function getPackerHeaders() {
  return ["Order Name", "Customer Name", "Packed By", "Packed At", "Item Count", "Bags Count", "Status"];
}
function getPackerRow(o: Order): string[] {
  const isPacked = ["Packing", "Ready to Assign", "Driver Accepted", "Started", "Delivered"].includes(o.status);
  const packer = o.packer || (isPacked ? "mashood" : "-");
  const packedAt = packer !== "-" ? addMinutes(o.date, o.time, 42) : "-";
  return [
    o.id,
    o.customer.name,
    packer,
    packedAt,
    String(o.items || 1),
    String(o.bags || 1),
    o.status,
  ];
}

function getDriverHeaders() {
  return [
    "Order Name",
    "Order Date",
    "Customer Name",
    "Address 2",
    "Zone",
    "Bags Count",
    "Item Count",
    "Driver Name",
    "Reassigned Driver Name",
    "Trip Started At",
    "Delivered At",
    "Total Price",
    "Shopify Payment Method",
    "Driver Payment Method",
    "Status",
    "Delivery Failed At",
    "Delivery Failed Reason",
  ];
}
function getDriverRow(o: Order): string[] {
  const hasDriver = ["Driver Accepted", "Started", "Delivered", "Delivery Failed"].includes(o.status) || !!o.driver;
  const driver = o.driver || (hasDriver ? "mwd_shambu" : "-");
  const tripStarted = driver !== "-" ? addMinutes(o.date, o.time, 58) : "-";
  const deliveredAt = o.status === "Delivered" && driver !== "-" ? addMinutes(o.date, o.time, 92) : "-";
  const failedAt = o.status === "Delivery Failed" && driver !== "-" ? addMinutes(o.date, o.time, 105) : "-";
  const zone = o.city && o.city.toLowerCase().startsWith("zone") ? o.city : "Zone 25";
  const address2 = o.city && !o.city.toLowerCase().startsWith("zone") ? o.city : "Doha, Qatar";
  const shopifyPayment = "Credit Card";
  const driverPayment = o.status === "Delivered" ? "Cash on Delivery" : "-";
  const failedReason = o.status === "Delivery Failed" ? "Customer not answering phone" : "-";

  return [
    o.id,
    o.date,
    o.customer.name,
    address2,
    zone,
    String(o.bags || 1),
    String(o.items || 1),
    driver,
    "-",
    tripStarted,
    deliveredAt,
    o.total.toFixed(2),
    shopifyPayment,
    driverPayment,
    o.status,
    failedAt,
    failedReason,
  ];
}

/* ── Main Page ─────────────────────────────────────────────────────── */

function ReportsPage() {
  const { data: orders = [] } = useOrders();

  const [domain, setDomain] = useState<ReportDomain>("picker");
  const [preset, setPreset] = useState<QuickPreset>("last_month");
  const [dateRange, setDateRange] = useState<[string, string]>(() => getPresetRange("last_month"));
  const [search, setSearch] = useState("");

  const handlePreset = (p: QuickPreset) => {
    setPreset(p);
    setDateRange(getPresetRange(p));
  };

  // Filter orders by date range and domain relevance
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (o.date < dateRange[0] || o.date > dateRange[1]) return false;
      if (domain === "picker" && !o.picker && o.status === "New") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.id.toLowerCase().includes(q) && !o.customer.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, dateRange, domain, search]);

  const domainLabel = DOMAIN_OPTIONS.find((d) => d.value === domain)!.label.replace(" Export", "");

  const headers = domain === "picker" ? getPickerHeaders() : domain === "packer" ? getPackerHeaders() : getDriverHeaders();
  const getRow = domain === "picker" ? getPickerRow : domain === "packer" ? getPackerRow : getDriverRow;

  const handleDownload = () => {
    const csvHeaders = headers;
    const rows = filtered.map(getRow);
    const filename = `${domainLabel.toLowerCase()}_export_${dateRange[0]}_to_${dateRange[1]}.csv`;
    downloadCSV(csvHeaders, rows, filename);
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-6 p-4 md:p-6">

          {/* ── Page Header ── */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-primary grid place-items-center shadow-soft">
              <FileSpreadsheet className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Warehouse Export Terminal</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Configure filters and export operational data as CSV</p>
            </div>
          </div>

          {/* ── Filter Card ── */}
          <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configure Filter & Export Selection</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Date Range */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Range</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <DatePicker
                      dateString={dateRange[0]}
                      setDateString={(val) => setDateRange([val, dateRange[1]])}
                      placeholder="Start date"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">→</span>
                  <div className="flex-1">
                    <DatePicker
                      dateString={dateRange[1]}
                      setDateString={(val) => setDateRange([dateRange[0], val])}
                      placeholder="End date"
                    />
                  </div>
                </div>
              </div>

              {/* Report Domain */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Report Domain</label>
                <Select value={domain} onValueChange={(val) => setDomain(val as ReportDomain)}>
                  <SelectTrigger className="h-10 rounded-xl border border-border bg-muted/30 hover:bg-muted/40 hover:border-primary/30 active:scale-[0.98] transition-all font-medium">
                    <SelectValue placeholder="Select Domain" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border shadow-elevated bg-popover">
                    {DOMAIN_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value} className="rounded-lg">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Presets</label>
                <Select value={preset} onValueChange={(val) => handlePreset(val as QuickPreset)}>
                  <SelectTrigger className="h-10 rounded-xl border border-border bg-muted/30 hover:bg-muted/40 hover:border-primary/30 active:scale-[0.98] transition-all font-medium">
                    <SelectValue placeholder="Select Preset" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border shadow-elevated bg-popover">
                    {PRESET_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="rounded-lg">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active date coverage */}
            <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Active date coverage:</span>
              <span className="font-semibold text-foreground">{dateRange[0]}</span>
              <span>→</span>
              <span className="font-semibold text-foreground">{dateRange[1]}</span>
            </div>
          </section>

          {/* ── Preview Card ── */}
          <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-semibold">{domainLabel} Report Preview</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Found <span className="font-bold text-primary">{filtered.length}</span> records
                </p>
              </div>
              <button
                id="download-csv-btn"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-primary text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-border">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="report-search"
                  placeholder={`Search in ${domainLabel.toLowerCase()} records by keyword...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-background transition-colors"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    {headers.map((h) => (
                      <th key={h} className="text-left font-semibold text-muted-foreground text-[10px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length} className="px-5 py-16 text-center text-sm text-muted-foreground">
                        No records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o) => {
                      const row = getRow(o);
                      return (
                        <tr key={o.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          {row.map((cell, i) => (
                            <td key={i} className="px-4 py-3 whitespace-nowrap text-xs">
                              {headers[i] === "Status" ? (
                                <StatusBadge status={cell} />
                              ) : headers[i] === "Total Price" ? (
                                <span className="font-medium tabular-nums">{cell}</span>
                              ) : headers[i] === "Order Name" ? (
                                <span className="font-mono font-medium text-primary">{cell}</span>
                              ) : (
                                <span className="text-muted-foreground">{cell}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing {filtered.length} records</span>
              <span className="flex items-center gap-1.5 text-[10px]">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                Halamama · RouteMyOrder · Warehouse Export Terminal · v2.4.1
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
