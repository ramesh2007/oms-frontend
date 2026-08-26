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
  status: "Prepared" | "Accepted" | "Allocated" | "Pending";
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
    | "bypassed";
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
  const itemNames = items?.map((i) => i.name) ?? [
    "Frida Baby NoseFrida Saline Snot Spray",
    ...(base.items > 1 ? ["SmarTrike STR3 6-in-1 Stroller-Trike (Black)"] : []),
  ];
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

/** Get mock order items list dynamically based on order ID and item count. */
export function getMockOrderItems(id: string, totalItems: number): OrderItemType[] {
  let itemsList: OrderItemType[] = [];

  if (id === "HM99005") {
    itemsList = [
      {
        id: "test-item-1",
        name: "Happy Hop 6-in-1 Play Center",
        sku: "9060",
        barcode: "90600000001",
        image: "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=100&h=100&fit=crop",
        qty: 1,
        price: 1999.0,
        fc: "F01",
        fcName: "Fulfillment Center Hilal",
        bin: "B-100 / 1",
        status: "Prepared",
        itemType: "FC",
      },
      {
        id: "test-item-2",
        name: "Bestway Apx 365 Round Pool Set (12' x 30\")",
        sku: "561KC",
        barcode: "56100000002",
        image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=100&h=100&fit=crop",
        qty: 1,
        price: 799.0,
        fc: "MWO",
        fcName: "Main Warehouse Outdoor",
        bin: "B-100 / 2",
        status: "Prepared",
        itemType: "MWH",
      },
      {
        id: "test-item-3",
        name: "Smoby Green XL Slide",
        sku: "820304",
        barcode: "82030400003",
        image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=100&h=100&fit=crop",
        qty: 1,
        price: 399.0,
        fc: "VS",
        fcName: "Virtual Stock",
        bin: "B-100 / 3",
        status: "Prepared",
        itemType: "VL_SUPPLIER",
      },
    ];
  } else if (id === "HM68229") {
    itemsList = [
      {
        id: "si-item-1",
        name: "Happy Hop 6-in-1 Play Center",
        sku: "9060",
        barcode: "90600000001",
        image: "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=100&h=100&fit=crop",
        qty: 1,
        price: 1999.0,
        fc: "F01",
        fcName: "Fulfillment Center Hilal",
        bin: "B-100 / 1",
        status: "Prepared",
        itemType: "FC",
      },
      {
        id: "si-item-2",
        name: "Bestway Apx 365 Round Pool Set (12' x 30\")",
        sku: "561KC",
        barcode: "56100000002",
        image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=100&h=100&fit=crop",
        qty: 1,
        price: 799.0,
        fc: "MWO",
        fcName: "Main Warehouse Outdoor",
        bin: "B-100 / 2",
        status: "Prepared",
        itemType: "MWH",
      },
      {
        id: "si-item-3",
        name: "Smoby Green XL Slide",
        sku: "820304",
        barcode: "82030400003",
        image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=100&h=100&fit=crop",
        qty: 1,
        price: 399.0,
        fc: "VS",
        fcName: "Virtual Stock",
        bin: "B-100 / 3",
        status: "Prepared",
        itemType: "VL_SUPPLIER",
      },
      {
        id: "si-item-4",
        name: "Happy Hop Double Water Slide – Deluxe",
        sku: "9029",
        barcode: "90290000004",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&h=100&fit=crop",
        qty: 1,
        price: 1499.0,
        fc: "F01",
        fcName: "Fulfillment Center Hilal",
        bin: "B-100 / 4",
        status: "Prepared",
      },
    ];
  } else if (id === "HM68258") {
    itemsList = [
      {
        id: "si-item-5",
        name: "Bestway H2Ogo! Leap & Play Mega Water Park",
        sku: "53427",
        barcode: "53427000005",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&h=100&fit=crop",
        qty: 1,
        price: 1299.0,
        fc: "F01",
        fcName: "Fulfillment Center Hilal",
        bin: "B-101 / 1",
        status: "Prepared",
      },
      {
        id: "si-item-6",
        name: "Bestway Flowclear Pool Cover (12ft)",
        sku: "58034",
        barcode: "58034000006",
        image: "https://images.unsplash.com/photo-1560090995-01b72abb4c06?w=100&h=100&fit=crop",
        qty: 1,
        price: 149.0,
        fc: "VS",
        fcName: "Virtual Stock",
        bin: "B-101 / 2",
        status: "Prepared",
      },
    ];
  } else if (id === "HM68268") {
    itemsList = [
      {
        id: "si-item-7",
        name: "Intex Prism Frame Rectangular Pool Set",
        sku: "26790",
        barcode: "26790000007",
        image: "https://images.unsplash.com/photo-1560090995-01b72abb4c06?w=100&h=100&fit=crop",
        qty: 1,
        price: 899.0,
        fc: "MWO",
        fcName: "Main Warehouse Outdoor",
        bin: "B-102 / 1",
        status: "Prepared",
      },
    ];
  } else if (id === "HM64839") {
    itemsList = [
      {
        id: "si-item-8",
        name: "Nip Soother With Hook (Blue)",
        sku: "412217",
        barcode: "41221700008",
        image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
        qty: 1,
        price: 25.0,
        fc: "F01",
        fcName: "Fulfillment Center Hilal",
        bin: "B-103 / 1",
        status: "Prepared",
      },
    ];
  } else if (id === "HM68300") {
    itemsList = [
      {
        id: "si-item-9",
        name: "HalaMama Premium Wooden Playground Set",
        sku: "HMP-WPS",
        barcode: "HMPWPS0001",
        image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
        qty: 1,
        price: 3499.0,
        fc: "MWO",
        fcName: "Main Warehouse Outdoor",
        bin: "B-300 / 1",
        status: "Prepared",
        itemType: "MWH",
      },
    ];
  } else if (id === "HM64110") {
    itemsList = [
      {
        id: "vl-item-1",
        name: "Mima Xari Stroller (Camel)",
        sku: "MX-STR-CAM",
        barcode: "MXSTRCAM001",
        image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
        qty: 1,
        price: 3999.0,
        fc: "VL_HMA",
        fcName: "Vendor Location 1",
        bin: "V-01",
        status: "Prepared",
        itemType: "VL_HMA",
        locationId: "loc-1",
      },
      {
        id: "vl-item-2",
        name: "Stokke Tripp Trapp High Chair (Oak)",
        sku: "ST-TTHC-OAK",
        barcode: "STTTHCOAK001",
        image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
        qty: 1,
        price: 1199.0,
        fc: "VL_HMA",
        fcName: "Vendor Location 1",
        bin: "V-02",
        status: "Prepared",
        itemType: "VL_HMA",
        locationId: "loc-1",
      },
    ];
  } else if (id === "HM99001") {
    itemsList = [
      {
        id: "vl-item-3",
        name: "Chicco Next2Me Side Sleeping Crib",
        sku: "CC-N2M-CRIB",
        barcode: "CCN2MCRIB01",
        image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
        qty: 1,
        price: 899.0,
        fc: "VL_HMA",
        fcName: "Vendor Location 1",
        bin: "V-03",
        status: "Prepared",
        itemType: "VL_HMA",
        locationId: "loc-1",
      },
      {
        id: "vl-item-4",
        name: "Nuna Leaf Grow Lounger",
        sku: "NL-GROW-LNG",
        barcode: "NLGROWLNG01",
        image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
        qty: 1,
        price: 1299.0,
        fc: "VL_HMA",
        fcName: "Vendor Location 1",
        bin: "V-04",
        status: "Prepared",
        itemType: "VL_HMA",
        locationId: "loc-1",
      },
    ];
  } else {
    const totalItemsCount = totalItems || 1;
    if (totalItemsCount === 1) {
      itemsList = [
        {
          id: "item-1",
          name: "Frida Baby NoseFrida Saline Snot Spray",
          sku: "NS-SPNC-1P-0200",
          barcode: "9350764006338",
          image:
            "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
          qty: 1,
          price: 31.0,
          fc: "F01",
          fcName: "Fulfillment Center Hilal",
          bin: "B-252 / 4",
          status: "Prepared",
        },
      ];
    } else if (totalItemsCount === 2) {
      itemsList = [
        {
          id: "item-1",
          name: "Frida Baby NoseFrida Saline Snot Spray",
          sku: "NS-SPNC-1P-0200",
          barcode: "9350764006338",
          image:
            "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
          qty: 1,
          price: 31.0,
          fc: "F01",
          fcName: "Fulfillment Center Hilal",
          bin: "B-252 / 4",
          status: "Prepared",
        },
        {
          id: "item-3",
          name: "Bestway Apx 365 Round Pool Set (12' x 30\")",
          sku: "561KC",
          barcode: "561KC00001",
          image: "https://images.unsplash.com/photo-1560090995-01b72abb4c06?w=100&h=100&fit=crop",
          qty: 1,
          price: 799.0,
          fc: "MWO",
          fcName: "Main Warehouse Outdoor",
          bin: "B-102 / 2",
          status: "Prepared",
        },
      ];
    } else if (totalItemsCount === 3) {
      itemsList = [
        {
          id: "item-1",
          name: "Frida Baby NoseFrida Saline Snot Spray",
          sku: "NS-SPNC-1P-0200",
          barcode: "9350764006338",
          image:
            "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
          qty: 1,
          price: 31.0,
          fc: "F01",
          fcName: "Fulfillment Center Hilal",
          bin: "B-252 / 4",
          status: "Prepared",
        },
        {
          id: "item-2",
          name: "SmarTrike STR3 6-in-1 Stroller-Trike (Black)",
          sku: "5021933",
          barcode: "9350764006339",
          image:
            "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
          qty: 1,
          price: 599.0,
          fc: "F01",
          fcName: "Fulfillment Center Hilal",
          bin: "B-100 / 1",
          status: "Allocated",
        },
        {
          id: "item-3",
          name: "Bestway Apx 365 Round Pool Set (12' x 30\")",
          sku: "561KC",
          barcode: "561KC00001",
          image: "https://images.unsplash.com/photo-1560090995-01b72abb4c06?w=100&h=100&fit=crop",
          qty: 1,
          price: 799.0,
          fc: "MWO",
          fcName: "Main Warehouse Outdoor",
          bin: "B-102 / 2",
          status: "Prepared",
        },
      ];
    } else {
      itemsList = [
        {
          id: "item-1",
          name: "Frida Baby NoseFrida Saline Snot Spray",
          sku: "NS-SPNC-1P-0200",
          barcode: "9350764006338",
          image:
            "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
          qty: 1,
          price: 31.0,
          fc: "F01",
          fcName: "Fulfillment Center Hilal",
          bin: "B-252 / 4",
          status: "Prepared",
        },
        {
          id: "item-2",
          name: "SmarTrike STR3 6-in-1 Stroller-Trike (Black)",
          sku: "5021933",
          barcode: "9350764006339",
          image:
            "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
          qty: 1,
          price: 599.0,
          fc: "F01",
          fcName: "Fulfillment Center Hilal",
          bin: "B-100 / 1",
          status: "Allocated",
        },
        {
          id: "item-3",
          name: "Bestway Apx 365 Round Pool Set (12' x 30\")",
          sku: "561KC",
          barcode: "561KC00001",
          image: "https://images.unsplash.com/photo-1560090995-01b72abb4c06?w=100&h=100&fit=crop",
          qty: 1,
          price: 799.0,
          fc: "MWO",
          fcName: "Main Warehouse Outdoor",
          bin: "B-102 / 2",
          status: "Prepared",
        },
        {
          id: "item-4",
          name: "Smoby Green XL Slide",
          sku: "820304",
          barcode: "82030400001",
          image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&h=100&fit=crop",
          qty: totalItemsCount - 3,
          price: 399.0,
          fc: "VS",
          fcName: "Virtual Stock",
          bin: "B-103 / 1",
          status: "Prepared",
        },
      ];
    }
  }

  // Load cancelled items from localStorage in demo mode
  let cancelledItemIds: string[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("hm_cancelled_items");
      if (raw) cancelledItemIds = JSON.parse(raw);
    } catch {}
  }

  return itemsList.map((item) => {
    if (cancelledItemIds.includes(item.id)) {
      return { ...item, status: "Pending" as const };
    }
    return item as OrderItemType;
  });
}

/** Get mock order total dynamically based on its items and payment information. */
export function getMockOrderTotal(id: string, totalItems: number, payment?: any): number {
  const itemsList = getMockOrderItems(id, totalItems);
  const subtotal = itemsList.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = payment?.discount ?? 0;
  const shipping = payment?.shipping ?? 0;
  return subtotal + shipping - discount;
}

/** Mock enriched order for the details page */
export function getEnrichedOrder(id: string): EnrichedOrder | undefined {
  const baseOrder = MOCK_ORDERS.find((o) => o.id === id);
  if (!baseOrder) return undefined;

  const itemsList = getMockOrderItems(id, baseOrder.items);
  const calculatedTotal = getMockOrderTotal(id, baseOrder.items, baseOrder.payment);

  return {
    ...baseOrder,
    zone: "No Zone",
    itemsList,
    returnsList:
      baseOrder.returnItems && baseOrder.returnItems.length > 0 ? baseOrder.returnItems : [],
    timeline: buildTimelineFor(baseOrder, itemsList),
    payment: baseOrder.payment
      ? {
          ...baseOrder.payment,
          method: baseOrder.payment.payment_method || baseOrder.payment.method || ((baseOrder as any).paymentMethod as any) || "Cash",
          status: baseOrder.payment.payment_status || baseOrder.payment.status || ((baseOrder as any).paymentBalance > 0 ? "pending" : "paid"),
          subtotal:
            calculatedTotal - (baseOrder.payment.shipping ?? 0) + (baseOrder.payment.discount ?? 0),
          total: calculatedTotal,
          balance:
            baseOrder.payment.total_outstanding !== undefined
              ? baseOrder.payment.total_outstanding
              : (baseOrder as any).paymentBalance !== undefined
              ? (baseOrder as any).paymentBalance
              : calculatedTotal - (baseOrder.payment.totalPaid ?? baseOrder.payment.paid_amount ?? 0),
          totalPaid:
            baseOrder.payment.paid_amount !== undefined
              ? baseOrder.payment.paid_amount
              : calculatedTotal -
                ((baseOrder as any).paymentBalance !== undefined
                  ? (baseOrder as any).paymentBalance
                  : (baseOrder.payment.balance ?? 0)),
        }
      : {
          method: ((baseOrder as any).paymentMethod as any) || "Cash",
          status: ((baseOrder as any).paymentBalance ?? 0) > 0 ? "pending" : "paid",
          totalPaid: calculatedTotal - ((baseOrder as any).paymentBalance ?? 0),
          cash:
            ((baseOrder as any).paymentMethod || "Cash") === "Cash"
              ? calculatedTotal - ((baseOrder as any).paymentBalance ?? 0)
              : 0,
          card:
            ((baseOrder as any).paymentMethod || "Cash") === "Card"
              ? calculatedTotal - ((baseOrder as any).paymentBalance ?? 0)
              : 0,
          subtotal: calculatedTotal - 10,
          discount: 0,
          shipping: 10,
          total: calculatedTotal,
          balance: (baseOrder as any).paymentBalance ?? 0,
          shippingMethod: "Standard Delivery",
        },
    notes: baseOrder.notes || "Please leave at the door if no one answers.",
    shippingAddress:
      id === "HM99005"
        ? {
            line1: "Al Waab St",
            line2: "Doha",
            city: "Qatar",
            country: "Qatar",
            lat: 25.2638,
            lng: 51.4822,
          }
        : {
            line1: "Al rayyan al azizya, Home number 20",
            line2: "Al azizya",
            city: "Qatar",
            country: "Qatar",
            lat: 25.24127,
            lng: 51.444699,
          },
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
          available:
            item.fc === "MWO" ? item.qty : item.sku === "561KC" || item.sku === "26790" ? 10 : 0,
        })),
      },
      {
        fc: "VS",
        fcName: "Virtual Stock",
        items: itemsList.map((item) => ({
          sku: item.sku,
          req: item.qty,
          available:
            item.fc === "VS" ? item.qty : item.sku === "820304" || item.sku === "58034" ? 15 : 0,
        })),
      },
      {
        fc: "F02",
        fcName: "Main Warehouse - Safety Stock",
        items: itemsList.map((item) => ({
          sku: item.sku,
          req: item.qty,
          available: item.fc === "F02" ? item.qty : 5,
        })),
      },
    ],
  };
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

export const MOCK_ORDERS: Order[] = [
  {
    id: "HM99005",
    customerId: "cust-99005",
    tat: "00h 01m",
    date: "Jun 27",
    time: "10:55",
    customer: { name: "Khalid Al-Nuaimi", email: "khalid.nuaimi@example.com", phone: "55776688" },
    channel: "shopify",
    items: 3,
    status: "New",
    city: "Doha",
    coordinator: "-",
    driver: null,
    picker: null,
    packer: null,
    total: 3197,
    shopify: "Unfulfilled",
    pickingStatus: "0/3 Picked",
    packingStatus: "0/3 Packed",
    bags: 0,
    lat: 25.2638,
    lng: 51.4822,
    payment: {
      subtotal: 3197,
      discount: 0,
      shipping: 0,
      shippingMethod: "Standard Delivery",
      total: 3197,
      balance: 3197,
      method: "Cash on Delivery",
      totalPaid: 0,
      cash: 0,
      card: 0,
    },
  },
  {
    id: "HM59238",
    customerId: "cust-59238",
    tat: "642h 50m",
    date: "Apr 16",
    time: "18:34",
    customer: { name: "test test", email: "nandu@halamama.com", phone: "77532802" },
    channel: "web",
    items: 0,
    status: "Cancelled",
    returns: { type: "Return", count: 1 },
    returnItems: [
      {
        id: "ret-HM59238-1",
        itemName: "Beurer Sugar Machine With 50 Strips",
        sku: "BEU-SM-050",
        type: "return",
        qty: 1,
        status: "completed",
        source: "Web",
        reason: "damaged",
        adminNote: "Customer reported device not powering on.",
        createdAt: "2026-04-16T18:40:00Z",
        collectedAt: "2026-04-17T10:20:00Z",
        collectedBy: "driver1",
        completedAt: "2026-04-17T14:00:00Z",
      },
    ],
    city: "Doha",
    coordinator: "-",
    driver: "driver1",
    driverStatus: "Completed",
    picker: null,
    packer: null,
    total: 10,
    shopify: "Fulfilled",
    pickingStatus: "0/0 Picked",
    packingStatus: "0/0 Packed",
    bags: 0,
    lat: 25.2854,
    lng: 51.531,
  },
  {
    id: "HM59239",
    customerId: "cust-59239",
    tat: "642h 49m",
    date: "Apr 16",
    time: "18:35",
    customer: { name: "Sara Alsooj", email: "bent-alsooj@hotmail.com", phone: "55339494" },
    channel: "5382175",
    items: 2,
    status: "Delivered",
    returns: { type: "Return", count: 1 },
    returnItems: [
      {
        id: "ret-HM59239-1",
        itemName: "Philips Avent Natural Bottle 260ml",
        sku: "PA-NB-260",
        type: "return",
        qty: 1,
        status: "picked up",
        source: "Web",
        reason: "damaged",
        adminNote: "Bottle had visible crack on arrival.",
        createdAt: "2026-04-16T19:00:00Z",
        collectedAt: "2026-04-17T09:15:00Z",
        collectedBy: "irshad",
      },
    ],
    city: "Zone 50",
    coordinator: "-",
    driver: "irshad",
    driverStatus: "Completed",
    picker: "picker1",
    packer: "packer1",
    total: 178,
    shopify: "Fulfilled",
    pickingStatus: "2/2 Picked",
    packingStatus: "2/2 Packed",
    bags: 1,
    lat: 25.2279,
    lng: 51.4941,
  },
  {
    id: "HM59245",
    customerId: "cust-59245",
    tat: "02h 15m",
    date: "May 13",
    time: "11:00",
    customer: { name: "Fatima Al-Thani", email: "fatima.thani@gmail.com", phone: "33442211" },
    channel: "shopify",
    items: 3,
    status: "New",
    city: "West Bay",
    coordinator: "-",
    driver: null,
    picker: null,
    packer: null,
    total: 1429,
    shopify: "Pending",
    pickingStatus: "0/3 Picked",
    packingStatus: "0/3 Packed",
    bags: 0,
    tags: ["PAYLATER", "PAYMENTLINKSENT"],
    notes:
      "Customer chose Pay Later. Payment link sent: https://halamama.myshopify.com/checkouts/pay/c1b2c3d4e5f6",
    payment: {
      subtotal: 1429,
      discount: 0,
      shipping: 0,
      shippingMethod: "Standard Delivery",
      total: 1429,
      balance: 1429,
      method: "Shopify PayLater",
      totalPaid: 0,
      cash: 0,
      card: 0,
    },
    lat: 25.3286,
    lng: 51.531,
  },
  {
    id: "HM64110",
    customerId: "cust-64110",
    tat: "00h 28m",
    date: "May 27",
    time: "10:15",
    customer: { name: "Dana Al-Thani", email: "dana.thani@gmail.com", phone: "55223344" },
    channel: "shopify",
    items: 2,
    status: "New",
    city: "West Bay",
    coordinator: "-",
    driver: null,
    picker: null,
    packer: null,
    total: 630,
    shopify: "Unfulfilled",
    pickingStatus: "0/2 Picked",
    packingStatus: "0/2 Packed",
    bags: 0,
    lat: 25.3286,
    lng: 51.531,
  },
  {
    id: "HM64112",
    customerId: "cust-64112",
    tat: "00h 58m",
    date: "May 27",
    time: "09:45",
    customer: { name: "Zoe Henderson", email: "zoe.h@outlook.com", phone: "33445566" },
    channel: "web",
    items: 4,
    status: "New",
    city: "The Pearl",
    coordinator: "Omar",
    driver: null,
    picker: "noushad",
    packer: null,
    total: 740,
    shopify: "Unfulfilled",
    pickingStatus: "2/4 Picked",
    packingStatus: "0/4 Packed",
    bags: 0,
    lat: 25.3713,
    lng: 51.5476,
  },
  {
    id: "HM64116",
    customerId: "cust-64116",
    tat: "01h 31m",
    date: "May 27",
    time: "09:12",
    customer: { name: "Liam Gallagher", email: "liam.g@oasis.com", phone: "55009988" },
    channel: "web",
    items: 3,
    status: "Picked",
    city: "Lusail",
    coordinator: "Rania",
    driver: null,
    picker: "rahul",
    packer: null,
    total: 320,
    shopify: "Pending",
    pickingStatus: "3/3 Picked",
    packingStatus: "0/3 Packed",
    bags: 0,
    lat: 25.4182,
    lng: 51.5218,
  },
  {
    id: "HM64118",
    customerId: "cust-64118",
    tat: "02h 03m",
    date: "May 27",
    time: "08:40",
    customer: { name: "Amira Haddad", email: "amira.h@gmail.com", phone: "66778899" },
    channel: "shopify",
    items: 5,
    status: "Picked",
    city: "Doha",
    coordinator: "Omar",
    driver: null,
    picker: "adhil",
    packer: "mashood",
    total: 1250,
    shopify: "Pending",
    pickingStatus: "5/5 Picked",
    packingStatus: "3/5 Packed",
    bags: 1,
    lat: 25.2764,
    lng: 51.5385,
  },
  {
    id: "HM60104",
    customerId: "cust-60104",
    tat: "03h 22m",
    date: "May 13",
    time: "12:41",
    customer: { name: "Hessa Al-Jaber", email: "hessa.jaber@gmail.com", phone: "55330012" },
    channel: "shopify",
    items: 4,
    status: "Driver Accepted",
    city: "Lusail",
    coordinator: "Rania",
    driver: "irshad",
    driverStatus: "Accepted",
    picker: "noushad",
    packer: "packer1",
    total: 760,
    shopify: "Pending",
    pickingStatus: "4/4 Picked",
    packingStatus: "4/4 Packed",
    bags: 2,
    lat: 25.4182,
    lng: 51.5218,
  },
  {
    id: "HM60105",
    customerId: "cust-60105",
    tat: "04h 03m",
    date: "May 13",
    time: "13:12",
    customer: { name: "Rashed Nasser", email: "rashed.nasser@gmail.com", phone: "55881234" },
    channel: "web",
    items: 5,
    status: "Started",
    city: "Education City",
    coordinator: "Omar",
    driver: "farshad",
    driverStatus: "Started",
    picker: "adhil",
    packer: "mashood",
    total: 925,
    shopify: "Pending",
    pickingStatus: "5/5 Picked",
    packingStatus: "5/5 Packed",
    bags: 3,
    lat: 25.3183,
    lng: 51.4358,
  },
  {
    id: "HM60106",
    customerId: "cust-60106",
    tat: "05h 37m",
    date: "May 13",
    time: "13:48",
    customer: { name: "Dana Ibrahim", email: "dana.ibrahim@gmail.com", phone: "55773391" },
    channel: "web",
    items: 1,
    status: "Delivery Failed",
    city: "Al Rayyan",
    coordinator: "Rania",
    driver: "nassim",
    driverStatus: "Failed",
    picker: "rahul",
    packer: "packer1",
    total: 145,
    shopify: "Pending",
    pickingStatus: "1/1 Picked",
    packingStatus: "1/1 Packed",
    bags: 1,
    lat: 25.2917,
    lng: 51.4244,
  },
  {
    id: "HM60107",
    customerId: "cust-60107",
    tat: "06h 10m",
    date: "May 13",
    time: "14:26",
    customer: { name: "Lina Qassim", email: "lina.qassim@gmail.com", phone: "55990031" },
    channel: "shopify",
    items: 2,
    status: "Replacement",
    returns: { type: "Return", count: 1 },
    returnItems: [
      {
        id: "ret-HM60107-1",
        itemName: "Nip 2in1 Soother Box Sterilizer and Hygienic Case (Blue)",
        sku: "NIP-STZ-001",
        type: "return",
        qty: 1,
        status: "pending",
        source: "Shopify",
        reason: "wrong",
        adminNote: "Customer received wrong colour variant.",
        createdAt: "2026-05-13T14:30:00Z",
      },
    ],
    city: "Muaither",
    coordinator: "Omar",
    driver: "irshad",
    driverStatus: "Accepted",
    picker: "noushad",
    packer: "mashood",
    total: 230,
    shopify: "Pending",
    pickingStatus: "2/2 Picked",
    packingStatus: "2/2 Packed",
    bags: 1,
    lat: 25.2682,
    lng: 51.4069,
  },
  {
    id: "HM60108",
    customerId: "cust-60108",
    tat: "07h 25m",
    date: "May 13",
    time: "15:04",
    customer: { name: "Othman Kareem", email: "othman.kareem@gmail.com", phone: "55447766" },
    channel: "web",
    items: 3,
    status: "Exchange",
    returns: { type: "Return", count: 2 },
    returnItems: [
      {
        id: "ret-HM60108-1",
        itemName: "Chicco Baby Carrier EasyFit (Grey)",
        sku: "CHC-BC-EF-GR",
        type: "replacement",
        qty: 1,
        status: "picked up",
        source: "Web",
        reason: "wrong",
        adminNote: "Customer ordered blue, received grey. Exchange approved.",
        createdAt: "2026-05-13T15:10:00Z",
        collectedAt: "2026-05-14T11:00:00Z",
        collectedBy: "farshad",
      },
      {
        id: "ret-HM60108-2",
        itemName: "Tommee Tippee Closer to Nature Bottle 150ml",
        sku: "TT-CTN-150",
        type: "return",
        qty: 2,
        status: "pending",
        source: "Web",
        reason: "damaged",
        adminNote: "Bottles leaking from cap seal.",
        createdAt: "2026-05-14T09:00:00Z",
      },
    ],
    city: "Old Airport",
    coordinator: "Rania",
    driver: "farshad",
    driverStatus: "Accepted",
    picker: "rahul",
    packer: "packer1",
    total: 388,
    shopify: "Pending",
    pickingStatus: "3/3 Picked",
    packingStatus: "3/3 Packed",
    bags: 1,
    lat: 25.2494,
    lng: 51.5492,
  },
  {
    id: "HM63850",
    customerId: "cust-63850",
    tat: "154h 34m",
    date: "May 20",
    time: "02:53",
    customer: { name: "Noora Almannai", email: "n.a.y.1@hotmail.com", phone: "+97466111881" },
    channel: "web" as const,
    items: 1,
    status: "Installation" as const,
    city: "Doha",
    coordinator: "-",
    driver: "mwd_nishad",
    driverStatus: "Completed",
    picker: "rahul",
    packer: "packer1",
    total: 1749,
    shopify: "Fulfilled" as const,
    pickingStatus: "1/1 Picked",
    packingStatus: "1/1 Packed",
    bags: 1,
    lat: 25.2854,
    lng: 51.531,
  },
  {
    id: "HM68300",
    customerId: "cust-68300",
    tat: "50h 00m",
    date: "May 25",
    time: "12:30",
    customer: { name: "Fatima Al-Kuwari", email: "fatima.kuwari@example.com", phone: "55889900" },
    channel: "shopify" as const,
    items: 1,
    status: "Ready to Assign" as const,
    city: "Doha",
    coordinator: "-",
    driver: null,
    driverStatus: null,
    picker: "rahul",
    packer: "packer1",
    total: 3499,
    shopify: "Pending" as const,
    pickingStatus: "1/1 Picked",
    packingStatus: "1/1 Packed",
    bags: 1,
    lat: 25.2854,
    lng: 51.531,
  },
  {
    id: "HM68229",
    customerId: "cust-68229",
    tat: "48h 15m",
    date: "May 25",
    time: "14:10",
    customer: { name: "Sara Al Sulaiti", email: "sara.sulaiti@example.com", phone: "55112233" },
    channel: "web" as const,
    items: 4,
    status: "Ready to Assign" as const,
    city: "Doha",
    coordinator: "-",
    driver: null,
    driverStatus: null,
    picker: "rahul",
    packer: "packer1",
    total: 4696,
    shopify: "Pending" as const,
    pickingStatus: "4/4 Picked",
    packingStatus: "4/4 Packed",
    bags: 2,
    lat: 25.2854,
    lng: 51.531,
  },
  {
    id: "HM68258",
    customerId: "cust-68258",
    tat: "46h 10m",
    date: "May 25",
    time: "16:20",
    customer: { name: "Mouza Al Derham", email: "mouza.derham@example.com", phone: "55667788" },
    channel: "web" as const,
    items: 2,
    status: "Ready to Assign" as const,
    city: "Doha",
    coordinator: "-",
    driver: null,
    driverStatus: null,
    picker: "noushad",
    packer: "packer1",
    total: 1448,
    shopify: "Pending" as const,
    pickingStatus: "2/2 Picked",
    packingStatus: "2/2 Packed",
    bags: 1,
    lat: 25.2854,
    lng: 51.531,
  },
  {
    id: "HM68268",
    customerId: "cust-68268",
    tat: "44h 05m",
    date: "May 26",
    time: "09:30",
    customer: { name: "aisha alnaemi", email: "aisha.naemi@example.com", phone: "55990011" },
    channel: "shopify" as const,
    items: 1,
    status: "Ready to Assign" as const,
    city: "Doha",
    coordinator: "-",
    driver: null,
    driverStatus: null,
    picker: "adhil",
    packer: "mashood",
    total: 899,
    shopify: "Pending" as const,
    pickingStatus: "1/1 Picked",
    packingStatus: "1/1 Packed",
    bags: 1,
    lat: 25.2854,
    lng: 51.531,
  },
  {
    id: "HM64839",
    customerId: "cust-64839",
    tat: "432h 12m",
    date: "May 15",
    time: "11:15",
    customer: { name: "test test", email: "test.test@example.com", phone: "77532802" },
    channel: "web" as const,
    items: 1,
    status: "Driver Accepted" as const,
    city: "Doha",
    coordinator: "-",
    driver: "driver1",
    driverStatus: "Accepted",
    picker: "rahul",
    packer: "packer1",
    total: 25,
    shopify: "Pending" as const,
    pickingStatus: "1/1 Picked",
    packingStatus: "1/1 Packed",
    bags: 1,
    lat: 25.2854,
    lng: 51.531,
  },
  {
    id: "HM99001",
    customerId: "cust-99001",
    tat: "01h 05m",
    date: "Jun 16",
    time: "14:00",
    customer: { name: "Salem Al-Marri", email: "salem.marri@example.com", phone: "33224455" },
    channel: "shopify" as const,
    items: 2,
    status: "New" as const,
    city: "Doha",
    coordinator: "-",
    driver: null,
    picker: null,
    packer: null,
    total: 480,
    shopify: "Unfulfilled" as const,
    pickingStatus: "0/2 Picked",
    packingStatus: "0/2 Packed",
    bags: 0,
    lat: 25.2854,
    lng: 51.531,
  },
  {
    id: "HM99003",
    customerId: "cust-99003",
    tat: "04h 15m",
    date: "Jun 16",
    time: "11:20",
    customer: { name: "Mohammed Al-Sada", email: "m.sada@example.com", phone: "66554433" },
    channel: "web" as const,
    items: 2,
    status: "Ready to Assign" as const,
    city: "Lusail",
    coordinator: "Omar",
    driver: null,
    picker: "rahul",
    packer: "packer1",
    total: 320,
    shopify: "Pending" as const,
    pickingStatus: "2/2 Picked",
    packingStatus: "2/2 Packed",
    bags: 1,
    lat: 25.4182,
    lng: 51.5218,
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
    value: MOCK_ORDERS.filter(
      (order) => order.status === "Picked" && !isUnpaidPayLaterOrder(order),
    ).length.toLocaleString(),
    icon: Package,
    tone: "violet" as const,
  },
  {
    label: "Packing",
    value: MOCK_ORDERS.filter(
      (order) => order.status === "Ready to Assign" && !isUnpaidPayLaterOrder(order),
    ).length.toLocaleString(),
    icon: PackageCheck,
    tone: "primary" as const,
  },
  {
    label: "Delivered",
    value: MOCK_ORDERS.filter(
      (order) => order.status === "Delivered" && !isUnpaidPayLaterOrder(order),
    ).length.toLocaleString(),
    icon: Truck,
    tone: "primary" as const,
  },
  {
    label: "Revenue",
    value: `QAR ${Math.round(MOCK_ORDERS.filter((o) => !isUnpaidPayLaterOrder(o)).reduce((sum, order) => sum + order.total, 0) / 1000)}K`,
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
  const blob = [
    order.id,
    order.customerId,
    order.customer.name,
    order.customer.email,
    order.customer.phone,
    order.city,
    order.status,
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes(q);
}

export function matchesLegacyTab(order: Order, tab: LegacyTabId): boolean {
  const isPayLater = isUnpaidPayLaterOrder(order);
  if (isPayLater) {
    return tab === "PayLater";
  } else {
    if (tab === "PayLater") return false;
  }

  if (tab === "All") return true;
  if (tab === "New") return order.status === "New" || order.status === "Unfulfilled";
  if (tab === "Unfulfilled") return order.status !== "Delivered";
  if (tab === "Installation") return order.status === "Installation";
  if (tab === "Returns & Replacements")
    return Boolean(order.returns) || order.status === "Replacement" || order.status === "Exchange";
  if (tab === "Flags & Exceptions") {
    if (order.status === "Flagged" || order.status === "Delivery Failed") return true;
    const m = order.tat.match(/(\d+)h/);
    if (m && parseInt(m[1], 10) > 24) return true;
    return false;
  }
  if (tab === "Replacement") return order.status === "Replacement";
  if (tab === "Exchange") return order.status === "Exchange";
  if (tab === "In Delivery")
    return order.status === "Driver Accepted" || order.status === "Started" || Boolean(order.driver);
  if (tab === "Ready to Assign")
    return order.status === "Ready to Assign" && !order.driver;
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
  return MOCK_ORDERS.filter((o) => o.customerId === customerId).sort((a, b) =>
    a.id < b.id ? 1 : a.id > b.id ? -1 : 0,
  );
}

/** First / primary order row for this customer id (profile anchor). */
export function getCustomerById(customerId: string): Order | undefined {
  const list = getOrdersForCustomerId(customerId);
  return list[0];
}
