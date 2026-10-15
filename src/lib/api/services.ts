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
  matchesLegacyTab,
  type Order,
  type EnrichedOrder,
} from "@/lib/orders";
import {
  getSharedOrders,
  updateSharedOrder,
  deleteSharedOrder,
  broadcastChange,
  assignPickerItemsToOrder,
  orderWisePickerUnassign as syncOrderWisePickerUnassign,
  unassignPickerItemsFromOrder,
  assignPackerItemsToOrder,
  unassignPackerItemsFromOrder,
  getPickers,
  getPackers,
} from "@/lib/sync";
import { getAppointments } from "@/lib/scheduling";

export { getPickers, getPackers };

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

  // ── Live mode: call dedicated Laravel OrderStatusApiController /api/admin/orders/status/all ──
  try {
    const response: any = await erpNextClient.get("/api/admin/orders/status/all?per_page=100");
    if (response && Array.isArray(response.data)) {
      return response.data.map(mapLaravelOrderToDashboardOrder);
    }
  } catch (err) {
    console.warn(
      "Error calling /api/admin/orders/status/all, attempting fallback /api/admin/orders/all",
      err,
    );
  }

  try {
    const response: any = await erpNextClient.get("/api/admin/orders/all?per_page=100");
    if (response && Array.isArray(response.data)) {
      return response.data.map(mapLaravelOrderToDashboardOrder);
    }
  } catch (err) {
    console.warn("Fallback to /api/orders/status/all", err);
  }

  try {
    const response: any = await erpNextClient.get("/api/orders/status/all?per_page=100");
    if (response && Array.isArray(response.data)) {
      return response.data.map(mapLaravelOrderToDashboardOrder);
    }
  } catch (err) {
    console.warn("Error calling /api/orders/status/all, attempting fallback /api/orders/all", err);
  }

  try {
    const response: any = await erpNextClient.get("/api/orders/all?per_page=100");
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
  const cleanId = getCleanOrderId(orderId);
  const isMockOrder = MOCK_ORDERS.some((o) => o.id === orderId || o.id === cleanId);

  // ── Demo mode or Mock order ID: return mock enriched order immediately ──
  if (isDemoMode() || isMockOrder) {
    const orders = getSharedOrders();
    const base = orders.find((o) => o.id === orderId || o.id === cleanId) || MOCK_ORDERS.find((o) => o.id === orderId || o.id === cleanId);
    if (base) {
      const idx = MOCK_ORDERS.findIndex((o) => o.id === base.id);
      if (idx >= 0) Object.assign(MOCK_ORDERS[idx], base);
      return getMockEnrichedOrder(base.id);
    }
    if (isMockOrder) {
      return getMockEnrichedOrder(cleanId);
    }
  }

  // 1. Try public salesOrderDetail endpoints (/api/admin/order-details/{cleanId} or /api/order-details/{cleanId})
  try {
    const response: any = await erpNextClient.get(`/api/admin/order-details/${cleanId}`);
    if (
      response &&
      response.data &&
      (response.data.name || response.data.customer_name || response.data.line_items)
    ) {
      return mapErpNextToEnrichedOrder(response.data);
    }
  } catch (err) {
    console.warn("[OrderDetails] /api/admin/order-details failed, trying next fallback:", err);
  }

  try {
    const response: any = await erpNextClient.get(`/api/order-details/${cleanId}`);
    if (
      response &&
      response.data &&
      (response.data.name || response.data.customer_name || response.data.line_items)
    ) {
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
        notes: rawData.notes || rawData.custom_notes || rawData.customer_notes || baseOrder.notes || "",
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
        notes: rawData.notes || rawData.custom_notes || rawData.customer_notes || baseOrder.notes || "",
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

  return getMockEnrichedOrder(cleanId);
}

/**
 * Update an order's status.
 *
 * USAGE:
 *   await ordersApi.updateOrderStatus("SO-00001", "Delivered");
 */
export async function updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
  const cleanId = getCleanOrderId(orderId);
  const normalized = newStatus.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (isDemoMode()) {
    updateSharedOrder(orderId, (o) => {
      o.status = (normalized === "ready_to_assign" ? "Ready to Assign" : newStatus) as any;
    });
    broadcastChange();
    console.log(`[Sync] Updated order ${orderId} to status: ${newStatus}`);
    return;
  }

  // 1. Try Laravel mobile/admin status mutation endpoint first
  try {
    let targetId: string | number = cleanId;
    let res: any = await erpNextClient.post(`/api/mobile/orders/${targetId}/status`, {
      status: normalized,
    });

    // If order was not found by this ID (e.g. order_number was provided instead of numeric order_id)
    if (res && res.success === false && (res.message === "Order not found." || res.message?.includes("not found"))) {
      try {
        const detailRes: any = await erpNextClient.get(`/api/admin/order-details/${cleanId}`);
        if (detailRes?.data?.order_id) {
          targetId = detailRes.data.order_id;
          res = await erpNextClient.post(`/api/mobile/orders/${targetId}/status`, {
            status: normalized,
          });
        }
      } catch (innerErr) {
        console.warn("[updateOrderStatus] Failed resolving order_id via order-details:", innerErr);
      }
    }

    if (res && (res.success || res.status)) {
      updateSharedOrder(orderId, (o) => {
        o.status = (normalized === "ready_to_assign" ? "Ready to Assign" : newStatus) as any;
      });
      broadcastChange();
      return;
    }
  } catch (err) {
    console.warn(`[updateOrderStatus] /api/mobile/orders/${cleanId}/status failed, trying fallback:`, err);
  }

  // 2. Fallback to ERPNext Sales Order PUT
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    status: newStatus,
  });
}

/**
 * Force an order into 'Ready to Assign' status
 */
export async function forceReadyToAssign(orderId: string): Promise<void> {
  return updateOrderStatus(orderId, "ready_to_assign");
}


/**
 * Assign a driver to an order.
 *
 * USAGE:
 *   await ordersApi.assignDriver("SO-00001", "driver_name");
 */
export async function assignDriver(orderId: string, driverName: string): Promise<void> {
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
export async function assignPicker(orderId: string, pickerName: string): Promise<void> {
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
 * Assign one order line item to a picker.
 */
export async function assignItemToPicker(
  orderLineItemId: number | string,
  pickerId: number | string,
): Promise<any> {
  return erpNextClient.post("/api/admin/assign-items-by-picker", {
    order_line_item_id: orderLineItemId,
    picker_id: pickerId,
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
 * Unassign picker order-wise via POST /api/admin/orders/order-wise-picker-unassign
 */
export async function orderWisePickerUnassign(
  orderId: string,
  orderItems?: (number | string)[],
  notes?: string,
): Promise<any> {
  const cleanId = getCleanOrderId(orderId);
  return syncOrderWisePickerUnassign({
    order_id: cleanId,
    order_number: cleanId,
    order_items: orderItems,
    notes,
  });
}

/**
 * Unassign picker items from an order via POST /api/admin/orders/order-wise-picker-unassign
 */
export async function unassignPickerItems(
  orderId: string,
  orderItems: (number | string)[],
): Promise<any> {
  const cleanId = getCleanOrderId(orderId);
  return orderWisePickerUnassign(cleanId, orderItems);
}

/**
 * Unassign one order line item from its picker.
 */
export async function unassignItemFromPicker(orderLineItemId: number | string): Promise<any> {
  return erpNextClient.post("/api/admin/orders/unassign-picker-items", {
    order_line_item_id: orderLineItemId,
  });
}

/**
 * Assign packer items to an order via POST /api/admin/orders/assign-packer-items
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
export async function assignPacker(orderId: string, packerName: string): Promise<void> {
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
export async function updateDriverStatus(orderId: string, driverStatus: string): Promise<void> {
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
 * Update payment status for an order via POST /api/admin/orders/update-payment-status
 */
export async function updatePaymentStatus(payload: {
  order_id?: string | number;
  order_number?: string;
  payment_status?: string;
  payment_method?: string;
  balance?: number;
  [key: string]: any;
}): Promise<any> {
  if (isDemoMode()) {
    if (payload.order_id || payload.order_number) {
      const id = String(payload.order_id || payload.order_number);
      updateSharedOrder(id, (o) => {
        if (payload.payment_method) (o as any).paymentMethod = payload.payment_method;
        if (payload.balance !== undefined) (o as any).paymentBalance = payload.balance;
        if (payload.payment_status) (o as any).paymentStatus = payload.payment_status;
      });
      broadcastChange();
    }
    return { success: true, message: "Payment status updated (demo mode)" };
  }

  try {
    return await erpNextClient.post("/api/admin/orders/update-payment-status", payload);
  } catch (err) {
    console.warn(
      "[Payments] /api/admin/orders/update-payment-status failed, trying fallback /api/orders/update-payment-status",
      err,
    );
    return await erpNextClient.post("/api/orders/update-payment-status", payload);
  }
}

/**
 * Create a return or replacement for an order via POST /api/admin/orders/return-replacement
 */
export async function createReturnReplacement(payload: {
  order_id?: string | number;
  order_number?: string;
  type?: "return" | "replacement" | "refund";
  items?: any[];
  reason?: string;
  notes?: string;
  [key: string]: any;
}): Promise<any> {
  if (isDemoMode()) {
    return { success: true, message: "Return/replacement recorded (demo mode)" };
  }

  try {
    return await erpNextClient.post("/api/admin/orders/return-replacement", payload);
  } catch (err) {
    console.warn(
      "[Returns] /api/admin/orders/return-replacement failed, trying fallback /api/orders/return-replacement",
      err,
    );
    return await erpNextClient.post("/api/orders/return-replacement", payload);
  }
}

/**
 * Assign schedule for an order item via POST /api/admin/schedule/assign/{order_item_id?}
 *
 * Payload:
 * {
 *   "order_item_id": 101,
 *   "is_scheduled_assigned": true
 * }
 */
export async function assignItemSchedule(
  orderItemId: number | string,
  isScheduledAssigned: boolean = true,
  extraPayload?: {
    order_id?: number | string;
    order_number?: string;
    location_id?: number | string;
    location_name?: string;
    team_id?: number | string;
    team_name?: string;
    technician_id?: number | string;
    technician_name?: string;
    scheduled_date?: string;
    notes?: string;
  },
): Promise<any> {
  const numericId = !isNaN(Number(orderItemId)) ? Number(orderItemId) : orderItemId;
  const payload: any = {
    order_item_id: numericId,
    is_scheduled_assigned: isScheduledAssigned,
    ...extraPayload,
  };

  if (isDemoMode()) {
    console.log("[Schedule] Demo mode: assignItemSchedule", payload);
    return {
      success: true,
      message: "Schedule assigned (demo mode)",
      ...payload,
    };
  }

  const endpointWithParam = `/api/admin/schedule/assign/${orderItemId}`;
  const baseEndpoint = `/api/admin/schedule/assign`;

  try {
    const res = await erpNextClient.post(endpointWithParam, payload);
    if (extraPayload?.technician_name || extraPayload?.scheduled_date) {
      try {
        await erpNextClient.post(`/api/admin/scheduled-installation`, {
          order_item_id: numericId,
          order_id: extraPayload.order_id,
          order_number: extraPayload.order_number,
          status: "scheduled",
          user_name: extraPayload.technician_name || extraPayload.team_name,
          user_id: extraPayload.technician_id || extraPayload.team_id,
          scheduled_date: extraPayload.scheduled_date,
          notes: extraPayload.notes,
        });
      } catch (storeErr) {
        console.warn("[Schedule] scheduled-installation store note:", storeErr);
      }
    }
    return res;
  } catch (err) {
    console.warn(`[Schedule] ${endpointWithParam} failed, trying ${baseEndpoint}:`, err);
    try {
      return await erpNextClient.post(baseEndpoint, payload);
    } catch (fallbackErr) {
      console.warn(
        `[Schedule] ${baseEndpoint} failed, trying legacy /api/schedule/assign:`,
        fallbackErr,
      );
      try {
        return await erpNextClient.post(`/api/schedule/assign/${orderItemId}`, payload);
      } catch (legacyParamErr) {
        return await erpNextClient.post(`/api/schedule/assign`, payload);
      }
    }
  }
}

export interface ApiInstallationLocation {
  id: number | string;
  name: string;
  location_id?: number | string;
  location_name?: string;
  city?: string;
}

export interface ApiInstallationTeam {
  id: number | string;
  name: string;
  technician_id?: number | string;
  technician_name?: string;
  role?: string;
  location_id?: number | string;
  locationId?: number | string;
}

export const DEFAULT_INSTALLATION_LOCATIONS: ApiInstallationLocation[] = [
  { id: 1, name: "Doha central", location_id: 1, location_name: "Doha central", city: "Doha" },
  {
    id: 2,
    name: "Al Wakrah Hall",
    location_id: 2,
    location_name: "Al Wakrah Hall",
    city: "Al Wakrah",
  },
  { id: 3, name: "Al Khor Zone", location_id: 3, location_name: "Al Khor Zone", city: "Al Khor" },
];

export const DEFAULT_INSTALLATION_TEAMS: ApiInstallationTeam[] = [
  { id: 1, name: "Farshad", technician_id: 1, technician_name: "Farshad", role: "Technician" },
  { id: 2, name: "Naveed", technician_id: 2, technician_name: "Naveed", role: "Technician" },
  { id: 3, name: "Shambu", technician_id: 3, technician_name: "Shambu", role: "Technician" },
  { id: 4, name: "Irshad", technician_id: 4, technician_name: "Irshad", role: "Technician" },
  { id: 5, name: "Waseem", technician_id: 5, technician_name: "Waseem", role: "Technician" },
  { id: 6, name: "Minhal", technician_id: 6, technician_name: "Minhal", role: "Technician" },
  { id: 7, name: "Rizwan", technician_id: 7, technician_name: "Rizwan", role: "Technician" },
];

/**
 * Fetch installation locations from GET /api/admin/installation/locations
 */
export async function fetchInstallationLocations(): Promise<ApiInstallationLocation[]> {
  if (isDemoMode()) {
    return DEFAULT_INSTALLATION_LOCATIONS;
  }

  const endpoints = [
    "/api/admin/installation/locations",
    "/api/admin/installation-level/locations",
    "/api/installation/locations",
  ];

  for (const ep of endpoints) {
    try {
      const res = await erpNextClient.get<any>(ep);
      const data = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
            ? res
            : [];
      if (data.length > 0) {
        return data.map((item: any) => ({
          id: item.id ?? item.location_id,
          name: item.name ?? item.location_name,
          location_id: item.location_id ?? item.id,
          location_name: item.location_name ?? item.name,
          city: item.city || "",
        }));
      }
    } catch (err) {
      console.warn(`[Installation] ${ep} failed:`, err);
    }
  }

  return DEFAULT_INSTALLATION_LOCATIONS;
}

/**
 * Fetch installation teams / technicians from GET /api/admin/installation/teams/{LocationId?}
 * When locationId is provided, queries technicians assigned to that specific location.
 */
export async function fetchInstallationTeams(
  locationId?: string | number | null,
): Promise<ApiInstallationTeam[]> {
  const locId =
    locationId != null && locationId !== "" && locationId !== "all" ? String(locationId) : null;

  if (isDemoMode()) {
    if (!locId) {
      return DEFAULT_INSTALLATION_TEAMS;
    }
    const numId = Number(locId);
    if (numId === 1) {
      return DEFAULT_INSTALLATION_TEAMS.filter((t) => [1, 2, 3].includes(Number(t.id)));
    }
    if (numId === 2) {
      return DEFAULT_INSTALLATION_TEAMS.filter((t) => [4, 5].includes(Number(t.id)));
    }
    if (numId === 3) {
      return DEFAULT_INSTALLATION_TEAMS.filter((t) => [6, 7].includes(Number(t.id)));
    }
    return DEFAULT_INSTALLATION_TEAMS;
  }

  const endpoints = locId
    ? [
        `/api/admin/installation/teams/${locId}`,
        `/api/admin/installation-level/teams/${locId}`,
        `/api/admin/installation/teams/${locId}`,
        `/api/admin/installation/teams?location_id=${locId}`,
      ]
    : [
        "/api/admin/installation/teams",
        "/api/admin/installation-level/teams",
        "/api/admin/installation-level/technicians",
        "/api/admin/installation/teams",
      ];

  for (const ep of endpoints) {
    try {
      const res = await erpNextClient.get<any>(ep);
      const data = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
            ? res
            : [];
      if (data.length > 0) {
        return data.map((item: any) => ({
          id: item.id ?? item.technician_id,
          name: item.name ?? item.technician_name,
          technician_id: item.technician_id ?? item.id,
          technician_name: item.technician_name ?? item.name,
          role: item.role ?? "Technician",
          location_id: locId ? Number(locId) : item.location_id,
          locationId: locId ? Number(locId) : item.locationId,
        }));
      }
    } catch (err) {
      console.warn(`[Installation] ${ep} failed:`, err);
    }
  }

  if (locId) {
    const numId = Number(locId);
    if (numId === 1) {
      return DEFAULT_INSTALLATION_TEAMS.filter((t) => [1, 2, 3].includes(Number(t.id)));
    }
    if (numId === 2) {
      return DEFAULT_INSTALLATION_TEAMS.filter((t) => [4, 5].includes(Number(t.id)));
    }
    if (numId === 3) {
      return DEFAULT_INSTALLATION_TEAMS.filter((t) => [6, 7].includes(Number(t.id)));
    }
  }

  return DEFAULT_INSTALLATION_TEAMS;
}

// ─── Technician Availability & Scheduling API ─────────────────────────────

export interface ScheduleConflictDetail {
  schedule_id?: number | string;
  order_id?: number | string;
  order_number?: string;
  customer_name?: string;
  building?: string;
  unit?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  [key: string]: any;
}

export interface BookedSlotDetail {
  start_time?: string;
  end_time?: string;
  time?: string;
  order_id?: number | string;
  order_number?: string;
  customer_name?: string;
  [key: string]: any;
}

export interface TechnicianAvailabilityResponse {
  success: boolean;
  available: boolean;
  response: "avaliable" | "not avaliable" | string;
  status: "available" | "engaged" | string;
  message: string;
  technician?: {
    id: number | string;
    name: string;
    [key: string]: any;
  };
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  taken_time_in_mins?: number;
  conflicts?: ScheduleConflictDetail[];
  booked_slots?: (BookedSlotDetail | string)[];
  [key: string]: any;
}

export interface CheckTechnicianAvailabilityParams {
  technician_id: number | string;
  installer_id?: number | string;
  user_id?: number | string;
  scheduled_date: string; // YYYY-MM-DD
  start_time?: string; // "10:00:00", "10:00 AM", "14:30"
  end_time?: string; // "11:30:00"
  taken_time_in_mins?: number; // defaults to 60 mins
  technician_name?: string;
}

export interface CreateTechnicianSchedulePayload {
  // Required fields per Laravel Validator
  order_id: number | string;
  order_item_id: number | string;
  order_installation_id: number | string;
  technician_id: number | string;
  scheduled_date: string;
  start_time: string;

  // Optional fields per Laravel Validator
  end_time?: string | null;
  taken_time_in_mins?: number | null;
  zone?: string | null;
  building?: string | null;
  unit?: string | null;
  street?: string | null;
  address?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  technician_name?: string | null;
  status?: string | null;
  notes?: string | null;
  images?: any;

  // Backward compatibility / extra context
  order_number?: string;
  customer_address?: string;
  location_id?: number | string;
  installer_id?: number | string;
  user_id?: number | string;
  [key: string]: any;
}

export interface RescheduleTechnicianPayload {
  // Required fields per Laravel Validator
  order_id: number | string;
  order_item_id: number | string;
  order_installation_id: number | string;
  technician_id: number | string;
  scheduled_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss or HH:mm

  // Standard & Recommended fields
  end_time?: string | null; // HH:mm:ss or HH:mm
  taken_time_in_mins?: number | null;
  reschedule_reason?: string | null; // e.g. "Customer requested afternoon slot"
  notes?: string | null;

  // Full / Available fields
  schedule_id?: number | string | null;
  technician_name?: string | null;
  status?: string | null; // defaults to "rescheduled"
  force?: boolean; // defaults to false; true bypasses conflict check
  zone?: string | null;
  building?: string | null;
  unit?: string | null;
  street?: string | null;
  address?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  user_id?: number | string | null;
  user_name?: string | null;

  // Backward compatibility / extra metadata
  order_number?: string;
  customer_address?: string;
  location_id?: number | string;
  installer_id?: number | string;
  [key: string]: any;
}

export interface RescheduleTechnicianResponse {
  success: boolean;
  status?: string;
  message?: string;
  data?: any;
  history?: any;
  [key: string]: any;
}

/**
 * Parses structured components (zone, building, unit, street) from an address string.
 */
export function parseAddressComponents(addressStr?: string): {
  zone: string | null;
  building: string | null;
  unit: string | null;
  street: string | null;
} {
  if (!addressStr || typeof addressStr !== "string") {
    return { zone: null, building: null, unit: null, street: null };
  }

  const clean = addressStr.trim();

  // Zone: "Zone - 42", "Zone: 42", "Zone 42", "Zone-42"
  const zoneMatch = clean.match(/\bZone\s*[-:#]?\s*([0-9A-Za-z]+)/i);
  const zone = zoneMatch ? zoneMatch[1] : null;

  // Building: "Building No - 151", "Building No. 151", "Building 151", "Bldg 151", "Villa 12"
  const bldgMatch = clean.match(/\b(?:Building\s*(?:No\.?|Number)?|Bldg\.?|Villa)\s*[-:#]?\s*([0-9A-Za-z]+)/i);
  const building = bldgMatch ? bldgMatch[1] : null;

  // Unit / Flat / Apt: "Unit 4", "Unit - 4", "Flat 4", "Apt 4", "Apartment 4"
  const unitMatch = clean.match(/\b(?:Unit|Flat|Apt\.?|Apartment|Suite)\s*[-:#]?\s*([0-9A-Za-z]+)/i);
  const unit = unitMatch ? unitMatch[1] : null;

  // Street: "Street - 230", "Street: 230", "Street 230", "St 230"
  const streetMatch = clean.match(/\b(?:Street|St\.?)\s*[-:#]?\s*([0-9A-Za-z]+)/i);
  const street = streetMatch ? streetMatch[1] : null;

  return { zone, building, unit, street };
}

/**
 * Normalizes time string to standard "HH:mm:ss" format.
 * Supports: "10:00", "10:00:00", "10:00 AM", "2:30 PM", "14:30"
 */
export function normalizeTimeTo24h(timeStr?: string): string {
  if (!timeStr) return "10:00:00";
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const isPm = ampmMatch[4].toUpperCase() === "PM";
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}:00`;
  }
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(":");
    return `${h.padStart(2, "0")}:${m}:00`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
    const parts = trimmed.split(":");
    return `${parts[0].padStart(2, "0")}:${parts[1]}:${parts[2]}`;
  }
  return trimmed;
}

/**
 * Calculates end time formatted as "HH:mm:ss" based on start time and duration in minutes.
 */
export function calculateEndTime(startTime: string, durationMinutes: number = 60): string {
  const norm = normalizeTimeTo24h(startTime);
  const [hStr, mStr] = norm.split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`;
}

/**
 * Check technician availability via API:
 * POST/GET /api/admin/check-technician-avaliablity
 *
 * Parameters:
 * - technician_id: Required (also accepts installer_id, user_id)
 * - scheduled_date: Required format YYYY-MM-DD
 * - start_time: Recommended (e.g. "10:00:00", "10:00 AM", "14:30")
 * - end_time: Optional (e.g. "11:30:00")
 * - taken_time_in_mins: Optional duration in minutes (defaults to 60 mins)
 */
export async function checkTechnicianAvailability(
  params: CheckTechnicianAvailabilityParams,
): Promise<TechnicianAvailabilityResponse> {
  const technicianId = !isNaN(Number(params.technician_id))
    ? Number(params.technician_id)
    : params.technician_id;

  const normalizedStart = normalizeTimeTo24h(params.start_time || "10:00:00");
  const duration = params.taken_time_in_mins || 60;
  const normalizedEnd = params.end_time
    ? normalizeTimeTo24h(params.end_time)
    : calculateEndTime(normalizedStart, duration);

  const payload = {
    technician_id: technicianId,
    installer_id: technicianId,
    user_id: technicianId,
    scheduled_date: params.scheduled_date,
    start_time: normalizedStart,
    end_time: normalizedEnd,
    taken_time_in_mins: duration,
  };

  if (!isDemoMode()) {
    const endpoints = [
      "/api/admin/check-technician-avaliablity"];

    for (const ep of endpoints) {
      try {
        const res = await erpNextClient.post<any>(ep, payload);
        if (res && typeof res.available === "boolean") {
          return res as TechnicianAvailabilityResponse;
        }
        if (
          res &&
          (res.status === "available" ||
            res.status === "engaged" ||
            res.response === "avaliable" ||
            res.response === "not avaliable")
        ) {
          const isAvail = res.status === "available" || res.response === "avaliable";
          return {
            success: true,
            available: isAvail,
            response: res.response || (isAvail ? "avaliable" : "not avaliable"),
            status: res.status || (isAvail ? "available" : "engaged"),
            message: res.message || "",
            technician: res.technician || {
              id: technicianId,
              name: params.technician_name || "Technician",
            },
            scheduled_date: res.scheduled_date || params.scheduled_date,
            start_time: res.start_time || normalizedStart,
            end_time: res.end_time || normalizedEnd,
            taken_time_in_mins: res.taken_time_in_mins || duration,
            conflicts: res.conflicts || [],
            booked_slots: res.booked_slots || [],
          };
        }
      } catch (postErr) {
        // If POST fails, attempt GET request with query string parameters
        try {
          const res = await erpNextClient.get<any>(ep, {
            technician_id: String(technicianId),
            installer_id: String(technicianId),
            user_id: String(technicianId),
            scheduled_date: params.scheduled_date,
            start_time: normalizedStart,
            end_time: normalizedEnd,
            taken_time_in_mins: String(duration),
          });
          if (res && typeof res.available === "boolean") {
            return res as TechnicianAvailabilityResponse;
          }
        } catch (getErr) {
          console.warn(`[checkTechnicianAvailability] ${ep} request failed:`, getErr);
        }
      }
    }
  }

  // Graceful fallback to local appointment store (handles offline / in-development controller)
  const localAppts = getAppointments().filter(
    (a) =>
      (String(a.teamId) === String(technicianId) || String((a as any).technicianId) === String(technicianId)) &&
      a.scheduledDate === params.scheduled_date &&
      a.status !== "Cancelled",
  );

  const [sH, sM] = normalizedStart.split(":").map(Number);
  const [eH, eM] = normalizedEnd.split(":").map(Number);
  const reqStartMin = (sH || 0) * 60 + (sM || 0);
  const reqEndMin = (eH || 0) * 60 + (eM || 0);

  const conflicts: ScheduleConflictDetail[] = [];
  const bookedSlots: any[] = [];

  for (const appt of localAppts) {
    if (!appt.scheduledTime) continue;
    const apptStartNorm = normalizeTimeTo24h(appt.scheduledTime);
    const apptEndNorm = calculateEndTime(apptStartNorm, 60);
    const [aSH, aSM] = apptStartNorm.split(":").map(Number);
    const [aEH, aEM] = apptEndNorm.split(":").map(Number);
    const apptStartMin = (aSH || 0) * 60 + (aSM || 0);
    const apptEndMin = (aEH || 0) * 60 + (aEM || 0);

    bookedSlots.push({
      start_time: apptStartNorm,
      end_time: apptEndNorm,
      time: appt.scheduledTime,
      order_id: appt.orderId,
      order_number: appt.orderId.startsWith("#") ? appt.orderId : `#${appt.orderId}`,
      customer_name: appt.customerName,
    });

    // Check overlap: requested start < apptEnd AND requested end > apptStart
    if (reqStartMin < apptEndMin && reqEndMin > apptStartMin) {
      conflicts.push({
        schedule_id: appt.id || 1,
        order_id: appt.orderId,
        order_number: appt.orderId.startsWith("#") ? appt.orderId : `#${appt.orderId}`,
        customer_name: appt.customerName || "Customer",
        building: appt.customerAddress || "Tower B",
        unit: "304",
        start_time: apptStartNorm,
        end_time: apptEndNorm,
        status: appt.status?.toLowerCase() || "scheduled",
      });
    }
  }

  const isAvailable = conflicts.length === 0;
  const techName =
    params.technician_name ||
    DEFAULT_INSTALLATION_TEAMS.find((t) => String(t.id) === String(technicianId))?.name ||
    `Technician #${technicianId}`;

  if (isAvailable) {
    return {
      success: true,
      available: true,
      response: "avaliable",
      status: "available",
      message: `Technician is available on ${params.scheduled_date} from ${normalizedStart} to ${normalizedEnd}.`,
      technician: {
        id: technicianId,
        name: techName,
      },
      scheduled_date: params.scheduled_date,
      start_time: normalizedStart,
      end_time: normalizedEnd,
      taken_time_in_mins: duration,
      booked_slots: bookedSlots,
    };
  } else {
    return {
      success: true,
      available: false,
      response: "not avaliable",
      status: "engaged",
      message: `Technician is engaged (not available) on ${params.scheduled_date} during ${normalizedStart} - ${normalizedEnd}.`,
      technician: {
        id: technicianId,
        name: techName,
      },
      scheduled_date: params.scheduled_date,
      start_time: normalizedStart,
      end_time: normalizedEnd,
      taken_time_in_mins: duration,
      conflicts,
      booked_slots: bookedSlots,
    };
  }
}

/**
 * Persists technician installation schedule to backend via:
 * POST /api/admin/technician-schedule/create
 * (with fallback to /api/technician-schedule/create)
 */
export async function createTechnicianSchedule(
  payload: CreateTechnicianSchedulePayload,
): Promise<any> {
  if (isDemoMode()) {
    console.log("[Schedule] Demo mode: createTechnicianSchedule", payload);
    return {
      success: true,
      message: "Technician schedule created (demo mode)",
      ...payload,
    };
  }

  try {
    return await erpNextClient.post<any>("/api/admin/technician-schedule/create", payload);
  } catch (err: any) {
    if (err?.status === 404) {
      console.warn("[Schedule] /api/admin/technician-schedule/create 404, attempting /api/technician-schedule/create");
      return await erpNextClient.post<any>("/api/technician-schedule/create", payload);
    }
    throw err;
  }
}

/**
 * Reschedules an existing technician installation schedule via:
 * POST /api/technician-schedule/reschedule
 * (or POST /api/admin/technician-schedule/reschedule)
 *
 * Supports Standard, Minimal, and Full payloads.
 * Handles 409 conflict detection and allows 'force: true' override.
 */
export async function rescheduleTechnicianSchedule(
  payload: RescheduleTechnicianPayload,
): Promise<RescheduleTechnicianResponse> {
  if (isDemoMode()) {
    console.log("[Schedule] Demo mode: rescheduleTechnicianSchedule", payload);
    return {
      success: true,
      status: "success",
      message: "Technician schedule rescheduled successfully (demo mode)",
      data: {
        ...payload,
        status: payload.status || "rescheduled",
      },
      history: {
        technician_id: payload.technician_id,
        technician_name: payload.technician_name,
        scheduled_date: payload.scheduled_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        taken_time_in_mins: payload.taken_time_in_mins,
        reschedule_reason: payload.reschedule_reason,
        created_at: new Date().toISOString(),
      },
    };
  }

  // Primary endpoint per spec: /api/technician-schedule/reschedule (fallback /api/admin/technician-schedule/reschedule)
  const endpoints = [
    "/api/technician-schedule/reschedule",
    "/api/admin/technician-schedule/reschedule",
  ];

  let lastError: any = null;
  for (const ep of endpoints) {
    try {
      return await erpNextClient.post<RescheduleTechnicianResponse>(ep, payload);
    } catch (err: any) {
      lastError = err;
      // If 409 Conflict (engaged) or 422 (validation error), throw immediately so caller can inspect conflict or prompt force
      if (err?.status === 409 || err?.status === 422) {
        throw err;
      }
      // If 404 Not Found, try alternate endpoint
      if (err?.status === 404) {
        console.warn(`[Schedule] ${ep} returned 404, attempting fallback endpoint...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Failed to reschedule technician schedule");
}

export const rescheduleTechnician = rescheduleTechnicianSchedule;

export interface ScheduledOrderItem {
  item_id: number | string;
  order_item_id: number | string;
  id: number | string;
  order_id: number | string;
  order_number: string;
  order_status?: string;
  line_item_id?: string;
  product_id?: string;
  product_code?: string;
  barcode?: string;
  product_name: string;
  image?: string;
  image_url?: string;
  product_image?: string;
  product_image_url?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  is_installable: boolean;
  is_scheduled_assigned: boolean;
  installation_type?: string;
  installation_level?: string;
  order_installation_id?: number | string;
  installation_id?: number | string;
  zone?: string;
  building?: string;
  unit?: string;
  street?: string;
  address?: string;
  images?: any;
  installation?: {
    id?: number;
    order_item_id?: number;
    installation_type?: string;
    installation_level?: string;
    is_scheduled_assigned?: boolean;
    created_at?: string;
    updated_at?: string;
    [key: string]: any;
  };
  customer?: {
    name?: string;
    phone?: string;
    delivery_address?: string;
    [key: string]: any;
  };
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  order?: {
    id?: number;
    order_number?: string;
    status?: string;
    customer_name?: string;
    customer_phone?: string;
    delivery_address?: string;
    total_amount?: number;
    bag_count?: number;
    created_at?: string;
    [key: string]: any;
  };
  assigned_to?: any;
  assigned_user_name?: string | null;
  assigned_user?: any;
  picked_by?: any;
  picked_user_name?: string | null;
  picked_user?: any;
  packed_by?: any;
  packed_user_name?: string | null;
  packed_user?: any;
  delivered_by?: any;
  delivered_user_name?: string | null;
  delivered_user?: any;
  driver_assignment?: any;
  is_flagged?: boolean;
  flag_reason?: string | null;
  is_packer_verified?: boolean;
  packer_verified_user?: any;
  picked_at?: string | null;
  packed_at?: string | null;
  delivered_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledItemsResponse {
  success: boolean;
  status?: string;
  message?: string;
  status_filter?: string;
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
    has_more_pages: boolean;
    next_page_url: string | null;
    prev_page_url: string | null;
  };
  data: ScheduledOrderItem[];
}

/**
 * Fetch scheduled order items from GET /api/admin/orders/scheduled-items
 * Query parameters:
 * - is_scheduled_assigned: 0 / false (awaiting) or 1 / true (scheduled) or "all"
 * - page: number
 * - per_page: number
 */
export async function fetchScheduledItems(params?: {
  is_scheduled_assigned?: boolean | string | number;
  page?: number;
  per_page?: number;
}): Promise<ScheduledItemsResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.is_scheduled_assigned !== undefined) {
    if (typeof params.is_scheduled_assigned === "boolean") {
      queryParams.is_scheduled_assigned = params.is_scheduled_assigned ? "1" : "0";
    } else {
      queryParams.is_scheduled_assigned = String(params.is_scheduled_assigned);
    }
  }
  if (params?.page !== undefined) queryParams.page = String(params.page);
  if (params?.per_page !== undefined) queryParams.per_page = String(params.per_page);

  if (isDemoMode()) {
    const orders = getSharedOrders();
    const demoItems: ScheduledOrderItem[] = [];
    orders.forEach((o, idx) => {
      const items = o.itemsList || [];
      items.forEach((item, itemIdx) => {
        if (
          item.is_installable ||
          item.isInstallable ||
          item.itemType === "MWH" ||
          item.itemType === "VL_SUPPLIER" ||
          idx % 2 === 0
        ) {
          const isAssigned = Boolean(item.is_scheduled_assigned || idx % 4 === 0);
          const reqVal = params?.is_scheduled_assigned;
          const match =
            reqVal === undefined ||
            reqVal === "all" ||
            (reqVal === "1" && isAssigned) ||
            (reqVal === "0" && !isAssigned);

          if (match) {
            demoItems.push({
              item_id: idx * 10 + itemIdx + 1,
              order_item_id: idx * 10 + itemIdx + 1,
              id: idx * 10 + itemIdx + 1,
              order_id: idx + 1,
              order_number: o.id.startsWith("#") ? o.id : `#${o.id}`,
              order_status: o.status,
              product_name: item.name,
              product_code: item.sku,
              barcode: item.barcode,
              image: item.image,
              image_url: item.image,
              product_image: item.image,
              product_image_url: item.image,
              quantity: item.qty || 1,
              unit_price: item.price || 100,
              total_price: (item.price || 100) * (item.qty || 1),
              status: o.status,
              is_installable: true,
              is_scheduled_assigned: isAssigned,
              installation_type: item.installation_type || "level-1",
              installation_level: item.installation_level || "level-1",
              customer: {
                name: o.customer.name,
                phone: o.customer.phone,
                delivery_address: (o.customer as any).address || o.city || "Doha, Qatar",
              },
              customer_name: o.customer.name,
              customer_phone: o.customer.phone,
              delivery_address: (o.customer as any).address || o.city || "Doha, Qatar",
              order: {
                id: idx + 1,
                order_number: o.id.startsWith("#") ? o.id : `#${o.id}`,
                status: o.status,
                customer_name: o.customer.name,
                customer_phone: o.customer.phone,
                delivery_address: (o.customer as any).address || o.city || "Doha, Qatar",
                total_amount: o.total,
              },
            });
          }
        }
      });
    });

    const perPage = params?.per_page || 15;
    const page = params?.page || 1;
    const total = demoItems.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const from = total > 0 ? (page - 1) * perPage + 1 : 0;
    const to = Math.min(page * perPage, total);
    const paginatedData = demoItems.slice(from > 0 ? from - 1 : 0, to);

    return {
      success: true,
      status: "success",
      pagination: {
        current_page: page,
        per_page: perPage,
        total,
        last_page: lastPage,
        from,
        to,
        has_more_pages: page < lastPage,
        next_page_url: null,
        prev_page_url: null,
      },
      data: paginatedData,
    };
  }

  try {
    const response = await erpNextClient.get<ScheduledItemsResponse>(
      "/api/admin/orders/scheduled-items",
      queryParams,
    );
    return response;
  } catch (err) {
    console.warn(
      "[ScheduledItems] /api/admin/orders/scheduled-items failed, trying fallback /api/orders/scheduled-items",
      err,
    );
    return await erpNextClient.get<ScheduledItemsResponse>(
      "/api/orders/scheduled-items",
      queryParams,
    );
  }
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
    console.log(
      `[Sync] Updated payment details for order ${orderId}: method=${paymentMethod}, balance=${balance}`,
    );
    return;
  }

  const cleanId = getCleanOrderId(orderId);
  try {
    await updatePaymentStatus({
      order_id: cleanId,
      order_number: cleanId,
      payment_method: paymentMethod,
      balance: balance,
      payment_status: balance <= 0 ? "Paid" : "Partially Paid",
    });
  } catch (err) {
    console.warn(
      "[Payments] Failed to update payment status via admin endpoint, falling back to resource endpoint:",
      err,
    );
    await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
      custom_payment_method: paymentMethod,
      custom_payment_balance: balance,
    });
  }
}

/**
 * Update notes for an order.
 */
export async function updateOrderNotes(orderId: string, notes: string): Promise<void> {
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
  },
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
// In-memory cache for fast status queries to eliminate tab switching delays
const statusQueryCache = new Map<string, { timestamp: number; result: any }>();
const STATUS_CACHE_TTL = 30 * 1000; // 30 seconds cache

/** Clear status query cache if orders are updated */
export function invalidateStatusQueryCache() {
  statusQueryCache.clear();
}

/**
 * Enhanced fetchOrdersByStatus that queries dedicated Laravel status endpoints
 */
export async function fetchOrdersByStatus(statusName: string, page = 1, perPage = 15) {
  const cacheKey = `${statusName.toLowerCase()}_${page}_${perPage}`;
  const cached = statusQueryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < STATUS_CACHE_TTL) {
    return cached.result;
  }

  if (isDemoMode()) {
    const orders = getSharedOrders();
    let filtered = orders;
    const lowerStatus = statusName.toLowerCase();
    if (lowerStatus === "new") {
      filtered = orders.filter((o) => o.status === "New" || o.status === "Unfulfilled");
    } else if (lowerStatus === "express") {
      filtered = orders.filter((o) => matchesLegacyTab(o, "Express"));
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
    } else if (
      lowerStatus === "cancelled" ||
      lowerStatus === "cancelled-delivery" ||
      lowerStatus === "cancelled_delivery"
    ) {
      filtered = orders.filter((o) => matchesLegacyTab(o, "Cancelled"));
    } else if (lowerStatus === "installation") {
      filtered = orders.filter((o) => matchesLegacyTab(o, "Installation"));
    }

    const total = filtered.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(page, lastPage);
    const from = total > 0 ? (safePage - 1) * perPage + 1 : 0;
    const to = Math.min(safePage * perPage, total);
    const paginatedData = filtered.slice(from > 0 ? from - 1 : 0, to);

    const result = {
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
        next_page_url:
          safePage < lastPage ? `/api/orders/status/${statusName}?page=${safePage + 1}` : null,
        prev_page_url:
          safePage > 1 ? `/api/orders/status/${statusName}?page=${safePage - 1}` : null,
      },
      data: paginatedData,
      mappedOrders: paginatedData,
    };
    statusQueryCache.set(cacheKey, { timestamp: Date.now(), result });
    return result;
  }

  // Live Mode: call dedicated Laravel status endpoint with admin prefix
  let response: any = null;
  const adminPrimaryEndpoint = `/api/admin/orders/status/${statusName}?page=${page}&per_page=${perPage}`;
  try {
    response = await erpNextClient.get(adminPrimaryEndpoint);
  } catch (err) {
    console.warn(
      `[OrdersByStatus] ${adminPrimaryEndpoint} failed, trying /api/admin/orders/${statusName}`,
      err,
    );
    try {
      response = await erpNextClient.get(
        `/api/admin/orders/${statusName}?page=${page}&per_page=${perPage}`,
      );
    } catch (adminFallbackErr) {
      console.error(
        `[OrdersByStatus] all endpoints failed for status ${statusName}`,
        adminFallbackErr,
      );
      throw err;
    }
  }


  if (response) {
    const rawData = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];
    const mappedOrders = rawData.map(mapLaravelOrderToDashboardOrder);

    const totalItems = response.pagination?.total ?? response.total ?? mappedOrders.length;
    const lastPg =
      response.pagination?.last_page ??
      response.last_page ??
      Math.max(1, Math.ceil(totalItems / perPage));

    const pagination = response.pagination || {
      current_page: page,
      per_page: perPage,
      total: totalItems,
      last_page: lastPg,
      from: response.from ?? (mappedOrders.length > 0 ? (page - 1) * perPage + 1 : 0),
      to: response.to ?? Math.min(page * perPage, totalItems),
      has_more_pages: response.has_more_pages ?? page < lastPg,
      next_page_url: response.next_page_url ?? null,
      prev_page_url: response.prev_page_url ?? null,
    };

    const result = {
      success: response.success ?? true,
      status_filter: response.status_filter ?? statusName,
      pagination,
      data: rawData,
      mappedOrders,
    };
    statusQueryCache.set(cacheKey, { timestamp: Date.now(), result });
    return result;
  }

  return response;
}

/** 1. GET /api/orders/status/all or /api/orders/all */
export const fetchAllOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("all", page, perPage);

/** 2. GET /api/orders/status/new or /api/orders/new */
export const fetchNewOrders = (page = 1, perPage = 15) => fetchOrdersByStatus("new", page, perPage);

/** 2b. GET /api/orders/status/express or /api/orders/express */
export const fetchExpressOrders = (page = 1, perPage = 15) =>
  fetchOrdersByStatus("express", page, perPage);

/** 3. GET /api/orders/status/ready-to-assign or /api/orders/ready-to-assign */
export const fetchReadyToAssignOrders = (page = 1, perPage = 15) =>
  fetchOrdersByStatus("ready-to-assign", page, perPage);

/** 4. GET /api/orders/status/picking or /api/orders/picking */
export const fetchPickingOrders = (page = 1, perPage = 15) =>
  fetchOrdersByStatus("picking", page, perPage);

/** 5. GET /api/orders/status/picked or /api/orders/picked */
export const fetchPickedOrders = (page = 1, perPage = 15) =>
  fetchOrdersByStatus("picked", page, perPage);

/** 6. GET /api/orders/status/packing or /api/orders/packing */
export const fetchPackingOrders = (page = 1, perPage = 15) =>
  fetchOrdersByStatus("packing", page, perPage);

/** 7. GET /api/orders/status/in-delivery or /api/orders/in-delivery */
export const fetchInDeliveryOrders = (page = 1, perPage = 15) =>
  fetchOrdersByStatus("in-delivery", page, perPage);

/** 8. GET /api/orders/status/delivered or /api/orders/delivered */
export const fetchDeliveredOrders = (page = 1, perPage = 15) =>
  fetchOrdersByStatus("delivered", page, perPage);

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
    console.warn(
      "[FlaggedOrders] /api/orders/status/flagged failed, trying /api/orders/flagged fallback:",
      e,
    );
  }

  // Fallback to /api/admin/orders/flagged or /api/orders/flagged
  try {
    let response: any = null;
    try {
      response = await erpNextClient.get(
        `/api/admin/orders/flagged?page=${page}&per_page=${perPage}`,
      );
    } catch (err1) {
      response = await erpNextClient.get(`/api/orders/flagged?page=${page}&per_page=${perPage}`);
    }
    const rawData = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];
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
    return {
      success: false,
      data: [],
      mappedOrders: [],
      pagination: { current_page: 1, per_page: perPage, total: 0, last_page: 1 },
    };
  }
};

/** 10. GET /api/admin/orders/flagged-items & /api/orders/flagged-items */
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
    const response: any = await erpNextClient.get("/api/admin/orders/flagged-items");
    return response;
  } catch (err) {
    console.warn(
      "[FlaggedItems] /api/admin/orders/flagged-items failed, trying /api/orders/flagged-items:",
      err,
    );
    try {
      const response: any = await erpNextClient.get("/api/orders/flagged-items");
      return response;
    } catch (fallbackErr) {
      console.error("[FlaggedItems] Failed to fetch flagged items:", fallbackErr);
      return { success: false, data: [] };
    }
  }
};

/** 11. GET /api/admin/orders/status/installation or /api/admin/orders/installation */
export const fetchInstallationOrders = (page = 1, perPage = 15) =>
  fetchOrdersByStatus("installation", page, perPage);

/** 12. GET /api/admin/orders/status/installation-items or /api/admin/orders/installation-items */
export const fetchInstallationItems = async () => {
  if (isDemoMode()) {
    return { success: true, data: [] };
  }

  try {
    const response: any = await erpNextClient.get("/api/admin/orders/status/installation-items");
    return response;
  } catch (err) {
    console.warn(
      "[InstallationItems] /api/admin/orders/status/installation-items failed, trying /api/admin/orders/installation-items fallback:",
      err,
    );
    try {
      const fallbackResponse: any = await erpNextClient.get("/api/admin/orders/installation-items");
      return fallbackResponse;
    } catch (fallbackErr) {
      try {
        const legacyResponse: any = await erpNextClient.get(
          "/api/orders/status/installation-items",
        );
        return legacyResponse;
      } catch (legacyErr) {
        try {
          const finalFallback: any = await erpNextClient.get("/api/orders/installation-items");
          return finalFallback;
        } catch (finalErr) {
          console.error("[InstallationItems] Failed to fetch installation items:", finalErr);
          return { success: false, data: [] };
        }
      }
    }
  }
};

/** 13. GET /api/orders/status/cancelled-delivery or /api/orders/cancelled-delivery */
export const fetchCancelledDeliveryOrders = (page = 1, perPage = 15) =>
  fetchOrdersByStatus("cancelled-delivery", page, perPage);

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
  fetchInstallationOrders,
  fetchInstallationItems,
  fetchCancelledDeliveryOrders,
  updateOrderStatus,
  forceReadyToAssign,
  assignDriver,
  assignPicker,
  assignPickerItems,
  unassignPickerItems,
  orderWisePickerUnassign,
  unassignOrderWisePicker: orderWisePickerUnassign,
  assignPacker,
  assignPackerItems,
  unassignPackerItems,
  updateDriverStatus,
  updatePaymentDetails,
  updatePaymentStatus,
  createReturnReplacement,
  assignItemSchedule,
  fetchScheduledItems,
  updateOrderNotes,
  deleteOrder,
  updateOrderDetails,
  getPickers,
  getPackers,
  fetchPickers: getPickers,
  fetchPackers: getPackers,
  fetchInstallationLocations,
  fetchInstallationTeams,
  checkTechnicianAvailability,
  createTechnicianSchedule,
};
