import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Clock3,
  Package,
  PackageCheck,
  RefreshCw,
  Sparkles,
  Truck,
  Wallet,
  XCircle,
  Flag,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react";
import { isDemoMode } from "@/lib/api/config";

export type OrderStatus =
  | "New"
  | "Unfulfilled"
  | "Picking"
  | "Picked"
  | "Packing"
  | "Ready to Assign"
  | "Driver Accepted"
  | "Started"
  | "Delivered"
  | "Delivery Failed"
  | "Flagged"
  | "Cancelled"
  | "Replacement"
  | "Exchange"
  | "Installation"
  | "PayLater";

export type LegacyTabId =
  | "New"
  | "Express"
  | "Installation"
  | "Unfulfilled"
  | "Picking"
  | "Picked"
  | "Packing"
  | "Ready to Assign"
  | "In Delivery"
  | "Delivery Failed"
  | "Delivered"
  | "Flags & Exceptions"
  | "Cancelled"
  | "Returns & Replacements"
  | "Replacement"
  | "Exchange"
  | "All"
  | "PayLater";

export interface LegacyTab {
  id: LegacyTabId;
  label: string;
  color: string;
  activeColor: string;
}

export const LEGACY_TABS: LegacyTab[] = [
  { id: "New", label: "New", color: "text-sky-600 dark:text-sky-400", activeColor: "bg-sky-500" },
  { id: "Express", label: "Express", color: "text-amber-600 dark:text-amber-400", activeColor: "bg-amber-500" },
  { id: "All", label: "All", color: "text-foreground", activeColor: "bg-primary" },
  {
    id: "Picking",
    label: "Picking",
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    activeColor: "bg-fuchsia-500",
  },
  {
    id: "Picked",
    label: "Picked",
    color: "text-violet-600 dark:text-violet-400",
    activeColor: "bg-violet-500",
  },
  {
    id: "Packing",
    label: "Packing",
    color: "text-indigo-600 dark:text-indigo-400",
    activeColor: "bg-indigo-500",
  },
  {
    id: "Ready to Assign",
    label: "Ready to Assign",
    color: "text-amber-600 dark:text-amber-400",
    activeColor: "bg-amber-500",
  },
  {
    id: "In Delivery",
    label: "In Delivery",
    color: "text-blue-600 dark:text-blue-400",
    activeColor: "bg-blue-500",
  },
  {
    id: "Delivered",
    label: "Delivered",
    color: "text-emerald-600 dark:text-emerald-400",
    activeColor: "bg-emerald-500",
  },
  {
    id: "Delivery Failed",
    label: "Delivery Failed",
    color: "text-red-600 dark:text-red-400",
    activeColor: "bg-red-500",
  },
  {
    id: "Installation",
    label: "Installation",
    color: "text-emerald-600 dark:text-emerald-400",
    activeColor: "bg-emerald-500",
  },
  {
    id: "Unfulfilled",
    label: "Unfulfilled",
    color: "text-orange-600 dark:text-orange-400",
    activeColor: "bg-orange-500",
  },
  {
    id: "Flags & Exceptions",
    label: "Flags & Exceptions",
    color: "text-red-600 dark:text-red-400",
    activeColor: "bg-red-500",
  },
  {
    id: "Cancelled",
    label: "Cancelled",
    color: "text-red-600 dark:text-red-400",
    activeColor: "bg-red-500",
  },
  {
    id: "Returns & Replacements",
    label: "Returns & Replacements",
    color: "text-pink-600 dark:text-pink-400",
    activeColor: "bg-pink-500",
  },
  {
    id: "Replacement",
    label: "Replacement",
    color: "text-indigo-600 dark:text-indigo-400",
    activeColor: "bg-indigo-500",
  },
  {
    id: "Exchange",
    label: "Exchange",
    color: "text-teal-600 dark:text-teal-400",
    activeColor: "bg-teal-500",
  },
  {
    id: "PayLater",
    label: "Pay Later",
    color: "text-purple-600 dark:text-purple-400",
    activeColor: "bg-purple-500",
  },
];

export interface Order {
  id: string;
  orderNumber?: string;
  shopifyOrderId?: string;
  /** Stable customer profile id (URL segment for /customers/:customerId). */
  customerId: string;
  tat: string;
  date: string;
  time: string;
  customer: { name: string; email: string; phone: string };
  channel: "web" | "5382175" | "shopify";
  items: number;
  status: OrderStatus;
  returns?: { type: "Return"; count: number };
  /** Detailed return/replacement items for this order. */
  returnItems?: OrderReturn[];
  city: string;
  coordinator: string;
  driver: string | null;
  driverStatus?: string | null;
  picker: string | null;
  packer: string | null;
  total: number;
  shopify: "Fulfilled" | "Unfulfilled" | "Pending";
  pickingStatus?: string;
  packingStatus?: string;
  bags?: number;
  tags?: string[];
  deliveryDate?: string;
  notes?: string;
  payment?: any;
  paymentMethod?: string;
  paymentBalance?: number;
  lat?: number;
  lng?: number;
  itemsList?: OrderItemType[];
  line_items?: any[];
  zone?: string;
  hasInstallation?: boolean;
  installationItemsCount?: number;
  installationStatus?: string;
  shippingMethod?: string;
  isExpress?: boolean;
  deliveryType?: string;
  timeline?: OrderTimelineEvent[];
  flags?: string[];
  order_id?: number | string;
  ready_to_assign?: boolean;
  is_ready_to_assign?: boolean;
  all_items_vs?: boolean;
  hasCancelledItems?: boolean;
  cancelledItemsCount?: number;
  summary?: any;
  rawOrder?: any;
  backend_status?: string;
  rawStatus?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  delivery_address?: string;
  shippingAddress?: {
    line1: string;
    line2: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    building?: string;
    unit?: string;
    zone?: string;
    street?: string;
  };
}

export type ItemFulfillmentType = "FC" | "MWH" | "VL_SUPPLIER" | "VL_HMA";

export interface OrderItemType {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  image: string;
  qty: number;
  price: number;
  fc: string;
  fcName: string;
  bin: string;
  status: "Prepared" | "Accepted" | "Allocated" | "Pending" | "Picker Assigned" | "Cancelled" | string;
  is_cancelled?: boolean;
  isCancelled?: boolean;
  is_added?: boolean;
  isAdded?: boolean;
  is_new?: boolean;
  isNew?: boolean;
  raw_status?: string | null;
  /**
   * Fulfillment type for this item:
   * - FC: standard fulfillment center item (normal delivery flow)
   * - MWH: main warehouse item requiring installation scheduling
   * - VL_SUPPLIER: virtual/supplier item requiring installation scheduling
   * - VL_HMA: vendor location item fulfilled by HalaMama staff (VL portal)
   */
  itemType?: ItemFulfillmentType;
  /** Whether this item has been scheduled for installation */
  isScheduled?: boolean;
  /** ISO timestamp of when it was scheduled */
  scheduledAt?: string;
  /** Driver/installer assigned for the installation */
  installationDriver?: string | null;
  /** Location ID for vendor/warehouse */
  locationId?: string;
  /** Whether this item requires or supports installation scheduling */
  is_installable?: boolean;
  isInstallable?: boolean;
  /** Backend Order Item ID */
  order_item_id?: number | string;
  /** Backend Line Item ID (e.g. 17043696451828) */
  line_item_id?: string | number;
  assigned_to?: number | string | null;
  assigned_user_name?: string | null;
  assigned_at?: string | null;
  picked_by?: number | string | null;
  picked_user_name?: string | null;
  packed_by?: number | string | null;
  packed_user_name?: string | null;
  delivered_by?: number | string | null;
  delivered_user_name?: string | null;
  picked_at?: string | null;
  packed_at?: string | null;
  delivered_at?: string | null;
  /** Whether the schedule has been assigned */
  is_scheduled_assigned?: boolean;
  /** Installation classification metadata */
  installation_type?: string | null;
  installation_level?: string | null;
  installation?: any;
  /** Product tags (e.g. VS, Fragile, Summer, etc.) */
  product_tags?: string[] | string | null;
  /** Gift wrap value or code (e.g. "GW-G") */
  gift_wrap?: string | boolean | null;
  giftWrap?: string | boolean | null;
  /** Gift message written for this item */
  gift_message?: string | null;
  giftMessage?: string | null;
  item_id?: number | string;
  is_flagged?: boolean;
  isFlagged?: boolean;
  flag_reason?: string | null;
  flagged_reason?: string | null;
  flaggedReason?: string | null;
  flagged_image?: string | null;
  flagged_image_url?: string | null;
  flaggedImageUrl?: string | null;
  flagged_by?: string | null;
  flagged_at?: string | null;
}

export type ReturnStatus = "pending" | "picked up" | "completed";

export interface OrderReturn {
  id: string;
  itemName: string;
  sku?: string;
  type: "return" | "replacement";
  qty: number;
  status: ReturnStatus;
  source: "Shopify" | "Web";
  /** Return reason (e.g. damaged, wrong_item, near_expiry, changed_mind, other). */
  reason?: string;
  /** Admin notes entered when creating the return. */
  adminNote?: string;
  /** Driver's note when collecting the return. */
  driverNote?: string;
  /** ISO timestamp when the return was created by admin. */
  createdAt?: string;
  /** ISO timestamp when driver confirmed collection. */
  collectedAt?: string;
  /** Email of the driver who collected the return. */
  collectedBy?: string;
  /** ISO timestamp when admin confirmed warehouse receipt. */
  completedAt?: string;
}

export interface OrderTimelineEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  /** The person who performed/triggered this action. */
  actor?: string;
  /** Role of the actor (picker, packer, driver, admin, system, webhook). */
  actorRole?: "picker" | "packer" | "driver" | "admin" | "system" | "webhook";
  /** Fulfillment center reference, e.g. "Fulfillment Center Hilal (F01)". */
  facility?: string;
  /** Arbitrary key-value metadata (Shopify IDs, payment info, financial data). */
  metadata?: Record<string, string>;
  /** Whether this event supports a "View Raw Details" action. */
  hasRawDetails?: boolean;
  type:
    | "added"
    | "placed"
    | "allocated"
    | "picking_started"
    | "picking_completed"
    | "packing_started"
    | "packing_completed"
    | "recalculated"
    | "updated"
    | "driver_assigned"
    | "driver_accepted"
    | "started"
    | "out_for_delivery"
    | "delivered"
    | "item_picked"
    | "item_packed"
    | "picker_assigned"
    | "packer_assigned"
    | "bags_verified"
    | "order_created"
    | "auto_fulfilled"
    | "auto_marked_paid"
    | "line_item_updated"
    | "delivery_failed"
    | "cancelled"
    | "bypassed"
    | "item_flagged"
    | "flagged";
  /** Item-level identifiers & flagged information */
  itemId?: string | number;
  itemName?: string;
  isFlagged?: boolean;
  flagReason?: string | null;
  flaggedImageUrl?: string | null;
}

export interface EnrichedOrder extends Order {
  zone: string;
  itemsList: OrderItemType[];
  returnsList: OrderReturn[];
  timeline: OrderTimelineEvent[];
  payment: {
    method: string;
    status?: string;
    totalPaid: number;
    cash: number;
    card: number;
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
    balance: number;
    shippingMethod: string;
    id?: number | string;
    shopifyOrderId?: string;
    processedAt?: string | null;
  };
  notes: string;
  shippingAddress: {
    line1: string;
    line2: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    building?: string;
    unit?: string;
    zone?: string;
    street?: string;
  };
  matrix: {
    fc: string;
    fcName: string;
    items: { sku: string; req: number; available: number }[];
  }[];
}

/** Build a realistic, data-driven timeline for any order based on its current status. */
function buildTimelineFor(base: Order, items?: OrderItemType[]): OrderTimelineEvent[] {
  // ── helpers ────────────────────────────────────────────────────────────────
  const addMin = (date: string, time: string, mins: number): { date: string; time: string } => {
    const [dh, dm] = time.split(":").map(Number);
    const total = dh * 60 + dm + mins;
    return {
      date,
      time: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
    };
  };
  const fmt = (date: string, time: string, mins: number) => {
    const { date: d2, time: t2 } = addMin(date, time, mins);
    return { date: d2, time: t2 };
  };

  // Generate a fake Shopify-style ID from the order id
  const shopifyId = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    return String(Math.abs(h * 1000000 + 7363242754210));
  };

  const t0 = fmt(base.date, base.time, 0);
  const t1 = fmt(base.date, base.time, 1);
  const t2 = fmt(base.date, base.time, 2);
  const t5 = fmt(base.date, base.time, 5);
  const t8 = fmt(base.date, base.time, 8);
  const t10 = fmt(base.date, base.time, 10);
  const t12 = fmt(base.date, base.time, 12);
  const t15 = fmt(base.date, base.time, 15);
  const t20 = fmt(base.date, base.time, 20);
  const t25 = fmt(base.date, base.time, 25);
  const t30 = fmt(base.date, base.time, 30);
  const t35 = fmt(base.date, base.time, 35);
  const t45 = fmt(base.date, base.time, 45);
  const t58 = fmt(base.date, base.time, 58);
  const t65 = fmt(base.date, base.time, 65);

  const hasPicker = base.picker != null;
  const hasPacker = base.packer != null;
  const hasDriver = base.driver != null;
  const isDelivered = base.driverStatus === "Completed";
  const isActive = [
    "New",
    "Unfulfilled",
    "Picked",
    "Ready to Assign",
    "Driver Accepted",
    "Started",
  ].includes(base.status);

  // Item names for per-item events (use provided items or fallback)
  const itemNames =
    items?.map((i) => i.name) ??
    (base.items > 0 ? Array.from({ length: base.items }, (_, idx) => `Item ${idx + 1}`) : []);
  const itemCount = Math.max(base.items, itemNames.length);
  const fcName = "Fulfillment Center Hilal";
  const fcCode = "F01";

  const ev: OrderTimelineEvent[] = [];

  // ── 1. Order totals recalculated (initial) ─────────────────────────────────
  ev.push({
    id: "tl-recalc-1",
    title: "Order totals recalculated",
    ...t0,
    description: `Subtotal: ${(base.total - 10).toFixed(2)}, Total: ${base.total}`,
    actorRole: "system",
    metadata: { subtotal: (base.total - 10).toFixed(2), total: String(base.total) },
    type: "recalculated",
  });

  // ── 2. Order updated from Shopify (initial webhook) ────────────────────────
  ev.push({
    id: "tl-update-1",
    title: "Order updated from Shopify",
    ...t0,
    description: "Order updated via webhook",
    actorRole: "webhook",
    type: "updated",
  });

  // ── 3. Order created via webhook ───────────────────────────────────────────
  ev.push({
    id: "tl-created",
    title: "Order created/inserted via webhook",
    ...t0,
    description: "Order created/inserted via webhook",
    actorRole: "webhook",
    type: "order_created",
  });

  // ── 4. Order placed ────────────────────────────────────────────────────────
  ev.push({
    id: "tl-placed",
    title: "Order placed",
    ...t0,
    description: `Order #${base.id} was placed.`,
    actorRole: "system",
    type: "placed",
  });

  // ── 5. Auto-allocated to Fulfillment Center ────────────────────────────────
  ev.push({
    id: "tl-alloc",
    title: `Auto-allocated to ${fcName}`,
    ...t0,
    description: `${fcName} (${fcCode})\nSingle fulfillment: auto-allocated ${itemCount} items to outlet 210`,
    actorRole: "system",
    facility: `${fcName} (${fcCode})`,
    type: "allocated",
  });

  // ── 6. Order totals recalculated (post-allocation) ─────────────────────────
  ev.push({
    id: "tl-recalc-2",
    title: "Order totals recalculated",
    ...t0,
    description: `Subtotal: ${(base.total - 10).toFixed(2)}, Total: ${base.total}`,
    actorRole: "system",
    metadata: { subtotal: (base.total - 10).toFixed(2), total: String(base.total) },
    type: "recalculated",
  });

  // ── 7. Line items added (per item) ─────────────────────────────────────────
  itemNames.forEach((name, i) => {
    ev.push({
      id: `tl-added-${i}`,
      title: `Line item added: ${name}`,
      ...t0,
      description: "",
      actorRole: "system",
      hasRawDetails: true,
      type: "added",
    });
  });

  // ── 8. Order updated from Shopify (2nd sync) ──────────────────────────────
  ev.push({
    id: "tl-update-2",
    title: "Order updated from Shopify",
    ...t1,
    description: "Order updated via webhook",
    actorRole: "webhook",
    type: "updated",
  });

  // ── 9. Order totals recalculated (post-sync) ──────────────────────────────
  ev.push({
    id: "tl-recalc-3",
    title: "Order totals recalculated",
    ...t1,
    description: `Subtotal: ${(base.total - 10).toFixed(2)}, Total: ${base.total}`,
    actorRole: "system",
    metadata: { subtotal: (base.total - 10).toFixed(2), total: String(base.total) },
    type: "recalculated",
  });

  // ── 10. Picker assigned ────────────────────────────────────────────────────
  if (hasPicker) {
    ev.push({
      id: "tl-picker-assigned",
      title: `Picker assigned: ${base.picker} at ${fcName}`,
      ...t5,
      description: `By: ${base.picker} · ${fcName} (${fcCode})`,
      actor: base.picker!,
      actorRole: "picker",
      facility: `${fcName} (${fcCode})`,
      hasRawDetails: true,
      type: "picker_assigned",
    });

    // ── 11. Item picked (per item) ─────────────────────────────────────────
    itemNames.forEach((_, i) => {
      ev.push({
        id: `tl-item-picked-${i}`,
        title: `Item picked (qty: 1) by ${base.picker}`,
        ...fmt(base.date, base.time, 5 + i + 1),
        description: `By: ${base.picker}`,
        actor: base.picker!,
        actorRole: "picker",
        hasRawDetails: true,
        type: "item_picked",
      });
    });

    // ── 12. Picking completed ──────────────────────────────────────────────
    ev.push({
      id: "tl-pick-end",
      title: `Picking completed by ${base.picker}`,
      ...t8,
      description: `By: ${base.picker}`,
      actor: base.picker!,
      actorRole: "picker",
      hasRawDetails: true,
      type: "picking_completed",
    });
  } else if (isActive) {
    ev.push({
      id: "tl-pick-start",
      title: "Picking started",
      ...t5,
      description: "Picking initiated.",
      actorRole: "system",
      type: "picking_started",
    });
  }

  // ── 13. Packer assigned ────────────────────────────────────────────────────
  if (hasPacker) {
    ev.push({
      id: "tl-packer-assigned",
      title: `Packer assigned: ${base.packer} at ${fcName}`,
      ...t15,
      description: `By: ${base.packer} · ${fcName} (${fcCode})`,
      actor: base.packer!,
      actorRole: "packer",
      facility: `${fcName} (${fcCode})`,
      type: "packer_assigned",
    });

    // ── 14. Item packed (per item) ─────────────────────────────────────────
    itemNames.forEach((_, i) => {
      ev.push({
        id: `tl-item-packed-${i}`,
        title: `Item packed (qty: 1) by ${base.packer}`,
        ...fmt(base.date, base.time, 15 + i + 1),
        description: `By: ${base.packer}`,
        actor: base.packer!,
        actorRole: "packer",
        hasRawDetails: true,
        type: "item_packed",
      });
    });

    // ── 15. Packing completed ──────────────────────────────────────────────
    const bags = base.bags ?? 1;
    ev.push({
      id: "tl-pack-end",
      title: `Packing completed — ${bags} bag(s) by ${base.packer}`,
      ...t20,
      description: `By: ${base.packer}`,
      actor: base.packer!,
      actorRole: "packer",
      hasRawDetails: true,
      metadata: { bags: String(bags) },
      type: "packing_completed",
    });
  } else if (isActive) {
    ev.push({
      id: "tl-pack-start",
      title: "Packing started",
      ...t15,
      description: "Packing initiated.",
      actorRole: "system",
      type: "packing_started",
    });
  }

  // ── 16. Driver assigned ────────────────────────────────────────────────────
  if (hasDriver) {
    const assigner = base.coordinator !== "-" ? base.coordinator : "suhail_halamama";
    ev.push({
      id: "tl-drv-assign",
      title: `Driver assigned: ${base.driver} by ${assigner}`,
      ...t25,
      description: `By: ${assigner} · Driver: ${base.driver}\nDriver assigned internally (forced)`,
      actor: assigner,
      actorRole: "admin",
      metadata: { driver: base.driver!, method: "internally (forced)" },
      type: "driver_assigned",
    });

    // ── 17. Bags verified ──────────────────────────────────────────────────
    ev.push({
      id: "tl-bags-verified",
      title: `Bags verified by ${base.driver}`,
      ...t35,
      description: `By: ${base.driver}\nDriver verified bags match & count`,
      actor: base.driver!,
      actorRole: "driver",
      type: "bags_verified",
    });

    // ── 18. Driver started trip ────────────────────────────────────────────
    if (isDelivered || isActive) {
      ev.push({
        id: "tl-started",
        title: `Driver ${base.driver} started trip`,
        ...t35,
        description: `By: ${base.driver}`,
        actor: base.driver!,
        actorRole: "driver",
        type: "started",
      });
    }
  }

  // ── 19–25. Delivered + post-delivery automation ─────────────────────────────
  if (isDelivered) {
    // Delivery event
    ev.push({
      id: "tl-delivered",
      title: `Order delivered by ${base.driver}`,
      ...t58,
      description: `By: ${base.driver}`,
      actor: base.driver!,
      actorRole: "driver",
      type: "delivered",
    });

    // Delivered (with payment details)
    ev.push({
      id: "tl-delivered-payment",
      title: `Order delivered by ${base.driver}`,
      ...t58,
      description: `By: ${base.driver}\nPayment: cash (Amount: ${base.total})`,
      actor: base.driver!,
      actorRole: "driver",
      metadata: { paymentMethod: "cash", paymentAmount: String(base.total) },
      type: "delivered",
    });

    // Auto-fulfilled on Shopify
    const fulfillId = shopifyId(base.id + "fulfill");
    ev.push({
      id: "tl-auto-fulfilled",
      title: "Order auto-fulfilled on Shopify",
      ...t58,
      description: `Auto-fulfilled on driver completion. Shopify Fulfillment ID: ${fulfillId}`,
      actorRole: "system",
      metadata: { shopifyFulfillmentId: fulfillId },
      type: "auto_fulfilled",
    });

    // Auto-marked as paid
    const txnId = shopifyId(base.id + "txn");
    ev.push({
      id: "tl-auto-paid",
      title: "Order auto-marked as paid",
      ...t58,
      description: `Auto-marked paid on driver completion. Shopify Transaction ID: ${txnId}`,
      actorRole: "system",
      metadata: { shopifyTransactionId: txnId },
      type: "auto_marked_paid",
    });

    // Order updated from Shopify (post-delivery)
    ev.push({
      id: "tl-update-3",
      title: "Order updated from Shopify",
      ...t58,
      description: "Order updated via webhook",
      actorRole: "webhook",
      type: "updated",
    });

    // Line items updated (post-delivery, per item)
    itemNames.forEach((name, i) => {
      ev.push({
        id: `tl-item-updated-${i}`,
        title: `Line item updated: ${name}`,
        ...t58,
        description: "",
        actorRole: "system",
        hasRawDetails: true,
        type: "line_item_updated",
      });
    });

    // Final recalculation
    ev.push({
      id: "tl-recalc-4",
      title: "Order totals recalculated",
      ...t58,
      description: `Subtotal: ${(base.total - 10).toFixed(2)}, Total: ${base.total}`,
      actorRole: "system",
      metadata: { subtotal: (base.total - 10).toFixed(2), total: String(base.total) },
      type: "recalculated",
    });

    // Next-day Shopify sync cycle
    ev.push({
      id: "tl-update-4",
      title: "Order updated from Shopify",
      ...t65,
      description: "Order updated via webhook",
      actorRole: "webhook",
      type: "updated",
    });
    ev.push({
      id: "tl-recalc-5",
      title: "Order totals recalculated",
      ...t65,
      description: `Subtotal: ${(base.total - 10).toFixed(2)}, Total: ${base.total}`,
      actorRole: "system",
      metadata: { subtotal: (base.total - 10).toFixed(2), total: String(base.total) },
      type: "recalculated",
    });
  }

  // Load custom timeline events from localStorage in demo mode
  if (typeof window !== "undefined") {
    try {
      const customRaw = localStorage.getItem("hm_custom_timeline_events");
      if (customRaw) {
        const customEvents = JSON.parse(customRaw);
        const filtered = customEvents.filter((e: any) => e.orderId === base.id);
        ev.push(...filtered);
      }
    } catch (e) {
      console.warn("Failed to load custom timeline events", e);
    }
  }

  return ev;
}

/** Single reference sample items for development reference. Returns empty array for all other orders. */
export function getMockOrderItems(id: string, totalItems: number): OrderItemType[] {
  if (id === "HM-REF-1001") {
    return [
      {
        id: "ref-item-1",
        name: "Reference Product Item",
        sku: "REF-SKU-001",
        barcode: "90600000001",
        image: "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=100&h=100&fit=crop",
        qty: 1,
        price: 150.0,
        fc: "F01",
        fcName: "Fulfillment Center Hilal",
        bin: "B-100 / 1",
        status: "Prepared",
        itemType: "FC",
        product_tags: ["Reference"],
      },
    ];
  }
  return [];
}

/** Get mock order total dynamically based on its items and payment information. */
export function getMockOrderTotal(id: string, totalItems: number, payment?: any): number {
  const itemsList = getMockOrderItems(id, totalItems);
  const subtotal = itemsList.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = payment?.discount ?? 0;
  const shipping = payment?.shipping ?? 0;
  return subtotal + shipping - discount;
}

/** Converts any Order into an EnrichedOrder, ensuring all nested properties exist safely */
export function toEnrichedOrder(order: Order): EnrichedOrder {
  const rawId = String(order.id || "");
  const baseOrder = isDemoMode() ? MOCK_ORDERS.find((o) => o.id === rawId) : undefined;

  // 1. Items List
  let itemsList: OrderItemType[] = [];
  if (Array.isArray(order.itemsList) && order.itemsList.length > 0) {
    const mockItems = getMockOrderItems(rawId, order.itemsList.length);
    itemsList = order.itemsList.map((item, idx) => {
      const matchingMock = mockItems.find((m) => m.id === item.id || m.sku === item.sku) || mockItems[idx];
      const rawLineItemId = (item as any).line_item_id;
      const rawIdVal = item.id;
      const rawOrderItemIdVal = (item as any).order_item_id;
      const rawItemIdVal = (item as any).item_id;

      const resolvedLineItemId = rawLineItemId
        ? String(rawLineItemId)
        : rawIdVal && String(rawIdVal).length > 6
          ? String(rawIdVal)
          : rawOrderItemIdVal && String(rawOrderItemIdVal).length > 6
            ? String(rawOrderItemIdVal)
            : rawLineItemId ?? rawIdVal ?? rawOrderItemIdVal ?? rawItemIdVal;

      const finalLineItemIdStr = resolvedLineItemId ? String(resolvedLineItemId) : String(item.id);

      const rawStatusStr = String(item.status || (item as any).custom_status || (item as any).raw_status || "").toLowerCase().trim();
      const isItemCancelled = rawStatusStr === "cancelled" || rawStatusStr === "canceled" || Boolean((item as any).is_cancelled || (item as any).cancelled);
      const isItemAdded = Boolean(
        (item as any).is_new ||
        (item as any).isNew ||
        (item as any).is_added ||
        (item as any).isAdded ||
        (item as any).added ||
        (item as any).is_replacement ||
        (item as any).isReplacement ||
        (item as any).is_exchange ||
        (item as any).isExchange ||
        rawStatusStr === "new" ||
        rawStatusStr === "added"
      );

      return {
        ...item,
        status: isItemCancelled ? "Cancelled" : isItemAdded ? "Added New" : item.status,
        is_cancelled: isItemCancelled,
        isCancelled: isItemCancelled,
        is_added: isItemAdded,
        isAdded: isItemAdded,
        is_new: isItemAdded,
        isNew: isItemAdded,
        raw_status: (item as any).raw_status || item.status,
        id: finalLineItemIdStr,
        line_item_id: finalLineItemIdStr,
        order_item_id: finalLineItemIdStr,
        item_id: rawItemIdVal ?? (item as any).product_id,
        assigned_to: item.assigned_to ?? (item as any).assigned_user_id ?? (item as any).picker_id ?? (item as any).picker ?? null,
        assigned_user_name: item.assigned_user_name ?? (item as any).assigned_to_name ?? (item as any).picker_name ?? (item as any).picker ?? (item as any).assignedUser?.name ?? null,
        assigned_at: item.assigned_at ?? null,
        picked_by: item.picked_by ?? null,
        picked_user_name: item.picked_user_name ?? (item as any).pickedUser?.name ?? null,
        product_tags:
          item.product_tags ??
          (item as any).tags ??
          (item as any).custom_product_tags ??
          (item as any).product?.product_tags ??
          (item as any).product?.tags ??
          (item as any).product_tag ??
          matchingMock?.product_tags ??
          null,
      };
    });
  } else if (Array.isArray(order.line_items) && order.line_items.length > 0) {
    const mockItems = getMockOrderItems(rawId, order.line_items.length);
    itemsList = order.line_items.map((rawItem: any, idx: number) => {
      const rawLineItemId = rawItem.line_item_id;
      const rawIdVal = rawItem.id;
      const rawOrderItemIdVal = rawItem.order_item_id;
      const rawItemIdVal = rawItem.item_id;

      const resolvedLineItemId = rawLineItemId
        ? String(rawLineItemId)
        : rawIdVal && String(rawIdVal).length > 6
          ? String(rawIdVal)
          : rawOrderItemIdVal && String(rawOrderItemIdVal).length > 6
            ? String(rawOrderItemIdVal)
            : rawLineItemId ?? rawIdVal ?? rawOrderItemIdVal ?? rawItemIdVal ?? `item-${rawId}-${idx + 1}`;

      const finalLineItemIdStr = String(resolvedLineItemId);
      const qty = Number(rawItem.quantity ?? rawItem.qty ?? 1) || 1;
      const price = Number(rawItem.unit_price ?? rawItem.price ?? rawItem.rate ?? 0) || 0;
      const matchingMock = mockItems.find((m) => m.id === finalLineItemIdStr || m.sku === (rawItem.product_code ?? rawItem.item_code ?? rawItem.sku)) || mockItems[idx];
      return {
        id: finalLineItemIdStr,
        line_item_id: finalLineItemIdStr,
        order_item_id: finalLineItemIdStr,
        item_id: rawItemIdVal ?? undefined,
        name: rawItem.product_name ?? rawItem.item_name ?? rawItem.name ?? `Item ${idx + 1}`,
        sku: rawItem.product_code ?? rawItem.item_code ?? rawItem.sku ?? "N/A",
        barcode: rawItem.barcode ?? rawItem.custom_barcode ?? "",
        image: rawItem.image ?? rawItem.image_url ?? "",
        qty,
        price,
        fc: rawItem.warehouse_code ?? rawItem.fc ?? "F01",
        fcName: rawItem.warehouse ?? rawItem.fcName ?? "Fulfillment Center Hilal",
        bin: rawItem.bin ?? rawItem.custom_bin ?? "—",
        status: (() => {
          const s = String(rawItem.status || rawItem.custom_status || "").toLowerCase().trim();
          if (s === "cancelled" || s === "canceled") return "Cancelled";
          if (
            (rawItem as any).is_new ||
            (rawItem as any).isNew ||
            (rawItem as any).is_added ||
            (rawItem as any).isAdded ||
            (rawItem as any).added ||
            s === "new" ||
            s === "added"
          ) return "Added New";
          return (rawItem.status as any) || "Prepared";
        })(),
        is_cancelled: Boolean(
          String(rawItem.status || "").toLowerCase() === "cancelled" ||
          String(rawItem.status || "").toLowerCase() === "canceled" ||
          rawItem.is_cancelled ||
          rawItem.cancelled
        ),
        isCancelled: Boolean(
          String(rawItem.status || "").toLowerCase() === "cancelled" ||
          String(rawItem.status || "").toLowerCase() === "canceled" ||
          rawItem.is_cancelled ||
          rawItem.cancelled
        ),
        is_added: Boolean(
          (rawItem as any).is_new ||
          (rawItem as any).isNew ||
          (rawItem as any).is_added ||
          (rawItem as any).isAdded ||
          (rawItem as any).added ||
          String(rawItem.status || "").toLowerCase() === "new" ||
          String(rawItem.status || "").toLowerCase() === "added"
        ),
        isAdded: Boolean(
          (rawItem as any).is_new ||
          (rawItem as any).isNew ||
          (rawItem as any).is_added ||
          (rawItem as any).isAdded ||
          (rawItem as any).added ||
          String(rawItem.status || "").toLowerCase() === "new" ||
          String(rawItem.status || "").toLowerCase() === "added"
        ),
        is_new: Boolean(
          (rawItem as any).is_new ||
          (rawItem as any).isNew ||
          (rawItem as any).is_added ||
          (rawItem as any).isAdded ||
          (rawItem as any).added ||
          String(rawItem.status || "").toLowerCase() === "new" ||
          String(rawItem.status || "").toLowerCase() === "added"
        ),
        isNew: Boolean(
          (rawItem as any).is_new ||
          (rawItem as any).isNew ||
          (rawItem as any).is_added ||
          (rawItem as any).isAdded ||
          (rawItem as any).added ||
          String(rawItem.status || "").toLowerCase() === "new" ||
          String(rawItem.status || "").toLowerCase() === "added"
        ),
        assigned_to: rawItem.assigned_to ?? rawItem.assigned_user_id ?? (rawItem as any).picker_id ?? (rawItem as any).picker ?? null,
        assigned_user_name: rawItem.assigned_user_name ?? rawItem.assigned_to_name ?? rawItem.picker_name ?? (rawItem as any).picker ?? rawItem.assignedUser?.name ?? null,
        assigned_at: rawItem.assigned_at ?? null,
        picked_by: rawItem.picked_by ?? null,
        picked_user_name: rawItem.picked_user_name ?? rawItem.pickedUser?.name ?? null,
        packed_by: rawItem.packed_by ?? null,
        packed_user_name: rawItem.packed_user_name ?? rawItem.packedUser?.name ?? null,
        is_installable: Boolean(
          rawItem.is_installable ||
          rawItem.isInstallable ||
          (rawItem as any).requires_installation ||
          (rawItem as any).custom_is_installable
        ),
        isInstallable: Boolean(
          rawItem.is_installable ||
          rawItem.isInstallable ||
          (rawItem as any).requires_installation ||
          (rawItem as any).custom_is_installable
        ),
        itemType: rawItem.itemType || rawItem.item_type,
        product_tags:
          rawItem.product_tags ??
          rawItem.tags ??
          (rawItem as any).custom_product_tags ??
          (rawItem as any).product?.product_tags ??
          (rawItem as any).product?.tags ??
          (rawItem as any).product_tag ??
          matchingMock?.product_tags ??
          null,
        gift_wrap:
          rawItem.gift_wrap ??
          rawItem.giftWrap ??
          (rawItem as any).custom_gift_wrap ??
          null,
        gift_message:
          rawItem.gift_message ??
          rawItem.giftMessage ??
          (rawItem as any).custom_gift_message ??
          null,
        is_flagged: Boolean(
          rawItem.is_flagged ||
          (rawItem as any).isFlagged ||
          (rawItem as any).flagged ||
          String(rawItem.status || "").toLowerCase() === "flagged"
        ),
        flag_reason: rawItem.flag_reason ?? (rawItem as any).flagged_reason ?? (rawItem as any).flaggedReason ?? (rawItem as any).reason ?? null,
        flagged_reason: rawItem.flag_reason ?? (rawItem as any).flagged_reason ?? (rawItem as any).flaggedReason ?? (rawItem as any).reason ?? null,
        flagged_image_url: rawItem.flagged_image_url ?? (rawItem as any).flagged_image ?? (rawItem as any).flag_image_url ?? null,
        flagged_by: rawItem.flagged_by ?? (rawItem as any).flagged_user_name ?? null,
        flagged_at: rawItem.flagged_at ?? null,
      };
    });
  } else {
    itemsList = isDemoMode() ? getMockOrderItems(rawId, Math.max(1, order.items || 1)) : [];
  }

  // 2. Calculated total & payment
  const calculatedTotal =
    typeof order.total === "number" && order.total > 0
      ? order.total
      : isDemoMode()
        ? getMockOrderTotal(
            rawId,
            itemsList.reduce((sum, i) => sum + i.qty, 0),
            order.payment || baseOrder?.payment
          )
        : (order.payment?.total ?? 0);

  const rawPayment = order.payment || baseOrder?.payment;
  const shipping = typeof rawPayment?.shipping === "number" ? rawPayment.shipping : 10;
  const discount = typeof rawPayment?.discount === "number" ? rawPayment.discount : 0;
  const subtotal =
    typeof rawPayment?.subtotal === "number"
      ? rawPayment.subtotal
      : Math.max(0, calculatedTotal - shipping + discount);
  const paymentMethod =
    rawPayment?.method ||
    rawPayment?.payment_method ||
    (order as any).paymentMethod ||
    baseOrder?.payment?.method ||
    "Cash on Delivery";
  const paymentStatus =
    rawPayment?.status ||
    rawPayment?.payment_status ||
    ((order as any).paymentBalance === 0 ? "paid" : "pending");
  const totalPaid =
    typeof rawPayment?.totalPaid === "number"
      ? rawPayment.totalPaid
      : typeof rawPayment?.paid_amount === "number"
        ? rawPayment.paid_amount
        : paymentStatus === "paid" || order.status === "Delivered"
          ? calculatedTotal
          : 0;
  const balance =
    typeof rawPayment?.balance === "number"
      ? rawPayment.balance
      : typeof rawPayment?.total_outstanding === "number"
        ? rawPayment.total_outstanding
        : typeof (order as any).paymentBalance === "number"
          ? (order as any).paymentBalance
          : Math.max(0, calculatedTotal - totalPaid);

  const payment = {
    method: paymentMethod,
    status: paymentStatus,
    totalPaid,
    cash: paymentMethod.toLowerCase().includes("card") ? 0 : totalPaid,
    card: paymentMethod.toLowerCase().includes("card") ? totalPaid : 0,
    subtotal,
    discount,
    shipping,
    total: calculatedTotal,
    balance,
    shippingMethod: rawPayment?.shippingMethod || "Standard Delivery",
    id: rawPayment?.id,
    shopifyOrderId: rawPayment?.shopifyOrderId || order.shopifyOrderId,
    processedAt: rawPayment?.processedAt,
  };

  // 3. Shipping Address
  const rawAddr = (order as any).shippingAddress || (baseOrder as any)?.shippingAddress;
  const city = order.city && order.city !== "—" ? order.city : (rawAddr?.city || "Doha");
  const shippingAddress = {
    line1: rawAddr?.line1 || (order as any).customer?.delivery_address || `${city} Main Street`,
    line2: rawAddr?.line2 || city,
    city: city,
    country: rawAddr?.country || "Qatar",
    lat: order.lat ?? rawAddr?.lat ?? 25.2854,
    lng: order.lng ?? rawAddr?.lng ?? 51.5310,
    building: rawAddr?.building || (order as any).building || "—",
    unit: rawAddr?.unit || (order as any).unit || "—",
    zone: rawAddr?.zone || order.zone || (order as any).customer?.zone || "—",
    street: rawAddr?.street || (order as any).street || "—",
  };

  // 4. Returns
  const isOrderFullyCancelled = isOrderCancelled(order);
  const cancelledFromItems = isOrderFullyCancelled ? [] : itemsList.filter(isItemCancelledOrReturned);
  const returnsList: OrderReturn[] =
    isOrderFullyCancelled
      ? []
      : order.returnItems && order.returnItems.length > 0
        ? order.returnItems
        : baseOrder?.returnItems && baseOrder.returnItems.length > 0
          ? baseOrder.returnItems
          : order.returns
            ? [
                {
                  id: `ret-${rawId}-1`,
                  itemName: itemsList[0]?.name || "Returned Item",
                  type: "return",
                  qty: order.returns.count || 1,
                  status: "pending",
                  source: "Shopify",
                },
              ]
            : cancelledFromItems.length > 0
              ? cancelledFromItems.map((ci, idx) => ({
                  id: `ret-${rawId}-${idx + 1}`,
                  itemName: ci.name || "Returned Item",
                  type: "return" as const,
                  qty: ci.qty || 1,
                  status: "pending" as const,
                  source: "Shopify",
                }))
              : [];

  // 5. Timeline
  const timeline: OrderTimelineEvent[] =
    order.timeline && order.timeline.length > 0
      ? order.timeline
      : buildTimelineFor(order, itemsList);

  return {
    ...order,
    total: calculatedTotal,
    zone: order.zone || order.city || "No Zone",
    customer: {
      name:
        (order.customer?.name &&
        order.customer.name !== "Unknown Customer" &&
        order.customer.name !== "Unknown" &&
        order.customer.name !== "Customer"
          ? order.customer.name
          : null) ||
        order.customer_name ||
        (order as any).customerName ||
        (order as any).rawOrder?.customer_name ||
        (order as any).rawOrder?.customerName ||
        (order as any).rawOrder?.customer?.name ||
        (order as any).rawOrder?.customer?.customer_name ||
        (typeof (order as any).rawOrder?.customer === "string" ? (order as any).rawOrder.customer : null) ||
        (order as any).shippingAddress?.name ||
        (order as any).recipient_name ||
        order.customer?.name ||
        "Customer",
      email:
        order.customer?.email ||
        order.customer_email ||
        (order as any).rawOrder?.customer_email ||
        (order as any).rawOrder?.email ||
        "",
      phone:
        order.customer?.phone ||
        order.customer_phone ||
        (order as any).rawOrder?.customer_phone ||
        (order as any).rawOrder?.phone ||
        "—",
    },
    itemsList,
    returnsList,
    returns: isOrderFullyCancelled
      ? undefined
      : returnsList.length > 0
        ? { type: "Return" as const, count: returnsList.length }
        : order.returns,
    returnItems: isOrderFullyCancelled ? [] : returnsList,
    hasCancelledItems: !isOrderFullyCancelled && returnsList.length > 0,
    cancelledItemsCount: isOrderFullyCancelled ? 0 : returnsList.length,
    timeline,
    payment,
    notes: order.notes || baseOrder?.notes || "",
    shippingAddress,
    matrix: [
      {
        fc: "F01",
        fcName: "Fulfillment Center Hilal",
        items: itemsList.map((item) => ({
          sku: item.sku,
          req: item.qty,
          available: item.fc === "F01" ? item.qty : 0,
        })),
      },
      {
        fc: "MWO",
        fcName: "Main Warehouse Outdoor",
        items: itemsList.map((item) => ({
          sku: item.sku,
          req: item.qty,
          available: item.fc === "MWO" ? item.qty : 0,
        })),
      },
      {
        fc: "VS",
        fcName: "Virtual Stock",
        items: itemsList.map((item) => ({
          sku: item.sku,
          req: item.qty,
          available: item.fc === "VS" ? item.qty : 0,
        })),
      },
    ],
  };
}

/** Mock enriched order for the details page */
export function getEnrichedOrder(id: string, fallbackOrder?: Order): EnrichedOrder | undefined {
  if (fallbackOrder) {
    return toEnrichedOrder(fallbackOrder);
  }
  if (isDemoMode() || id === "HM-REF-1001") {
    const baseOrder = MOCK_ORDERS.find((o) => o.id === id);
    if (baseOrder) {
      return toEnrichedOrder(baseOrder);
    }
    if (typeof window !== "undefined") {
      try {
        const shared = localStorage.getItem("hm_shared_orders");
        if (shared) {
          const parsed: Order[] = JSON.parse(shared);
          const found = parsed.find((o) => o.id === id);
          if (found) return toEnrichedOrder(found);
        }
      } catch {}
    }
  }

  if (!isDemoMode()) {
    return undefined;
  }

  // Graceful fallback order only in demo mode
  const fallback: Order = {
    id,
    shopifyOrderId: id,
    orderNumber: id,
    customerId: `cust-${id}`,
    channel: "web",
    coordinator: "Operations",
    driver: null,
    picker: null,
    packer: null,
    shopify: "Unfulfilled",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    customer: { name: `Customer #${id}`, email: "", phone: "—" },
    status: "New",
    items: 1,
    total: 0,
    city: "Doha",
    tat: "12h left",
    flags: [],
    returns: { type: "Return", count: 0 },
  };
  return toEnrichedOrder(fallback);
}

export type SegmentId = "all" | "active" | "delivered" | "issues";

export type IssueSubFilter = "Delivery Failed" | "Returns" | "Cancelled" | null;

export const ACTIVE_STATUSES: OrderStatus[] = [
  "New",
  "Unfulfilled",
  "Picked",
  "Ready to Assign",
  "Driver Accepted",
  "Started",
];

/**
 * Single reference order kept for structure & type reference until production.
 * All fake mock orders removed in favor of live dynamic server data.
 */
export const MOCK_ORDERS: Order[] = [
  {
    id: "HM-REF-1001",
    orderNumber: "1001",
    customerId: "cust-ref-001",
    tat: "00h 15m",
    date: "2026-10-18",
    time: "10:00",
    customer: { name: "Sample Reference Order", email: "sample@halamama.com", phone: "55000000" },
    channel: "shopify",
    items: 1,
    status: "New",
    city: "Doha",
    coordinator: "-",
    driver: null,
    picker: null,
    packer: null,
    total: 100,
    shopify: "Unfulfilled",
    pickingStatus: "0/1 Picked",
    packingStatus: "0/1 Packed",
    bags: 0,
    isExpress: false,
    shippingMethod: "Standard Delivery",
    tags: [],
    lat: 25.2854,
    lng: 51.5310,
    payment: {
      subtotal: 100,
      discount: 0,
      shipping: 0,
      shippingMethod: "Standard Delivery",
      total: 100,
      balance: 100,
      method: "Cash on Delivery",
      totalPaid: 0,
      cash: 0,
      card: 0,
    },
  },
];

export function isUnpaidPayLaterOrder(order: {
  tags?: string[];
  payment?: { balance: number };
}): boolean {
  const hasTag = order.tags?.some((t) => t.toUpperCase() === "PAYLATER") ?? false;
  const isPending = (order.payment?.balance ?? 0) > 0;
  return hasTag && isPending;
}

export const ORDER_STATS = [
  {
    label: "Picking",
    value: "0",
    icon: Package,
    tone: "violet" as const,
  },
  {
    label: "Packing",
    value: "0",
    icon: PackageCheck,
    tone: "primary" as const,
  },
  {
    label: "Delivered",
    value: "0",
    icon: Truck,
    tone: "primary" as const,
  },
  {
    label: "Revenue",
    value: "QAR 0",
    icon: Wallet,
    tone: "success" as const,
  },
];

export const statusIcon: Record<OrderStatus, LucideIcon> = {
  New: Sparkles,
  Unfulfilled: Clock3,
  Picking: PackageCheck,
  Picked: PackageCheck,
  Packing: Package,
  "Ready to Assign": Truck,
  "Driver Accepted": Truck,
  Started: RefreshCw,
  Delivered: CheckCircle2,
  "Delivery Failed": XCircle,
  Flagged: Flag,
  Cancelled: XCircle,
  Replacement: ArrowLeftRight,
  Exchange: RotateCcw,
  Installation: Clock3,
  PayLater: Clock3,
};

/** Tailwind classes for the status indicator dot */
export function statusDotClass(status: OrderStatus): string {
  switch (status) {
    case "Delivered":
      return "bg-emerald-500";
    case "Delivery Failed":
    case "Cancelled":
      return "bg-destructive";
    case "New":
      return "bg-sky-500";
    case "Unfulfilled":
      return "bg-muted-foreground";
    case "Picking":
      return "bg-fuchsia-500";
    case "Picked":
      return "bg-violet-500";
    case "Packing":
      return "bg-indigo-500";
    case "Ready to Assign":
      return "bg-amber-500";
    case "Driver Accepted":
      return "bg-blue-500";
    case "Started":
      return "bg-orange-500";
    case "Flagged":
      return "bg-rose-500";
    case "Replacement":
      return "bg-indigo-500";
    case "Exchange":
      return "bg-teal-500";
    case "Installation":
      return "bg-emerald-500";
    case "PayLater":
      return "bg-purple-500";
    default:
      return "bg-muted-foreground";
  }
}

export function matchesSearch(order: Order, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const cleanQ = q.replace(/^#/, "");
  
  const orderNumber = order.orderNumber ? order.orderNumber.toString().toLowerCase() : "";
  const orderId = order.id ? order.id.toString().toLowerCase() : "";
  const cleanOrderNumber = orderNumber.replace(/^#/, "");
  const cleanOrderId = orderId.replace(/^#/, "");

  if (
    orderId === q ||
    cleanOrderId === q ||
    cleanOrderId === cleanQ ||
    orderNumber === q ||
    cleanOrderNumber === q ||
    cleanOrderNumber === cleanQ ||
    orderId.includes(q) ||
    orderNumber.includes(q) ||
    (cleanQ.length > 0 && (cleanOrderId.includes(cleanQ) || cleanOrderNumber.includes(cleanQ)))
  ) {
    return true;
  }

  const blob = [
    order.id,
    order.orderNumber,
    order.shopifyOrderId,
    order.customerId,
    order.customer?.name,
    order.customer?.email,
    order.customer?.phone,
    order.city,
    order.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return blob.includes(q) || (cleanQ.length > 0 && blob.includes(cleanQ));
}

export function getOrderPrimaryTab(order: Order): LegacyTabId {
  if (isUnpaidPayLaterOrder(order)) return "PayLater";
  if (order.status === "Cancelled" || order.status === "Delivery Failed") return "Cancelled";
  if (order.status === "Delivered") return "Delivered";

  const raw = (
    (order as any).backend_status ||
    (order as any).rawStatus ||
    (order as any).rawOrder?.status ||
    (order as any).rawOrder?.order_status ||
    ""
  ).toString().toLowerCase().trim().replace(/[\s_-]+/g, "_");

  if (raw === "assigned_to_driver" || raw === "partial_assigned_driver") {
    return "In Delivery";
  }
  if (
    raw === "ready_to_assign" ||
    raw === "readytoassign" ||
    raw === "to_deliver" ||
    raw === "packed" ||
    order.status === "Ready to Assign"
  ) {
    return "Ready to Assign";
  }
  if (order.status === "Driver Accepted" || order.status === "Started") {
    return "In Delivery";
  }
  if (order.status === "Packing") return "Packing";
  if (order.status === "Picked") return "Picked";
  if (order.status === "Picking") return "Picking";
  if (isExpressOrder(order) && (order.status === "New" || order.status === "Unfulfilled")) return "Express";
  if (matchesLegacyTab(order, "Installation")) return "Installation";
  if (order.status === "New" || order.status === "Unfulfilled") return "New";
  if (order.status === "Flagged") return "Flags & Exceptions";
  return "All";
}

export interface CustomerStageSummary {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  totalOrders: number;
  stages: Array<{
    tab: LegacyTabId;
    label: string;
    count: number;
    color: string;
    activeColor: string;
  }>;
}

export function getCustomerOrdersBreakdown(orders: Order[], customerKey: string): CustomerStageSummary | null {
  if (!customerKey || !customerKey.trim()) return null;
  const key = customerKey.trim().toLowerCase();
  
  const customerOrders = orders.filter((o) => {
    const cName = o.customer?.name?.toLowerCase() || "";
    const cId = o.customerId?.toLowerCase() || "";
    const cEmail = o.customer?.email?.toLowerCase() || "";
    const cPhone = o.customer?.phone?.replace(/\D/g, "") || "";
    const cleanKeyDigits = key.replace(/\D/g, "");
    
    return (
      cName === key ||
      cName.includes(key) ||
      cId === key ||
      cEmail === key ||
      (cleanKeyDigits.length >= 4 && cPhone.includes(cleanKeyDigits))
    );
  });

  if (customerOrders.length === 0) return null;

  const firstOrder = customerOrders[0];
  const primaryName = firstOrder.customer?.name || "Customer";
  const primaryPhone = customerOrders.find(o => o.customer?.phone)?.customer?.phone;
  const primaryEmail = customerOrders.find(o => o.customer?.email)?.customer?.email;

  const stageOrder: LegacyTabId[] = [
    "New",
    "Express",
    "Picking",
    "Picked",
    "Packing",
    "Ready to Assign",
    "In Delivery",
    "Delivered",
    "Installation",
    "Cancelled",
    "Flags & Exceptions",
    "PayLater",
  ];

  const stages: Array<{
    tab: LegacyTabId;
    label: string;
    count: number;
    color: string;
    activeColor: string;
  }> = [];

  for (const tabId of stageOrder) {
    const matchingTab = LEGACY_TABS.find(t => t.id === tabId);
    if (!matchingTab) continue;
    const count = customerOrders.filter(o => matchesLegacyTab(o, tabId)).length;
    if (count > 0) {
      stages.push({
        tab: tabId,
        label: matchingTab.label,
        count,
        color: matchingTab.color,
        activeColor: matchingTab.activeColor,
      });
    }
  }

  return {
    customerName: primaryName,
    customerPhone: primaryPhone,
    customerEmail: primaryEmail,
    totalOrders: customerOrders.length,
    stages,
  };
}

/**
 * Checks whether an order is an express delivery order.
 * Inspects explicit flags, shipping method titles, delivery type, tags, and shipping lines.
 */
export function isExpressOrder(order: any): boolean {
  if (!order) return false;

  if (
    order.isExpress === true ||
    order.is_express === true ||
    order.is_express === 1 ||
    order.is_express === "1" ||
    order.is_express === "true" ||
    order.express === true ||
    order.express === 1 ||
    order.express === "1" ||
    order.express === "true"
  ) {
    return true;
  }

  const shippingMethod = (
    order.shippingMethod ||
    order.shipping_method ||
    order.shipping_title ||
    order.payment?.shippingMethod ||
    order.delivery_method ||
    order.deliveryMethod ||
    order.delivery_type ||
    order.deliveryType ||
    order.order_type ||
    ""
  ).toString().toLowerCase();

  if (shippingMethod.includes("express")) {
    return true;
  }

  if (Array.isArray(order.shipping_lines)) {
    const hasExpressShippingLine = order.shipping_lines.some((line: any) => {
      const title = (line?.title || line?.code || "").toString().toLowerCase();
      return title.includes("express");
    });
    if (hasExpressShippingLine) return true;
  }

  if (Array.isArray(order.tags)) {
    if (order.tags.some((t: any) => typeof t === "string" && t.toLowerCase().includes("express"))) {
      return true;
    }
  } else if (typeof order.tags === "string" && order.tags.toLowerCase().includes("express")) {
    return true;
  }

  if (typeof order.custom_tags === "string" && order.custom_tags.toLowerCase().includes("express")) {
    return true;
  }

  if (
    typeof order.payment?.shippingMethod === "string" &&
    order.payment.shippingMethod.toLowerCase().includes("express")
  ) {
    return true;
  }

  return false;
}

export function orderHasInstallation(order: Order): boolean {
  if (!order) return false;
  return Boolean(
    order.status === "Installation" ||
    Boolean(order.hasInstallation) ||
    (typeof order.installationItemsCount === "number" && order.installationItemsCount > 0) ||
    Boolean((order as any).summary?.has_installation) ||
    Boolean((order as any).summary?.installation_items > 0) ||
    order.itemsList?.some(
      (i) =>
        Boolean(i.is_installable) ||
        Boolean(i.isInstallable) ||
        Boolean((i as any).custom_is_installable) ||
        Boolean((i as any).requires_installation) ||
        Boolean(i.installation) ||
        Boolean(i.installation_type) ||
        i.itemType === "MWH" ||
        i.itemType === "VL_SUPPLIER",
    )
  );
}

export function orderHasVirtualStock(order: Order): boolean {
  if (!order) return false;
  return Boolean(
    Boolean(order.all_items_vs) ||
    Boolean((order as any).summary?.all_items_vs) ||
    Boolean((order as any).summary?.vs_items_count > 0) ||
    Boolean((order as any).vs_items_count > 0) ||
    Boolean((order as any).has_vs) ||
    Boolean((order as any).is_vs) ||
    order.itemsList?.some(
      (i) =>
        Boolean((i as any).is_vs) ||
        i.fc === "VS" ||
        (i.fcName && i.fcName.toLowerCase().includes("virtual stock")) ||
        (Array.isArray(i.product_tags) && i.product_tags.some((t) => String(t).trim().toUpperCase() === "VS")) ||
        (typeof i.product_tags === "string" && i.product_tags.split(",").some((t) => t.trim().toUpperCase() === "VS")) ||
        String((i as any).product_tag || "").split(",").some((t) => t.trim().toUpperCase() === "VS")
    )
  );
}

export function isItemCancelledOrReturned(item: any): boolean {
  if (!item) return false;
  if (item.is_cancelled === true || item.isCancelled === true || item.cancelled === true) return true;
  if (item.is_return === true || item.isReturn === true) return true;
  const s = String(item.status || item.custom_status || item.raw_status || "").toLowerCase().trim();
  if (s === "cancelled" || s === "canceled" || s === "return" || s === "returned" || s === "delivery_failed") {
    return true;
  }
  return false;
}

export function isItemAddedNew(item: any, order?: Order): boolean {
  if (!item) return false;
  if (isItemCancelledOrReturned(item)) return false;

  const normStatus = String(item.status || "").toLowerCase().trim();
  const rawStatus = String(item.raw_status || item.custom_status || "").toLowerCase().trim();

  if (
    item.is_new === true ||
    item.isNew === true ||
    item.is_added === true ||
    item.isAdded === true ||
    item.added === true ||
    item.is_replacement === true ||
    item.isReplacement === true ||
    item.is_exchange === true ||
    item.isExchange === true ||
    normStatus === "added new" ||
    normStatus === "new item" ||
    normStatus === "added" ||
    rawStatus === "added"
  ) {
    return true;
  }

  const tagsStr = Array.isArray(item.product_tags)
    ? item.product_tags.join(" ")
    : String(item.product_tags || "");
  if (
    tagsStr.toLowerCase().includes("new_item") ||
    tagsStr.toLowerCase().includes("added") ||
    tagsStr.toLowerCase().includes("replacement") ||
    tagsStr.toLowerCase().includes("exchange")
  ) {
    return true;
  }

  // If order is active/advanced and has cancelled items (like order 1080),
  // any newly pending or new item is the newly added replacement
  if (order && !isOrderCancelled(order) && (order.hasCancelledItems || (order.returns && order.returns.count > 0))) {
    if (normStatus === "new" || rawStatus === "new") {
      return true;
    }
  }

  return false;
}

export function getOrderCancelledItemsCount(order: Order): number {
  if (!order) return 0;
  let count = 0;
  if (Array.isArray(order.itemsList) && order.itemsList.length > 0) {
    count = order.itemsList.filter(isItemCancelledOrReturned).length;
  } else if (Array.isArray(order.line_items) && order.line_items.length > 0) {
    count = order.line_items.filter(isItemCancelledOrReturned).length;
  } else if (Array.isArray((order as any).items) && (order as any).items.length > 0) {
    count = (order as any).items.filter(isItemCancelledOrReturned).length;
  } else if (Array.isArray(order.rawOrder?.items)) {
    count = order.rawOrder.items.filter(isItemCancelledOrReturned).length;
  } else if (Array.isArray(order.rawOrder?.line_items)) {
    count = order.rawOrder.line_items.filter(isItemCancelledOrReturned).length;
  }
  if (count > 0) return count;
  if (typeof order.cancelledItemsCount === "number" && order.cancelledItemsCount > 0) return order.cancelledItemsCount;
  if (order.returnItems && order.returnItems.length > 0) return order.returnItems.length;
  if (order.returns?.count && order.returns.count > 0) return order.returns.count;
  if (typeof (order as any).custom_return_count === "number" && (order as any).custom_return_count > 0) return (order as any).custom_return_count;
  if (typeof (order as any).cancelled_items_count === "number" && (order as any).cancelled_items_count > 0) return (order as any).cancelled_items_count;
  return 0;
}

export function isOrderCancelled(order: Order): boolean {
  if (!order) return false;
  const s = String(
    order.status ||
    (order as any).backend_status ||
    (order as any).rawStatus ||
    (order as any).rawOrder?.status ||
    (order as any).rawOrder?.order_status ||
    ""
  ).toLowerCase().trim();
  return (
    s === "cancelled" ||
    s === "canceled" ||
    s === "cancelled delivery" ||
    s === "cancelled_delivery" ||
    s === "delivery failed" ||
    s === "delivery_failed" ||
    Boolean((order as any).cancelled_at) ||
    Boolean((order as any).rawOrder?.cancelled_at)
  );
}

export function orderHasReturnedItems(order: Order): boolean {
  if (!order) return false;
  // If the whole order is cancelled, it is NOT an item return!
  if (isOrderCancelled(order)) return false;

  if (getOrderCancelledItemsCount(order) > 0) return true;
  if (order.hasCancelledItems === true) return true;
  if (order.status === "Replacement" || order.status === "Exchange") return true;
  if (Boolean(order.returns && order.returns.count > 0)) return true;
  if (Array.isArray(order.tags) && order.tags.some(t => {
    const s = String(t).toLowerCase();
    return s === "return" || s === "returns";
  })) return true;
  return false;
}

export function orderHasReplacedItems(order: Order): boolean {
  if (!order) return false;
  if (isOrderCancelled(order)) return false;

  const s = String(
    order.status ||
    (order as any).backend_status ||
    (order as any).rawStatus ||
    ""
  ).toLowerCase().trim();
  if (s === "replacement" || s === "exchange") return true;

  const items = (Array.isArray(order.itemsList) && order.itemsList.length > 0)
    ? order.itemsList
    : (Array.isArray(order.line_items) && order.line_items.length > 0)
      ? order.line_items
      : (Array.isArray((order as any).items) && (order as any).items.length > 0)
        ? (order as any).items
        : Array.isArray(order.rawOrder?.items)
          ? order.rawOrder.items
          : Array.isArray(order.rawOrder?.line_items)
            ? order.rawOrder.line_items
            : [];

  if (items.some((i: any) => isItemAddedNew(i, order))) {
    return true;
  }

  if (
    Array.isArray(order.tags) &&
    order.tags.some((t: any) => {
      const ts = String(t).toLowerCase();
      return ts.includes("replacement") || ts.includes("exchange");
    })
  ) {
    return true;
  }

  return false;
}

export function isOrderReturnAndReplacement(order: Order): boolean {
  if (!order) return false;
  if (isOrderCancelled(order)) return false;
  return orderHasReturnedItems(order) && orderHasReplacedItems(order);
}

export function orderHasReturnedOrCancelledItems(order: Order): boolean {
  return orderHasReturnedItems(order);
}

export function matchesLegacyTab(order: Order, tab: LegacyTabId): boolean {
  const isPayLater = isUnpaidPayLaterOrder(order);
  if (isPayLater) {
    return tab === "PayLater";
  } else {
    if (tab === "PayLater") return false;
  }

  const raw = (
    (order as any).backend_status ||
    (order as any).rawStatus ||
    (order as any).rawOrder?.status ||
    (order as any).rawOrder?.order_status ||
    ""
  ).toString().toLowerCase().trim().replace(/[\s_-]+/g, "_");

  if (tab === "All") return true;

  if (tab === "New") {
    if (raw) {
      return raw === "new" || raw === "unfulfilled" || raw === "pending" || raw === "draft";
    }
    return order.status === "New" || order.status === "Unfulfilled";
  }

  if (tab === "Express") {
    return (
      (order.status as string) === "Express" ||
      (isExpressOrder(order) && (order.status === "New" || order.status === "Unfulfilled"))
    );
  }

  if (tab === "Unfulfilled") {
    return order.status !== "Delivered" && order.status !== "Cancelled";
  }

  if (tab === "Picking") {
    if (raw) {
      return raw === "picking";
    }
    const s = String(order.status || "").toLowerCase();
    if (
      s === "delivered" ||
      s === "started" ||
      s === "driver accepted" ||
      s === "in delivery" ||
      s === "cancelled" ||
      s === "delivery failed" ||
      s === "packing" ||
      s === "packed" ||
      s === "ready to assign" ||
      s === "picked"
    ) {
      return false;
    }
    return order.status === "Picking";
  }

  if (tab === "Picked") {
    if (raw) {
      return raw === "picked";
    }
    return order.status === "Picked";
  }

  if (tab === "Packing") {
    if (raw) {
      return raw === "packing";
    }
    const s = String(order.status || "").toLowerCase();
    if (
      s === "delivered" ||
      s === "started" ||
      s === "driver accepted" ||
      s === "in delivery" ||
      s === "cancelled" ||
      s === "delivery failed" ||
      s === "ready to assign"
    ) {
      return false;
    }
    return order.status === "Packing";
  }

  if (tab === "Ready to Assign") {
    if (raw) {
      return (
        raw === "ready_to_assign" ||
        raw === "readytoassign" ||
        raw === "to_deliver" ||
        raw === "packed"
      );
    }
    const s = String(order.status || "").toLowerCase();
    if (
      s === "delivered" ||
      s === "started" ||
      s === "driver accepted" ||
      s === "in delivery" ||
      s === "cancelled" ||
      s === "delivery failed"
    ) {
      return false;
    }
    return order.status === "Ready to Assign";
  }

  if (tab === "In Delivery") {
    // In Delivery strictly shows only 2 statuses: 'partial_assigned_driver', 'assigned_to_driver'
    if (raw) {
      return raw === "assigned_to_driver" || raw === "partial_assigned_driver";
    }
    return order.status === "Driver Accepted" || order.status === "Started";
  }

  if (tab === "Delivered") {
    if (raw) {
      return raw === "delivered" || raw === "completed" || raw === "to_bill";
    }
    return order.status === "Delivered";
  }

  if (tab === "Cancelled") {
    if (raw) {
      return (
        raw === "cancelled" ||
        raw === "canceled" ||
        raw === "cancelled_delivery" ||
        raw === "delivery_cancelled"
      );
    }
    return order.status === "Cancelled" || order.status === "Delivery Failed";
  }

  if (tab === "Delivery Failed") {
    if (raw) {
      return raw === "delivery_failed" || raw === "failed";
    }
    return order.status === "Delivery Failed";
  }
  if (tab === "Installation") {
    return orderHasInstallation(order);
  }
  if (tab === "Returns & Replacements")
    return (
      Boolean(order.returns) ||
      orderHasReturnedItems(order) ||
      isOrderReturnAndReplacement(order) ||
      order.status === "Replacement" ||
      order.status === "Exchange"
    );
  if (tab === "Flags & Exceptions") {
    return order.status === "Flagged" || order.status === "Delivery Failed";
  }
  if (tab === "Replacement") return order.status === "Replacement" || isOrderReturnAndReplacement(order);
  if (tab === "Exchange") return order.status === "Exchange";
  return order.status === tab;
}

export function countForLegacyTab(orders: Order[], tab: LegacyTabId): number {
  return orders.filter((o) => matchesLegacyTab(o, tab)).length;
}

export function matchesSegment(
  order: Order,
  segment: SegmentId,
  activeSub: OrderStatus | null,
  issueSub: IssueSubFilter,
): boolean {
  if (segment === "all") return true;
  if (segment === "delivered") return order.status === "Delivered";
  if (segment === "active") {
    if (!activeSub) return ACTIVE_STATUSES.includes(order.status);
    return order.status === activeSub;
  }
  if (segment === "issues") {
    if (issueSub === "Returns") return Boolean(order.returns);
    if (issueSub === "Cancelled") return order.status === "Cancelled";
    if (issueSub === "Delivery Failed") return order.status === "Delivery Failed";
    return (
      order.status === "Delivery Failed" || order.status === "Cancelled" || Boolean(order.returns)
    );
  }
  return true;
}

export function countOrdersForSegment(orders: Order[], segment: SegmentId): number {
  return orders.filter((o) => matchesSegment(o, segment, null, null)).length;
}

export function countActiveSub(orders: Order[], status: OrderStatus): number {
  return orders.filter((o) => ACTIVE_STATUSES.includes(o.status) && o.status === status).length;
}

export function countIssueSub(orders: Order[], sub: Exclude<IssueSubFilter, null>): number {
  if (sub === "Returns") return orders.filter((o) => Boolean(o.returns)).length;
  if (sub === "Cancelled") return orders.filter((o) => o.status === "Cancelled").length;
  return orders.filter((o) => o.status === "Delivery Failed").length;
}

/** Parse TAT string to hours for color coding */
export function parseTatHours(tat: string): number {
  const hMatch = tat.match(/(\d+)h/);
  const mMatch = tat.match(/(\d+)m/);
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hours + minutes / 60;
}

/** Get TAT color class based on hours elapsed */
export function tatColorClass(tat: string): string {
  const hours = parseTatHours(tat);
  if (hours <= 2) return "text-emerald-600 dark:text-emerald-400";
  if (hours <= 12) return "text-amber-600 dark:text-amber-400";
  if (hours <= 24) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export type OrderSlaStatus = "on_track" | "at_risk" | "breached";

/** Calculate order elapsed minutes based on TAT string */
export function getOrderElapsedMinutes(order: Order): number {
  if (order.tat) {
    return Math.round(parseTatHours(order.tat) * 60);
  }
  return 0;
}

/** Compute 4-hour SLA status and remaining time for an order */
export function getOrderSlaStatus(order: Order): {
  status: OrderSlaStatus;
  elapsedMinutes: number;
  remainingMinutes: number;
  label: string;
} {
  if (order.status === "Delivered") {
    return { status: "on_track", elapsedMinutes: 0, remainingMinutes: 240, label: "SLA Met" };
  }
  const elapsedMinutes = getOrderElapsedMinutes(order);
  const targetMinutes = 240; // 4 hours continuous SLA
  const remainingMinutes = targetMinutes - elapsedMinutes;

  if (elapsedMinutes > targetMinutes || order.status === "Delivery Failed") {
    return { status: "breached", elapsedMinutes, remainingMinutes, label: "SLA Breached" };
  }
  if (remainingMinutes <= 60) {
    return { status: "at_risk", elapsedMinutes, remainingMinutes, label: "At Risk" };
  }
  return { status: "on_track", elapsedMinutes, remainingMinutes, label: "On Track" };
}

/** Calculate unified item count across Order lists and Order Details */
export function getOrderItemsCount(order: {
  itemsList?: OrderItemType[];
  items?: number;
  line_items?: { quantity?: number; qty?: number }[];
}): number {
  if (!order) return 0;

  // Accept Shopify-style or dynamic API `line_items` payloads (quantity or qty)
  if (order.line_items && Array.isArray(order.line_items) && order.line_items.length > 0) {
    return order.line_items.reduce((sum, li) => sum + (li.quantity ?? li.qty ?? 1), 0);
  }

  // Prefer the normalized `itemsList` when available
  if (order.itemsList && Array.isArray(order.itemsList) && order.itemsList.length > 0) {
    return order.itemsList.reduce((sum, item) => sum + (item.qty ?? 1), 0);
  }

  // Fallback to the simple items count
  return order.items || 0;
}

export function getDeliveryDate(order: { date: string; deliveryDate?: string }): string {
  if (order.deliveryDate) return order.deliveryDate;
  try {
    const currentYear = new Date().getFullYear();
    const dateObj = new Date(`${order.date}, ${currentYear}`);
    if (!isNaN(dateObj.getTime())) {
      dateObj.setDate(dateObj.getDate() + 1);
      return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  } catch (e) {
    // ignore
  }
  return order.date;
}

/** All mock orders for this customer (newest-first by order id). */
export function getOrdersForCustomerId(customerId: string): Order[] {
  if (!isDemoMode()) return [];
  return MOCK_ORDERS.filter((o) => o.customerId === customerId).sort((a, b) =>
    a.id < b.id ? 1 : a.id > b.id ? -1 : 0,
  );
}

/** First / primary order row for this customer id (profile anchor). */
export function getCustomerById(customerId: string): Order | undefined {
  const list = getOrdersForCustomerId(customerId);
  return list[0];
}

/** Format the delivery address for an order into a clean single string */
export function formatOrderAddress(order?: Order | null): string {
  if (!order) return "—";
  if ((order as any).shippingAddress) {
    const parts = [
      (order as any).shippingAddress.line1,
      (order as any).shippingAddress.line2,
      (order as any).shippingAddress.city,
      (order as any).shippingAddress.country,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }
  if ((order as any).delivery_address) return (order as any).delivery_address;
  if ((order as any).customer?.delivery_address) return (order as any).customer.delivery_address;
  if (order.city && order.city !== "—") return `${order.city}, Qatar`;
  return "Doha, Qatar";
}
