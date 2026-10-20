/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  ERPNext ↔ Dashboard Data Mappers                                            ║
 * ║                                                                              ║
 * ║  WHY DO WE NEED THIS?                                                        ║
 * ║  ERPNext returns data in its own format (field names, structures).            ║
 * ║  Our dashboard expects data in the format defined in src/lib/orders.ts.      ║
 * ║  These "mapper" functions translate between the two formats.                  ║
 * ║                                                                              ║
 * ║  WHEN YOUR ERPNEXT DEV GIVES YOU THE API:                                    ║
 * ║  1. Check what fields ERPNext returns (use Postman or browser dev tools)     ║
 * ║  2. Update the mapXxx() functions below to match those field names            ║
 * ║  3. The rest of the dashboard will work automatically!                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Order, OrderStatus, EnrichedOrder, OrderItemType } from "@/lib/orders";

// ─── ERPNext Raw Response Types ──────────────────────────────────────────
// These describe what ERPNext typically sends back.
// Update these interfaces when your backend dev confirms the exact fields.

/**
 * Raw Sales Order from ERPNext API response.
 *
 * IMPORTANT: These field names come from ERPNext.
 * Your ERPNext developer may use custom fields with different names.
 * When they provide the API, update these field names to match.
 */
export interface ERPNextSalesOrder {
  name: string; // ERPNext document ID (e.g. "SO-00001")
  customer: string; // Customer name
  customer_name?: string; // Full customer display name
  contact_email?: string; // Customer email
  contact_phone?: string; // Customer phone
  order_type?: string; // e.g. "Sales", "Shopping Cart"
  transaction_date?: string; // Order date (YYYY-MM-DD)
  delivery_date?: string; // Expected delivery date
  grand_total: number; // Order total amount
  status: string; // ERPNext status (e.g. "To Deliver and Bill")
  delivery_status?: string; // Custom delivery status
  items?: ERPNextSalesOrderItem[]; // Line items
  line_items?: ERPNextSalesOrderItem[]; // Shopify / Backend dynamic line items

  // ── Custom fields your ERPNext dev may add ──
  custom_city?: string;
  custom_zone?: string;
  custom_coordinator?: string;
  custom_driver?: string;
  custom_driver_status?: string;
  custom_picker?: string;
  custom_packer?: string;
  custom_channel?: string;
  custom_tat?: string;
  custom_bags?: number;
  custom_picking_status?: string;
  custom_packing_status?: string;
  custom_shopify_status?: string;
  custom_return_count?: number;
  custom_notes?: string;
  custom_shipping_address_line1?: string;
  custom_shipping_address_line2?: string;
  custom_shipping_city?: string;
  custom_shipping_country?: string;
  custom_latitude?: number;
  custom_longitude?: number;
  custom_tags?: string;
}

/** Raw Sales Order Item from ERPNext or Shopify API */
export interface ERPNextSalesOrderItem {
  id?: number | string;
  name?: string;
  item_code?: string;
  item_name?: string;
  qty?: number;
  quantity?: number;
  rate?: number;
  price?: number;
  amount?: number;
  warehouse?: string;
  custom_barcode?: string;
  custom_bin?: string;
  custom_status?: string;
  image?: string;
  sku?: string;
  product_id?: number | string;
  variant_id?: number | string;
}

/** Standard ERPNext list response wrapper */
export interface ERPNextListResponse<T> {
  data: T[];
  count?: number;
  source?: string;
}

/** Standard ERPNext single document response wrapper */
export interface ERPNextDocResponse<T> {
  data: T;
}

// ─── Mapper Functions ────────────────────────────────────────────────────

/**
 * Maps an ERPNext status string to our dashboard's OrderStatus.
 *
 * HOW TO CUSTOMIZE:
 * Look at what statuses your ERPNext returns, then add/change the mappings below.
 * The left side is what ERPNext sends, the right side is what our dashboard expects.
 */
function mapStatus(erpStatus: string): OrderStatus {
  if (!erpStatus) return "New";
  const normalized = String(erpStatus).trim().toLowerCase().replace(/[\s_-]+/g, "_");

  if (normalized === "flagged") return "Flagged";
  if (normalized === "delivery_failed" || normalized === "failed") return "Delivery Failed";
  if (
    normalized === "pending" ||
    normalized === "new" ||
    normalized === "unfulfilled" ||
    normalized === "draft"
  ) {
    return "New";
  }
  if (normalized === "picking") return "Picking";
  if (normalized === "picked") return "Picked";
  if (normalized === "packing") return "Packing";
  if (
    normalized === "ready_to_assign" ||
    normalized === "readytoassign" ||
    normalized === "to_deliver" ||
    normalized === "packed"
  ) {
    return "Ready to Assign";
  }
  if (
    normalized === "driver_accepted" ||
    normalized === "assigned_to_driver" ||
    normalized === "partial_assigned_driver"
  ) {
    return "Driver Accepted";
  }
  if (
    normalized === "started" ||
    normalized === "in_delivery" ||
    normalized === "out_for_delivery"
  ) {
    return "Started";
  }
  if (normalized === "delivered" || normalized === "completed" || normalized === "to_bill") return "Delivered";
  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "cancelled_delivery" ||
    normalized === "delivery_cancelled"
  ) {
    return "Cancelled";
  }
  if (normalized === "replacement") return "Replacement";
  if (normalized === "exchange") return "Exchange";
  if (
    normalized === "installation" ||
    normalized === "ready_for_installation" ||
    normalized === "in_installation" ||
    normalized === "installed"
  ) {
    return "Installation";
  }
  if (normalized === "paylater" || normalized === "pay_later") return "PayLater";

  const statusMap: Record<string, OrderStatus> = {
    Draft: "New",
    "To Deliver and Bill": "Unfulfilled",
    "To Deliver": "Ready to Assign",
    "To Bill": "Delivered",
    Completed: "Delivered",
    Cancelled: "Cancelled",
    Picking: "Picking",
    Picked: "Picked",
    Packing: "Packing",
    "Ready to Assign": "Ready to Assign",
    "Ready to assign": "Ready to Assign",
    "Driver Accepted": "Driver Accepted",
    Started: "Started",
    Delivered: "Delivered",
    "Delivery Failed": "Delivery Failed",
    Flagged: "Flagged",
    New: "New",
    Pending: "New",
    Unfulfilled: "Unfulfilled",
    Replacement: "Replacement",
    Exchange: "Exchange",
    Installation: "Installation",
  };

  return statusMap[erpStatus] || "New";
}

/**
 * Maps a channel string from ERPNext to our dashboard's channel type.
 */
function mapChannel(channel?: string): "web" | "5382175" | "shopify" {
  if (!channel) return "web";
  const lower = channel.toLowerCase();
  if (lower.includes("shopify")) return "shopify";
  if (lower.includes("5382175") || lower.includes("pos")) return "5382175";
  return "web";
}

/**
 * Calculates a TAT (turnaround time) string from the order date.
 */
function calculateTat(orderDate?: string): string {
  if (!orderDate) return "0h 0m";
  const created = new Date(orderDate);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

/**
 * 🔄 MAIN MAPPER: Converts one ERPNext Sales Order → Dashboard Order
 *
 * This is the most important function. It translates ERPNext field names
 * into the field names our React components expect.
 */
export function mapErpNextToOrder(raw: ERPNextSalesOrder): Order {
  const dateObj = raw.transaction_date ? new Date(raw.transaction_date) : new Date();
  const date = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  let deliveryDate = undefined;
  if (raw.delivery_date) {
    const delDateObj = new Date(raw.delivery_date);
    if (!isNaN(delDateObj.getTime())) {
      deliveryDate = delDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  const rawLineItems = raw.line_items || raw.items || [];
  const itemCount =
    rawLineItems.length > 0
      ? rawLineItems.reduce((sum: number, item: any) => sum + (item.quantity ?? item.qty ?? 1), 0)
      : 0;

  const rawId = String(raw.name || (raw as any).id || (raw as any).order_id || "");
  const rawOrderNum =
    (raw as any).order_number ?? (raw as any).order_no ?? (raw as any).orderNumber;
  const orderNumber =
    rawOrderNum !== undefined && rawOrderNum !== null ? String(rawOrderNum) : undefined;
  const shopifyOrderId = (raw as any).shopify_order_id
    ? String((raw as any).shopify_order_id)
    : undefined;
  const displayId = orderNumber || shopifyOrderId || rawId;

  return {
    id: displayId,
    orderNumber: orderNumber || displayId,
    shopifyOrderId,
    customerId: `cust-${raw.customer?.replace(/\s+/g, "-").toLowerCase() || "unknown"}`,
    tat: raw.custom_tat || calculateTat(raw.transaction_date),
    date,
    time,
    customer: {
      name:
        raw.customer_name ||
        (typeof raw.customer === "string" ? raw.customer : (raw as any).customer?.name) ||
        "Customer",
      email: raw.contact_email || (raw as any).customer?.email || "",
      phone: raw.contact_phone || (raw as any).customer?.phone || "",
    },
    customer_name:
      raw.customer_name ||
      (typeof raw.customer === "string" ? raw.customer : (raw as any).customer?.name) ||
      "Customer",
    channel: mapChannel(raw.custom_channel),
    items: itemCount,
    line_items: rawLineItems,
    status: mapStatus(raw.status),
    returns: (() => {
      const mappedStatus = mapStatus(raw.status);
      const isOrderCancelled =
        mappedStatus === "Cancelled" ||
        mappedStatus === "Delivery Failed" ||
        String(raw.status || "").toLowerCase().trim() === "cancelled" ||
        String(raw.status || "").toLowerCase().trim() === "canceled";
      if (isOrderCancelled) return undefined;

      const cancelledCount = rawLineItems.filter((i: any) => {
        const s = String(i.status || (i as any).custom_status || "").toLowerCase().trim();
        return s === "cancelled" || s === "canceled" || Boolean((i as any).is_cancelled || (i as any).cancelled);
      }).length;
      const count = raw.custom_return_count || cancelledCount || 0;
      return count > 0 ? { type: "Return" as const, count } : undefined;
    })(),
    hasCancelledItems: (() => {
      const mappedStatus = mapStatus(raw.status);
      const isOrderCancelled =
        mappedStatus === "Cancelled" ||
        mappedStatus === "Delivery Failed" ||
        String(raw.status || "").toLowerCase().trim() === "cancelled" ||
        String(raw.status || "").toLowerCase().trim() === "canceled";
      if (isOrderCancelled) return false;

      return rawLineItems.some((i: any) => {
        const s = String(i.status || (i as any).custom_status || "").toLowerCase().trim();
        return s === "cancelled" || s === "canceled" || Boolean((i as any).is_cancelled || (i as any).cancelled);
      });
    })(),
    cancelledItemsCount: (() => {
      const mappedStatus = mapStatus(raw.status);
      const isOrderCancelled =
        mappedStatus === "Cancelled" ||
        mappedStatus === "Delivery Failed" ||
        String(raw.status || "").toLowerCase().trim() === "cancelled" ||
        String(raw.status || "").toLowerCase().trim() === "canceled";
      if (isOrderCancelled) return 0;

      return rawLineItems.filter((i: any) => {
        const s = String(i.status || (i as any).custom_status || "").toLowerCase().trim();
        return s === "cancelled" || s === "canceled" || Boolean((i as any).is_cancelled || (i as any).cancelled);
      }).length;
    })(),
    city: raw.custom_city || "—",
    coordinator: raw.custom_coordinator || "-",
    driver: raw.custom_driver || null,
    driverStatus: raw.custom_driver_status || null,
    picker: raw.custom_picker || null,
    packer: raw.custom_packer || null,
    total: raw.grand_total || 0,
    shopify:
      (raw.custom_shopify_status as "Fulfilled" | "Unfulfilled" | "Pending") || "Unfulfilled",
    pickingStatus: raw.custom_picking_status,
    packingStatus: raw.custom_packing_status,
    bags: raw.custom_bags,
    tags: raw.custom_tags ? raw.custom_tags.split(",").map((t) => t.trim()) : [],
    shippingMethod: (raw as any).shipping_method || (raw as any).custom_shipping_method || undefined,
    isExpress: Boolean(
      (raw as any).is_express === 1 ||
      (raw as any).is_express === true ||
      (raw as any).is_express === "1" ||
      ((raw as any).shipping_method && String((raw as any).shipping_method).toLowerCase().includes("express")) ||
      (raw.custom_tags && raw.custom_tags.toLowerCase().includes("express")),
    ),
    deliveryDate,
    zone: raw.custom_zone || "",
    hasInstallation: Boolean(
      (raw as any).has_installation ||
      (raw as any).custom_has_installation ||
      raw.status === "Installation" ||
      (Array.isArray(rawLineItems) &&
        rawLineItems.some(
          (i: any) =>
            i.is_installable === true ||
            i.is_installable === 1 ||
            i.is_installable === "1" ||
            i.custom_is_installable === 1 ||
            i.custom_is_installable === true ||
            i.requires_installation === true ||
            Boolean(i.installation_type) ||
            Boolean(i.installation),
        )),
    ),
    installationItemsCount:
      (raw as any).installation_items_count ?? (raw as any).installation_items ?? undefined,
    order_id: (raw as any).order_id ?? (raw as any).id,
    ready_to_assign: Boolean(
      (raw as any).ready_to_assign ||
      (raw as any).is_ready_to_assign ||
      (raw as any).ready_assign ||
      (raw as any).summary?.ready_to_assign ||
      (raw as any).summary?.ready_assign ||
      (raw as any).all_items_vs ||
      (raw as any).summary?.all_items_vs
    ),
    is_ready_to_assign: Boolean(
      (raw as any).ready_to_assign ||
      (raw as any).is_ready_to_assign ||
      (raw as any).ready_assign ||
      (raw as any).summary?.ready_to_assign ||
      (raw as any).summary?.ready_assign ||
      (raw as any).all_items_vs ||
      (raw as any).summary?.all_items_vs
    ),
    all_items_vs: Boolean((raw as any).all_items_vs || (raw as any).summary?.all_items_vs),
    summary: (raw as any).summary,
    notes: (raw as any).notes || raw.custom_notes || (raw as any).customer_notes || "",
    rawOrder: raw,
  };
}

/**
 * Maps an ERPNext or Shopify Sales Order Item → Dashboard OrderItemType
 */
export function mapErpNextToOrderItem(raw: ERPNextSalesOrderItem): OrderItemType {
  const isInstallable = Boolean(
    (raw as any).is_installable === true ||
    (raw as any).is_installable === 1 ||
    (raw as any).is_installable === "1" ||
    (raw as any).is_installable === "true" ||
    (raw as any).isInstallable === true ||
    (raw as any).isInstallable === 1 ||
    (raw as any).isInstallable === "1" ||
    (raw as any).isInstallable === "true" ||
    (raw as any).custom_is_installable === 1 ||
    (raw as any).custom_is_installable === true ||
    (raw as any).custom_is_installable === "1" ||
    (raw as any).custom_is_installable === "true" ||
    (raw as any).requires_installation === true ||
    (raw as any).requires_installation === 1 ||
    (raw as any).requires_installation === "1" ||
    (raw as any).requires_installation === "true",
  );

  const rawLineItemId = (raw as any).line_item_id;
  const rawId = raw.id;
  const rawItemId = (raw as any).item_id;
  const rawOrderItemId = (raw as any).order_item_id;

  const resolvedLineItemId = rawLineItemId
    ? String(rawLineItemId)
    : rawId && String(rawId).length > 6
      ? String(rawId)
      : rawOrderItemId && String(rawOrderItemId).length > 6
        ? String(rawOrderItemId)
        : rawLineItemId ?? rawId ?? rawOrderItemId ?? rawItemId;

  const finalLineItemIdStr = resolvedLineItemId ? String(resolvedLineItemId) : String(raw.name || Math.random());

  const rawStatusStr = String(raw.custom_status || (raw as any).status || "").toLowerCase().trim();
  const isItemCancelled = rawStatusStr === "cancelled" || rawStatusStr === "canceled" || Boolean((raw as any).is_cancelled || (raw as any).cancelled);
  const isItemAdded = Boolean(
    (raw as any).is_new ||
    (raw as any).isNew ||
    (raw as any).is_added ||
    (raw as any).isAdded ||
    (raw as any).added ||
    (raw as any).is_replacement ||
    (raw as any).isReplacement ||
    (raw as any).is_exchange ||
    (raw as any).isExchange ||
    rawStatusStr === "new" ||
    rawStatusStr === "added"
  );

  return {
    id: finalLineItemIdStr,
    line_item_id: finalLineItemIdStr,
    order_item_id: finalLineItemIdStr,
    item_id: rawItemId ?? undefined,
    name: raw.name || raw.item_name || "Item",
    sku: raw.sku || raw.item_code || "",
    barcode: raw.custom_barcode || "",
    image: raw.image || "",
    qty: raw.quantity ?? raw.qty ?? 1,
    price: raw.price ?? raw.rate ?? 0,
    fc: "F01",
    fcName: raw.warehouse || "Default Warehouse",
    bin: raw.custom_bin || "—",
    status: isItemCancelled
        ? "Cancelled"
        : isItemAdded
          ? "Added New"
          : rawStatusStr === "picker_assigned"
            ? "Picker Assigned"
            : (raw.custom_status as "Prepared" | "Accepted" | "Allocated" | "Pending") || "Pending",
      is_cancelled: isItemCancelled,
      isCancelled: isItemCancelled,
      is_added: isItemAdded,
      isAdded: isItemAdded,
      is_new: isItemAdded,
      isNew: isItemAdded,
      raw_status: raw.custom_status || (raw as any).status || null,
      is_flagged: Boolean(
        (raw as any).is_flagged === true ||
        (raw as any).is_flagged === 1 ||
        (raw as any).is_flagged === "1" ||
        (raw as any).is_flagged === "true" ||
        (raw as any).isFlagged === true ||
        (raw as any).flagged === true ||
        String((raw as any).status || "").toLowerCase() === "flagged" ||
        String((raw as any).custom_status || "").toLowerCase() === "flagged"
      ),
      isFlagged: Boolean(
        (raw as any).is_flagged === true ||
        (raw as any).is_flagged === 1 ||
        (raw as any).is_flagged === "1" ||
        (raw as any).is_flagged === "true" ||
        (raw as any).isFlagged === true ||
        (raw as any).flagged === true ||
        String((raw as any).status || "").toLowerCase() === "flagged" ||
        String((raw as any).custom_status || "").toLowerCase() === "flagged"
      ),
      flag_reason: (raw as any).flag_reason ?? (raw as any).flagged_reason ?? (raw as any).flaggedReason ?? null,
      flagged_reason: (raw as any).flag_reason ?? (raw as any).flagged_reason ?? (raw as any).flaggedReason ?? null,
      flaggedReason: (raw as any).flag_reason ?? (raw as any).flagged_reason ?? (raw as any).flaggedReason ?? null,
    flagged_image_url: (raw as any).flagged_image_url ?? (raw as any).flagged_image ?? (raw as any).flag_image_url ?? (raw as any).flag_image ?? null,
    flaggedImageUrl: (raw as any).flagged_image_url ?? (raw as any).flagged_image ?? (raw as any).flag_image_url ?? (raw as any).flag_image ?? null,
    flagged_by: (raw as any).flagged_by ?? (raw as any).flagged_user_name ?? null,
    flagged_at: (raw as any).flagged_at ?? null,
    assigned_to: (raw as any).assigned_to ?? null,
    assigned_user_name: (raw as any).assigned_user_name ?? null,
    assigned_at: (raw as any).assigned_at ?? null,
    picked_by: (raw as any).picked_by ?? null,
    picked_user_name: (raw as any).picked_user_name ?? null,
    packed_by: (raw as any).packed_by ?? null,
    packed_user_name: (raw as any).packed_user_name ?? null,
    delivered_by: (raw as any).delivered_by ?? null,
    delivered_user_name: (raw as any).delivered_user_name ?? null,
    picked_at: (raw as any).picked_at ?? null,
    packed_at: (raw as any).packed_at ?? null,
    delivered_at: (raw as any).delivered_at ?? null,
    product_tags:
      (raw as any).product_tags ??
      (raw as any).tags ??
      (raw as any).custom_product_tags ??
      (raw as any).product?.product_tags ??
      (raw as any).product?.tags ??
      (raw as any).product_tag ??
      null,
    is_scheduled_assigned: Boolean((raw as any).is_scheduled_assigned || (raw as any).is_scheduled),
    is_installable: isInstallable,
    isInstallable: isInstallable,
    installation_type: (raw as any).installation_type || null,
    installation_level: (raw as any).installation_level || null,
    installation: (raw as any).installation || null,
    gift_wrap:
      (raw as any).gift_wrap ??
      (raw as any).giftWrap ??
      (raw as any).gift_wrapper ??
      (raw as any).giftWrapper ??
      (raw as any).custom_gift_wrap ??
      null,
    giftWrap:
      (raw as any).gift_wrap ??
      (raw as any).giftWrap ??
      (raw as any).gift_wrapper ??
      (raw as any).giftWrapper ??
      (raw as any).custom_gift_wrap ??
      null,
    gift_message:
      (raw as any).gift_message ??
      (raw as any).giftMessage ??
      (raw as any).custom_gift_message ??
      null,
    giftMessage:
      (raw as any).gift_message ??
      (raw as any).giftMessage ??
      (raw as any).custom_gift_message ??
      null,
  };
}

/**
 * Maps a full ERPNext Sales Order (with items) → Dashboard EnrichedOrder
 * This is used for the order detail/single-order view.
 */
export function mapErpNextToEnrichedOrder(raw: ERPNextSalesOrder): EnrichedOrder {
  const base = mapErpNextToOrder(raw);
  const rawLineItems = raw.line_items || raw.items || [];
  const itemsList = rawLineItems.map(mapErpNextToOrderItem);

  const rawPayment = (raw as any).payment || {};
  const paymentMethod =
    rawPayment.payment_method ||
    (raw as any).payment_method ||
    (raw as any).custom_payment_method ||
    "Cash on Delivery (COD)";

  const paymentStatus =
    rawPayment.payment_status ||
    (raw as any).payment_status ||
    (raw as any).custom_payment_status ||
    (raw as any).financial_status ||
    "pending";

  const totalPrice =
    typeof rawPayment.total_price === "number" ? rawPayment.total_price : raw.grand_total || 0;

  const paidAmount =
    typeof rawPayment.paid_amount === "number"
      ? rawPayment.paid_amount
      : typeof (raw as any).paid_amount === "number"
        ? (raw as any).paid_amount
        : paymentStatus.toLowerCase() === "paid"
          ? totalPrice
          : 0;

  const totalOutstanding =
    typeof rawPayment.total_outstanding === "number"
      ? rawPayment.total_outstanding
      : typeof (raw as any).total_outstanding === "number"
        ? (raw as any).total_outstanding
        : Math.max(0, totalPrice - paidAmount);

  const lowerMethod = paymentMethod.toLowerCase();
  const isCash = lowerMethod.includes("cash") || lowerMethod.includes("cod");
  const isCard = lowerMethod.includes("card");

  return {
    ...base,
    zone: raw.custom_zone || "No Zone",
    itemsList,
    returnsList: [],
    timeline: [],
    payment: {
      method: paymentMethod,
      status: paymentStatus,
      totalPaid: paidAmount,
      cash: isCash ? paidAmount : 0,
      card: isCard ? paidAmount : 0,
      subtotal: Math.max(0, totalPrice - 10),
      discount: 0,
      shipping: 10,
      total: totalPrice,
      balance: totalOutstanding,
      shippingMethod: "Standard Delivery",
      id: rawPayment.id,
      shopifyOrderId: rawPayment.shopify_order_id,
      processedAt: rawPayment.processed_at,
    },
    notes:
      (raw as any).notes ||
      raw.custom_notes ||
      (raw as any).customer_notes ||
      base.notes ||
      "",
    shippingAddress: {
      line1: raw.custom_shipping_address_line1 || "",
      line2: raw.custom_shipping_address_line2 || "",
      city: raw.custom_shipping_city || "",
      country: raw.custom_shipping_country || "Qatar",
      lat: raw.custom_latitude || 25.276987,
      lng: raw.custom_longitude || 51.520008,
    },
    matrix: [],
    order_id: (raw as any).order_id ?? (raw as any).id ?? base.order_id,
    ready_to_assign: Boolean(
      (raw as any).ready_to_assign ||
      (raw as any).is_ready_to_assign ||
      (raw as any).ready_assign ||
      (raw as any).summary?.ready_to_assign ||
      (raw as any).summary?.ready_assign ||
      (raw as any).all_items_vs ||
      (raw as any).summary?.all_items_vs ||
      base.ready_to_assign
    ),
    is_ready_to_assign: Boolean(
      (raw as any).ready_to_assign ||
      (raw as any).is_ready_to_assign ||
      (raw as any).ready_assign ||
      (raw as any).summary?.ready_to_assign ||
      (raw as any).summary?.ready_assign ||
      (raw as any).all_items_vs ||
      (raw as any).summary?.all_items_vs ||
      base.is_ready_to_assign
    ),
    all_items_vs: Boolean((raw as any).all_items_vs || (raw as any).summary?.all_items_vs || base.all_items_vs),
    summary: (raw as any).summary || base.summary,
    rawOrder: raw,
  };
}

/**
 * 🔄 LARAVEL API MAPPER: Converts Laravel Order API JSON → Dashboard Order
 * Maps responses from /api/orders/status/{all,new,ready-to-assign,picking,picked,packing,in-delivery,delivered}
 */
export function mapLaravelOrderToDashboardOrder(raw: any): Order {
  if (!raw)
    return mapErpNextToOrder({
      name: "UNKNOWN",
      customer: "UNKNOWN",
      grand_total: 0,
      status: "New",
    });

  // If payload is already standard ERPNext format, fallback to mapErpNextToOrder
  if (raw.name && !raw.order_number) {
    return mapErpNextToOrder(raw);
  }

  const dateObj = raw.created_at ? new Date(raw.created_at) : new Date();
  const date = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const rawDriver = raw.driver_user?.name || raw.assigned_user_name || raw.driver_name;
  const hasDriverAssigned = Boolean(
    raw.driver_user ||
    raw.driver_assignment ||
    raw.assigned_driver_user_id ||
    (typeof rawDriver === "string" &&
      rawDriver.trim().toLowerCase() !== "unassigned" &&
      rawDriver.trim() !== ""),
  );

  const rawStatus = (raw.status || raw.order_status || "").toString().toLowerCase().trim();
  const normalizedStatus = rawStatus.replace(/[\s_-]+/g, "_");

  let status: OrderStatus = "New";
  if (normalizedStatus === "flagged") {
    status = "Flagged";
  } else if (normalizedStatus === "delivery_failed" || normalizedStatus === "failed") {
    status = "Delivery Failed";
  } else if (
    normalizedStatus === "pending" ||
    normalizedStatus === "new" ||
    normalizedStatus === "unfulfilled"
  ) {
    status = "New";
  } else if (normalizedStatus === "picking") {
    status = "Picking";
  } else if (normalizedStatus === "picked") {
    status = "Picked";
  } else if (normalizedStatus === "packing") {
    status = "Packing";
  } else if (
    normalizedStatus === "ready_to_assign" ||
    normalizedStatus === "readytoassign" ||
    normalizedStatus === "to_deliver" ||
    normalizedStatus === "packed"
  ) {
    status = "Ready to Assign";
  } else if (
    normalizedStatus === "assigned_to_driver" ||
    normalizedStatus === "partial_assigned_driver"
  ) {
    status = "Driver Accepted";
  } else if (
    normalizedStatus === "out_for_delivery" ||
    normalizedStatus === "in_delivery" ||
    normalizedStatus === "started" ||
    normalizedStatus === "driver_accepted"
  ) {
    status = "Started";
  } else if (
    normalizedStatus === "delivered" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "to_bill"
  ) {
    status = "Delivered";
  } else if (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled" ||
    normalizedStatus === "cancelled_delivery" ||
    normalizedStatus === "delivery_cancelled"
  ) {
    status = "Cancelled";
  } else if (
    normalizedStatus === "installation" ||
    normalizedStatus === "ready_for_installation" ||
    normalizedStatus === "in_installation" ||
    normalizedStatus === "installed"
  ) {
    status = "Installation";
  }

  const pickerName =
    raw.pickers && raw.pickers.length > 0
      ? raw.pickers.map((p: any) => p.name).join(", ")
      : raw.assigned_user?.name || null;

  const packerName =
    raw.packers && raw.packers.length > 0 ? raw.packers.map((p: any) => p.name).join(", ") : null;

  const totalItems =
    raw.summary?.total_items ??
    (raw.items && raw.items.length > 0
      ? raw.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)
      : raw.items
        ? raw.items.length
        : 1);

  let pickingStatus = raw.custom_picking_status;
  if (!pickingStatus) {
    if (typeof raw.summary?.picked_items === "number") {
      pickingStatus = `${raw.summary.picked_items}/${totalItems} Picked`;
    } else if (raw.items && raw.items.length > 0) {
      const pickedCount = raw.items.filter(
        (i: any) => i.status === "picked" || i.status === "packed" || i.status === "delivered",
      ).length;
      pickingStatus = `${pickedCount}/${totalItems} Picked`;
    } else if (
      [
        "picked",
        "packing",
        "packed",
        "ready_to_assign",
        "assigned_to_driver",
        "in_delivery",
        "out_for_delivery",
        "delivered",
      ].includes(rawStatus)
    ) {
      pickingStatus = `${totalItems}/${totalItems} Picked`;
    } else {
      pickingStatus = `0/${totalItems} Picked`;
    }
  }

  let packingStatus = raw.custom_packing_status;
  if (!packingStatus) {
    if (typeof raw.summary?.packed_items === "number") {
      packingStatus = `${raw.summary.packed_items}/${totalItems} Packed`;
    } else if (raw.items && raw.items.length > 0) {
      const packedCount = raw.items.filter(
        (i: any) => i.status === "packed" || i.status === "delivered",
      ).length;
      packingStatus = `${packedCount}/${totalItems} Packed`;
    } else if (
      [
        "packed",
        "ready_to_assign",
        "assigned_to_driver",
        "in_delivery",
        "out_for_delivery",
        "delivered",
      ].includes(rawStatus)
    ) {
      packingStatus = `${totalItems}/${totalItems} Packed`;
    } else {
      packingStatus = `0/${totalItems} Packed`;
    }
  }

  const rawOrderNum = raw.order_number ?? raw.order_no ?? raw.orderNumber;
  const orderNumber =
    rawOrderNum !== undefined && rawOrderNum !== null ? String(rawOrderNum) : undefined;
  const shopifyOrderId = raw.shopify_order_id ? String(raw.shopify_order_id) : undefined;
  const displayId = orderNumber || shopifyOrderId || String(raw.order_id || raw.id || "UNKNOWN");

  const rawShippingMethod =
    raw.shipping_method ||
    raw.shipping_title ||
    raw.shipping_lines?.[0]?.title ||
    raw.shipping_rate?.title ||
    raw.delivery_type ||
    raw.delivery_method ||
    raw.custom_shipping_method ||
    raw.payment?.shippingMethod ||
    "";

  const isExpress = Boolean(
    raw.is_express === true ||
    raw.is_express === 1 ||
    raw.is_express === "1" ||
    raw.is_express === "true" ||
    raw.express === true ||
    raw.express === 1 ||
    raw.express === "1" ||
    raw.express === "true" ||
    (typeof rawShippingMethod === "string" && rawShippingMethod.toLowerCase().includes("express")) ||
    (typeof raw.delivery_type === "string" && raw.delivery_type.toLowerCase().includes("express")) ||
    (typeof raw.delivery_method === "string" && raw.delivery_method.toLowerCase().includes("express")) ||
    (Array.isArray(raw.tags) && raw.tags.some((t: any) => typeof t === "string" && t.toLowerCase().includes("express"))) ||
    (typeof raw.tags === "string" && raw.tags.toLowerCase().includes("express")) ||
    (typeof raw.custom_tags === "string" && raw.custom_tags.toLowerCase().includes("express")) ||
    (Array.isArray(raw.shipping_lines) && raw.shipping_lines.some((s: any) => (s?.title || s?.code || "").toLowerCase().includes("express")))
  );

  const parsedTags: string[] = Array.isArray(raw.tags)
    ? raw.tags
    : typeof raw.tags === "string"
      ? raw.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : typeof raw.custom_tags === "string"
        ? raw.custom_tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : isExpress
          ? ["express"]
          : [];

  // Resolving customer details from all potential backend patterns (direct, nested, string, object, shipping address, recipient, etc.)
  let rawCustomerObj = raw.customer;
  if (typeof rawCustomerObj === "string" && (rawCustomerObj.trim().startsWith("{") || rawCustomerObj.trim().startsWith("["))) {
    try {
      rawCustomerObj = JSON.parse(rawCustomerObj);
    } catch {
      // ignore
    }
  }

  let orderCustomerObj = raw.order?.customer;
  if (typeof orderCustomerObj === "string" && (orderCustomerObj.trim().startsWith("{") || orderCustomerObj.trim().startsWith("["))) {
    try {
      orderCustomerObj = JSON.parse(orderCustomerObj);
    } catch {
      // ignore
    }
  }

  const resolvedCustomerName = (() => {
    // 1. Direct top-level name properties
    const directName =
      raw.customer_name ||
      raw.customerName ||
      raw.order?.customer_name ||
      raw.order?.customerName ||
      raw.client_name ||
      raw.recipient_name ||
      raw.receiver_name ||
      raw.contact_name;
    if (directName && typeof directName === "string" && directName.trim()) {
      return directName.trim();
    }

    // 2. raw.customer as plain string
    if (typeof raw.customer === "string" && raw.customer.trim() && !raw.customer.trim().startsWith("{")) {
      return raw.customer.trim();
    }
    if (typeof raw.order?.customer === "string" && raw.order.customer.trim() && !raw.order.customer.trim().startsWith("{")) {
      return raw.order.customer.trim();
    }

    // 3. Customer object properties
    const custObj = (rawCustomerObj && typeof rawCustomerObj === "object") ? rawCustomerObj : null;
    const ordCustObj = (orderCustomerObj && typeof orderCustomerObj === "object") ? orderCustomerObj : null;

    const fromObj =
      custObj?.name ||
      custObj?.customer_name ||
      custObj?.full_name ||
      ordCustObj?.name ||
      ordCustObj?.customer_name ||
      ordCustObj?.full_name;
    if (fromObj && typeof fromObj === "string" && fromObj.trim()) {
      return fromObj.trim();
    }

    // 4. first_name + last_name
    const first = (custObj?.first_name || ordCustObj?.first_name || "").toString().trim();
    const last = (custObj?.last_name || ordCustObj?.last_name || "").toString().trim();
    if (first || last) {
      const full = `${first} ${last}`.trim();
      if (full) return full;
    }

    // 5. Shipping address / delivery address / billing address name
    const shipName =
      raw.shipping_address?.name ||
      raw.delivery_address?.name ||
      raw.billing_address?.name ||
      raw.order?.shipping_address?.name ||
      raw.order?.delivery_address?.name;
    if (shipName && typeof shipName === "string" && shipName.trim()) {
      return shipName.trim();
    }

    const shipFirst = (raw.shipping_address?.first_name || raw.order?.shipping_address?.first_name || "").toString().trim();
    const shipLast = (raw.shipping_address?.last_name || raw.order?.shipping_address?.last_name || "").toString().trim();
    if (shipFirst || shipLast) {
      const full = `${shipFirst} ${shipLast}`.trim();
      if (full) return full;
    }

    // 6. User / customer_user
    const userName = raw.customer_user?.name || raw.user?.name || raw.order?.user?.name;
    if (userName && typeof userName === "string" && userName.trim()) {
      return userName.trim();
    }

    return "Customer";
  })();

  const resolvedCustomerEmail = (() => {
    const custObj = (rawCustomerObj && typeof rawCustomerObj === "object") ? rawCustomerObj : null;
    const ordCustObj = (orderCustomerObj && typeof orderCustomerObj === "object") ? orderCustomerObj : null;
    const directEmail =
      raw.customer_email ||
      raw.customerEmail ||
      raw.email ||
      raw.contact_email ||
      raw.order?.customer_email ||
      raw.order?.email ||
      custObj?.email ||
      ordCustObj?.email ||
      raw.shipping_address?.email ||
      raw.billing_address?.email;
    return typeof directEmail === "string" ? directEmail.trim() : "";
  })();

  const resolvedCustomerPhone = (() => {
    const custObj = (rawCustomerObj && typeof rawCustomerObj === "object") ? rawCustomerObj : null;
    const ordCustObj = (orderCustomerObj && typeof orderCustomerObj === "object") ? orderCustomerObj : null;
    const directPhone =
      raw.customer_phone ||
      raw.customerPhone ||
      raw.phone ||
      raw.contact_phone ||
      raw.mobile ||
      raw.order?.customer_phone ||
      raw.order?.phone ||
      custObj?.phone ||
      custObj?.mobile ||
      ordCustObj?.phone ||
      ordCustObj?.mobile ||
      raw.shipping_address?.phone ||
      raw.delivery_address?.phone ||
      raw.billing_address?.phone;
    return typeof directPhone === "string" && directPhone.trim() ? directPhone.trim() : "—";
  })();

  const resolvedDeliveryAddress = (() => {
    const custObj = (rawCustomerObj && typeof rawCustomerObj === "object") ? rawCustomerObj : null;
    const ordCustObj = (orderCustomerObj && typeof orderCustomerObj === "object") ? orderCustomerObj : null;
    const directAddr =
      raw.delivery_address ||
      raw.deliveryAddress ||
      raw.order?.delivery_address ||
      raw.address ||
      custObj?.delivery_address ||
      custObj?.address ||
      ordCustObj?.delivery_address ||
      ordCustObj?.address ||
      raw.shipping_address?.address1 ||
      raw.shipping_address?.line1 ||
      raw.shipping_address?.city ||
      raw.city;
    return typeof directAddr === "string" && directAddr.trim() ? directAddr.trim() : "—";
  })();

  const sourceRawItems = (Array.isArray(raw.items) && raw.items.length > 0)
    ? raw.items
    : (Array.isArray(raw.line_items) && raw.line_items.length > 0)
      ? raw.line_items
      : (Array.isArray(raw.order?.items) && raw.order.items.length > 0)
        ? raw.order.items
        : [];

  return {
    id: displayId,
    orderNumber: orderNumber || displayId,
    shopifyOrderId,
    customerId: `cust-${resolvedCustomerName.replace(/\s+/g, "-").toLowerCase() || "unknown"}`,
    tat: calculateTat(raw.created_at),
    date,
    time,
    customer: {
      name: resolvedCustomerName,
      email: resolvedCustomerEmail,
      phone: resolvedCustomerPhone,
    },
    customer_name: resolvedCustomerName,
    customer_phone: resolvedCustomerPhone,
    customer_email: resolvedCustomerEmail,
    delivery_address: resolvedDeliveryAddress,
    channel: "shopify",
    items: totalItems,
    status,
    city: resolvedDeliveryAddress,
    shippingAddress: {
      line1: raw.shipping_address?.address1 || raw.shipping_address?.line1 || resolvedDeliveryAddress,
      line2: raw.shipping_address?.address2 || raw.shipping_address?.line2 || "",
      city: raw.shipping_address?.city || resolvedDeliveryAddress || "Doha",
      country: raw.shipping_address?.country || "Qatar",
      lat: raw.latitude ?? raw.lat ?? 25.2854,
      lng: raw.longitude ?? raw.lng ?? 51.5310,
      building: raw.building || raw.building_no || "—",
      unit: raw.unit || raw.unit_no || "—",
      zone: raw.zone || raw.zone_no || "—",
      street: raw.street || "—",
    },
    coordinator: "-",
    driver: (() => {
      const d = raw.driver_user?.name || raw.assigned_user_name || raw.driver_name;
      if (!d || typeof d !== "string" || d.trim().toLowerCase() === "unassigned") return null;
      return d.trim();
    })(),
    driverStatus: (() => {
      const d = raw.driver_user?.name || raw.assigned_user_name || raw.driver_name;
      if (!d || typeof d !== "string" || d.trim().toLowerCase() === "unassigned") return null;
      return "Assigned";
    })(),
    picker: pickerName,
    packer: packerName,
    total: raw.summary?.total_amount ?? (raw.total_amount || 0),
    shopify: rawStatus === "delivered" ? "Fulfilled" : "Unfulfilled",
    pickingStatus,
    packingStatus,
    bags: raw.bag_count || 0,
    tags: parsedTags,
    notes: raw.notes || raw.custom_notes || raw.customer_notes || "",
    shippingMethod: rawShippingMethod || (isExpress ? "Express Delivery" : "Standard Delivery"),
    isExpress,
    line_items: sourceRawItems,
    itemsList: sourceRawItems.map((i: any) => {
      const isInstallable = Boolean(
        i.is_installable === true ||
        i.is_installable === 1 ||
        i.is_installable === "1" ||
        i.is_installable === "true" ||
        i.isInstallable === true ||
        i.isInstallable === 1 ||
        i.isInstallable === "1" ||
        i.isInstallable === "true" ||
        i.custom_is_installable === 1 ||
        i.custom_is_installable === true ||
        i.custom_is_installable === "1" ||
        i.custom_is_installable === "true" ||
        i.requires_installation === true ||
        i.requires_installation === 1 ||
        i.requires_installation === "1" ||
        i.requires_installation === "true",
      );

      const rawLineItemId = (i as any).line_item_id;
      const rawId = i.id;
      const rawItemId = (i as any).item_id;
      const rawOrderItemId = (i as any).order_item_id;

      const resolvedLineItemId = rawLineItemId
        ? String(rawLineItemId)
        : rawId && String(rawId).length > 6
          ? String(rawId)
          : rawOrderItemId && String(rawOrderItemId).length > 6
            ? String(rawOrderItemId)
            : rawLineItemId ?? rawId ?? rawOrderItemId ?? rawItemId;

      const finalLineItemIdStr = resolvedLineItemId ? String(resolvedLineItemId) : String(Math.random());

      const rawStatusStr = String(i.status || (i as any).custom_status || (i as any).raw_status || "").toLowerCase().trim();
      const isItemCancelled = rawStatusStr === "cancelled" || rawStatusStr === "canceled" || Boolean((i as any).is_cancelled || (i as any).cancelled);
      const isItemAdded = Boolean(
        (i as any).is_new ||
        (i as any).isNew ||
        (i as any).is_added ||
        (i as any).isAdded ||
        (i as any).added ||
        (i as any).is_replacement ||
        (i as any).isReplacement ||
        (i as any).is_exchange ||
        (i as any).isExchange ||
        rawStatusStr === "new" ||
        rawStatusStr === "added"
      );

      return {
        id: finalLineItemIdStr,
        line_item_id: finalLineItemIdStr,
        order_item_id: finalLineItemIdStr,
        item_id: rawItemId ?? undefined,
        is_flagged: Boolean(
          i.is_flagged === true ||
          i.is_flagged === 1 ||
          i.is_flagged === "1" ||
          i.is_flagged === "true" ||
          i.isFlagged === true ||
          i.flagged === true ||
          String(i.status || "").toLowerCase() === "flagged"
        ),
        isFlagged: Boolean(
          i.is_flagged === true ||
          i.is_flagged === 1 ||
          i.is_flagged === "1" ||
          i.is_flagged === "true" ||
          i.isFlagged === true ||
          i.flagged === true ||
          String(i.status || "").toLowerCase() === "flagged"
        ),
        flag_reason: i.flag_reason ?? i.flagged_reason ?? i.flaggedReason ?? null,
        flagged_reason: i.flag_reason ?? i.flagged_reason ?? i.flaggedReason ?? null,
        flaggedReason: i.flag_reason ?? i.flagged_reason ?? i.flaggedReason ?? null,
        flagged_image_url: i.flagged_image_url ?? i.flagged_image ?? i.flag_image_url ?? i.flag_image ?? null,
        flaggedImageUrl: i.flagged_image_url ?? i.flagged_image ?? i.flag_image_url ?? i.flag_image ?? null,
        flagged_by: i.flagged_by ?? i.flagged_user_name ?? null,
        flagged_at: i.flagged_at ?? null,
        assigned_to: i.assigned_to ?? null,
        assigned_user_name: i.assigned_user_name ?? null,
        assigned_at: i.assigned_at ?? null,
        picked_by: i.picked_by ?? null,
        picked_user_name: i.picked_user_name ?? null,
        packed_by: i.packed_by ?? null,
        packed_user_name: i.packed_user_name ?? null,
        delivered_by: i.delivered_by ?? null,
        delivered_user_name: i.delivered_user_name ?? null,
        picked_at: i.picked_at ?? null,
        packed_at: i.packed_at ?? null,
        delivered_at: i.delivered_at ?? null,
        is_scheduled_assigned: Boolean(i.is_scheduled_assigned || i.is_scheduled),
        name: i.product_name || "Product Item",
        sku: i.product_code || "",
        barcode: i.barcode || "",
        image: i.image || i.image_url || "",
        qty: i.quantity || 1,
        price: i.unit_price || 0,
        fc: "F01",
        fcName: "Fulfillment Center Hilal",
        bin: "—",
        status: isItemCancelled
          ? "Cancelled"
          : isItemAdded
            ? "Added New"
            : rawStatusStr === "picker_assigned"
              ? "Picker Assigned"
              : rawStatusStr === "picked" || rawStatusStr === "packed" || rawStatusStr === "delivered"
                ? "Prepared"
                : (i.status || "Pending"),
        is_cancelled: isItemCancelled,
        isCancelled: isItemCancelled,
        is_added: isItemAdded,
        isAdded: isItemAdded,
        is_new: isItemAdded,
        isNew: isItemAdded,
        raw_status: i.status || null,
        is_installable: isInstallable,
        isInstallable: isInstallable,
        installation_type: i.installation_type || null,
        installation_level: i.installation_level || null,
        installation: i.installation || null,
        product_tags:
          i.product_tags ??
          i.tags ??
          i.custom_product_tags ??
          i.product?.product_tags ??
          i.product?.tags ??
          i.product_tag ??
          null,
        gift_wrap:
          i.gift_wrap ??
          i.giftWrap ??
          i.gift_wrapper ??
          i.giftWrapper ??
          i.custom_gift_wrap ??
          null,
        giftWrap:
          i.gift_wrap ??
          i.giftWrap ??
          i.gift_wrapper ??
          i.giftWrapper ??
          i.custom_gift_wrap ??
          null,
        gift_message:
          i.gift_message ??
          i.giftMessage ??
          i.custom_gift_message ??
          null,
        giftMessage:
          i.gift_message ??
          i.giftMessage ??
          i.custom_gift_message ??
          null,
      };
    }),
    returns: (() => {
      const isWholeOrderCancelled =
        status === "Cancelled" ||
        status === "Delivery Failed" ||
        normalizedStatus === "cancelled" ||
        normalizedStatus === "canceled" ||
        normalizedStatus === "cancelled_delivery" ||
        normalizedStatus === "delivery_cancelled" ||
        rawStatus === "cancelled" ||
        rawStatus === "canceled" ||
        Boolean(raw.cancelled_at);
      if (isWholeOrderCancelled) return undefined;

      const cancelledCount = sourceRawItems.filter((i: any) => {
        const s = String(i.status || (i as any).custom_status || (i as any).raw_status || "").toLowerCase().trim();
        return s === "cancelled" || s === "canceled" || Boolean((i as any).is_cancelled || (i as any).cancelled);
      }).length;
      const count = cancelledCount || raw.custom_return_count || raw.return_count || (Array.isArray(raw.returns) ? raw.returns.length : 0);
      return count > 0 ? { type: "Return" as const, count } : undefined;
    })(),
    hasCancelledItems: (() => {
      const isWholeOrderCancelled =
        status === "Cancelled" ||
        status === "Delivery Failed" ||
        normalizedStatus === "cancelled" ||
        normalizedStatus === "canceled" ||
        normalizedStatus === "cancelled_delivery" ||
        normalizedStatus === "delivery_cancelled" ||
        rawStatus === "cancelled" ||
        rawStatus === "canceled" ||
        Boolean(raw.cancelled_at);
      if (isWholeOrderCancelled) return false;

      return sourceRawItems.some((i: any) => {
        const s = String(i.status || (i as any).custom_status || (i as any).raw_status || "").toLowerCase().trim();
        return s === "cancelled" || s === "canceled" || Boolean((i as any).is_cancelled || (i as any).cancelled);
      });
    })(),
    cancelledItemsCount: (() => {
      const isWholeOrderCancelled =
        status === "Cancelled" ||
        status === "Delivery Failed" ||
        normalizedStatus === "cancelled" ||
        normalizedStatus === "canceled" ||
        normalizedStatus === "cancelled_delivery" ||
        normalizedStatus === "delivery_cancelled" ||
        rawStatus === "cancelled" ||
        rawStatus === "canceled" ||
        Boolean(raw.cancelled_at);
      if (isWholeOrderCancelled) return 0;

      return sourceRawItems.filter((i: any) => {
        const s = String(i.status || (i as any).custom_status || (i as any).raw_status || "").toLowerCase().trim();
        return s === "cancelled" || s === "canceled" || Boolean((i as any).is_cancelled || (i as any).cancelled);
      }).length;
    })(),
    hasInstallation: Boolean(
      raw.has_installation ||
      raw.summary?.has_installation ||
      raw.is_installation ||
      rawStatus === "installation" ||
      normalizedStatus === "installation" ||
      (Array.isArray(raw.items) &&
        raw.items.some(
          (i: any) =>
            i.is_installable === true ||
            i.is_installable === 1 ||
            i.is_installable === "1" ||
            i.is_installable === "true" ||
            i.custom_is_installable === 1 ||
            i.custom_is_installable === true ||
            i.requires_installation === true ||
            Boolean(i.installation_type) ||
            Boolean(i.installation),
        )),
    ),
    installationItemsCount:
      typeof raw.summary?.installation_items === "number"
        ? raw.summary.installation_items
        : typeof raw.installation_items === "number"
          ? raw.installation_items
          : Array.isArray(raw.items)
            ? raw.items.filter(
                (i: any) =>
                  i.is_installable === true ||
                  i.is_installable === 1 ||
                  i.is_installable === "1" ||
                  i.is_installable === "true" ||
                  i.custom_is_installable === 1 ||
                  i.custom_is_installable === true ||
                  i.requires_installation === true ||
                  Boolean(i.installation_type) ||
                  Boolean(i.installation),
              ).length
            : 0,
    order_id: raw.order_id ?? raw.id,
    ready_to_assign: Boolean(
      raw.ready_to_assign ||
      raw.is_ready_to_assign ||
      raw.ready_assign ||
      raw.summary?.ready_to_assign ||
      raw.summary?.ready_assign ||
      raw.all_items_vs ||
      raw.summary?.all_items_vs
    ),
    is_ready_to_assign: Boolean(
      raw.ready_to_assign ||
      raw.is_ready_to_assign ||
      raw.ready_assign ||
      raw.summary?.ready_to_assign ||
      raw.summary?.ready_assign ||
      raw.all_items_vs ||
      raw.summary?.all_items_vs
    ),
    all_items_vs: Boolean(raw.all_items_vs || raw.summary?.all_items_vs),
    summary: raw.summary,
    rawOrder: raw,
    backend_status: normalizedStatus,
    rawStatus: normalizedStatus,
  };
}
