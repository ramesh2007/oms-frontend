import { AlertTriangle, PackageX, PhoneOff, Clock, Flame, ChevronRight, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order } from "@/lib/orders";
import { parseTatHours } from "@/lib/orders";
import { useFlaggedOrders } from "@/hooks/useOrders";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

interface FlagsPanelProps {
  orders?: Order[];
}

interface FlagItem {
  icon: typeof AlertTriangle;
  title: string;
  order: string;
  driver: string;
  priority: "high" | "med";
  time: string;
}

export function FlagsPanel({ orders = [] }: FlagsPanelProps) {
  const navigate = useNavigate();
  const { data: flaggedResult } = useFlaggedOrders(1, 15);
  const liveFlaggedOrders = flaggedResult?.orders || [];

  const combinedOrders = useMemo(() => {
    const map = new Map<string, Order>();
    orders.forEach((o) => map.set(o.id, o));
    liveFlaggedOrders.forEach((o) => map.set(o.id, o));
    return Array.from(map.values());
  }, [orders, liveFlaggedOrders]);

  // Build flags dynamically from order data
  const flags: FlagItem[] = [];

  combinedOrders.forEach((o) => {
    // Delivery Failed orders are high priority
    if (o.status === "Delivery Failed") {
      flags.push({
        icon: XCircle,
        title: "Delivery failed",
        order: o.id,
        driver: o.driver ?? "—",
        priority: "high",
        time: o.tat,
      });
    }

    // TAT exceeded > 24h on active orders
    const tatHours = parseTatHours(o.tat);
    if (
      tatHours > 24 &&
      o.status !== "Delivered" &&
      o.status !== "Delivery Failed" &&
      o.status !== "Cancelled"
    ) {
      flags.push({
        icon: Clock,
        title: "TAT exceeded (> 24h)",
        order: o.id,
        driver: o.driver ?? "—",
        priority: tatHours > 48 ? "high" : "med",
        time: o.tat,
      });
    }

    // Flagged status
    if (o.status === "Flagged") {
      flags.push({
        icon: AlertTriangle,
        title: "Order flagged",
        order: o.id,
        driver: o.driver ?? "—",
        priority: "high",
        time: o.tat,
      });
    }
  });

  // Sort: high priority first, then by order id descending
  flags.sort((a, b) => {
    if (a.priority === "high" && b.priority !== "high") return -1;
    if (a.priority !== "high" && b.priority === "high") return 1;
    return b.order.localeCompare(a.order);
  });

  const displayFlags = flags.slice(0, 6);

  const priorityMap = {
    high: { bg: "bg-destructive/10", text: "text-destructive", border: "border-l-destructive" },
    med: { bg: "bg-warning/10", text: "text-warning", border: "border-l-warning" },
  };

  return (
    <section className="rounded-2xl premium-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-destructive/10 grid place-items-center">
            <Flame className="h-3 w-3 text-destructive" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Flags & Exceptions</h2>
            <p className="text-[11px] text-muted-foreground">
              {flags.length} active alert{flags.length !== 1 ? "s" : ""} requiring attention
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate({ to: "/flags" })}
          className="text-xs font-medium text-primary hover:underline cursor-pointer"
        >
          View all
        </button>
      </div>
      <div className="divide-y divide-border">
        {displayFlags.length === 0 && (
          <div className="px-4 py-5 text-center text-sm text-muted-foreground">
            No active flags or exceptions — all clear!
          </div>
        )}
        {displayFlags.map((f, i) => {
          const p = priorityMap[f.priority];
          const Icon = f.icon;
          return (
            <div
              key={`${f.order}-${i}`}
              className={cn(
                "flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors border-l-2",
                p.border,
              )}
            >
              <div
                className={cn("h-6 w-6 rounded-lg grid place-items-center shrink-0 mt-0.5", p.bg)}
              >
                <Icon className={cn("h-3 w-3", p.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{f.title}</span>
                  <span
                    className={cn(
                      "text-[9px] uppercase tracking-wider font-bold px-1.5 h-4 rounded grid place-items-center",
                      p.bg,
                      p.text,
                    )}
                  >
                    {f.priority}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span className="font-mono font-medium">{f.order}</span>
                  <span>·</span>
                  <span>{f.driver}</span>
                  <span>·</span>
                  <span>{f.time}</span>
                </div>
              </div>
              <button className="h-7 px-2.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-colors flex items-center gap-0.5">
                Resolve <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
