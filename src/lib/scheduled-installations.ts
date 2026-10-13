/**
 * Scheduled Installations Store
 *
 * A reactive store that holds the list of scheduled installations.
 * Data is persisted to localStorage so the Picker App (route-my-order)
 * can write items and the Admin Dashboard picks them up in real-time
 * via the `storage` event.
 */

const STORAGE_KEY = 'hm_scheduled_installations';

export interface ScheduledItem {
  /** Unique id for this scheduled entry */
  id: string;
  /** The order this item belongs to */
  orderId: string;
  /** The backend order item id */
  orderItemId?: number | string;
  /** Product name */
  productName: string;
  /** SKU */
  sku: string;
  /** Product image URL */
  image: string;
  /** Customer name */
  customerName: string;
  /** Scheduled status: "Pending" or "Assigned" */
  status: "Pending" | "Assigned";
  /** When this installation was scheduled */
  scheduledAt: string;
  /** Assigned driver/installer */
  assignedDriver?: string | null;
  /** Installation method from the product location */
  installationMethod?: string;
}

type Listener = () => void;

const DEFAULT_ITEMS: ScheduledItem[] = [
  // Pre-populate with data matching the old dashboard screenshot
  {
    id: "si-1",
    orderId: "HM68229",
    productName: "Happy Hop 6-in-1 Play Center",
    sku: "9060",
    image: "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=100&h=100&fit=crop",
    customerName: "Sara Al Sulaiti",
    status: "Pending",
    scheduledAt: "2026-05-25T14:10:00.000Z",
    installationMethod: "Standard Assembly (Hilal Team)",
  },
  {
    id: "si-2",
    orderId: "HM68229",
    productName: "Bestway Apx 365 Round Pool Set (12' x 30\")",
    sku: "561KC",
    image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=100&h=100&fit=crop",
    customerName: "Sara Al Sulaiti",
    status: "Pending",
    scheduledAt: "2026-05-25T14:10:00.000Z",
    installationMethod: "Main Warehouse Outdoor Installation (Specialist Team)",
  },
  {
    id: "si-3",
    orderId: "HM68229",
    productName: "Smoby Green XL Slide",
    sku: "820304",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=100&h=100&fit=crop",
    customerName: "Sara Al Sulaiti",
    status: "Pending",
    scheduledAt: "2026-05-25T14:10:00.000Z",
    installationMethod: "Virtual Stock Direct Delivery & Setup (Third-Party Partner)",
  },
  {
    id: "si-4",
    orderId: "HM68258",
    productName: "Bestway H2Ogo! Leap & Play Mega Water Park",
    sku: "53427",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&h=100&fit=crop",
    customerName: "Mouza Al Derham",
    status: "Pending",
    scheduledAt: "2026-05-25T16:20:00.000Z",
    installationMethod: "Standard Assembly (Hilal Team)",
  },
  {
    id: "si-5",
    orderId: "HM68268",
    productName: "Intex Prism Frame Rectangular Pool Set",
    sku: "26790",
    image: "https://images.unsplash.com/photo-1560090995-01b72abb4c06?w=100&h=100&fit=crop",
    customerName: "aisha alnaemi",
    status: "Pending",
    scheduledAt: "2026-05-26T09:30:00.000Z",
    installationMethod: "Main Warehouse Outdoor Installation (Specialist Team)",
  },
  {
    id: "si-6",
    orderId: "HM68229",
    productName: "Happy Hop Double Water Slide – Deluxe",
    sku: "9029",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&h=100&fit=crop",
    customerName: "Sara Al Sulaiti",
    status: "Assigned",
    scheduledAt: "2026-05-25T14:10:00.000Z",
    assignedDriver: "Omar Farooq",
    installationMethod: "Standard Assembly (Hilal Team)",
  },
  {
    id: "si-7",
    orderId: "HM68258",
    productName: "Bestway Flowclear Pool Cover (12ft)",
    sku: "58034",
    image: "https://images.unsplash.com/photo-1560090995-01b72abb4c06?w=100&h=100&fit=crop",
    customerName: "Mouza Al Derham",
    status: "Assigned",
    scheduledAt: "2026-05-25T16:20:00.000Z",
    assignedDriver: "Omar Farooq",
    installationMethod: "Virtual Stock Direct Delivery & Setup (Third-Party Partner)",
  },
  {
    id: "si-8",
    orderId: "HM64839",
    productName: "Nip Soother With Hook (Blue)",
    sku: "412217",
    image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100&h=100&fit=crop",
    customerName: "test test",
    status: "Assigned",
    scheduledAt: "2026-05-26T09:30:00.000Z",
    assignedDriver: "Omar Farooq",
    installationMethod: "Standard Assembly (Hilal Team)",
  },
];

/** Load from localStorage, falling back to defaults on first run. */
function _loadFromStorage(): ScheduledItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration: if storage has old mock data (missing installationMethod) or references old mock drivers, reset to new defaults
      const needsMigration = parsed.some(
        (item: any) =>
          !item.installationMethod ||
          item.assignedDriver === "irshad" ||
          item.assignedDriver === "farshad" ||
          item.assignedDriver === "driver1"
      );
      if (!needsMigration) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  // First run or old mock data detected — seed defaults and persist
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS));
  return [...DEFAULT_ITEMS];
}

let _items: ScheduledItem[] = _loadFromStorage();

const _listeners: Set<Listener> = new Set();

/** Persist current state to localStorage. */
function _persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_items));
}

function _notify() {
  _persist();
  _listeners.forEach((fn) => fn());
}

// Listen for cross-tab writes (from Picker App)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        _items = JSON.parse(e.newValue);
        _listeners.forEach((fn) => fn());
      } catch { /* ignore */ }
    }
  });
}

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/** Get current snapshot of scheduled items. */
export function getSnapshot(): ScheduledItem[] {
  return _items;
}

/** Schedule a new installation item. */
export function scheduleItem(item: Omit<ScheduledItem, "id" | "status" | "scheduledAt">): ScheduledItem {
  const newItem: ScheduledItem = {
    ...item,
    id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: "Pending",
    scheduledAt: new Date().toISOString(),
    assignedDriver: null,
  };
  _items = [..._items, newItem];
  _notify();
  return newItem;
}

/** Remove a scheduled installation. */
export function removeItem(id: string) {
  _items = _items.filter((i) => i.id !== id);
  _notify();
}

/** Assign a driver to selected items. */
export function assignDriver(ids: string[], driver: string) {
  _items = _items.map((item) =>
    ids.includes(item.id)
      ? { ...item, assignedDriver: driver, status: "Assigned" as const }
      : item,
  );
  _notify();
}

/** Check if a product (by orderId + sku) is already scheduled. */
export function isItemScheduled(orderId: string, sku: string): boolean {
  return _items.some((i) => i.orderId === orderId && i.sku === sku);
}

/** Available drivers / installers for assignment. */
export const AVAILABLE_DRIVERS = [
  "minhal",
  "rizwan_",
  "mwd_shambu",
  "mwd_naveed",
  "mwd_nishad",
  "shijar",
  "waseem",
  "chand",
  "omar",
  "saifu",
  "irshad",
  "farshad",
  "nassim",
];
