import { Skeleton } from "@/components/ui/skeleton";
import { getOrderItemsCount, tatColorClass, orderHasInstallation, orderHasVirtualStock, isOrderCancelled, orderHasReturnedItems, isOrderReturnAndReplacement, type Order } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { Eye, Package, Wrench, Sparkles, RotateCcw, XCircle, ArrowLeftRight } from "lucide-react";
import { CrewTag } from "../CrewTag";
import { Button } from "@/components/ui/button";

export function PickingTable({
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
            <th className="py-3 pr-3 font-semibold">Picking Status</th>
            <th className="py-3 pr-3 font-semibold">Assigned Picker</th>
            <th className="py-3 pr-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const tatClass = tatColorClass(order.tat);
            return (
              <tr
                key={order.id}
                className={cn(
                  "border-b border-border/70 transition-colors hover:bg-muted/35",
                  isOrderReturnAndReplacement(order)
                    ? "bg-indigo-500/[0.03] hover:bg-indigo-500/[0.06] border-l-2 border-l-indigo-500"
                    : (isOrderCancelled(order) || orderHasReturnedItems(order)) && "bg-red-500/[0.03] hover:bg-red-500/[0.06] border-l-2 border-l-red-500",
                )}
              >
                <td className="py-3 pl-4 pr-3 align-middle">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      onClick={() => onViewOrder(order)}
                      className="font-mono text-sm font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {order.orderNumber || order.id}
                    </span>
                    {orderHasInstallation(order) && (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shadow-2xs">
                        <Wrench className="h-3 w-3 shrink-0 text-sky-600 dark:text-sky-400" />
                        Installation
                      </span>
                    )}
                    {orderHasVirtualStock(order) && (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-2xs">
                        <Sparkles className="h-3 w-3 shrink-0 text-purple-600 dark:text-purple-400" />
                        Virtual Stock
                      </span>
                    )}
                    {isOrderCancelled(order) ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800/80 shadow-2xs select-none">
                        <XCircle className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" />
                        (Cancelled)
                      </span>
                    ) : isOrderReturnAndReplacement(order) ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/80 shadow-2xs select-none">
                        <ArrowLeftRight className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        (Return & Replacement)
                      </span>
                    ) : orderHasReturnedItems(order) ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800/80 shadow-2xs select-none">
                        <RotateCcw className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" />
                        (Return)
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="whitespace-nowrap py-3 pr-3 align-middle">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">
                      📅 {order.date} | {order.time}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-3 align-middle">
                  <span className={cn("text-xs font-semibold tabular-nums", tatClass)}>
                    {order.tat}
                  </span>
                </td>
                <td className="max-w-[220px] py-3 pr-3 align-middle">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {order.customer.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {order.customer.email}
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3 align-middle">
                  <span className="text-xs font-medium">{getOrderItemsCount(order)}</span>
                </td>
                <td className="py-3 pr-3 align-middle">
                  {(() => {
                    let pickingStat = order.pickingStatus;
                    if (!pickingStat || pickingStat === "0/0 Picked") {
                      const total = getOrderItemsCount(order) || order.items || 1;
                      if (order.itemsList && order.itemsList.length > 0) {
                        const picked = order.itemsList.filter(item => item.status === "Prepared" || (item.status as string) === "Picked").length;
                        pickingStat = `${picked}/${total} Picked`;
                      } else {
                        const fullyPickedStatuses = ["Picked", "Packing", "Ready to Assign", "Driver Accepted", "Started", "Delivered"];
                        if (fullyPickedStatuses.includes(order.status)) {
                          pickingStat = `${total}/${total} Picked`;
                        } else {
                          pickingStat = `0/${total} Picked`;
                        }
                      }
                    }

                    const parts = pickingStat.split(" ")[0].split("/");
                    const picked = parts[0];
                    const totalVal = parts[1];
                    const isFullyPicked = picked && totalVal && picked === totalVal && totalVal !== "0";
                    return (
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        isFullyPicked
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      )}>
                        {pickingStat}
                      </span>
                    );
                  })()}
                </td>
                <td className="py-3 pr-3 align-middle">
                  {(() => {
                    const pickerName =
                      order.picker ||
                      Array.from(
                        new Set(
                          (order.itemsList || [])
                            .map((i) => i.assigned_user_name || (i as any).picker_name)
                            .filter(Boolean),
                        ),
                      ).join(", ") ||
                      Array.from(
                        new Set(
                          ((order.line_items as any) || [])
                            .map((i: any) => i.assigned_user_name || i.picker_name)
                            .filter(Boolean),
                        ),
                      ).join(", ");

                    return pickerName ? (
                      <CrewTag
                        name={pickerName}
                        Icon={Package}
                        color="bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    );
                  })()}
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
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
