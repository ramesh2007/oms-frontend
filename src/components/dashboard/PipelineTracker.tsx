import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order, LegacyTabId } from "@/lib/orders";
import { useNavigate } from "@tanstack/react-router";

interface PipelineTrackerProps {
  orders: Order[];
}

const stageColors: Record<string, { bg: string; text: string; bar: string; dot: string }> = {
  new: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
  },
  picked: {
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
    dot: "bg-violet-500",
  },
  packed: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  ready: {
    bg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    text: "text-yellow-600 dark:text-yellow-400",
    bar: "bg-yellow-500",
    dot: "bg-yellow-500",
  },
  out: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    text: "text-cyan-600 dark:text-cyan-400",
    bar: "bg-cyan-500",
    dot: "bg-cyan-500",
  },
  delivered: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
};

export function PipelineTracker({ orders }: PipelineTrackerProps) {
  const navigate = useNavigate();

  const stages: { key: string; label: string; count: number; tab: LegacyTabId }[] = [
    {
      key: "new",
      label: "New Orders",
      count: orders.filter((o) => o.status === "New" || o.status === "Unfulfilled").length,
      tab: "New",
    },
    {
      key: "picked",
      label: "Picking / Picked",
      count: orders.filter((o) => o.status === "Picking" || o.status === "Picked").length,
      tab: "Picking",
    },
    {
      key: "packed",
      label: "Packing",
      count: orders.filter((o) => o.status === "Packing").length,
      tab: "Packing",
    },
    {
      key: "ready",
      label: "Ready to Assign",
      count: orders.filter((o) => o.status === "Ready to Assign").length,
      tab: "Ready to Assign",
    },
    {
      key: "out",
      label: "Out for Delivery",
      count: orders.filter((o) => o.status === "Driver Accepted" || o.status === "Started").length,
      tab: "In Delivery",
    },
    {
      key: "delivered",
      label: "Delivered",
      count: orders.filter((o) => o.status === "Delivered").length,
      tab: "Delivered",
    },
  ];

  const pipelineTotal = stages.reduce((total, stage) => total + stage.count, 0) || 1;

  return (
    <section className="rounded-2xl premium-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Live Order Pipeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time fulfillment workflow across warehouses
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/orders" })}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer"
        >
          View kanban <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-border/30">
        {stages.map((s, i) => {
          const pct = (s.count / pipelineTotal) * 100;
          const colors = stageColors[s.key];
          return (
            <button
              key={s.key}
              onClick={() => navigate({ to: "/orders", search: { tab: s.tab } })}
              className="relative text-left p-3 transition-all group hover:bg-muted/40 cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("h-2 w-2 rounded-full", colors.dot)} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Stage {i + 1}
                </span>
                <span className={cn("ml-auto text-[10px] font-semibold", colors.text)}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="text-xl font-bold tracking-tight mb-0.5">{s.count}</div>
              <div className="text-[11px] text-muted-foreground truncate mb-2">{s.label}</div>
              <div className="h-1 rounded-full bg-border/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    colors.bar,
                  )}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
