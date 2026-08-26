import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EnrichedOrder, OrderTimelineEvent } from "@/lib/orders";
import {
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
  ShieldCheck,
  ShoppingCart,
  Truck,
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
            Order #{String(order.shopifyOrderId || order.orderNumber || order.id).replace(/^#+/, "")}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2 py-6 sm:px-6">
          <div className="space-y-0 relative z-10 mx-auto max-w-lg">
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
                  ].includes(event.type)
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
      <div 
        className="absolute left-2 sm:left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm ring-[3px] ring-background"
      >
        <div className={cn("flex h-full w-full items-center justify-center rounded-full", eventColorClass)}>
          {getIcon(event.type)}
        </div>
      </div>

      {/* Content Card */}
      <div className="flex-1 min-w-0 bg-transparent rounded-lg pb-1">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1.5">
          <h4 className="text-[15px] font-semibold text-foreground leading-snug tracking-tight">
            {event.title}
          </h4>
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
                <span className="truncate max-w-[200px]" title={event.facility}>{event.facility}</span>
              </>
            )}
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
