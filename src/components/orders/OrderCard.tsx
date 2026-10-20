import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getOrderItemsCount,
  parseTatHours,
  statusDotClass,
  isExpressOrder,
  orderHasInstallation,
  orderHasVirtualStock,
  isOrderCancelled,
  orderHasReturnedItems,
  isOrderReturnAndReplacement,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Globe,
  MapPin,
  MoreHorizontal,
  Printer,
  Gift,
  Download,
  Truck,
  User,
  Package,
  Timer,
  ShoppingBag,
  Zap,
  Wrench,
  Sparkles,
  RotateCcw,
  XCircle,
  ArrowLeftRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Status badge color map ──────────────────────────────────────────────── */
function statusBadgeClasses(status: OrderStatus): string {
  switch (status) {
    case "New":
      return "bg-sky-50 text-sky-700 ring-sky-200/60 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800/40";
    case "Picking":
      return "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200/60 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 dark:ring-fuchsia-800/40";
    case "Picked":
      return "bg-violet-50 text-violet-700 ring-violet-200/60 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800/40";
    case "Packing":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200/60 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800/40";
    case "Ready to Assign":
      return "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/40";
    case "Driver Accepted":
      return "bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800/40";
    case "Started":
      return "bg-orange-50 text-orange-700 ring-orange-200/60 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-800/40";
    case "Delivered":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/40";
    case "Delivery Failed":
    case "Cancelled":
      return "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/40";
    case "Flagged":
      return "bg-rose-50 text-rose-700 ring-rose-200/60 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800/40";
    case "Replacement":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200/60 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800/40";
    case "Exchange":
      return "bg-teal-50 text-teal-700 ring-teal-200/60 dark:bg-teal-950/50 dark:text-teal-300 dark:ring-teal-800/40";
    case "Installation":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/40";
    case "PayLater":
      return "bg-purple-50 text-purple-700 ring-purple-200/60 dark:bg-purple-950/50 dark:text-purple-300 dark:ring-purple-800/40";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

/* ─── TAT badge background/ring for urgency ───────────────────────────────── */
function tatBadgeClasses(tat: string): string {
  const hours = parseTatHours(tat);
  if (hours <= 2) return "bg-emerald-50 text-emerald-700 ring-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/30";
  if (hours <= 12) return "bg-amber-50 text-amber-700 ring-amber-200/50 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/30";
  if (hours <= 24) return "bg-orange-50 text-orange-700 ring-orange-200/50 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800/30";
  return "bg-red-50 text-red-700 ring-red-200/50 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/30";
}

/* ─── Channel label ───────────────────────────────────────────────────────── */
function channelLabel(channel: string): string {
  if (channel === "shopify") return "Shopify";
  if (channel === "web") return "Online Store";
  return channel;
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export function OrderCard({
  order,
  selected,
  onSelectChange,
  expanded,
  onToggleExpand,
  onViewOrder,
  onAction,
}: {
  order: Order;
  selected: boolean;
  onSelectChange: (next: boolean) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onViewOrder: (order: Order) => void;
  onAction?: (action: "zone" | "driver" | "print" | "giftPrint" | "export", order: Order) => void;
}) {
  const itemCount = getOrderItemsCount(order);
  const isFulfilled = order.status === "Delivered";

  return (
    <article
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 ease-out",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_14px_rgba(0,0,0,0.04)]",
        "hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] hover:border-primary/30",
        isOrderReturnAndReplacement(order)
          ? "border-l-4 border-l-indigo-500 bg-indigo-500/[0.02] dark:bg-indigo-950/10"
          : (isOrderCancelled(order) || orderHasReturnedItems(order)) && "border-l-4 border-l-red-500 bg-red-500/[0.02] dark:bg-red-950/10",
        selected && "ring-2 ring-primary/40 border-primary/50 shadow-[0_0_0_1px_rgba(133,175,174,0.15)]",
      )}
    >
      {/* ── Status accent bar (top) ─────────────────────────────────────── */}
      <div className={cn("h-[3px] w-full", statusDotClass(order.status))} />

      {/* ── Card body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4 pb-0">

        {/* ── Header: checkbox + order ID + status badge ─────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectChange(v === true)}
              aria-label={`Select order ${order.id}`}
              className="shrink-0"
            />
            <span
              className="font-mono text-[15px] font-bold tracking-tight text-foreground hover:text-primary hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onViewOrder(order);
              }}
            >
              #{String(order.orderNumber || order.id).replace(/^#+/, "")}
            </span>
            {isExpressOrder(order) && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                <Zap className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                EXPRESS
              </span>
            )}
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
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800/80 shadow-2xs select-none"
                title="Order Cancelled"
              >
                <XCircle className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" />
                (Cancelled)
              </span>
            ) : isOrderReturnAndReplacement(order) ? (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/80 shadow-2xs select-none"
                title="Item cancelled and replaced with another item (Return & Replacement)"
              >
                <ArrowLeftRight className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
                (Return & Replacement)
              </span>
            ) : orderHasReturnedItems(order) ? (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800/80 shadow-2xs select-none"
                title="Returned item(s)"
              >
                <RotateCcw className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" />
                (Return)
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 ring-1 ring-inset",
              statusBadgeClasses(order.status),
            )}
          >
            {order.status}
          </span>
        </div>

        {/* ── Meta row: date/time ────────────────────────────────────────── */}
        <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            {order.date}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            {order.time}
          </span>
        </div>

        {/* ── TAT + Channel row ──────────────────────────────────────────── */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset",
              tatBadgeClasses(order.tat),
            )}
          >
            <Timer className="h-3 w-3 shrink-0" aria-hidden />
            {order.tat} TAT
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/40 dark:bg-muted/30">
            <Globe className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            {channelLabel(order.channel)}
          </span>
        </div>

        {/* ── Customer block ─────────────────────────────────────────────── */}
        <div className="mt-3 rounded-xl bg-muted/30 px-3 py-2.5 ring-1 ring-inset ring-border/30 dark:bg-muted/15">
          <div className="text-sm font-semibold text-foreground leading-snug">
            {order.customer?.name || (order as any).customer_name || (order as any).rawOrder?.customer_name || "Customer"}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {order.customer?.email || (order as any).customer_email || (order as any).rawOrder?.customer_email || ""}
          </div>
        </div>

        {/* ── Items + Total row ──────────────────────────────────────────── */}
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Items
            </div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Total
            </div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
              QAR {order.total.toFixed(2)}
            </div>
          </div>
        </div>

        {/* ── Sub-badges: Shopify status + Picker + Packer ───────────────── */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {/* Shopify fulfillment */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-semibold ring-1 ring-inset",
              isFulfilled
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/30"
                : "bg-slate-50 text-slate-600 ring-slate-200/50 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700/30",
            )}
          >
            <ShoppingBag className="h-2.5 w-2.5" aria-hidden />
            {isFulfilled ? "Fulfilled" : "Unfulfilled"}
          </span>

          {/* Picker */}
          {order.picker && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-[3px] text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200/50 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/30">
              <User className="h-2.5 w-2.5" aria-hidden />
              Picker: {order.picker}
            </span>
          )}

          {/* Packer */}
          {order.packer && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-[3px] text-[10px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200/50 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-800/30">
              <Package className="h-2.5 w-2.5" aria-hidden />
              Packer: {order.packer}
            </span>
          )}

          {/* Return indicator */}
          {order.returns && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-[3px] text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-200/50 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/30">
              Return ×{order.returns.count}
            </span>
          )}
        </div>
      </div>

      {/* ── Action row ────────────────────────────────────────────────────── */}
      <div className="mt-3 flex items-center gap-2 border-t border-border/50 bg-muted/15 px-4 py-3 dark:bg-muted/5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-1.5 rounded-lg border-border/60 bg-card font-semibold shadow-sm transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md cursor-pointer text-xs"
          onClick={() => onViewOrder(order)}
        >
          View Order
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg border-border/60 bg-card cursor-pointer transition-colors hover:bg-muted"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl bg-popover border-border shadow-elevated">
            <DropdownMenuItem onClick={() => onAction?.("zone", order)} className="cursor-pointer gap-2 py-2 rounded-lg">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span>Assign Zone</span>
            </DropdownMenuItem>
            {order.status === "Ready to Assign" && (
              <DropdownMenuItem onClick={() => onAction?.("driver", order)} className="cursor-pointer gap-2 py-2 rounded-lg">
                <Truck className="h-4 w-4 text-emerald-500" />
                <span>Assign Driver</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onAction?.("print", order)} className="cursor-pointer gap-2 py-2 rounded-lg">
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Print Invoice</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("giftPrint", order)} className="cursor-pointer gap-2 py-2 rounded-lg">
              <Gift className="h-4 w-4 text-pink-500" />
              <span>Print Gift Invoice</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("export", order)} className="cursor-pointer gap-2 py-2 rounded-lg">
              <Download className="h-4 w-4 text-orange-500" />
              <span>Export CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
