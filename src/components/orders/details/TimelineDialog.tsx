import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EnrichedOrder, OrderTimelineEvent } from "@/lib/orders";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit,
  ExternalLink,
  FileText,
  Package,
  PackageCheck,
  Play,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  UserCheck,
  UserPlus,
  Webhook,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventType = OrderTimelineEvent["type"];

/** Colour class for the event node circle. */
function colourForEvent(type: EventType): string {
  switch (type) {
    case "item_flagged":
    case "flagged":
      return "bg-rose-600";
    case "picking_started":
    case "picker_assigned":
    case "item_picked":
      return "bg-emerald-600";
    case "picking_completed":
    case "packing_completed":
    case "delivered":
    case "auto_fulfilled":
    case "auto_marked_paid":
      return "bg-emerald-600";
    case "packing_started":
    case "packer_assigned":
    case "item_packed":
      return "bg-emerald-600";
    case "driver_assigned":
    case "driver_accepted":
    case "bags_verified":
      return "bg-emerald-600";
    case "started":
    case "out_for_delivery":
      return "bg-emerald-600";
    case "allocated":
    case "order_created":
      return "bg-emerald-600";
    case "recalculated":
    case "updated":
    case "line_item_updated":
      return "bg-emerald-600";
    case "added":
    case "placed":
      return "bg-emerald-600";
    case "delivery_failed":
    case "cancelled":
      return "bg-red-600";
    case "bypassed":
      return "bg-amber-600";
    default:
      return "bg-muted-foreground";
  }
}

function getIcon(eventType: EventType) {
  const cls = "h-4 w-4 text-white";
  switch (eventType) {
    case "item_flagged":
    case "flagged":
      return <ShieldAlert className={cls} />;
    case "added":
    case "line_item_updated":
      return <Plus className={cls} />;
    case "placed":
      return <ShoppingCart className={cls} />;
    case "allocated":
      return <Package className={cls} />;
    case "order_created":
      return <Webhook className={cls} />;
    case "picker_assigned":
    case "packer_assigned":
      return <UserPlus className={cls} />;
    case "item_picked":
    case "picking_started":
    case "item_packed":
    case "packing_started":
      return <Box className={cls} />;
    case "picking_completed":
    case "packing_completed":
    case "delivered":
      return <CheckCircle2 className={cls} />;
    case "recalculated":
    case "updated":
      return <Edit className={cls} />;
    case "driver_assigned":
      return <UserPlus className={cls} />;
    case "driver_accepted":
      return <UserCheck className={cls} />;
    case "bags_verified":
      return <ShieldCheck className={cls} />;
    case "started":
      return <Play className={cls} />;
    case "out_for_delivery":
      return <Truck className={cls} />;
    case "auto_fulfilled":
      return <PackageCheck className={cls} />;
    case "auto_marked_paid":
      return <CreditCard className={cls} />;
    case "delivery_failed":
      return <ExternalLink className={cls} />;
    case "cancelled":
      return <XCircle className={cls} />;
    case "bypassed":
      return <ShieldCheck className={cls} />;
    default:
      return <div className="h-2 w-2 rounded-full bg-white" />;
  }
}

export function TimelineDialog({
  order,
  open,
  onOpenChange,
}: {
  order: EnrichedOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[600px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 max-h-[85vh] flex flex-col shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-border/40 bg-muted/30">
          <DialogTitle className="text-xl font-semibold tracking-tight text-center text-foreground">
            Order Timeline
          </DialogTitle>
          <p className="text-center text-xs text-muted-foreground mt-1">
            Order #
            {String(order.orderNumber || order.id || order.shopifyOrderId).replace(/^#+/, "")}
          </p>
        </DialogHeader>

        {/* Fulfillment Crew Summary: Who Picked, Who Packed, Who Driver */}
        <div className="border-b border-border/40 bg-muted/10 px-6 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Fulfillment Crew
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-card p-2">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3 text-emerald-600" /> Picker
              </span>
              <span
                className="font-semibold truncate text-foreground"
                title={order.picker ?? "Not assigned"}
              >
                {order.picker ?? "Not assigned"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-card p-2">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3 text-indigo-600" /> Packer
              </span>
              <span
                className="font-semibold truncate text-foreground"
                title={order.packer ?? "Not assigned"}
              >
                {order.packer ?? "Not assigned"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-card p-2">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Truck className="h-3 w-3 text-blue-600" /> Driver
              </span>
              <span
                className="font-semibold truncate text-foreground"
                title={order.driver ?? "Not assigned"}
              >
                {order.driver ?? "Not assigned"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-6 sm:px-6">
          <div className="space-y-0 relative z-10 mx-auto max-w-lg">
            <ItemFulfillmentTimeline order={order} />
            {(() => {
              const mainTimeline = order.timeline.filter(
                (event) =>
                  ![
                    "recalculated",
                    "updated",
                    "added",
                    "line_item_updated",
                    "auto_fulfilled",
                    "auto_marked_paid",
                    "order_created",
                    "item_picked",
                    "item_packed",
                  ].includes(event.type),
              );
              return mainTimeline.map((event, index) => (
                <TimelineEventRow
                  key={event.id}
                  event={event}
                  isLast={index === mainTimeline.length - 1}
                />
              ));
            })()}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/40 bg-muted/30 flex justify-center">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border bg-background px-8 py-2 text-sm font-medium text-foreground hover:bg-muted hover:text-foreground transition-all shadow-sm ring-1 ring-border/50"
          >
            Close Timeline
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isItemFlagged(item: EnrichedOrder["itemsList"][number]): boolean {
  if (!item) return false;
  const statusStr = String(item.status || "").toLowerCase().trim();
  const rawStatus = String((item as any).custom_status || "").toLowerCase().trim();
  return Boolean(
    (item as any).is_flagged ||
    (item as any).isFlagged ||
    (item as any).flagged ||
    statusStr === "flagged" ||
    rawStatus === "flagged" ||
    Boolean((item as any).flag_reason) ||
    Boolean((item as any).flagged_reason) ||
    Boolean((item as any).flaggedReason)
  );
}

function getItemFlagReason(item: EnrichedOrder["itemsList"][number]): string {
  return (
    (item as any).flag_reason ||
    (item as any).flagged_reason ||
    (item as any).flaggedReason ||
    (item as any).reason ||
    "Flagged item exception recorded during fulfillment"
  );
}

function getItemFlaggedImageUrl(item: EnrichedOrder["itemsList"][number]): string {
  return (
    (item as any).flagged_image_url ||
    (item as any).flagged_image ||
    (item as any).flag_image_url ||
    (item as any).flag_image ||
    ""
  );
}

function resolveItemId(item: EnrichedOrder["itemsList"][number]): string {
  const raw = (item as any).item_id ?? (item as any).order_item_id ?? item.id;
  return String(raw ?? "").replace(/^#+/, "") || item.id;
}

function ItemFulfillmentTimeline({ order }: { order: EnrichedOrder }) {
  const itemEvents = order.itemsList.flatMap((item) => {
    const events: OrderTimelineEvent[] = [];
    const resolvedItemId = resolveItemId(item);
    const itemIsFlagged = isItemFlagged(item);
    const flagReason = getItemFlagReason(item);
    const flaggedImageUrl = getItemFlaggedImageUrl(item);

    const addItemEvent = (
      id: string,
      title: string,
      actor: string | null | undefined,
      timestamp: string | null | undefined,
      type: OrderTimelineEvent["type"],
      extra?: {
        isFlagged?: boolean;
        flagReason?: string | null;
        flaggedImageUrl?: string | null;
      },
    ) => {
      const date = timestamp ? new Date(timestamp) : null;
      events.push({
        id,
        title,
        date: date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : order.date,
        time:
          date && !Number.isNaN(date.getTime())
            ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
            : order.time,
        description: actor ? `By: ${actor}` : "",
        actor: actor || undefined,
        actorRole:
          type === "picker_assigned" || type === "item_picked"
            ? "picker"
            : type === "item_packed"
              ? "packer"
              : type === "item_flagged"
                ? "admin"
                : "driver",
        type,
        itemId: resolvedItemId,
        itemName: item.name,
        isFlagged: extra?.isFlagged !== undefined ? extra.isFlagged : itemIsFlagged,
        flagReason: extra?.flagReason !== undefined ? extra.flagReason : (itemIsFlagged ? flagReason : undefined),
        flaggedImageUrl: extra?.flaggedImageUrl !== undefined ? extra.flaggedImageUrl : (itemIsFlagged ? flaggedImageUrl : undefined),
      });
    };

    if (
      item.assigned_user_name ||
      item.assigned_to ||
      String(item.status).toLowerCase() === "picker_assigned"
    ) {
      addItemEvent(
        `${item.id}-picker-assigned`,
        `Picker assigned: ${item.name}`,
        item.assigned_user_name || String(item.assigned_to || "Picker"),
        item.assigned_at,
        "picker_assigned",
      );
    }

    if (
      item.picked_at ||
      item.picked_user_name ||
      ["picked", "packed", "delivered"].includes(String(item.status).toLowerCase())
    ) {
      addItemEvent(
        `${item.id}-picked`,
        `Item picked: ${item.name}`,
        item.picked_user_name || item.assigned_user_name,
        item.picked_at,
        "item_picked",
      );
    }

    // Flagged event in timeline along with picking, packing, delivery process
    if (itemIsFlagged) {
      addItemEvent(
        `${item.id}-flagged`,
        `Item flagged: ${item.name}`,
        (item as any).flagged_by || item.picked_user_name || item.assigned_user_name || "Quality Assurance / Staff",
        (item as any).flagged_at || item.packed_at || item.picked_at || item.assigned_at,
        "item_flagged",
        {
          isFlagged: true,
          flagReason,
          flaggedImageUrl,
        },
      );
    }

    if (
      item.packed_at ||
      item.packed_user_name ||
      ["packed", "delivered"].includes(String(item.status).toLowerCase())
    ) {
      addItemEvent(
        `${item.id}-packed`,
        `Item packed: ${item.name}`,
        item.packed_user_name,
        item.packed_at,
        "item_packed",
      );
    }

    if (
      item.delivered_at ||
      item.delivered_user_name ||
      String(item.status).toLowerCase() === "delivered"
    ) {
      addItemEvent(
        `${item.id}-delivered`,
        `Item delivered: ${item.name}`,
        item.delivered_user_name || order.driver,
        item.delivered_at,
        "delivered",
      );
    }

    return events;
  });

  if (itemEvents.length === 0) return null;

  return (
    <section className="mb-8 border-b border-border/50 pb-5">
      <h3 className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        <span>Item Fulfillment Timeline</span>
        <span className="text-[11px] font-normal text-muted-foreground">
          {itemEvents.length} event{itemEvents.length === 1 ? "" : "s"}
        </span>
      </h3>
      {itemEvents.map((event, index) => (
        <TimelineEventRow
          key={`${event.id}-${index}`}
          event={event}
          isLast={index === itemEvents.length - 1}
        />
      ))}
    </section>
  );
}

function TimelineEventRow({ event, isLast }: { event: OrderTimelineEvent; isLast: boolean }) {
  const descLines = event.description ? event.description.split("\n").filter(Boolean) : [];
  const eventColorClass = colourForEvent(event.type);

  return (
    <div className="relative pl-12 sm:pl-14 py-4 group">
      {/* Connecting Line */}
      {!isLast && (
        <div
          className="absolute left-[23px] sm:left-[31px] top-[2.25rem] bottom-[-1rem] w-0.5 bg-border dark:bg-border/80 group-hover:bg-foreground/20 transition-colors"
          aria-hidden="true"
        />
      )}

      {/* Node Circle */}
      <div className="absolute left-2 sm:left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm ring-[3px] ring-background">
        <div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full",
            eventColorClass,
          )}
        >
          {getIcon(event.type)}
        </div>
      </div>

      {/* Content Card */}
      <div className="flex-1 min-w-0 bg-transparent rounded-lg pb-1">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[15px] font-semibold text-foreground leading-snug tracking-tight">
              {event.title}
            </h4>
            {event.itemId && (
              <span className="inline-flex items-center gap-1 rounded bg-muted/70 px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground border border-border/50">
                Item ID: <strong className="text-foreground">{event.itemId}</strong>
              </span>
            )}
            {event.isFlagged && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                Flagged
              </span>
            )}
          </div>
          <time className="shrink-0 text-[11px] font-medium text-muted-foreground/80 sm:mt-1 bg-muted/50 px-2 py-0.5 rounded-md whitespace-nowrap">
            {event.date}, {event.time}
          </time>
        </div>

        {/* Actor Info */}
        {event.actor && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-md mb-2 border border-border/30">
            <span className="text-foreground/80">{event.actor}</span>
            {event.facility && (
              <>
                <span className="text-border/50">•</span>
                <span className="truncate max-w-[200px]" title={event.facility}>
                  {event.facility}
                </span>
              </>
            )}
          </div>
        )}

        {/* Dedicated Flagged Details Panel if is_flagged is true */}
        {event.isFlagged && (
          <div className="mt-2.5 mb-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs dark:border-rose-900/50 dark:bg-rose-950/20 shadow-xs">
            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 mb-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">Flagged Exception Details</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3.5">
              {/* Flagged Image Preview: Click opens new window */}
              {event.flaggedImageUrl && (
                <div className="shrink-0">
                  <a
                    href={event.flaggedImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block h-20 w-20 overflow-hidden rounded-lg border-2 border-rose-300 bg-muted shadow-sm transition-all hover:border-rose-500 hover:ring-2 hover:ring-rose-400/40 dark:border-rose-800"
                    title="Click to open image in new window"
                  >
                    <img
                      src={event.flaggedImageUrl}
                      alt="Flagged Proof"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <ExternalLink className="h-4 w-4 text-white drop-shadow" />
                      <span className="mt-0.5 text-[9px] font-bold text-white uppercase tracking-tight">
                        View
                      </span>
                    </div>
                  </a>
                </div>
              )}

              <div className="min-w-0 space-y-2 flex-1">
                {/* Item ID */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-muted-foreground">Item ID:</span>
                  <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border/60 text-[11px]">
                    #{event.itemId}
                  </span>
                  {event.itemName && (
                    <span className="text-muted-foreground text-[11px] truncate max-w-[220px]" title={event.itemName}>
                      ({event.itemName})
                    </span>
                  )}
                </div>

                {/* Flagged Reason */}
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-rose-800 dark:text-rose-300">Flagged Reason: </span>
                  <span className="font-medium text-foreground dark:text-rose-100 bg-rose-100/60 dark:bg-rose-900/40 px-2 py-0.5 rounded text-[12px]">
                    {event.flagReason || "Flagged for manual review"}
                  </span>
                </div>

                {/* Image URL link (Click opens new window) */}
                {event.flaggedImageUrl && (
                  <div className="pt-0.5 flex items-start gap-1.5 flex-wrap">
                    <span className="font-semibold text-muted-foreground text-[11px] shrink-0 mt-0.5">Image URL:</span>
                    <a
                      href={event.flaggedImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 underline underline-offset-2 break-all text-[11px] group/url"
                      title="Click to open image in new window"
                    >
                      <span className="break-all">{event.flaggedImageUrl}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 transition-transform group-hover/url:translate-x-0.5 group-hover/url:-translate-y-0.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {descLines.length > 0 && (
          <div className="space-y-1 mt-1">
            {descLines.map((line, i) => (
              <p key={i} className="text-[13px] leading-relaxed text-muted-foreground/90">
                {line}
              </p>
            ))}
          </div>
        )}

        {/* View Raw Details Button */}
        {event.hasRawDetails && (
          <div className="mt-3">
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/50 hover:bg-muted hover:border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-all shadow-sm">
              <FileText className="h-3.5 w-3.5" />
              View Raw Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
