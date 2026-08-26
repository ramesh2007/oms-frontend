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
  name: string;                    // ERPNext document ID (e.g. "SO-00001")
  customer: string;                // Customer name
  customer_name?: string;          // Full customer display name
  contact_email?: string;          // Customer email
  contact_phone?: string;          // Customer phone
  order_type?: string;             // e.g. "Sales", "Shopping Cart"
  transaction_date?: string;       // Order date (YYYY-MM-DD)
  delivery_date?: string;          // Expected delivery date
  grand_total: number;             // Order total amount
  status: string;                  // ERPNext status (e.g. "To Deliver and Bill")
  delivery_status?: string;        // Custom delivery status
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
  const statusMap: Record<string, OrderStatus> = {
    // ERPNext standard statuses
    "Draft": "New",
    "To Deliver and Bill": "Unfulfilled",
    "To Deliver": "Ready to Assign",
    "To Bill": "Delivered",
    "Completed": "Delivered",
    "Cancelled": "Cancelled",

    // Custom statuses your ERPNext dev might create
    "Picking": "Picking",
    "Picked": "Picked",
    "Packing": "Packing",
    "Ready to Assign": "Ready to Assign",
    "Driver Accepted": "Driver Accepted",
    "Started": "Started",
    "Delivered": "Delivered",
    "Delivery Failed": "Delivery Failed",
    "Flagged": "Flagged",
    "New": "New",
    "Pending": "New",
    "Unfulfilled": "Unfulfilled",
    "Replacement": "Replacement",
    "Exchange": "Exchange",
    "Installation": "Installation",
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
  const time = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  let deliveryDate = undefined;
  if (raw.delivery_date) {
    const delDateObj = new Date(raw.delivery_date);
    if (!isNaN(delDateObj.getTime())) {
      deliveryDate = delDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  const rawLineItems = raw.line_items || raw.items || [];
  const itemCount = rawLineItems.length > 0
    ? rawLineItems.reduce((sum: number, item: any) => sum + (item.quantity ?? item.qty ?? 1), 0)
    : 0;

  const rawId = String(raw.name || (raw as any).id || (raw as any).order_id || "");
  const shopifyOrderId = (raw as any).shopify_order_id ? String((raw as any).shopify_order_id) : undefined;
  const orderNumber = (raw as any).order_number ? String((raw as any).order_number) : undefined;
  const displayId = shopifyOrderId || orderNumber || rawId;

  return {
    id: displayId,
    orderNumber: orderNumber || displayId,
    shopifyOrderId,
    customerId: `cust-${raw.customer?.replace(/\s+/g, "-").toLowerCase() || "unknown"}`,
    tat: raw.custom_tat || calculateTat(raw.transaction_date),
    date,
    time,
    customer: {
      name: raw.customer_name || raw.customer || "Unknown",
      email: raw.contact_email || "",
      phone: raw.contact_phone || "",
    },
    channel: mapChannel(raw.custom_channel),
    items: itemCount,
    line_items: rawLineItems,
    status: mapStatus(raw.status),
    returns: raw.custom_return_count
      ? { type: "Return", count: raw.custom_return_count }
      : undefined,
    city: raw.custom_city || "—",
    coordinator: raw.custom_coordinator || "-",
    driver: raw.custom_driver || null,
    driverStatus: raw.custom_driver_status || null,
    picker: raw.custom_picker || null,
    packer: raw.custom_packer || null,
    total: raw.grand_total || 0,
    shopify: (raw.custom_shopify_status as "Fulfilled" | "Unfulfilled" | "Pending") || "Unfulfilled",
    pickingStatus: raw.custom_picking_status,
    packingStatus: raw.custom_packing_status,
    bags: raw.custom_bags,
    tags: raw.custom_tags ? raw.custom_tags.split(",").map(t => t.trim()) : [],
    deliveryDate,
    zone: raw.custom_zone || "",
  };
}

/**
 * Maps an ERPNext or Shopify Sales Order Item → Dashboard OrderItemType
 */
export function mapErpNextToOrderItem(raw: ERPNextSalesOrderItem): OrderItemType {
  return {
    id: String(raw.id || raw.name || Math.random()),
    name: raw.name || raw.item_name || "Item",
    sku: raw.sku || raw.item_code || "",
    barcode: raw.custom_barcode || "",
    image: raw.image || "",
    qty: raw.quantity ?? raw.qty ?? 1,
    price: raw.price ?? raw.rate ?? 0,
    fc: "F01",
    fcName: raw.warehouse || "Default Warehouse",
    bin: raw.custom_bin || "—",
    status: (raw.custom_status as "Prepared" | "Accepted" | "Allocated" | "Pending") || "Pending",
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
    typeof rawPayment.total_price === "number"
      ? rawPayment.total_price
      : (raw.grand_total || 0);

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
    notes: raw.custom_notes || "",
    shippingAddress: {
      line1: raw.custom_shipping_address_line1 || "",
      line2: raw.custom_shipping_address_line2 || "",
      city: raw.custom_shipping_city || "",
      country: raw.custom_shipping_country || "Qatar",
      lat: raw.custom_latitude || 25.276987,
      lng: raw.custom_longitude || 51.520008,
    },
    matrix: [],
  };
}

/**
 * 🔄 LARAVEL API MAPPER: Converts Laravel Order API JSON → Dashboard Order
 * Maps responses from /api/orders/status/{all,new,ready-to-assign,picking,picked,packing,in-delivery,delivered}
 */
export function mapLaravelOrderToDashboardOrder(raw: any): Order {
  if (!raw) return mapErpNextToOrder({ name: "UNKNOWN", customer: "UNKNOWN", grand_total: 0, status: "New" });

  // If payload is already standard ERPNext format, fallback to mapErpNextToOrder
  if (raw.name && !raw.order_number) {
    return mapErpNextToOrder(raw);
  }

  const dateObj = raw.created_at ? new Date(raw.created_at) : new Date();
  const date = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const rawStatus = (raw.status || "pending").toLowerCase();
  const hasDriverAssigned = Boolean(
    raw.driver_user ||
    raw.driver_assignment ||
    raw.assigned_driver_user_id ||
    raw.driver_name
  );

  let status: OrderStatus = "New";
  if (rawStatus === "flagged") {
    status = "Flagged";
  } else if (rawStatus === "delivery_failed" || rawStatus === "failed") {
    status = "Delivery Failed";
  } else if (hasDriverAssigned && rawStatus !== "delivered" && rawStatus !== "cancelled") {
    status = "Started";
  } else if (rawStatus === "ready_to_assign" || rawStatus === "packed") {
    status = "Ready to Assign";
  } else if (rawStatus === "pending") {
    status = "New";
  } else if (rawStatus === "picking") {
    status = "Picking";
  } else if (rawStatus === "picked") {
    status = "Picked";
  } else if (rawStatus === "packing") {
    status = "Packing";
  } else if (rawStatus === "assigned_to_driver" || rawStatus === "out_for_delivery" || rawStatus === "in_delivery" || rawStatus === "started" || rawStatus === "driver_accepted") {
    status = "Started";
  } else if (rawStatus === "delivered") {
    status = "Delivered";
  } else if (rawStatus === "cancelled") {
    status = "Cancelled";
  }

  const pickerName = raw.pickers && raw.pickers.length > 0
    ? raw.pickers.map((p: any) => p.name).join(", ")
    : (raw.assigned_user?.name || null);

  const packerName = raw.packers && raw.packers.length > 0
    ? raw.packers.map((p: any) => p.name).join(", ")
    : null;

  const totalItems = raw.summary?.total_items ?? (raw.items && raw.items.length > 0 ? raw.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) : (raw.items ? raw.items.length : 1));

  let pickingStatus = raw.custom_picking_status;
  if (!pickingStatus) {
    if (typeof raw.summary?.picked_items === "number") {
      pickingStatus = `${raw.summary.picked_items}/${totalItems} Picked`;
    } else if (raw.items && raw.items.length > 0) {
      const pickedCount = raw.items.filter((i: any) => i.status === "picked" || i.status === "packed" || i.status === "delivered").length;
      pickingStatus = `${pickedCount}/${totalItems} Picked`;
    } else if (["picked", "packing", "packed", "ready_to_assign", "assigned_to_driver", "in_delivery", "out_for_delivery", "delivered"].includes(rawStatus)) {
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
      const packedCount = raw.items.filter((i: any) => i.status === "packed" || i.status === "delivered").length;
      packingStatus = `${packedCount}/${totalItems} Packed`;
    } else if (["packed", "ready_to_assign", "assigned_to_driver", "in_delivery", "out_for_delivery", "delivered"].includes(rawStatus)) {
      packingStatus = `${totalItems}/${totalItems} Packed`;
    } else {
      packingStatus = `0/${totalItems} Packed`;
    }
  }

  const shopifyOrderId = raw.shopify_order_id ? String(raw.shopify_order_id) : undefined;
  const orderNumber = raw.order_number ? String(raw.order_number) : undefined;
  const displayId = shopifyOrderId || orderNumber || String(raw.order_id || raw.id || "UNKNOWN");

  return {
    id: displayId,
    orderNumber: orderNumber || displayId,
    shopifyOrderId,
    customerId: `cust-${raw.customer?.name?.replace(/\s+/g, "-").toLowerCase() || "unknown"}`,
    tat: calculateTat(raw.created_at),
    date,
    time,
    customer: {
      name: raw.customer?.name || "Unknown Customer",
      email: raw.customer?.email || "",
      phone: raw.customer?.phone || "N/A",
    },
    channel: "shopify",
    items: totalItems,
    status,
    city: raw.customer?.delivery_address || "—",
    coordinator: "-",
    driver: raw.driver_user?.name || raw.assigned_user_name || raw.driver_name || null,
    driverStatus: (raw.driver_user || raw.assigned_user_name || raw.driver_name) ? "Assigned" : null,
    picker: pickerName,
    packer: packerName,
    total: raw.summary?.total_amount ?? (raw.total_amount || 0),
    shopify: rawStatus === "delivered" ? "Fulfilled" : "Unfulfilled",
    pickingStatus,
    packingStatus,
    bags: raw.bag_count || 0,
    tags: [],
    itemsList: (raw.items || []).map((i: any) => ({
      id: String(i.item_id || i.line_item_id || Math.random()),
      name: i.product_name || "Product Item",
      sku: i.product_code || "",
      barcode: i.barcode || "",
      image: i.image || i.image_url || "",
      qty: i.quantity || 1,
      price: i.unit_price || 0,
      fc: "F01",
      fcName: "Fulfillment Center Hilal",
      bin: "—",
      status: i.status === "picked" ? "Prepared" : "Pending",
    })),
  };
}


