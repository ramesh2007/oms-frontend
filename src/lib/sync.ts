/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  Shared Order Sync — Cross-App Data Bridge                                    ║
 * ║                                                                              ║
 * ║  Enables real-time sync between Admin Dashboard and RouteMyOrder apps        ║
 * ║  using localStorage as a shared "database" and storage events for            ║
 * ║  cross-tab notifications.                                                     ║
 * ║                                                                              ║
 * ║  BACKEND MIGRATION: When the real API is connected, set                       ║
 * ║  VITE_USE_MOCK_DATA=false and all sync code is bypassed.                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { QueryClient } from "@tanstack/react-query";
import { MOCK_ORDERS, type Order, getMockOrderTotal, getMockOrderItems } from "@/lib/orders";
import { isDemoMode } from "@/lib/api/config";
import { getProducts } from "./products";
import { getVendorLocations } from "./vendor-locations";
import { erpNextClient } from "./api/client";

const STORAGE_KEY = "hm_shared_orders";
const SYNC_EVENT_KEY = "hm_sync_signal";

let queryClientRef: QueryClient | null = null;

// ─── Routing Resolver ────────────────────────────────────────────────────

function resolveDynamicRouting(itemsList: any[]): any[] {
  if (!itemsList) return [];
  const products = getProducts();
  const prodMap = new Map(products.map(p => [p.sku, p]));
  const vendorLocs = getVendorLocations();
  const vendorMap = new Map(vendorLocs.map(l => [l.locationId, l]));

  return itemsList.map(item => {
    const prod = prodMap.get(item.sku);
    if (prod) {
      if (prod.fulfillmentType === "VS") {
        const vendor = vendorMap.get(prod.locationId);
        return {
          ...item,
          fc: "VL_HMA",
          itemType: "VL_HMA",
          locationId: prod.locationId,
          fcName: vendor ? `${vendor.vendorName} - ${vendor.locationName}` : "Vendor Location",
        };
      } else {
        return {
          ...item,
          fc: prod.locationId,
          itemType: prod.locationId === "MWO" ? "MWH" : "FC",
          locationId: undefined,
          fcName: prod.locationId === "F01"
            ? "Fulfillment Center Hilal"
            : prod.locationId === "F02"
              ? "Main Warehouse - Safety Stock"
              : prod.locationId === "MWO"
                ? "Main Warehouse Outdoor"
                : "Virtual Stock",
        };
      }
    }
    
    // Fallback mapping for old seeded location IDs
    if (item.locationId === "loc-1") {
      return {
        ...item,
        locationId: "loc-001",
        fcName: "Baby Boutique - West Bay Showroom"
      };
    }
    
    return item;
  });
}

// ─── Seeding ─────────────────────────────────────────────────────────────

/** Seed localStorage with MOCK_ORDERS on first load (only in demo mode). */
function seedIfNeeded(): void {
  if (!isDemoMode()) return;
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    const enriched = MOCK_ORDERS.map((o) => ({
      ...o,
      itemsList: getMockOrderItems(o.id, o.items),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
  } else {
    try {
      const parsed = JSON.parse(existing) as Order[];
      let updated = false;

      // Filter out old deleted mock orders
      const validMockIds = new Set(MOCK_ORDERS.map((o) => o.id));
      const filteredParsed = parsed.filter((o) => validMockIds.has(o.id));
      if (filteredParsed.length !== parsed.length) {
        parsed.length = 0;
        parsed.push(...filteredParsed);
        updated = true;
      }

      // Ensure all MOCK_ORDERS are in parsed local storage array
      for (const mockOrder of MOCK_ORDERS) {
        const index = parsed.findIndex((o) => o.id === mockOrder.id);
        if (index === -1) {
          parsed.push(mockOrder);
          updated = true;
        } else {
          const stored = parsed[index];
          if (!stored.itemsList || stored.itemsList.length === 0 || mockOrder.id === "HM64110" || mockOrder.id === "HM99001") {
            stored.itemsList = getMockOrderItems(mockOrder.id, mockOrder.items);
            stored.total = getMockOrderTotal(mockOrder.id, mockOrder.items, stored.payment);
            updated = true;
          }
          if (mockOrder.lat !== undefined && stored.lat === undefined) {
            stored.lat = mockOrder.lat;
            updated = true;
          }
          if (mockOrder.lng !== undefined && stored.lng === undefined) {
            stored.lng = mockOrder.lng;
            updated = true;
          }
          if (mockOrder.id === "HM59245") {
            // Keep HM59245 synced with its specific PayLater configuration and updated totals
            const hasPayLater = stored.tags?.some((t) => t.toUpperCase() === "PAYLATER") ?? false;
            const isPending = (stored.payment?.balance ?? 0) > 0;
            const isTotalMismatch = stored.total !== mockOrder.total;
            if (!hasPayLater || !isPending || isTotalMismatch) {
              parsed[index] = mockOrder;
              updated = true;
            }
          }
        }
      }

      if (updated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ORDERS));
    }
  }
}

// ─── Read / Write ────────────────────────────────────────────────────────

/** Get all orders from the shared store. */
export function getSharedOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const orders = JSON.parse(raw) as Order[];
      return orders.map((order) => {
        const total = getMockOrderTotal(order.id, order.items, order.payment);
        const rawItems = order.itemsList || getMockOrderItems(order.id, order.items);
        return {
          ...order,
          total,
          itemsList: resolveDynamicRouting(rawItems),
          payment: order.payment
            ? {
                ...order.payment,
                subtotal: total - (order.payment.shipping ?? 0) + (order.payment.discount ?? 0),
                total,
                balance: total - (order.payment.totalPaid ?? 0),
              }
            : undefined,
        };
      });
    }
  } catch (e) {
    console.warn("[Sync] Failed to read shared orders:", e);
  }
  return MOCK_ORDERS.map((order) => {
    const total = getMockOrderTotal(order.id, order.items, order.payment);
    return {
      ...order,
      total,
      itemsList: resolveDynamicRouting(getMockOrderItems(order.id, order.items)),
      payment: order.payment
        ? {
            ...order.payment,
            subtotal: total - (order.payment.shipping ?? 0) + (order.payment.discount ?? 0),
            total,
            balance: total - (order.payment.totalPaid ?? 0),
          }
        : undefined,
    };
  });
}

/** Write all orders back to the shared store. */
function saveSharedOrders(orders: Order[]): void {
  const enriched = orders.map((order) => {
    const total = getMockOrderTotal(order.id, order.items, order.payment);
    return {
      ...order,
      total,
      itemsList: order.itemsList || getMockOrderItems(order.id, order.items),
      payment: order.payment
        ? {
            ...order.payment,
            subtotal: total - (order.payment.shipping ?? 0) + (order.payment.discount ?? 0),
            total,
            balance: total - (order.payment.totalPaid ?? 0),
          }
        : undefined,
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
  localStorage.setItem(SYNC_EVENT_KEY, Date.now().toString());
}

/** Find and update a single order in the shared store. Returns the updated order or undefined. */
export function updateSharedOrder(
  orderId: string,
  updater: (order: Order) => void,
): Order | undefined {
  const orders = getSharedOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return undefined;
  updater(order);
  saveSharedOrders(orders);
  return order;
}

/** Delete an order from the shared store. */
export function deleteSharedOrder(orderId: string): void {
  const orders = getSharedOrders().filter((o) => o.id !== orderId);
  saveSharedOrders(orders);
}

// ─── Cross-Tab Broadcast ─────────────────────────────────────────────────

/** Signal other tabs/apps that order data has changed. */
export function broadcastChange(): void {
  // Write a timestamp to a special key — this triggers 'storage' events in other tabs
  localStorage.setItem(SYNC_EVENT_KEY, Date.now().toString());
  // Also invalidate our own queries
  queryClientRef?.invalidateQueries({ queryKey: ["orders"] });
}

// ─── Initialization ──────────────────────────────────────────────────────

/**
 * Initialize the sync system. Call this once at app startup.
 * 
 * @param queryClient - The React Query client to invalidate on incoming changes.
 */
export function initSync(queryClient: QueryClient): void {
  if (!isDemoMode()) return;
  queryClientRef = queryClient;
  seedIfNeeded();

  // Listen for changes from other tabs / the RMO app
  window.addEventListener("storage", (event) => {
    if (event.key === SYNC_EVENT_KEY || event.key === STORAGE_KEY) {
      // Another tab/app modified order data — refetch everything
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });

  console.log("[Sync] Admin Dashboard sync initialized (demo mode)");
}

// ─── User Management Store ───────────────────────────────────────────────

const USERS_KEY = "hm_users";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  status: "active" | "inactive";
  password: string;
  createdAt: string;
  locationId?: string;
  assignedLocationId?: string;
}

const DEFAULT_USERS: ManagedUser[] = [
  { id: "u1", name: "Ahmed Khalil", email: "picker@rmo.qa", role: "picker", phone: "55001122", status: "active", password: "picker123", createdAt: "2026-01-15" },
  { id: "u2", name: "Sara Al-Thani", email: "packer@rmo.qa", role: "packer", phone: "55003344", status: "active", password: "packer123", createdAt: "2026-01-15" },
  { id: "u3", name: "Omar Farooq", email: "driver@rmo.qa", role: "driver", phone: "55005566", status: "active", password: "driver123", createdAt: "2026-01-15" },
  { id: "u4", name: "Nijad", email: "nijad@rmo.qa", role: "picker", phone: "55007788", status: "active", password: "picker123", createdAt: "2026-02-01" },
  { id: "u5", name: "Mashood", email: "mashood@rmo.qa", role: "packer", phone: "55009900", status: "active", password: "packer123", createdAt: "2026-02-01" },
];

function seedUsersIfNeeded(): void {
  const existing = localStorage.getItem(USERS_KEY);
  if (!existing) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  } else {
    try {
      const parsed = JSON.parse(existing);
      const filtered = parsed.filter((u: any) => u.role !== "customer_care" && u.role !== "vl_staff");
      if (filtered.length !== parsed.length) {
        localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
      }
    } catch {}
  }
}

export async function getUsers(): Promise<ManagedUser[]> {
  if (isDemoMode()) {
    seedUsersIfNeeded();
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.filter((u: any) => u.role !== "customer_care" && u.role !== "vl_staff");
      }
    } catch {}
    return DEFAULT_USERS;
  }

  try {
    const response = await erpNextClient.get<{ success: boolean; data: any[] }>("/api/users");
    if (response && response.success && Array.isArray(response.data)) {
      return response.data.map((u: any) => ({
        id: String(u.id),
        name: u.name || "",
        email: u.email || "",
        role: u.role || "picker",
        phone: u.phone || "",
        status: u.status || "active",
        password: "", // hide password in UI list
        createdAt: u.created_at ? u.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
      }));
    }
  } catch (err) {
    console.error("[Sync] Failed to fetch users from backend:", err);
  }
  return [];
}

export async function getDrivers(): Promise<ManagedUser[]> {
  if (isDemoMode()) {
    const users = await getUsers();
    return users.filter((u) => u.role === "driver" && u.status === "active");
  }

  try {
    const response = await erpNextClient.get<any>("/api/get-drivers-list");
    const rawList = Array.isArray(response) ? response : (response?.data || response?.drivers || []);
    if (Array.isArray(rawList)) {
      return rawList.map((d: any) => ({
        id: String(d.id),
        name: d.name || d.username || d.email || `Driver #${d.id}`,
        email: d.email || "",
        role: d.role || "driver",
        phone: d.phone || "",
        status: d.status || "active",
        password: "",
        createdAt: d.created_at ? d.created_at.split("T")[0] : "",
      }));
    }
  } catch (err) {
    console.warn("[Sync] /api/get-drivers-list request error, fallback to /api/drivers", err);
  }

  try {
    const response = await erpNextClient.get<any>("/api/drivers");
    const rawList = Array.isArray(response) ? response : (response?.data || response?.drivers || []);
    if (Array.isArray(rawList)) {
      return rawList.map((d: any) => ({
        id: String(d.id),
        name: d.name || d.username || d.email || `Driver #${d.id}`,
        email: d.email || "",
        role: d.role || "driver",
        phone: d.phone || "",
        status: d.status || "active",
        password: "",
        createdAt: d.created_at ? d.created_at.split("T")[0] : "",
      }));
    }
  } catch (err) {
    console.warn("[Sync] /api/drivers request error, fallback to getUsers()", err);
  }

  // Fallback to getUsers()
  const users = await getUsers();
  return users.filter((u) => u.role === "driver");
}

export async function getPickers(): Promise<ManagedUser[]> {
  if (isDemoMode()) {
    const users = await getUsers();
    return users.filter((u) => u.role === "picker" && u.status === "active");
  }

  try {
    const response = await erpNextClient.get<any>("/api/get-pickers-list");
    const rawList = Array.isArray(response) ? response : (response?.data || response?.pickers || []);
    if (Array.isArray(rawList)) {
      return rawList.map((p: any) => ({
        id: String(p.id),
        name: p.name || p.username || p.email || `Picker #${p.id}`,
        email: p.email || "",
        role: p.role || "picker",
        phone: p.phone || "",
        status: p.status || "active",
        password: "",
        createdAt: p.created_at ? p.created_at.split("T")[0] : "",
      }));
    }
  } catch (err) {
    console.warn("[Sync] /api/get-pickers-list request error, fallback to /api/pickers", err);
  }

  try {
    const response = await erpNextClient.get<any>("/api/pickers");
    const rawList = Array.isArray(response) ? response : (response?.data || response?.pickers || []);
    if (Array.isArray(rawList)) {
      return rawList.map((p: any) => ({
        id: String(p.id),
        name: p.name || p.username || p.email || `Picker #${p.id}`,
        email: p.email || "",
        role: p.role || "picker",
        phone: p.phone || "",
        status: p.status || "active",
        password: "",
        createdAt: p.created_at ? p.created_at.split("T")[0] : "",
      }));
    }
  } catch (err) {
    console.warn("[Sync] /api/pickers request error, fallback to getUsers()", err);
  }

  const users = await getUsers();
  return users.filter((u) => u.role === "picker");
}

export async function getPackers(): Promise<ManagedUser[]> {
  if (isDemoMode()) {
    const users = await getUsers();
    return users.filter((u) => u.role === "packer" && u.status === "active");
  }

  try {
    const response = await erpNextClient.get<any>("/api/get-packers-list");
    const rawList = Array.isArray(response) ? response : (response?.data || response?.packers || []);
    if (Array.isArray(rawList)) {
      return rawList.map((p: any) => ({
        id: String(p.id),
        name: p.name || p.username || p.email || `Packer #${p.id}`,
        email: p.email || "",
        role: p.role || "packer",
        phone: p.phone || "",
        status: p.status || "active",
        password: "",
        createdAt: p.created_at ? p.created_at.split("T")[0] : "",
      }));
    }
  } catch (err) {
    console.warn("[Sync] /api/get-packers-list request error, fallback to /api/packers", err);
  }

  try {
    const response = await erpNextClient.get<any>("/api/packers");
    const rawList = Array.isArray(response) ? response : (response?.data || response?.packers || []);
    if (Array.isArray(rawList)) {
      return rawList.map((p: any) => ({
        id: String(p.id),
        name: p.name || p.username || p.email || `Packer #${p.id}`,
        email: p.email || "",
        role: p.role || "packer",
        phone: p.phone || "",
        status: p.status || "active",
        password: "",
        createdAt: p.created_at ? p.created_at.split("T")[0] : "",
      }));
    }
  } catch (err) {
    console.warn("[Sync] /api/packers request error, fallback to getUsers()", err);
  }

  const users = await getUsers();
  return users.filter((u) => u.role === "packer");
}

export async function assignDriverToOrder(payload: {
  order_number?: string;
  order_id?: number | string;
  assigned_driver_user_id: number | string;
  zone?: string;
}) {
  if (isDemoMode()) {
    console.log("[Sync] Demo mode: assignDriverToOrder", payload);
    return { status: "success", message: "Driver assigned (demo mode)" };
  }

  try {
    const response = await erpNextClient.post<any>("/api/orders/assign-driver", {
      order_number: payload.order_number,
      order_id: payload.order_id ? Number(payload.order_id) : undefined,
      assigned_driver_user_id: Number(payload.assigned_driver_user_id),
      zone: payload.zone || undefined,
    });
    return response;
  } catch (err) {
    console.error("[Sync] Failed to assign driver via API:", err);
    throw err;
  }
}

export async function assignPickerItemsToOrder(payload: {
  order_id?: number | string;
  order_number?: string;
  picker_id?: number | string;
  picker_name?: string;
  order_items: (number | string)[];
}) {
  if (isDemoMode()) {
    console.log("[Sync] Demo mode: assignPickerItemsToOrder", payload);
    return { status: "success", message: "Picker items assigned (demo mode)" };
  }

  try {
    const response = await erpNextClient.post<any>("/api/orders/assign-picker-items", {
      order_id: payload.order_id ? Number(payload.order_id) : undefined,
      order_number: payload.order_number,
      order: payload.order_id || payload.order_number,
      picker_id: payload.picker_id ? Number(payload.picker_id) : payload.picker_id,
      picker_name: payload.picker_name,
      picker: payload.picker_id || payload.picker_name,
      order_items: payload.order_items,
    });
    return response;
  } catch (err) {
    console.error("[Sync] Failed to assign picker items via API:", err);
    throw err;
  }
}

export async function unassignPickerItemsFromOrder(payload: {
  order_id?: number | string;
  order_number?: string;
  order_items: (number | string)[];
}) {
  if (isDemoMode()) {
    console.log("[Sync] Demo mode: unassignPickerItemsFromOrder", payload);
    return { status: "success", message: "Picker items unassigned (demo mode)" };
  }

  try {
    const response = await erpNextClient.post<any>("/api/orders/unassign-picker-items", {
      order_id: payload.order_id ? Number(payload.order_id) : undefined,
      order_number: payload.order_number,
      order: payload.order_id || payload.order_number,
      order_items: payload.order_items,
    });
    return response;
  } catch (err) {
    console.error("[Sync] Failed to unassign picker items via API:", err);
    throw err;
  }
}

export async function assignPackerItemsToOrder(payload: {
  order_id?: number | string;
  order_number?: string;
  packer_id?: number | string;
  packer_name?: string;
  order_items: (number | string)[];
}) {
  if (isDemoMode()) {
    console.log("[Sync] Demo mode: assignPackerItemsToOrder", payload);
    return { status: "success", message: "Packer items assigned (demo mode)" };
  }

  try {
    const parsedPackerId = payload.packer_id && !isNaN(Number(payload.packer_id))
      ? Number(payload.packer_id)
      : payload.packer_id;

    const response = await erpNextClient.post<any>("/api/orders/assign-packer-items", {
      order_id: payload.order_id,
      order_number: payload.order_number,
      packer_id: parsedPackerId,
      packer_name: payload.packer_name,
      order_items: payload.order_items,
    });
    return response;
  } catch (err) {
    console.error("[Sync] Failed to assign packer items via API:", err);
    throw err;
  }
}

export async function unassignPackerItemsFromOrder(payload: {
  order_id?: number | string;
  order_number?: string;
  order_items: (number | string)[];
}) {
  if (isDemoMode()) {
    console.log("[Sync] Demo mode: unassignPackerItemsFromOrder", payload);
    return { status: "success", message: "Packer items unassigned (demo mode)" };
  }

  try {
    const response = await erpNextClient.post<any>("/api/orders/unassign-packer-items", {
      order_id: payload.order_id,
      order_number: payload.order_number,
      order_items: payload.order_items,
    });
    return response;
  } catch (err) {
    console.error("[Sync] Failed to unassign packer items via API:", err);
    throw err;
  }
}

export function saveUsers(users: ManagedUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Signal other tabs
  localStorage.setItem("hm_users_sync", Date.now().toString());
}

export async function addUser(user: ManagedUser): Promise<void> {
  if (isDemoMode()) {
    const users = await getUsers();
    users.push(user);
    saveUsers(users);
    return;
  }

  await erpNextClient.post("/api/users", {
    name: user.name,
    email: user.email,
    password: user.password,
    phone: user.phone,
    role: user.role,
    status: user.status,
  });
}

export async function updateUser(id: string, updates: Partial<ManagedUser>): Promise<void> {
  if (isDemoMode()) {
    const users = await getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updates };
      saveUsers(users);
    }
    return;
  }

  await erpNextClient.put(`/api/users/${id}`, {
    name: updates.name,
    email: updates.email,
    phone: updates.phone,
    role: updates.role,
    status: updates.status,
    password: updates.password || undefined,
  });
}

export async function deleteUser(id: string): Promise<void> {
  if (isDemoMode()) {
    const users = (await getUsers()).filter((u) => u.id !== id);
    saveUsers(users);
    return;
  }

  await erpNextClient.delete(`/api/users/${id}`);
}
