import { createFileRoute } from "@tanstack/react-router";
import { Package, CheckCircle2, Clock, Loader2, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ShiftTracker } from "@/components/dashboard/ShiftTracker";
import { PipelineTracker } from "@/components/dashboard/PipelineTracker";
import { FlagsPanel } from "@/components/dashboard/FlagsPanel";
import { StaffMonitoring } from "@/components/dashboard/StaffMonitoring";
import { ACTIVE_STATUSES, isUnpaidPayLaterOrder } from "@/lib/orders";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/lib/auth";
import { isDemoMode } from "@/lib/api/config";

export const Route = createFileRoute("/")(  {
  head: () => ({
    meta: [
      { title: "Halamama LMD · RouteMyOrder Admin Dashboard" },
      {
        name: "description",
        content:
          "Real-time warehouse and last-mile delivery operations control center for Halamama LMD.",
      },
      { property: "og:title", content: "Halamama LMD · RouteMyOrder" },
      {
        property: "og:description",
        content:
          "Premium logistics dashboard: orders, pipeline, drivers, exceptions and live delivery map.",
      },
    ],
  }),
  component: Dashboard,
});

function generateHourlySparkline(orderList: any[], filterFn?: (o: any) => boolean): number[] {
  const target = filterFn ? orderList.filter(filterFn) : orderList;
  const spark = new Array(12).fill(0);
  if (target.length === 0) return spark;

  target.forEach((o) => {
    let hour = 12;
    if (o.time) {
      const match = String(o.time).match(/(\d{1,2}):/);
      if (match) hour = parseInt(match[1], 10);
    }
    const bucket = Math.min(11, Math.max(0, Math.floor(hour / 2)));
    spark[bucket] += 1;
  });

  // If all spark values are 0 or constant, distribute proportionally so sparkline visual looks smooth
  const max = Math.max(...spark);
  if (max === 0) {
    const step = target.length / 12;
    return Array.from({ length: 12 }, (_, i) => Math.round((i + 1) * step));
  }

  return spark;
}

function Dashboard() {
  const { data: orders = [] } = useOrders();
  const { user } = useAuth();
  const [period, setPeriod] = useState<"Today" | "7D" | "30D" | "QTD">("Today");

  const filteredOrders = useMemo(() => {
    if (orders.length === 0) return [];
    // Exclude unpaid PayLater orders from general dashboard view
    const activeOrders = orders.filter((o) => !isUnpaidPayLaterOrder(o));
    if (activeOrders.length === 0) return [];

    const currentYear = new Date().getFullYear();

    // Determine the reference "now" date
    let referenceDate = new Date();
    if (isDemoMode()) {
      // Find the latest date in the mock orders list to use as reference "today"
      let maxDate = new Date(0);
      activeOrders.forEach((o) => {
        const d = new Date(`${o.date}, ${currentYear}`);
        if (!isNaN(d.getTime()) && d.getTime() > maxDate.getTime()) {
          maxDate = d;
        }
      });
      if (maxDate.getTime() > 0) {
        referenceDate = maxDate;
      }
    }

    const refTime = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate()
    ).getTime();

    return activeOrders.filter((order) => {
      if (!order.date) return true;
      const orderDateObj = new Date(`${order.date}, ${currentYear}`);
      if (isNaN(orderDateObj.getTime())) return true;

      const orderTime = new Date(
        orderDateObj.getFullYear(),
        orderDateObj.getMonth(),
        orderDateObj.getDate()
      ).getTime();
      const diffDays = (refTime - orderTime) / (1000 * 60 * 60 * 24);

      if (period === "Today") {
        return diffDays === 0;
      } else if (period === "7D") {
        return diffDays >= 0 && diffDays < 7;
      } else if (period === "30D") {
        return diffDays >= 0 && diffDays < 30;
      } else if (period === "QTD") {
        const refMonth = referenceDate.getMonth();
        const startOfQuarterMonth = Math.floor(refMonth / 3) * 3;
        const startOfQuarter = new Date(
          referenceDate.getFullYear(),
          startOfQuarterMonth,
          1
        ).getTime();
        return orderTime >= startOfQuarter && orderTime <= refTime;
      }
      return true;
    });
  }, [orders, period]);

  const previousPeriodOrders = useMemo(() => {
    if (orders.length === 0) return [];
    const activeOrders = orders.filter((o) => !isUnpaidPayLaterOrder(o));
    if (activeOrders.length === 0) return [];

    const currentYear = new Date().getFullYear();
    let referenceDate = new Date();
    if (isDemoMode()) {
      let maxDate = new Date(0);
      activeOrders.forEach((o) => {
        const d = new Date(`${o.date}, ${currentYear}`);
        if (!isNaN(d.getTime()) && d.getTime() > maxDate.getTime()) {
          maxDate = d;
        }
      });
      if (maxDate.getTime() > 0) referenceDate = maxDate;
    }

    const refTime = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate()
    ).getTime();

    return activeOrders.filter((order) => {
      if (!order.date) return false;
      const orderDateObj = new Date(`${order.date}, ${currentYear}`);
      if (isNaN(orderDateObj.getTime())) return false;

      const orderTime = new Date(
        orderDateObj.getFullYear(),
        orderDateObj.getMonth(),
        orderDateObj.getDate()
      ).getTime();
      const diffDays = (refTime - orderTime) / (1000 * 60 * 60 * 24);

      if (period === "Today") {
        return diffDays === 1; // Yesterday
      } else if (period === "7D") {
        return diffDays >= 7 && diffDays < 14;
      } else if (period === "30D") {
        return diffDays >= 30 && diffDays < 60;
      } else if (period === "QTD") {
        const refMonth = referenceDate.getMonth();
        const startOfQuarterMonth = Math.floor(refMonth / 3) * 3;
        const prevQuarterStartMonth = (startOfQuarterMonth - 3 + 12) % 12;
        const prevQuarterYear = startOfQuarterMonth === 0 ? referenceDate.getFullYear() - 1 : referenceDate.getFullYear();
        const startOfPrevQuarter = new Date(prevQuarterYear, prevQuarterStartMonth, 1).getTime();
        const endOfPrevQuarter = new Date(referenceDate.getFullYear(), startOfQuarterMonth, 0).getTime();
        return orderTime >= startOfPrevQuarter && orderTime <= endOfPrevQuarter;
      }
      return false;
    });
  }, [orders, period]);

  const deliveredCount = filteredOrders.filter((order) => order.status === "Delivered").length;
  const pendingAllocationCount = filteredOrders.filter((order) => order.status === "Ready to Assign").length;
  const inProgressCount = filteredOrders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length;

  const prevTotalCount = previousPeriodOrders.length;
  const prevDeliveredCount = previousPeriodOrders.filter((o) => o.status === "Delivered").length;
  const prevPendingCount = previousPeriodOrders.filter((o) => o.status === "Ready to Assign").length;
  const prevInProgressCount = previousPeriodOrders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

  const totalChange = useMemo(() => {
    if (prevTotalCount === 0) return filteredOrders.length > 0 ? 100 : 0;
    return Number((((filteredOrders.length - prevTotalCount) / prevTotalCount) * 100).toFixed(1));
  }, [filteredOrders.length, prevTotalCount]);

  const deliveredChange = useMemo(() => {
    if (prevDeliveredCount === 0) return deliveredCount > 0 ? 100 : 0;
    return Number((((deliveredCount - prevDeliveredCount) / prevDeliveredCount) * 100).toFixed(1));
  }, [deliveredCount, prevDeliveredCount]);

  const pendingChange = useMemo(() => {
    if (prevPendingCount === 0) return pendingAllocationCount > 0 ? 100 : 0;
    return Number((((pendingAllocationCount - prevPendingCount) / prevPendingCount) * 100).toFixed(1));
  }, [pendingAllocationCount, prevPendingCount]);

  const inProgressChange = useMemo(() => {
    if (prevInProgressCount === 0) return inProgressCount > 0 ? 100 : 0;
    return Number((((inProgressCount - prevInProgressCount) / prevInProgressCount) * 100).toFixed(1));
  }, [inProgressCount, prevInProgressCount]);

  // Dynamic date
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const hours = now.getHours();
  const greeting = hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";

  const kpis = [
    {
      label: "Total Orders",
      value: filteredOrders.length.toLocaleString(),
      change: totalChange,
      icon: Package,
      tone: "primary" as const,
      spark: generateHourlySparkline(filteredOrders),
      pulse: true,
    },
    {
      label: "Completed Deliveries",
      value: deliveredCount.toLocaleString(),
      change: deliveredChange,
      icon: CheckCircle2,
      tone: "success" as const,
      spark: generateHourlySparkline(filteredOrders, (o) => o.status === "Delivered"),
    },
    {
      label: "Pending Allocation",
      value: pendingAllocationCount.toLocaleString(),
      change: pendingChange,
      icon: Clock,
      tone: "warning" as const,
      spark: generateHourlySparkline(filteredOrders, (o) => o.status === "Ready to Assign"),
    },
    {
      label: "Orders In Progress",
      value: inProgressCount.toLocaleString(),
      change: inProgressChange,
      icon: Loader2,
      tone: "info" as const,
      spark: generateHourlySparkline(filteredOrders, (o) => ACTIVE_STATUSES.includes(o.status)),
      pulse: true,
    },
  ];

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col relative z-10 aurora-container">
        <div className="aurora-glow-1" />
        <div className="aurora-glow-2" />
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto w-full">
          {/* Page header — Personalized greeting */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary/60" />
                <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">{dateStr}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                {greeting}, {user?.name?.split(" ")[0] ?? "Admin"} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Here's what's happening across your warehouses & delivery zones.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-soft">
                {(["Today", "7D", "30D", "QTD"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`h-8 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                      period === p
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map((k) => (
              <KpiCard key={k.label} {...k} />
            ))}
          </div>

          {/* Shift Operations tracker */}
          <ShiftTracker orders={filteredOrders} />

          {/* Pipeline */}
          <PipelineTracker orders={filteredOrders} />

          {/* Flags & Staff — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FlagsPanel orders={filteredOrders} />
            <StaffMonitoring orders={filteredOrders} />
          </div>

          <footer className="text-center text-[11px] text-muted-foreground py-4 border-t border-border/40 mt-2">
            <span className="font-medium">Halamama</span> · RouteMyOrder · Connected to Shopify · v2.4.1
          </footer>
        </main>
      </div>
    </div>
  );
}
