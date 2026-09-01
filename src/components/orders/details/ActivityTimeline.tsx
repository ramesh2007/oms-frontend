import { useState } from "react";
import {
  Box,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  Package,
  PackageCheck,
  Play,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  UserCheck,
  UserPlus,
  List,
  Webhook,
  FileText,
  XCircle,
} from "lucide-react";
import type { EnrichedOrder, OrderTimelineEvent } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TimelineDialog } from "./TimelineDialog";

type EventType = OrderTimelineEvent["type"];

export function ActivityTimeline({ order }: { order: EnrichedOrder }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
  const latestEvent = mainTimeline.length > 0 ? mainTimeline[mainTimeline.length - 1] : null;

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Latest Activity</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs bg-background"
            onClick={() => setIsDialogOpen(true)}
          >
            <List className="h-3.5 w-3.5" />
            View Full Timeline
          </Button>
        </div>

        {/* Fulfillment Crew Summary: Who Picked, Who Packed, Who Driver */}
        <div className="border-b border-border bg-muted/10 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Fulfillment Crew
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-card p-2">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3 text-emerald-600" /> Picker
              </span>
              <span className="font-semibold truncate text-foreground" title={order.picker ?? "Not assigned"}>
                {order.picker ?? "Not assigned"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-card p-2">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3 text-indigo-600" /> Packer
              </span>
              <span className="font-semibold truncate text-foreground" title={order.packer ?? "Not assigned"}>
                {order.packer ?? "Not assigned"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-card p-2">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Truck className="h-3 w-3 text-blue-600" /> Driver
              </span>
              <span className="font-semibold truncate text-foreground" title={order.driver ?? "Not assigned"}>
                {order.driver ?? "Not assigned"}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 py-4">
          {latestEvent ? (
            <TimelineEvent event={latestEvent} />
          ) : (
            <p className="text-sm text-muted-foreground">No activity recorded.</p>
          )}
        </div>
      </section>

      <TimelineDialog
        order={order}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}

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

/** Return the appropriate Lucide icon for a given timeline event type. */
function iconForEvent(type: EventType) {
  switch (type) {
    case "added":
    case "line_item_updated":
      return Plus;
    case "placed":
      return ShoppingCart;
    case "allocated":
      return Package;
    case "order_created":
      return Webhook;
    case "picker_assigned":
    case "packer_assigned":
      return UserPlus;
    case "item_picked":
    case "picking_started":
    case "item_packed":
    case "packing_started":
      return Box;
    case "picking_completed":
    case "packing_completed":
    case "delivered":
      return CheckCircle2;
    case "recalculated":
    case "updated":
      return Edit3;
    case "driver_assigned":
      return UserPlus;
    case "driver_accepted":
      return UserCheck;
    case "bags_verified":
      return ShieldCheck;
    case "started":
      return Play;
    case "out_for_delivery":
      return Truck;
    case "auto_fulfilled":
      return PackageCheck;
    case "auto_marked_paid":
      return CreditCard;
    case "cancelled":
      return XCircle;
    case "bypassed":
      return ShieldCheck;
    default:
      return Clock;
  }
}

function TimelineEvent({ event }: { event: OrderTimelineEvent }) {
  const Icon = iconForEvent(event.type);
  const eventColorClass = colourForEvent(event.type);
  const descLines = event.description ? event.description.split("\n").filter(Boolean) : [];

  return (
    <div className="relative pl-12 group py-1">
      {/* Node Circle */}
      <div 
        className="absolute left-2 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm ring-[3px] ring-background"
      >
        <div className={cn("flex h-full w-full items-center justify-center rounded-full", eventColorClass)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Content Card */}
      <div className="flex-1 min-w-0 bg-transparent rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1.5">
          <h4 className="text-[15px] font-semibold text-foreground leading-snug tracking-tight">
            {event.title}
          </h4>
          <time className="shrink-0 text-[11px] font-medium text-muted-foreground/80 sm:mt-0.5 bg-muted/50 px-2 py-0.5 rounded-md whitespace-nowrap">
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
