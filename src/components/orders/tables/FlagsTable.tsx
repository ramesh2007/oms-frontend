import { Skeleton } from "@/components/ui/skeleton";
import type { Order } from "@/lib/orders";
import { tatColorClass, statusDotClass } from "@/lib/orders";
import { cn } from "@/lib/utils";
import {
  Eye,
  AlertTriangle,
  PhoneOff,
  PackageX,
  Clock,
  MapPinOff,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/* ── Flag types & helpers ────────────────────────────────────────────────── */

export type FlagType =
  | "delivery_failed"
  | "customer_unreachable"
  | "damaged_item"
  | "tat_exceeded"
  | "missing_item"
  | "wrong_address"
  | "flagged";

export interface FlagInfo {
  type: FlagType;
  label: string;
  icon: typeof AlertTriangle;
  priority: "critical" | "high" | "medium" | "low";
  description: string;
}

/** Derive flag info from order status / data */
export function deriveFlagInfo(order: Order): FlagInfo {
  if (order.status === "Delivery Failed") {
    return {
      type: "delivery_failed",
      label: "Delivery Failed",
      icon: PackageX,
      priority: "critical",
      description: `Delivery attempt failed for ${order.customer.name} in ${order.city}.`,
    };
  }
  if (order.status === "Flagged") {
    return {
      type: "flagged",
      label: "Flagged for Review",
      icon: ShieldAlert,
      priority: "high",
      description: `Order flagged and requires manual review.`,
    };
  }
  // TAT exceeded (> 24h)
  const tatMatch = order.tat.match(/(\d+)h/);
  const hours = tatMatch ? parseInt(tatMatch[1], 10) : 0;
  if (hours > 24) {
    return {
      type: "tat_exceeded",
      label: "TAT Exceeded",
      icon: Clock,
      priority: hours > 100 ? "critical" : "high",
      description: `Order has exceeded TAT by ${hours - 24}+ hours.`,
    };
  }
  return {
    type: "flagged",
    label: "Exception",
    icon: AlertTriangle,
    priority: "medium",
    description: "Order requires attention.",
  };
}

const priorityConfig = {
  critical: {
    bg: "bg-red-500/10 dark:bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    border: "border-l-red-500",
    badge: "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400 ring-1 ring-red-500/20",
    dot: "bg-red-500",
  },
  high: {
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-l-orange-500",
    badge: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 ring-1 ring-orange-500/20",
    dot: "bg-orange-500",
  },
  medium: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-l-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 ring-1 ring-amber-500/20",
    dot: "bg-amber-500",
  },
  low: {
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-l-sky-500",
    badge: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 ring-1 ring-sky-500/20",
    dot: "bg-sky-500",
  },
};

/* ── Priority badge ──────────────────────────────────────────────────────── */

function PriorityBadge({ priority }: { priority: FlagInfo["priority"] }) {
  const cfg = priorityConfig[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        cfg.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {priority}
    </span>
  );
}

/* ── Flag type badge ─────────────────────────────────────────────────────── */

function FlagTypeBadge({ flagInfo }: { flagInfo: FlagInfo }) {
  const Icon = flagInfo.icon;
  const cfg = priorityConfig[flagInfo.priority];
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-7 w-7 rounded-lg grid place-items-center shrink-0", cfg.bg)}>
        <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground">{flagInfo.label}</div>
        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{flagInfo.description}</div>
      </div>
    </div>
  );
}

/* ── Main table ──────────────────────────────────────────────────────────── */

export function FlagsTable({
  orders,
  loading,
  onViewOrder,
}: {
  orders: Order[];
  loading?: boolean;
  onViewOrder: (order: Order) => void;
}) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const handleResolve = (id: string) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
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
    );
  }

  const activeOrders = orders.filter((o) => !resolvedIds.has(o.id));

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="py-3 pl-4 pr-3 font-semibold">Order</th>
            <th className="py-3 pr-3 font-semibold">TAT</th>
            <th className="py-3 pr-3 font-semibold">Date & Time</th>
            <th className="py-3 pr-3 font-semibold">Customer</th>
            <th className="py-3 pr-3 font-semibold">Flag / Exception</th>
            <th className="py-3 pr-3 font-semibold">Priority</th>
            <th className="py-3 pr-3 font-semibold">Status</th>
            <th className="py-3 pr-3 font-semibold">Driver</th>
            <th className="py-3 pr-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {activeOrders.map((order) => {
            const tatClass = tatColorClass(order.tat);
            const flagInfo = deriveFlagInfo(order);
            const cfg = priorityConfig[flagInfo.priority];

            return (
              <tr
                key={order.id}
                className={cn(
                  "border-b border-border/70 transition-colors hover:bg-muted/35 border-l-2",
                  cfg.border,
                )}
              >
                <td className="py-3 pl-4 pr-3 align-middle">
                  <span
                    className="font-mono text-sm font-semibold text-primary hover:underline cursor-pointer"
                    onClick={() => onViewOrder(order)}
                  >
                    {order.id}
                  </span>
                </td>
                <td className="py-3 pr-3 align-middle">
                  <span className={cn("text-xs font-semibold tabular-nums", tatClass)}>
                    {order.tat}
                  </span>
                </td>
                <td className="whitespace-nowrap py-3 pr-3 align-middle">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">📅 {order.date} | {order.time}</span>
                  </div>
                </td>
                <td className="max-w-[200px] py-3 pr-3 align-middle">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{order.customer.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{order.customer.phone}</div>
                  </div>
                </td>
                <td className="py-3 pr-3 align-middle">
                  <FlagTypeBadge flagInfo={flagInfo} />
                </td>
                <td className="py-3 pr-3 align-middle">
                  <PriorityBadge priority={flagInfo.priority} />
                </td>
                <td className="py-3 pr-3 align-middle">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", statusDotClass(order.status))} aria-hidden />
                    <span className="text-xs font-medium">{order.status}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 align-middle">
                  <span className="text-xs font-medium text-muted-foreground">
                    {order.driver || "—"}
                  </span>
                </td>
                <td className="py-3 pr-4 align-middle">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 gap-1 rounded-md px-2.5 text-[11px] font-semibold shadow-sm"
                      onClick={() => onViewOrder(order)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                    <button
                      type="button"
                      className="h-7 px-2.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-0.5 ring-1 ring-emerald-500/20"
                      onClick={() => handleResolve(order.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolve
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {activeOrders.length === 0 && (
            <tr>
              <td colSpan={9} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 grid place-items-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">All clear!</div>
                    <div className="text-xs text-muted-foreground mt-0.5">No active flags or exceptions at this time.</div>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Flagged Items Table ─────────────────────────────────────────────────── */

export interface FlaggedItem {
  id: number | string;
  order_id: string;
  item_id?: number | string;
  item_name?: string;
  name?: string;
  sku?: string;
  reason?: string;
  flagged_by?: string;
  flagged_at?: string;
  status?: string;
}

export function FlaggedItemsTable({
  items,
  loading,
  onViewOrder,
}: {
  items: FlaggedItem[];
  loading?: boolean;
  onViewOrder: (orderId: string) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
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
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="py-3 pl-4 pr-3 font-semibold">Order ID</th>
            <th className="py-3 pr-3 font-semibold">Item Name</th>
            <th className="py-3 pr-3 font-semibold">SKU</th>
            <th className="py-3 pr-3 font-semibold">Flag Reason</th>
            <th className="py-3 pr-3 font-semibold">Flagged By</th>
            <th className="py-3 pr-3 font-semibold">Flagged At</th>
            <th className="py-3 pr-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/70 transition-colors hover:bg-muted/35 border-l-2 border-l-destructive"
            >
              <td className="py-3 pl-4 pr-3 align-middle">
                <span
                  className="font-mono text-sm font-semibold text-primary hover:underline cursor-pointer"
                  onClick={() => onViewOrder(String(item.order_id))}
                >
                  {item.order_id}
                </span>
              </td>
              <td className="py-3 pr-3 align-middle">
                <span className="font-semibold text-foreground">
                  {item.item_name || item.name || "—"}
                </span>
              </td>
              <td className="py-3 pr-3 align-middle font-mono text-xs text-muted-foreground">
                {item.sku || "—"}
              </td>
              <td className="py-3 pr-3 align-middle">
                <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" />
                  {item.reason || "Flagged item"}
                </span>
              </td>
              <td className="py-3 pr-3 align-middle text-xs text-muted-foreground">
                {item.flagged_by || "—"}
              </td>
              <td className="py-3 pr-3 align-middle text-xs text-muted-foreground whitespace-nowrap">
                {item.flagged_at || "—"}
              </td>
              <td className="py-3 pr-4 align-middle text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 gap-1 rounded-md px-2.5 text-[11px] font-semibold shadow-xs"
                  onClick={() => onViewOrder(String(item.order_id))}
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Order
                </Button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                No flagged items found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
