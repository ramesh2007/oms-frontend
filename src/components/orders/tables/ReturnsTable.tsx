import { Skeleton } from "@/components/ui/skeleton";
import { getOrderItemsCount, tatColorClass, statusDotClass, type Order, type OrderReturn } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

function ReturnBadge({ count, status }: { count: number; status?: string }) {
  if (status === "collected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Return Collected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400">
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M6 2v4M6 8v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Return ({count})
    </span>
  );
}

function getReturnBadgeStatus(order: Order): { count: number; status?: string } {
  const items = order.returnItems ?? [];
  const count = items.length || order.returns?.count || 0;
  if (items.length > 0 && items.every((r) => r.status === "completed")) {
    return { count, status: "completed" };
  }
  if (items.length > 0 && items.every((r) => r.status === "picked up" || r.status === "completed")) {
    return { count, status: "collected" };
  }
  return { count };
}

export function ReturnsTable({
  orders,
  loading,
  onViewOrder,
}: {
  orders: Order[];
  loading?: boolean;
  onViewOrder: (order: Order) => void;
}) {
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

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[1000px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="py-3 pl-4 pr-3 font-semibold">Order</th>
            <th className="py-3 pr-3 font-semibold">Date & Time</th>
            <th className="py-3 pr-3 font-semibold">TAT</th>
            <th className="py-3 pr-3 font-semibold">Customer</th>
            <th className="py-3 pr-3 font-semibold">Items</th>
            <th className="py-3 pr-3 font-semibold">Status</th>
            <th className="py-3 pr-3 font-semibold">Returns & Status</th>
            <th className="py-3 pr-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const tatClass = tatColorClass(order.tat);
            const badgeInfo = getReturnBadgeStatus(order);
            return (
              <tr
                key={order.id}
                className="border-b border-border/70 transition-colors hover:bg-muted/35"
              >
                <td className="py-3 pl-4 pr-3 align-middle">
                  <span className="font-mono text-sm font-semibold text-primary hover:underline cursor-pointer">
                    {order.id}
                  </span>
                </td>
                <td className="whitespace-nowrap py-3 pr-3 align-middle">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">📅 {order.date} | {order.time}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 align-middle">
                  <span className={cn("text-xs font-semibold tabular-nums", tatClass)}>
                    {order.tat}
                  </span>
                </td>
                <td className="max-w-[220px] py-3 pr-3 align-middle">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{order.customer.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{order.customer.email}</div>
                    <div className="text-xs text-muted-foreground">{order.customer.phone}</div>
                  </div>
                </td>
                <td className="py-3 pr-3 align-middle">
                  <span className="text-xs font-medium">{getOrderItemsCount(order)}</span>
                </td>
                <td className="py-3 pr-3 align-middle">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", statusDotClass(order.status))} aria-hidden />
                    <span className="text-xs font-medium">{order.status}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 align-middle">
                  {badgeInfo.count > 0 ? (
                    <div className="space-y-1">
                      <ReturnBadge count={badgeInfo.count} status={badgeInfo.status} />
                      {/* Show individual return item statuses */}
                      {order.returnItems && order.returnItems.length > 0 && (
                        <div className="space-y-0.5">
                          {order.returnItems.map((ret) => (
                            <div key={ret.id} className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                ret.status === "pending" && "bg-amber-500",
                                ret.status === "picked up" && "bg-violet-500",
                                ret.status === "completed" && "bg-emerald-500",
                              )} />
                              <span className="truncate max-w-[140px]">{ret.itemName}</span>
                              <span className="capitalize font-medium">
                                {ret.status === "picked up" ? "collected" : ret.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : order.status === "Replacement" || order.status === "Exchange" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {order.status}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-3 pr-4 align-middle text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1 rounded-md px-3 text-xs font-semibold shadow-sm"
                    onClick={() => onViewOrder(order)}
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                No return orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
