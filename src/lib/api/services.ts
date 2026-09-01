/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  ERPNext API Service — Order Operations                                      ║
 * ║                                                                              ║
 * ║  This is the "bridge" between your dashboard and ERPNext.                    ║
 * ║  Each function either:                                                       ║
 * ║    • Returns mock data (when VITE_USE_MOCK_DATA=true)                        ║
 * ║    • Calls the ERPNext API (when VITE_USE_MOCK_DATA=false)                   ║
 * ║                                                                              ║
 * ║  Your React components call these functions. They never need to know         ║
 * ║  whether the data comes from mock or live API — it's automatic!              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { isDemoMode } from "./config";
import { erpNextClient } from "./client";
import {
  mapErpNextToOrder,
  mapErpNextToEnrichedOrder,
  mapLaravelOrderToDashboardOrder,
  type ERPNextSalesOrder,
  type ERPNextListResponse,
  type ERPNextDocResponse,
} from "./mappers";
import {
  MOCK_ORDERS,
  getEnrichedOrder as getMockEnrichedOrder,
  type Order,
  type EnrichedOrder,
} from "@/lib/orders";
import {
  getSharedOrders,
  updateSharedOrder,
  deleteSharedOrder,
  broadcastChange,
  assignPickerItemsToOrder,
  unassignPickerItemsFromOrder,
  assignPackerItemsToOrder,
  unassignPackerItemsFromOrder,
} from "@/lib/sync";

// ─── Orders Service ──────────────────────────────────────────────────────


/**
 * Fetch all orders.
 *
 * In demo mode → returns MOCK_ORDERS
 * In live mode → calls GET /api/resource/Sales Order
 *
 * USAGE IN COMPONENTS:
 *   const orders = await ordersApi.fetchOrders();
 */
export async function fetchOrders(): Promise<Order[]> {
  // ── Demo mode: return from shared localStorage store ──
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 100));
    return getSharedOrders();
  }

  // ── Live mode: call dedicated Laravel OrderStatusApiController /api/orders/all ──
  try {
    const response: any = await erpNextClient.get("/api/orders/all?per_page=100");
    if (response && Array.isArray(response.data)) {
      return response.data.map(mapLaravelOrderToDashboardOrder);
    }
  } catch (err) {
    console.warn("Error calling /api/orders/all, attempting fallback /api/orders/status/all", err);
  }

  try {
    const response: any = await erpNextClient.get("/api/orders/status/all?per_page=100");
    if (response && Array.isArray(response.data)) {
      return response.data.map(mapLaravelOrderToDashboardOrder);
    }
  } catch (err) {
    console.warn("Fallback to ERPNext /api/resource/Sales Order", err);
  }

  // Fallback to ERPNext legacy resource endpoint if needed
  try {
    const response = await erpNextClient.get<ERPNextListResponse<ERPNextSalesOrder>>(
      "/api/resource/Sales Order",
      {
        fields: JSON.stringify([
          "name",
          "customer",
          "customer_name",
          "contact_email",
          "contact_phone",
          "transaction_date",
          "grand_total",
          "status",
          "custom_city",
          "custom_coordinator",
          "custom_driver",
          "custom_driver_status",
          "custom_picker",
          "custom_packer",
          "custom_channel",
          "custom_tat",
          "custom_bags",
          "custom_picking_status",
          "custom_packing_status",
          "custom_shopify_status",
          "custom_return_count",
          "custom_tags",
          "delivery_date",
        ]),
        limit_page_length: "500",
        order_by: "creation desc",
      },
    );
    return response.data.map(mapErpNextToOrder);
  } catch {
    return [];
  }
}

const getCleanOrderId = (id: string): string => String(id || "").replace(/^#/, "");

/**
 * Fetch a single order with full details (items, timeline, etc.)
 */
export async function fetchOrderDetails(orderId: string): Promise<EnrichedOrder | undefined> {
  // ── Demo mode: read from shared store, then enrich ──
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 100));
    const orders = getSharedOrders();
    const base = orders.find((o) => o.id === orderId || o.id === getCleanOrderId(orderId));
    if (!base) return undefined;
    const idx = MOCK_ORDERS.findIndex((o) => o.id === orderId || o.id === getCleanOrderId(orderId));
    if (idx >= 0) Object.assign(MOCK_ORDERS[idx], base);
    return getMockEnrichedOrder(base.id);
  }

  // ── Live mode: Call Laravel salesOrderDetail endpoint ──
  const cleanId = getCleanOrderId(orderId);

  // 1. Try public salesOrderDetail endpoints (/api/demo/order-management/orders/{cleanId} or /api/admin/order/{cleanId})
  try {
    const response: any = await erpNextClient.get(`/api/demo/order-management/orders/${cleanId}`);
    if (response && response.data && (response.data.name || response.data.customer_name || response.data.line_items)) {
      return mapErpNextToEnrichedOrder(response.data);
    }
  } catch (err) {
    console.warn("[OrderDetails] /api/demo/order-management/orders failed, trying next fallback:", err);
  }

  try {
    const response: any = await erpNextClient.get(`/api/admin/order/${cleanId}`);
    if (response && response.data && (response.data.name || response.data.customer_name || response.data.line_items)) {
      return mapErpNextToEnrichedOrder(response.data);
    }
  } catch (err) {
    console.warn("[OrderDetails] /api/admin/order failed, trying next fallback:", err);
  }

  try {
    const response: any = await erpNextClient.get(`/api/order-details/${cleanId}`);
    if (response && response.data && (response.data.name || response.data.customer_name || response.data.line_items)) {
      return mapErpNextToEnrichedOrder(response.data);
    }
  } catch (err) {
    console.warn("[OrderDetails] /api/order-details failed, trying next fallback:", err);
  }

  // 2. Try legacy Sales Order resource endpoint
  try {
    const response = await erpNextClient.get<ERPNextDocResponse<ERPNextSalesOrder>>(
      `/api/resource/Sales Order/${cleanId}`,
    );
    if (response && response.data) {
      return mapErpNextToEnrichedOrder(response.data);
    }
  } catch {
    // Continue to next fallback
  }

  // 3. Fallback to /api/orders/{cleanId} ONLY if it returns valid non-empty order object or non-empty array
  try {
    const response: any = await erpNextClient.get(`/api/orders/${cleanId}`);
    if (response && response.data && !Array.isArray(response.data)) {
      const rawData = response.data;
      const baseOrder = mapLaravelOrderToDashboardOrder(rawData);
      return {
        ...baseOrder,
        zone: "No Zone",
        itemsList: baseOrder.itemsList || [],
        returnsList: [],
        timeline: [],
        payment: {
          method: "Cash",
          totalPaid: baseOrder.total,
          cash: baseOrder.total,
          card: 0,
          subtotal: baseOrder.total - 10,
          discount: 0,
          shipping: 10,
          total: baseOrder.total,
          balance: 0,
          shippingMethod: "Standard Delivery",
        },
        notes: rawData.notes || "",
        shippingAddress: {
          line1: rawData.customer?.delivery_address || "",
          line2: "",
          city: rawData.customer?.delivery_address || "",
          country: "Qatar",
          lat: 25.276987,
          lng: 51.520008,
        },
        matrix: [],
      };
    } else if (response && Array.isArray(response.data) && response.data.length > 0) {
      const rawData = response.data[0];
      const baseOrder = mapLaravelOrderToDashboardOrder(rawData);
      return {
        ...baseOrder,
        zone: "No Zone",
        itemsList: baseOrder.itemsList || [],
        returnsList: [],
        timeline: [],
        payment: {
          method: "Cash",
          totalPaid: baseOrder.total,
          cash: baseOrder.total,
          card: 0,
          subtotal: baseOrder.total - 10,
          discount: 0,
          shipping: 10,
          total: baseOrder.total,
          balance: 0,
          shippingMethod: "Standard Delivery",
        },
        notes: rawData.notes || "",
        shippingAddress: {
          line1: rawData.customer?.delivery_address || "",
          line2: "",
          city: rawData.customer?.delivery_address || "",
          country: "Qatar",
          lat: 25.276987,
          lng: 51.520008,
        },
        matrix: [],
      };
    }
  } catch {
    // Ignore
  }

  return undefined;
}


/**
 * Update an order's status.
 *
 * USAGE:
 *   await ordersApi.updateOrderStatus("SO-00001", "Delivered");
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
): Promise<void> {
  if (isDemoMode()) {
    updateSharedOrder(orderId, (o) => {
      o.status = newStatus as any;
    });
    broadcastChange();
    console.log(`[Sync] Updated order ${orderId} to status: ${newStatus}`);
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    status: newStatus,
  });
}

/**
 * Assign a driver to an order.
 *
 * USAGE:
 *   await ordersApi.assignDriver("SO-00001", "driver_name");
 */
export async function assignDriver(
  orderId: string,
  driverName: string,
): Promise<void> {
  if (isDemoMode()) {
    updateSharedOrder(orderId, (o) => {
      o.driver = driverName || null;
      o.driverStatus = driverName ? "Assigned" : null;
      if (driverName) o.status = "Driver Accepted";
    });
    broadcastChange();
    console.log(`[Sync] Assigned driver ${driverName} to order ${orderId}`);
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    custom_driver: driverName,
    custom_driver_status: "Assigned",
  });
}

/**
 * Assign a picker to an order.
 */
export async function assignPicker(
  orderId: string,
  pickerName: string,
): Promise<void> {
  if (isDemoMode()) {
    updateSharedOrder(orderId, (o) => {
      o.picker = pickerName || null;
      if (pickerName) o.status = "Picking";
    });
    broadcastChange();
    console.log(`[Sync] Assigned picker ${pickerName} to order ${orderId}`);
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    custom_picker: pickerName,
  });
}

/**
 * Assign picker items to an order via POST /api/orders/assign-picker-items
 */
export async function assignPickerItems(
  orderId: string,
  pickerIdOrName: string | number,
  orderItems: (number | string)[],
  pickerName?: string,
): Promise<any> {
  const cleanId = getCleanOrderId(orderId);
  const isNumericPickerId =
    typeof pickerIdOrName === "number" ||
    (typeof pickerIdOrName === "string" &&
      pickerIdOrName.trim() !== "" &&
      !isNaN(Number(pickerIdOrName)));

  const pickerId = isNumericPickerId ? Number(pickerIdOrName) : null;
  const resolvedPickerName =
    pickerName || (typeof pickerIdOrName === "string" ? pickerIdOrName : undefined);

  return assignPickerItemsToOrder({
    order_id: cleanId,
    order_number: cleanId,
    order: cleanId,
    picker_id: pickerId,
    picker_name: resolvedPickerName,
    picker: resolvedPickerName || (pickerId !== null ? pickerId : undefined),
    order_items: orderItems,
  });
}

/**
 * Unassign picker items from an order via POST /api/orders/unassign-picker-items
 */
export async function unassignPickerItems(
  orderId: string,
  orderItems: (number | string)[],
): Promise<any> {
  const cleanId = getCleanOrderId(orderId);
  return unassignPickerItemsFromOrder({
    order_id: cleanId,
    order_number: cleanId,
    order_items: orderItems,
  });
}

/**
 * Assign packer items to an order via POST /api/orders/assign-packer-items
 */
export async function assignPackerItems(
  orderId: string,
  packerIdOrName: string | number,
  orderItems: (number | string)[],
  packerName?: string,
): Promise<any> {
  const cleanId = getCleanOrderId(orderId);
  return assignPackerItemsToOrder({
    order_id: cleanId,
    order_number: cleanId,
    packer_id: packerIdOrName,
    packer_name: packerName || (typeof packerIdOrName === "string" ? packerIdOrName : undefined),
    order_items: orderItems,
  });
}

/**
 * Unassign packer items from an order via POST /api/orders/unassign-packer-items
 */
export async function unassignPackerItems(
  orderId: string,
  orderItems: (number | string)[],
): Promise<any> {
  const cleanId = getCleanOrderId(orderId);
  return unassignPackerItemsFromOrder({
    order_id: cleanId,
    order_number: cleanId,
    order_items: orderItems,
  });
}

/**
 * Assign a packer to an order.
 */
export async function assignPacker(
  orderId: string,
  packerName: string,
): Promise<void> {
  if (isDemoMode()) {
    updateSharedOrder(orderId, (o) => {
      o.packer = packerName || null;
      if (packerName) o.status = "Packing";
    });
    broadcastChange();
    console.log(`[Sync] Assigned packer ${packerName} to order ${orderId}`);
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    custom_packer: packerName,
  });
}

/**
 * Update driver status for an order.
 */
export async function updateDriverStatus(
  orderId: string,
  driverStatus: string,
): Promise<void> {
  if (isDemoMode()) {
    updateSharedOrder(orderId, (o) => {
      o.driverStatus = driverStatus || null;
      // Map driver status changes to order status
      if (driverStatus === "Started") o.status = "Started";
      if (driverStatus === "Completed") o.status = "Delivered";
      if (driverStatus === "Failed") o.status = "Delivery Failed";
    });
    broadcastChange();
    console.log(`[Sync] Updated driver status for order ${orderId} to: ${driverStatus}`);
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    custom_driver_status: driverStatus,
  });
}

/**
 * Update payment details for an order.
 */
export async function updatePaymentDetails(
  orderId: string,
  paymentMethod: string,
  balance: number,
): Promise<void> {
  if (isDemoMode()) {
    updateSharedOrder(orderId, (o) => {
      (o as any).paymentMethod = paymentMethod;
      (o as any).paymentBalance = balance;
    });
    broadcastChange();
    console.log(`[Sync] Updated payment details for order ${orderId}: method=${paymentMethod}, balance=${balance}`);
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    custom_payment_method: paymentMethod,
    custom_payment_balance: balance,
  });
}

/**
 * Update notes for an order.
 */
export async function updateOrderNotes(
  orderId: string,
  notes: string,
): Promise<void> {
  if (isDemoMode()) {
    updateSharedOrder(orderId, (o) => {
      o.notes = notes;
    });
    broadcastChange();
    console.log(`[Sync] Updated notes for order ${orderId} to: ${notes}`);
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    custom_notes: notes,
  });
}

/** Delete an order. */
export async function deleteOrder(orderId: string): Promise<void> {
  if (isDemoMode()) {
    deleteSharedOrder(orderId);
    broadcastChange();
    console.log(`[Sync] Deleted order ${orderId}`);
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  await erpNextClient.delete(`/api/resource/Sales Order/${cleanId}`);
}

/** Update order details. */
export async function updateOrderDetails(
  orderId: string,
  updates: {
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    city?: string;
    bags?: number;
    total?: number;
  }
): Promise<void> {
  if (isDemoMode()) {
    updateSharedOrder(orderId, (o) => {
      if (updates.customerName) o.customer.name = updates.customerName;
      if (updates.customerPhone) o.customer.phone = updates.customerPhone;
      if (updates.customerEmail) o.customer.email = updates.customerEmail;
      if (updates.city) o.city = updates.city;
      if (updates.bags !== undefined) o.bags = updates.bags;
      if (updates.total !== undefined) o.total = updates.total;
    });
    broadcastChange();
    console.log(`[Sync] Updated order details for ${orderId}`, updates);
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    customer_name: updates.customerName,
    contact_phone: updates.customerPhone,
    contact_email: updates.customerEmail,
    custom_city: updates.city,
    custom_bags: updates.bags,
    grand_total: updates.total,
  });
}

/**
 * Fetch status-specific paginated orders from Laravel API endpoints:
 * - GET /api/orders/status/all & /api/orders/all
 * - GET /api/orders/status/new & /api/orders/new
 * - GET /api/orders/status/ready-to-assign & /api/orders/ready-to-assign
 * - GET /api/orders/status/picking & /api/orders/picking
 * - GET /api/orders/status/picked & /api/orders/picked
 * - GET /api/orders/status/packing & /api/orders/packing
 * - GET /api/orders/status/in-delivery & /api/orders/in-delivery
 * - GET /api/orders/status/delivered & /api/orders/delivered
 */
export async function fetchOrdersByStatus(statusName: string, page = 1, perPage = 15) {
  if (isDemoMode()) {
    const orders = getSharedOrders();
    let filtered = orders;
    const lowerStatus = statusName.toLowerCase();
    if (lowerStatus === "new") {
      filtered = orders.filter((o) => o.status === "New" || o.status === "Unfulfilled");
    } else if (lowerStatus === "ready-to-assign") {
      filtered = orders.filter((o) => o.status === "Ready to Assign");
    } else if (lowerStatus === "picking") {
      filtered = orders.filter((o) => o.status === "Picking");
    } else if (lowerStatus === "picked") {
      filtered = orders.filter((o) => o.status === "Picked");
    } else if (lowerStatus === "packing") {
      filtered = orders.filter((o) => o.status === "Packing");
    } else if (lowerStatus === "in-delivery") {
      filtered = orders.filter((o) => o.status === "Started" || o.status === "Driver Accepted");
    } else if (lowerStatus === "delivered") {
      filtered = orders.filter((o) => o.status === "Delivered");
    }

    const total = filtered.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(page, lastPage);
    const from = total > 0 ? (safePage - 1) * perPage + 1 : 0;
    const to = Math.min(safePage * perPage, total);
    const paginatedData = filtered.slice(from > 0 ? from - 1 : 0, to);

    return {
      success: true,
      status_filter: statusName,
      pagination: {
        current_page: safePage,
        per_page: perPage,
        total,
        last_page: lastPage,
        from,
        to,
        has_more_pages: safePage < lastPage,
        next_page_url: safePage < lastPage ? `/api/orders/status/${statusName}?page=${safePage + 1}` : null,
        prev_page_url: safePage > 1 ? `/api/orders/status/${statusName}?page=${safePage - 1}` : null,
      },
      data: paginatedData,
      mappedOrders: paginatedData,
    };
  }

  // Live Mode: call dedicated Laravel status endpoint
  const endpoint = `/api/orders/status/${statusName}?page=${page}&per_page=${perPage}`;
  const response: any = await erpNextClient.get(endpoint);

  if (response) {
    const rawData = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response)
      ? response
      : [];
    const mappedOrders = rawData.map(mapLaravelOrderToDashboardOrder);

    const totalItems = response.pagination?.total ?? response.total ?? mappedOrders.length;
    const lastPg = response.pagination?.last_page ?? response.last_page ?? Math.max(1, Math.ceil(totalItems / perPage));

    const pagination = response.pagination || {
      current_page: page,
      per_page: perPage,
      total: totalItems,
      last_page: lastPg,
      from: response.from ?? (mappedOrders.length > 0 ? (page - 1) * perPage + 1 : 0),
      to: response.to ?? Math.min(page * perPage, totalItems),
      has_more_pages: response.has_more_pages ?? (page < lastPg),
      next_page_url: response.next_page_url ?? null,
      prev_page_url: response.prev_page_url ?? null,
    };

    return {
      success: response.success ?? true,
      status_filter: response.status_filter ?? statusName,
      pagination,
      data: rawData,
      mappedOrders,
    };
  }

  return response;
}

/** 1. GET /api/orders/status/all or /api/orders/all */
export const fetchAllOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("all", page, perPage);

/** 2. GET /api/orders/status/new or /api/orders/new */
export const fetchNewOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("new", page, perPage);

/** 3. GET /api/orders/status/ready-to-assign or /api/orders/ready-to-assign */
export const fetchReadyToAssignOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("ready-to-assign", page, perPage);

/** 4. GET /api/orders/status/picking or /api/orders/picking */
export const fetchPickingOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("picking", page, perPage);

/** 5. GET /api/orders/status/picked or /api/orders/picked */
export const fetchPickedOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("picked", page, perPage);

/** 6. GET /api/orders/status/packing or /api/orders/packing */
export const fetchPackingOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("packing", page, perPage);

/** 7. GET /api/orders/status/in-delivery or /api/orders/in-delivery */
export const fetchInDeliveryOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("in-delivery", page, perPage);

/** 8. GET /api/orders/status/delivered or /api/orders/delivered */
export const fetchDeliveredOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("delivered", page, perPage);

/** 9. GET /api/orders/status/flagged or /api/orders/flagged */
export const fetchFlaggedOrders = async (page = 1, perPage = 15) => {
  if (isDemoMode()) {
    return fetchOrdersByStatus("flagged", page, perPage);
  }
  try {
    const res = await fetchOrdersByStatus("flagged", page, perPage);
    if (res && (res.mappedOrders?.length > 0 || res.data?.length > 0)) {
      return res;
    }
  } catch (e) {
    console.warn("[FlaggedOrders] /api/orders/status/flagged failed, trying /api/orders/flagged fallback:", e);
  }

  // Fallback to /api/orders/flagged
  try {
    const response: any = await erpNextClient.get(`/api/orders/flagged?page=${page}&per_page=${perPage}`);
    const rawData = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    const mappedOrders = rawData.map(mapLaravelOrderToDashboardOrder);
    return {
      success: response?.success ?? true,
      status_filter: "flagged",
      pagination: response?.pagination || {
        current_page: page,
        per_page: perPage,
        total: mappedOrders.length,
        last_page: 1,
        from: mappedOrders.length > 0 ? (page - 1) * perPage + 1 : 0,
        to: Math.min(page * perPage, mappedOrders.length),
        has_more_pages: false,
      },
      data: rawData,
      mappedOrders,
    };
  } catch (err) {
    console.error("[FlaggedOrders] Failed to fetch flagged orders:", err);
    return { success: false, data: [], mappedOrders: [], pagination: { current_page: 1, per_page: perPage, total: 0, last_page: 1 } };
  }
};

/** 10. GET /api/orders/flagged-items */
export const fetchFlaggedItems = async () => {
  if (isDemoMode()) {
    return {
      success: true,
      data: [
        {
          id: 1,
          order_id: "7045961220340",
          item_name: "Fresh Whole Milk 1L",
          sku: "MILK-001",
          reason: "Damaged packaging during picking",
          flagged_by: "John Picker",
          flagged_at: "2026-08-26 14:30:00",
          status: "Flagged",
        },
      ],
    };
  }

  try {
    const response: any = await erpNextClient.get("/api/orders/flagged-items");
    return response;
  } catch (err) {
    console.error("[FlaggedItems] Failed to fetch flagged items via GET /api/orders/flagged-items:", err);
    return { success: false, data: [] };
  }
};

// ─── Export as a single object for convenience ───────────────────────────
export const ordersApi = {
  fetchOrders,
  fetchOrderDetails,
  fetchOrdersByStatus,
  fetchAllOrders,
  fetchNewOrders,
  fetchReadyToAssignOrders,
  fetchPickingOrders,
  fetchPickedOrders,
  fetchPackingOrders,
  fetchInDeliveryOrders,
  fetchDeliveredOrders,
  fetchFlaggedOrders,
  fetchFlaggedItems,
  updateOrderStatus,
  assignDriver,
  assignPicker,
  assignPickerItems,
  unassignPickerItems,
  assignPacker,
  assignPackerItems,
  unassignPackerItems,
  updateDriverStatus,
  updatePaymentDetails,
  updateOrderNotes,
  deleteOrder,
  updateOrderDetails,
};


