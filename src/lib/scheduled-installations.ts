/**
 * Scheduled Installations Store
 *
 * A reactive store that holds the list of scheduled installations.
 * Data is persisted to localStorage so changes are reactive across tabs
 * and merge cleanly with live backend technician schedule data.
 */

import type {
  TechnicianScheduleRecord,
  CompletedInstallationRecord,
  ScheduledOrderItem,
  MainWarehousePickedRecord,
} from "@/lib/api/services";

const STORAGE_KEY = 'hm_scheduled_installations';

export type ScheduledTabType =
  | "Pending Scheduled"
  | "Scheduled"
  | "Main Warehouse Picked"
  | "Technician Received"
  | "Completed"
  | "Driver Assigned";

export interface ScheduledItem {
  /** Unique id for this scheduled entry */
  id: string;
  /** The order this item belongs to */
  orderId: string;
  /** Order number (e.g. "#1041") */
  orderNumber?: string;
  /** The backend order item id */
  orderItemId?: number | string;
  /** Order installation ID if available */
  orderInstallationId?: number | string;
  /** Product name */
  productName: string;
  /** SKU */
  sku: string;
  /** Product image URL */
  image: string;
  /** Customer name */
  customerName: string;
  /** Customer phone */
  customerPhone?: string;
  /** Delivery / installation address */
  address?: string;
  /** Scheduled tab status */
  status: ScheduledTabType;
  /** When this installation was created/scheduled */
  scheduledAt: string;
  /** Customer requested installation date (YYYY-MM-DD) */
  scheduledDate?: string;
  /** Start time (HH:mm:ss or HH:mm) */
  startTime?: string;
  /** End time (HH:mm:ss or HH:mm) */
  endTime?: string;
  /** Formatted customer time range, e.g. "09:00 AM – 10:00 AM" */
  scheduledTimeRange?: string;
  /** Scheduled technician ID */
  technicianId?: number | string | null;
  /** Scheduled technician Name */
  technicianName?: string | null;
  /** Assigned driver/installer name */
  assignedDriver?: string | null;
  /** Driver user ID */
  driverId?: number | string | null;
  /** Installation method or classification from the product */
  installationMethod?: string;
  /** Installation / customer notes */
  installationNotes?: string | null;
  /** ISO timestamp when installation was completed */
  completedAt?: string | null;
  /** Proof / uploaded installation photos */
  images?: string[];
  /** Barcode */
  barcode?: string;
  /** Whether this schedule has been rescheduled */
  isRescheduled?: boolean;
  /** Total reschedule count */
  rescheduleCount?: number;
  /** Reason for latest reschedule */
  latestRescheduleReason?: string | null;
  /** Full reschedule history entries */
  rescheduleHistory?: any[];
  /** ISO timestamp when the appointment was rescheduled */
  rescheduledAt?: string | null;
  /** Normalized YYYY-MM-DD rescheduled date or new scheduled date */
  rescheduledDate?: string | null;
  /** Product tags (e.g. Bedding, Boys, etc.) */
  productTags?: string | string[] | null;
  /** Gift wrap value */
  giftWrap?: string | boolean | null;
  /** Gift message */
  giftMessage?: string | null;
  /** Raw backend payload */
  raw?: any;
  /** Proof images from installation_images table */
  proofImages?: any[];
  /** When this item was picked by main warehouse picker */
  pickedAt?: string | null;
  /** Name of the warehouse picker */
  pickerName?: string | null;
  /** When technician received or started installation */
  technicianReceivedAt?: string | null;
  /** Installation start time */
  startedAt?: string | null;
  /** Line item ID from order_items table or Shopify */
  lineItemId?: string | number | null;
  /** Status of the line item in order_items table (e.g. "pending", "picker_assigned", "picked") */
  orderItemStatus?: string | null;
}

type Listener = () => void;

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return "";
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

export function formatCustomerTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime) return "";
  const startFmt = formatTime12h(startTime);
  if (!endTime) return startFmt;
  const endFmt = formatTime12h(endTime);
  return `${startFmt} – ${endFmt}`;
}

export function normalizeDateStr(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined;
  const s = String(dateStr).trim();
  if (!s) return undefined;

  // 1. Check YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 2. Check DD-MM-YYYY or DD/MM/YYYY (4-digit year like 16/11/2026)
  const dmy4Match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy4Match) {
    const day = dmy4Match[1].padStart(2, "0");
    const month = dmy4Match[2].padStart(2, "0");
    const year = dmy4Match[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Check DD-MM-YY or DD/MM/YY (2-digit year like 16/11/26)
  const dmy2Match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})(?!\d)/);
  if (dmy2Match) {
    const day = dmy2Match[1].padStart(2, "0");
    const month = dmy2Match[2].padStart(2, "0");
    const yr = parseInt(dmy2Match[3], 10);
    const fullYear = yr < 70 ? `20${dmy2Match[3]}` : `19${dmy2Match[3]}`;
    return `${fullYear}-${month}-${day}`;
  }

  // 4. Try Date parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return s.slice(0, 10);
}

/**
 * Determines whether a ScheduledItem matches a target date string (YYYY-MM-DD).
 * If targetDate is null/undefined, returns true (All Dates view).
 * If targetDate is provided (e.g. today "2026-11-17", tomorrow, or a selected date):
 * - Matches if scheduledDate === targetDate
 * - Matches if rescheduledDate === targetDate
 * - Matches if rescheduledAt date === targetDate
 * - Matches if any rescheduleHistory entry has scheduled_date === targetDate or rescheduled_at === targetDate
 * - For "Main Warehouse Picked": also matches if pickedAt date === targetDate
 * - For "Technician Received": also matches if technicianReceivedAt date === targetDate
 * - For "Completed": also matches if completedAt date === targetDate
 * - For "Pending Scheduled": also matches if !scheduledDate && !item.rescheduledDate
 */
export function itemMatchesDate(item: ScheduledItem, targetDate: string | null | undefined, tab: ScheduledTabType): boolean {
  if (!targetDate) return true;

  const rawScheduled = item.scheduledDate || (item.scheduledAt ? item.scheduledAt.slice(0, 10) : "");
  const scheduledDate = normalizeDateStr(rawScheduled) || rawScheduled;

  // 1. Direct scheduled date match
  if (scheduledDate === targetDate) return true;

  // 2. Rescheduled date match (e.g. appointment rescheduled to targetDate or rescheduled on targetDate)
  if (item.rescheduledDate && normalizeDateStr(item.rescheduledDate) === targetDate) return true;
  if (item.rescheduledAt && normalizeDateStr(item.rescheduledAt.slice(0, 10)) === targetDate) return true;

  // 3. Check any history entries for a match with targetDate
  if (Array.isArray(item.rescheduleHistory) && item.rescheduleHistory.length > 0) {
    const hasHistoryMatch = item.rescheduleHistory.some((h: any) => {
      const hDate = h.scheduled_date ? normalizeDateStr(h.scheduled_date) : "";
      const hReschedAt = h.rescheduled_at ? normalizeDateStr(String(h.rescheduled_at).slice(0, 10)) : "";
      return hDate === targetDate || hReschedAt === targetDate;
    });
    if (hasHistoryMatch) return true;
  }

  // 4. Check raw backend payload if available
  if (item.raw) {
    const rawReschedAt = item.raw.rescheduled_at ? normalizeDateStr(String(item.raw.rescheduled_at).slice(0, 10)) : "";
    if (rawReschedAt === targetDate) return true;
    const rawSchedDate = item.raw.scheduled_date ? normalizeDateStr(item.raw.scheduled_date) : "";
    if (rawSchedDate === targetDate) return true;
  }

  // 5. Stage-specific event date matches
  if (tab === "Main Warehouse Picked") {
    const pickedDate = item.pickedAt ? (normalizeDateStr(item.pickedAt.slice(0, 10)) || item.pickedAt.slice(0, 10)) : "";
    if (pickedDate === targetDate) return true;
  }

  if (tab === "Technician Received") {
    const receivedDate = item.technicianReceivedAt ? (normalizeDateStr(item.technicianReceivedAt.slice(0, 10)) || item.technicianReceivedAt.slice(0, 10)) : "";
    if (receivedDate === targetDate) return true;
  }

  if (tab === "Completed") {
    const completedDate = item.completedAt ? (normalizeDateStr(item.completedAt.slice(0, 10)) || item.completedAt.slice(0, 10)) : "";
    if (completedDate === targetDate) return true;
  }

  if (tab === "Pending Scheduled") {
    if (!scheduledDate && !item.rescheduledDate) return true;
  }

  return false;
}

export function normalizeScheduledStatus(
  status: string | undefined | null,
  assignedDriver?: string | null,
  completedAt?: string | null,
  orderStatus?: string | null,
  existingStatus?: ScheduledTabType,
  orderItemStatus?: string | null,
  isFromTechnicianSchedule: boolean = false,
): ScheduledTabType {
  const s = String(status || "").toLowerCase().trim();
  const itemStatus = String(orderItemStatus || "").toLowerCase().trim();

  // 1. Completed
  if (
    s === "completed" ||
    s === "installed" ||
    completedAt ||
    existingStatus === "Completed" ||
    itemStatus === "completed" ||
    itemStatus === "installed"
  ) {
    return "Completed";
  }

  // 2. Preserve locally transitioned status if already moved past Scheduled
  if (existingStatus === "Technician Received") {
    return "Technician Received";
  }
  if (existingStatus === "Main Warehouse Picked") {
    if (
      s === "technician received" ||
      s === "technician_received" ||
      s === "received" ||
      s === "started" ||
      s === "technician started" ||
      s === "in_progress" ||
      s === "in progress" ||
      s === "in_installation"
    ) {
      return "Technician Received";
    }
    return "Main Warehouse Picked";
  }

  // 3. Technician Received / Started
  if (
    s === "technician received" ||
    s === "technician_received" ||
    s === "received" ||
    s === "started" ||
    s === "technician started" ||
    s === "in_progress" ||
    s === "in progress" ||
    s === "in_installation" ||
    s === "driver assigned" ||
    s === "driver_assigned" ||
    s === "assigned"
  ) {
    return "Technician Received";
  }

  // 4. Main Warehouse Picked
  // Only if the installation item itself in order_items table is picked!
  if (
    itemStatus === "picked" ||
    s === "main warehouse picked" ||
    s === "main_warehouse_picked" ||
    s === "picker picked" ||
    s === "picker_picked"
  ) {
    return "Main Warehouse Picked";
  }

  // 5. From technician-scheduled-list: explicitly Scheduled!
  if (isFromTechnicianSchedule) {
    return "Scheduled";
  }

  // 6. Explicitly Scheduled in backend record
  if (s === "scheduled" || s === "rescheduled") {
    return "Scheduled";
  }

  // 7. Pending Scheduled
  // If schedule record status is explicitly pending or awaiting, or preserved as Pending Scheduled
  if (
    s === "pending" ||
    s === "pending scheduled" ||
    s === "pending_scheduled" ||
    s === "pending_schedule" ||
    s === "awaiting" ||
    s === "awaiting_scheduled" ||
    existingStatus === "Pending Scheduled"
  ) {
    return "Pending Scheduled";
  }

  // 8. Default to Scheduled
  return "Scheduled";
}

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) {
      const todayStr = getTodayDateStr();
      const tomorrowStr = getTomorrowDateStr();
      const formatted = dateObj.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      if (dateStr === todayStr) return `Today (${formatted})`;
      if (dateStr === tomorrowStr) return `Tomorrow (${formatted})`;
      return formatted;
    }
  }
  return dateStr;
}

function _isMockItem(item: any): boolean {
  if (!item) return false;
  const id = String(item.id || "");
  if (id.startsWith("si-")) return true;
  if (item.orderId === "HM68229" || item.orderId === "HM68268" || item.orderId === "HM68258" || item.orderId === "HM68290" || item.orderId === "HM68305") return true;
  if (item.customerName === "Sara Al Sulaiti" || item.customerName === "aisha alnaemi" || item.customerName === "Mouza Al Derham") return true;
  return false;
}

/** No mock data: default to empty array */
const DEFAULT_ITEMS: ScheduledItem[] = [];

/** Load from localStorage, removing any legacy mock data and migrating statuses. */
function _loadFromStorage(): ScheduledItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Strip out any legacy mock data
        const nonMock = parsed.filter((item) => !_isMockItem(item));

        // Migrate statuses into the pipeline
        const migrated = nonMock.map((item) => {
          let currentStatus: ScheduledTabType = "Scheduled";
          const ois = item.orderItemStatus ? String(item.orderItemStatus).toLowerCase().trim() : null;

          if (item.status === "Completed" || item.completedAt) {
            currentStatus = "Completed";
          } else if (item.status === "Technician Received" || item.technicianReceivedAt) {
            currentStatus = "Technician Received";
          } else if (item.status === "Main Warehouse Picked" || item.status === "Picked" || (item.pickedAt && ois === "picked")) {
            currentStatus = "Main Warehouse Picked";
          } else if (item.status === "Pending Scheduled") {
            // Items synced from technician-scheduled-list belong in Scheduled
            if (String(item.id).startsWith("tech-") || item.technicianName) {
              currentStatus = "Scheduled";
            } else {
              currentStatus = "Pending Scheduled";
            }
          } else if (item.status === "Driver Assigned" || item.assignedDriver) {
            currentStatus = "Technician Received";
          } else {
            currentStatus = "Scheduled";
          }

          const timeRange =
            item.scheduledTimeRange ||
            (item.startTime ? formatCustomerTimeRange(item.startTime, item.endTime) : undefined);

          return {
            ...item,
            status: currentStatus,
            orderItemStatus: item.orderItemStatus || "pending",
            pickedAt: (currentStatus === "Scheduled" || currentStatus === "Pending Scheduled") ? null : item.pickedAt,
            scheduledTimeRange: timeRange,
            images: Array.isArray(item.images) ? item.images : item.images ? [item.images] : [],
          };
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    /* ignore parse errors */
  }

  // First run or empty: seed empty array
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  return [];
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

// Listen for cross-tab writes
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        _items = JSON.parse(e.newValue);
        _listeners.forEach((fn) => fn());
      } catch {
        /* ignore */
      }
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
export function scheduleItem(
  item: Omit<ScheduledItem, "id" | "status" | "scheduledAt"> & {
    status?: ScheduledTabType;
    scheduledAt?: string;
  },
): ScheduledItem {
  const timeRange =
    item.scheduledTimeRange ||
    (item.startTime ? formatCustomerTimeRange(item.startTime, item.endTime) : undefined);

  const newItem: ScheduledItem = {
    ...item,
    id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: item.status || "Scheduled",
    scheduledAt: item.scheduledAt || new Date().toISOString(),
    scheduledTimeRange: timeRange,
    assignedDriver: item.assignedDriver || null,
    images: Array.isArray(item.images) ? item.images : item.images ? [item.images] : [],
  };
  _items = [newItem, ..._items];
  _notify();
  return newItem;
}

/** Remove a scheduled installation. */
export function removeItem(id: string) {
  _items = _items.filter((i) => i.id !== id);
  _notify();
}

/** Mark selected items as Scheduled (transitions from Pending Scheduled). */
export function markAsScheduled(ids: string[]) {
  _items = _items.map((item) =>
    ids.includes(item.id)
      ? {
          ...item,
          status: "Scheduled" as const,
        }
      : item,
  );
  _notify();
}

/** Mark selected items as picked by Main Warehouse Picker. */
export function markItemsAsPicked(ids: string[], pickerName?: string) {
  const timestamp = new Date().toISOString();
  _items = _items.map((item) =>
    ids.includes(item.id)
      ? {
          ...item,
          status: "Main Warehouse Picked" as const,
          orderItemStatus: "picked",
          pickedAt: item.pickedAt || timestamp,
          pickerName: pickerName || item.pickerName || "Main Warehouse Picker",
        }
      : item,
  );
  _notify();
}

/** Mark selected items as received or started by technician. */
export function markTechnicianReceived(ids: string[], technicianName?: string, technicianId?: number | string) {
  const timestamp = new Date().toISOString();
  _items = _items.map((item) =>
    ids.includes(item.id)
      ? {
          ...item,
          status: "Technician Received" as const,
          technicianReceivedAt: item.technicianReceivedAt || timestamp,
          startedAt: item.startedAt || timestamp,
          technicianName: technicianName || item.technicianName || item.assignedDriver || "Assigned Technician",
          technicianId: technicianId ?? item.technicianId,
        }
      : item,
  );
  _notify();
}

/** Assign a driver or technician to selected items. */
export function assignDriver(ids: string[], driver: string, driverId?: number | string) {
  const timestamp = new Date().toISOString();
  _items = _items.map((item) =>
    ids.includes(item.id)
      ? {
          ...item,
          assignedDriver: driver,
          technicianName: item.technicianName || driver,
          driverId: driverId ?? item.driverId,
          technicianReceivedAt: item.technicianReceivedAt || timestamp,
          status: "Technician Received" as const,
        }
      : item,
  );
  _notify();
}

/** Revert an item back to a specified stage. */
export function revertItemStatus(id: string, targetStatus: ScheduledTabType) {
  _items = _items.map((item) =>
    item.id === id
      ? {
          ...item,
          status: targetStatus,
          orderItemStatus:
            targetStatus === "Pending Scheduled" || targetStatus === "Scheduled"
              ? "pending"
              : item.orderItemStatus,
          pickedAt:
            targetStatus === "Pending Scheduled" || targetStatus === "Scheduled"
              ? null
              : item.pickedAt,
          technicianReceivedAt:
            targetStatus === "Pending Scheduled" ||
            targetStatus === "Scheduled" ||
            targetStatus === "Main Warehouse Picked"
              ? null
              : item.technicianReceivedAt,
          startedAt:
            targetStatus === "Pending Scheduled" ||
            targetStatus === "Scheduled" ||
            targetStatus === "Main Warehouse Picked"
              ? null
              : item.startedAt,
          completedAt: targetStatus !== "Completed" ? null : item.completedAt,
        }
      : item,
  );
  _notify();
}

/** Mark an installation as completed and optionally attach images. */
export function completeInstallation(
  id: string,
  data?: {
    notes?: string;
    images?: string[];
    completedAt?: string;
  },
) {
  _items = _items.map((item) => {
    if (item.id !== id) return item;
    const existingImages = item.images || [];
    const newImages = data?.images || [];
    const mergedImages = Array.from(new Set([...existingImages, ...newImages]));

    return {
      ...item,
      status: "Completed" as const,
      completedAt: data?.completedAt || new Date().toISOString(),
      installationNotes: data?.notes !== undefined ? data.notes : item.installationNotes,
      images: mergedImages,
    };
  });
  _notify();
}

/** Add images to an installation item. */
export function addInstallationImages(id: string, newImages: string[]) {
  if (!newImages || newImages.length === 0) return;
  _items = _items.map((item) => {
    if (item.id !== id) return item;
    const current = item.images || [];
    return {
      ...item,
      images: Array.from(new Set([...current, ...newImages])),
    };
  });
  _notify();
}

/** Check if a product (by orderId + sku) is already scheduled. */
export function isItemScheduled(orderId: string, sku: string): boolean {
  return _items.some(
    (i) =>
      i.orderId.replace("#", "") === orderId.replace("#", "") &&
      i.sku.toLowerCase() === sku.toLowerCase(),
  );
}

/**
 * Synchronize live records from GET /api/admin/technician-schedule/list
 * into the store, seamlessly keeping user edits (such as driver assignments and proof photos).
 */
export function syncTechnicianSchedules(records: TechnicianScheduleRecord[]) {
  if (!Array.isArray(records) || records.length === 0) return;

  let hasChanges = false;
  const currentMap = new Map<string, ScheduledItem>(_items.map((i) => [i.id, i]));
  const orderItemMap = new Map<string, ScheduledItem>();
  _items.forEach((i) => {
    if (i.orderItemId) orderItemMap.set(String(i.orderItemId), i);
  });

  records.forEach((record) => {
    const rawId = `tech-${record.id || record.schedule_id}`;
    const scheduleIdKey = record.schedule_id ? `tech-${record.schedule_id}` : null;
    const orderItemIdKey = record.order_item_id ? String(record.order_item_id) : null;
    const cleanOrderNum = String(record.order_number || record.order_id || "").replace(/^#/, "").trim();
    const existing =
      currentMap.get(rawId) ||
      (scheduleIdKey ? currentMap.get(scheduleIdKey) : null) ||
      (orderItemIdKey ? orderItemMap.get(orderItemIdKey) : null) ||
      (cleanOrderNum ? _items.find((i) => i.orderId.replace(/^#/, "").trim() === cleanOrderNum || i.orderNumber?.replace(/^#/, "").trim() === cleanOrderNum) : null);

    // Extract images
    const rawImages = record.installation?.images || record.images;
    let extractedImages: string[] = [];
    if (Array.isArray(rawImages)) {
      extractedImages = rawImages.filter(Boolean).map(String);
    } else if (typeof rawImages === "string" && rawImages.trim()) {
      if (rawImages.startsWith("[") && rawImages.endsWith("]")) {
        try {
          const parsed = JSON.parse(rawImages);
          if (Array.isArray(parsed)) extractedImages = parsed.filter(Boolean).map(String);
        } catch {
          extractedImages = [rawImages];
        }
      } else {
        extractedImages = [rawImages];
      }
    }

    // Keep locally uploaded images if any
    if (existing?.images && existing.images.length > 0) {
      extractedImages = Array.from(new Set([...extractedImages, ...existing.images]));
    }

    const itemStatus =
      record.order_item?.status ||
      (record as any).order_item_status ||
      (record as any).item_status ||
      existing?.orderItemStatus ||
      "pending";

    const isActivelyScheduled = record.status === "scheduled" || record.status === "rescheduled" || record.status === "pending";
    const completedAt = isActivelyScheduled
      ? (existing?.completedAt && existing.status === "Completed" ? existing.completedAt : null)
      : (existing?.completedAt || record.completed_at || record.installation?.completed_at || null);

    const assignedDriver =
      existing?.assignedDriver ||
      record.order?.driver_assignment?.driver_name ||
      null;

    const status = normalizeScheduledStatus(
      record.status || record.installation?.status || existing?.status,
      assignedDriver,
      completedAt,
      record.order?.status,
      existing?.status,
      itemStatus,
      true, // isFromTechnicianSchedule: items from this endpoint are active technician appointments
    );

    const timeRange = formatCustomerTimeRange(record.start_time, record.end_time);

    const rawDateStr =
      record.scheduled_date ||
      record.schedule_date ||
      record.technician_schedule?.scheduled_date ||
      (record.scheduled_at ? String(record.scheduled_at).slice(0, 10) : undefined) ||
      existing?.scheduledDate;
    const scheduledDate = normalizeDateStr(rawDateStr) || getTodayDateStr();

    const rawRescheduledAt = record.rescheduled_at || existing?.rescheduledAt || null;
    let rescheduledDate: string | null = null;
    if (rawRescheduledAt) {
      rescheduledDate = normalizeDateStr(String(rawRescheduledAt).slice(0, 10)) || null;
    }
    if (Array.isArray(record.reschedule_history) && record.reschedule_history.length > 0) {
      const latestHist = record.reschedule_history[record.reschedule_history.length - 1];
      const histDate = latestHist?.scheduled_date || (latestHist?.rescheduled_at ? String(latestHist.rescheduled_at).slice(0, 10) : null);
      if (histDate) {
        const normHist = normalizeDateStr(histDate);
        if (normHist) rescheduledDate = normHist;
      }
    }
    if (!rescheduledDate && existing?.rescheduledDate) {
      rescheduledDate = existing.rescheduledDate;
    }

    const mappedItem: ScheduledItem = {
      id: existing ? existing.id : rawId,
      orderId: String(record.order_number || record.order_id || ""),
      orderNumber: record.order_number || (record.order_id ? `#${record.order_id}` : undefined),
      orderItemId: record.order_item_id,
      orderInstallationId: record.order_installation_id || record.installation?.id,
      lineItemId: record.order_item?.line_item_id || (record as any).line_item_id || existing?.lineItemId || null,
      orderItemStatus: itemStatus,
      productName:
        record.product_name ||
        record.order_item?.product_name ||
        record.notes?.replace(/^Installation for /i, "") ||
        existing?.productName ||
        "Installation Item",
      sku: record.product_code || record.order_item?.product_code || existing?.sku || "",
      barcode: record.barcode || record.order_item?.barcode || existing?.barcode || "",
      image:
        record.product_image ||
        record.order_item?.image ||
        record.order_item?.image_url ||
        (typeof record.images === "string" && record.images.startsWith("http") ? record.images : "") ||
        existing?.image ||
        "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=100&h=100&fit=crop",
      customerName:
        record.customer_name ||
        record.customer?.name ||
        record.order?.customer_name ||
        existing?.customerName ||
        "Customer",
      customerPhone:
        record.customer_phone ||
        record.customer?.phone ||
        record.order?.customer_phone ||
        existing?.customerPhone ||
        "",
      address:
        record.address ||
        record.customer?.address ||
        record.customer?.delivery_address ||
        record.order?.delivery_address ||
        existing?.address ||
        "",
      status,
      pickedAt:
        status === "Scheduled" || status === "Pending Scheduled"
          ? null
          : (existing?.pickedAt || (itemStatus === "picked" || status === "Main Warehouse Picked" || status === "Technician Received" || status === "Completed" ? (record.updated_at || record.created_at) : null)),
      pickerName: existing?.pickerName || (record.order?.packer || "Main Warehouse Picker"),
      technicianReceivedAt: existing?.technicianReceivedAt || (status === "Technician Received" || status === "Completed" ? (record.updated_at || record.created_at) : null),
      startedAt: existing?.startedAt || null,
      isRescheduled: record.is_rescheduled ?? existing?.isRescheduled ?? (record.status === "rescheduled"),
      rescheduleCount: record.reschedule_count ?? existing?.rescheduleCount ?? 0,
      latestRescheduleReason: record.latest_reschedule_reason || existing?.latestRescheduleReason || null,
      rescheduleHistory: record.reschedule_history || existing?.rescheduleHistory || [],
      rescheduledAt: rawRescheduledAt,
      rescheduledDate,
      productTags: record.product_tags || record.order_item?.product_tags || existing?.productTags || null,
      giftWrap: record.gift_wrap || record.order_item?.gift_wrap || existing?.giftWrap || null,
      giftMessage: record.gift_message || record.order_item?.gift_message || existing?.giftMessage || null,
      scheduledAt: record.scheduled_at || record.scheduled_date || record.created_at || new Date().toISOString(),
      scheduledDate,
      startTime: record.start_time || existing?.startTime,
      endTime: record.end_time || existing?.endTime,
      scheduledTimeRange: timeRange || existing?.scheduledTimeRange,
      technicianId: record.technician_id || record.technician?.id,
      technicianName: record.technician_name || record.technician?.name || "Technician",
      assignedDriver,
      driverId: existing?.driverId || record.order?.driver_assignment?.assigned_driver_user_id || null,
      installationMethod:
        record.installation_type
          ? `${record.installation_type} (${record.installation_level || "Installation"})`
          : record.installation?.installation_type
            ? `${record.installation.installation_type} (${record.installation.installation_level || "Installation"})`
            : existing?.installationMethod || "Standard Assembly",
      installationNotes: record.notes || record.installation?.notes || existing?.installationNotes || null,
      completedAt,
      images: extractedImages,
      raw: record,
    };

    if (!existing) {
      _items.push(mappedItem);
      currentMap.set(mappedItem.id, mappedItem);
      if (mappedItem.orderItemId) orderItemMap.set(String(mappedItem.orderItemId), mappedItem);
      hasChanges = true;
    } else {
      // Merge updates
      let updated = false;
      if (status && status !== existing.status) {
        existing.status = status;
        updated = true;
      }
      if (scheduledDate && scheduledDate !== existing.scheduledDate) {
        existing.scheduledDate = scheduledDate;
        updated = true;
      }
      if (status === "Scheduled" || status === "Pending Scheduled") {
        existing.pickedAt = null;
      }
      if (itemStatus && itemStatus !== existing.orderItemStatus) {
        existing.orderItemStatus = itemStatus;
        updated = true;
      }
      if (mappedItem.lineItemId && mappedItem.lineItemId !== existing.lineItemId) {
        existing.lineItemId = mappedItem.lineItemId;
        updated = true;
      }
      if (mappedItem.productName && mappedItem.productName !== existing.productName) {
        existing.productName = mappedItem.productName;
        updated = true;
      }
      if (mappedItem.image && mappedItem.image !== existing.image) {
        existing.image = mappedItem.image;
        updated = true;
      }
      if (mappedItem.technicianName && mappedItem.technicianName !== existing.technicianName) {
        existing.technicianName = mappedItem.technicianName;
        updated = true;
      }
      if (mappedItem.scheduledDate && mappedItem.scheduledDate !== existing.scheduledDate) {
        existing.scheduledDate = mappedItem.scheduledDate;
        updated = true;
      }
      if (timeRange && timeRange !== existing.scheduledTimeRange) {
        existing.scheduledTimeRange = timeRange;
        updated = true;
      }
      if (mappedItem.isRescheduled !== undefined && mappedItem.isRescheduled !== existing.isRescheduled) {
        existing.isRescheduled = mappedItem.isRescheduled;
        updated = true;
      }
      if (mappedItem.latestRescheduleReason && mappedItem.latestRescheduleReason !== existing.latestRescheduleReason) {
        existing.latestRescheduleReason = mappedItem.latestRescheduleReason;
        updated = true;
      }
      if (mappedItem.productTags && mappedItem.productTags !== existing.productTags) {
        existing.productTags = mappedItem.productTags;
        updated = true;
      }
      if (mappedItem.giftWrap && mappedItem.giftWrap !== existing.giftWrap) {
        existing.giftWrap = mappedItem.giftWrap;
        updated = true;
      }
      if (mappedItem.giftMessage && mappedItem.giftMessage !== existing.giftMessage) {
        existing.giftMessage = mappedItem.giftMessage;
        updated = true;
      }
      if (extractedImages.length > (existing.images?.length || 0)) {
        existing.images = extractedImages;
        updated = true;
      }
      if (completedAt && !existing.completedAt) {
        existing.completedAt = completedAt;
        existing.status = "Completed";
        updated = true;
      }
      if (hasChanges || updated) hasChanges = true;
    }
  });

  if (hasChanges) {
    _notify();
  }
}

/**
 * Synchronize awaiting scheduled order items from GET /api/admin/orders/scheduled-items
 * into the store so they populate the "Pending Scheduled" tab.
 */
export function syncAwaitingScheduledItems(records: ScheduledOrderItem[]): void {
  if (!Array.isArray(records) || records.length === 0) return;

  let hasChanges = false;
  const currentMap = new Map<string, ScheduledItem>(_items.map((i) => [i.id, i]));
  const orderItemMap = new Map<string, ScheduledItem>();
  _items.forEach((i) => {
    if (i.orderItemId) orderItemMap.set(String(i.orderItemId), i);
  });

  records.forEach((record) => {
    const rawId = `awaiting-${record.order_item_id || record.id || record.item_id}`;
    const orderItemIdKey = String(record.order_item_id || record.id || record.item_id || "");
    const existing = currentMap.get(rawId) || (orderItemIdKey ? orderItemMap.get(orderItemIdKey) : null);

    // If item already exists in the store with an advanced status, don't overwrite it
    if (existing && existing.status !== "Pending Scheduled") {
      return;
    }

    const itemStatus = record.status || "pending";
    const mappedItem: ScheduledItem = {
      id: existing ? existing.id : rawId,
      orderId: String(record.order_number || record.order_id || ""),
      orderNumber: record.order_number || (record.order_id ? `#${record.order_id}` : undefined),
      orderItemId: record.order_item_id || record.id || record.item_id,
      orderInstallationId: record.order_installation_id || record.installation_id || record.installation?.id,
      lineItemId: record.line_item_id || existing?.lineItemId || null,
      orderItemStatus: itemStatus,
      productName:
        record.product_name ||
        existing?.productName ||
        "Installation Item",
      sku: record.product_code || existing?.sku || "",
      barcode: record.barcode || existing?.barcode || "",
      image:
        record.image ||
        record.image_url ||
        record.product_image ||
        record.product_image_url ||
        existing?.image ||
        "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=100&h=100&fit=crop",
      customerName:
        record.customer?.name ||
        existing?.customerName ||
        "Customer",
      customerPhone:
        record.customer?.phone ||
        existing?.customerPhone ||
        "",
      address:
        record.address ||
        record.customer?.delivery_address ||
        existing?.address ||
        "",
      status: "Pending Scheduled",
      pickedAt: null,
      pickerName: null,
      technicianReceivedAt: null,
      startedAt: null,
      scheduledAt: record.installation?.created_at || new Date().toISOString(),
      scheduledDate: existing?.scheduledDate || undefined,
      startTime: existing?.startTime || undefined,
      endTime: existing?.endTime || undefined,
      scheduledTimeRange: existing?.scheduledTimeRange || undefined,
      technicianId: null,
      technicianName: existing?.technicianName || null,
      assignedDriver: null,
      installationMethod:
        record.installation_type
          ? `${record.installation_type} (${record.installation_level || "Installation"})`
          : record.installation?.installation_type
            ? `${record.installation.installation_type} (${record.installation.installation_level || "Installation"})`
            : existing?.installationMethod || "Standard Assembly",
      installationNotes: existing?.installationNotes || null,
      completedAt: null,
      images: [],
      raw: record,
    };

    if (!existing) {
      _items.push(mappedItem);
      hasChanges = true;
    } else {
      let updated = false;
      if (mappedItem.productName && mappedItem.productName !== existing.productName) {
        existing.productName = mappedItem.productName;
        updated = true;
      }
      if (mappedItem.lineItemId && mappedItem.lineItemId !== existing.lineItemId) {
        existing.lineItemId = mappedItem.lineItemId;
        updated = true;
      }
      if (hasChanges || updated) hasChanges = true;
    }
  });

  if (hasChanges) {
    _notify();
  }
}

/**
 * Synchronize completed installation records from /api/admin/installation-completed
 * into the scheduled installations store so they display in the Completed tab.
 */
export function syncCompletedInstallations(records: CompletedInstallationRecord[]): void {
  if (!Array.isArray(records) || records.length === 0) return;

  let hasChanges = false;
  const currentMap = new Map<string, ScheduledItem>(_items.map((i) => [i.id, i]));
  const orderInstallationMap = new Map<string, ScheduledItem>();
  const orderItemMap = new Map<string, ScheduledItem>();

  _items.forEach((i) => {
    if (i.orderInstallationId) orderInstallationMap.set(String(i.orderInstallationId), i);
    if (i.orderItemId) orderItemMap.set(String(i.orderItemId), i);
  });

  records.forEach((record) => {
    const rawId = `inst-${record.id}`;
    const instIdKey = String(record.id || record.order_installation_id || "");
    const orderItemIdKey = record.order_item_id ? String(record.order_item_id) : null;

    // Check if item already exists by rawId, orderInstallationId, or orderItemId
    const existing =
      currentMap.get(rawId) ||
      (instIdKey ? orderInstallationMap.get(instIdKey) : null) ||
      (orderItemIdKey ? orderItemMap.get(orderItemIdKey) : null);

    // Extract all images from record.images and proof_images
    let extractedImages: string[] = [];
    if (Array.isArray(record.images)) {
      extractedImages = record.images.filter(Boolean).map(String);
    }
    if (Array.isArray(record.proof_images)) {
      record.proof_images.forEach((img) => {
        if (img.before_install_image) extractedImages.push(img.before_install_image);
        if (img.after_install_image) extractedImages.push(img.after_install_image);
      });
    }
    extractedImages = Array.from(new Set(extractedImages));

    if (existing?.images && existing.images.length > 0) {
      extractedImages = Array.from(new Set([...extractedImages, ...existing.images]));
    }

    const completedAt =
      record.completed_at ||
      existing?.completedAt ||
      record.updated_at ||
      new Date().toISOString();

    const timeRange = formatCustomerTimeRange(record.start_time ?? undefined, record.end_time ?? undefined);

    const mappedItem: ScheduledItem = {
      id: existing ? existing.id : rawId,
      orderId: String(record.order_number || record.order_id || ""),
      orderNumber: record.order_number || (record.order_id ? `#${record.order_id}` : undefined),
      orderItemId: record.order_item_id,
      orderInstallationId: record.id || record.order_installation_id,
      productName:
        record.product_name ||
        record.order_item?.product_name ||
        existing?.productName ||
        "Installation Item",
      sku: record.product_code || record.order_item?.product_code || existing?.sku || "",
      barcode: record.barcode || record.order_item?.barcode || existing?.barcode || "",
      image:
        record.product_image ||
        record.order_item?.image ||
        record.order_item?.image_url ||
        existing?.image ||
        "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=100&h=100&fit=crop",
      customerName:
        record.customer_name ||
        record.customer?.name ||
        record.order?.customer_name ||
        existing?.customerName ||
        "Customer",
      customerPhone:
        record.customer_phone ||
        record.customer?.phone ||
        record.order?.customer_phone ||
        existing?.customerPhone ||
        "",
      address:
        record.address ||
        record.customer?.address ||
        record.order?.delivery_address ||
        existing?.address ||
        "",
      status: "Completed",
      completedAt,
      images: extractedImages,
      proofImages: record.proof_images || [],
      technicianId: record.technician_id || record.technician?.id,
      technicianName: record.technician_name || record.technician?.name || "Technician",
      assignedDriver: existing?.assignedDriver || record.order_item?.delivered_user_name || record.technician_name || null,
      scheduledDate: record.scheduled_date ? String(record.scheduled_date).slice(0, 10) : (completedAt ? completedAt.slice(0, 10) : existing?.scheduledDate),
      startTime: record.start_time || existing?.startTime,
      endTime: record.end_time || existing?.endTime,
      scheduledTimeRange: timeRange || existing?.scheduledTimeRange,
      installationMethod:
        record.installation_type
          ? `${record.installation_type} (${record.installation_level || "Installation"})`
          : existing?.installationMethod || "Standard Assembly",
      installationNotes: record.notes || existing?.installationNotes || null,
      productTags: record.product_tags || record.order_item?.product_tags || existing?.productTags || null,
      giftWrap: record.gift_wrap || record.order_item?.gift_wrap || existing?.giftWrap || null,
      giftMessage: record.gift_message || record.order_item?.gift_message || existing?.giftMessage || null,
      scheduledAt: record.completed_at || record.created_at || new Date().toISOString(),
      raw: record,
    };

    if (!existing) {
      _items.push(mappedItem);
      hasChanges = true;
    } else {
      let updated = false;
      if (existing.status !== "Completed") {
        existing.status = "Completed";
        updated = true;
      }
      if (completedAt && existing.completedAt !== completedAt) {
        existing.completedAt = completedAt;
        updated = true;
      }
      if (extractedImages.length > (existing.images?.length || 0)) {
        existing.images = extractedImages;
        updated = true;
      }
      if (record.proof_images && record.proof_images.length > 0) {
        existing.proofImages = record.proof_images;
        updated = true;
      }
      if (mappedItem.productName && mappedItem.productName !== existing.productName) {
        existing.productName = mappedItem.productName;
        updated = true;
      }
      if (mappedItem.technicianName && mappedItem.technicianName !== existing.technicianName) {
        existing.technicianName = mappedItem.technicianName;
        updated = true;
      }
      if (record.notes && record.notes !== existing.installationNotes) {
        existing.installationNotes = record.notes;
        updated = true;
      }
      if (hasChanges || updated) hasChanges = true;
    }
  });

  if (hasChanges) {
    _notify();
  }
}

/**
 * Synchronize main warehouse picked installation items from:
 * /api/admin/installation-itmes/main-warehouse-picked
 * into the scheduled installations store so they display in the "Main Warehouse Picked" tab list.
 */
export function syncMainWarehousePickedItems(records: MainWarehousePickedRecord[]): void {
  if (!Array.isArray(records) || records.length === 0) return;

  let hasChanges = false;
  const currentMap = new Map<string, ScheduledItem>(_items.map((i) => [i.id, i]));
  const orderInstallationMap = new Map<string, ScheduledItem>();
  const orderItemMap = new Map<string, ScheduledItem>();

  _items.forEach((i) => {
    if (i.orderInstallationId) orderInstallationMap.set(String(i.orderInstallationId), i);
    if (i.orderItemId) orderItemMap.set(String(i.orderItemId), i);
  });

  records.forEach((record) => {
    const rawId = `picked-${record.id || record.order_item_id || record.item_id || record.order_installation_id || Math.random().toString(36).slice(2, 9)}`;
    const instIdKey = String(record.id || record.order_installation_id || record.installation_id || record.installation?.id || "");
    const orderItemIdKey = record.order_item_id || record.item_id ? String(record.order_item_id || record.item_id) : null;

    // Check if item already exists by rawId, orderInstallationId, or orderItemId
    const existing =
      currentMap.get(rawId) ||
      (instIdKey ? orderInstallationMap.get(instIdKey) : null) ||
      (orderItemIdKey ? orderItemMap.get(orderItemIdKey) : null);

    // If item has already progressed past picked (Technician Received or Completed), don't regress it
    const isAdvanced =
      existing &&
      (existing.status === "Completed" ||
        existing.status === "Technician Received" ||
        existing.status === "Driver Assigned");

    const targetStatus: ScheduledTabType = isAdvanced ? existing.status : "Main Warehouse Picked";

    // Extract images
    const rawImages = record.installation?.images || record.images || record.product_image || record.image;
    let extractedImages: string[] = [];
    if (Array.isArray(rawImages)) {
      extractedImages = rawImages.filter(Boolean).map(String);
    } else if (typeof rawImages === "string" && rawImages.trim()) {
      if (rawImages.startsWith("[") && rawImages.endsWith("]")) {
        try {
          const parsed = JSON.parse(rawImages);
          if (Array.isArray(parsed)) extractedImages = parsed.filter(Boolean).map(String);
        } catch {
          extractedImages = [rawImages];
        }
      } else {
        extractedImages = [rawImages];
      }
    }
    extractedImages = Array.from(new Set(extractedImages));
    if (existing?.images && existing.images.length > 0) {
      extractedImages = Array.from(new Set([...extractedImages, ...existing.images]));
    }

    const timeRange =
      formatCustomerTimeRange(
        record.start_time || record.technician_schedule?.start_time,
        record.end_time || record.technician_schedule?.end_time,
      ) || existing?.scheduledTimeRange;

    const scheduledDateStr =
      record.scheduled_date ||
      record.technician_schedule?.scheduled_date ||
      (record.scheduled_at ? String(record.scheduled_at).slice(0, 10) : undefined) ||
      existing?.scheduledDate;

    const pickerName =
      record.picker_name ||
      record.picked_by_name ||
      record.picked_user_name ||
      record.assigned_user_name ||
      record.picked_user?.name ||
      record.picker?.name ||
      record.order?.packer ||
      existing?.pickerName ||
      "Main Warehouse Picker";

    const pickedAt =
      record.picked_at ||
      record.updated_at ||
      record.created_at ||
      existing?.pickedAt ||
      new Date().toISOString();

    const rawRescheduledAt = record.rescheduled_at || record.technician_schedule?.rescheduled_at || existing?.rescheduledAt || null;
    let rescheduledDate: string | null = null;
    if (rawRescheduledAt) {
      rescheduledDate = normalizeDateStr(String(rawRescheduledAt).slice(0, 10)) || null;
    }
    const history = record.reschedule_history || record.technician_schedule?.reschedule_history;
    if (Array.isArray(history) && history.length > 0) {
      const latestHist = history[history.length - 1];
      const histDate = latestHist?.scheduled_date || (latestHist?.rescheduled_at ? String(latestHist.rescheduled_at).slice(0, 10) : null);
      if (histDate) {
        const normHist = normalizeDateStr(histDate);
        if (normHist) rescheduledDate = normHist;
      }
    }
    if (!rescheduledDate && existing?.rescheduledDate) {
      rescheduledDate = existing.rescheduledDate;
    }

    const mappedItem: ScheduledItem = {
      id: existing ? existing.id : rawId,
      orderId: String(record.order_number || record.order_id || record.order?.order_number || record.order?.id || existing?.orderId || ""),
      orderNumber:
        record.order_number ||
        record.order?.order_number ||
        (record.order_id ? `#${record.order_id}` : undefined) ||
        existing?.orderNumber,
      orderItemId: record.order_item_id || record.item_id || existing?.orderItemId,
      orderInstallationId:
        record.order_installation_id ||
        record.installation_id ||
        record.installation?.id ||
        existing?.orderInstallationId,
      lineItemId:
        record.line_item_id ||
        record.order_item?.line_item_id ||
        existing?.lineItemId ||
        null,
      orderItemStatus: "picked",
      productName:
        record.product_name ||
        record.order_item?.product_name ||
        record.notes?.replace(/^Installation for /i, "") ||
        existing?.productName ||
        "Installation Item",
      sku:
        record.product_code ||
        record.sku ||
        record.order_item?.product_code ||
        existing?.sku ||
        "",
      barcode:
        record.barcode ||
        record.order_item?.barcode ||
        existing?.barcode ||
        "",
      image:
        record.product_image ||
        record.image ||
        record.order_item?.image ||
        record.order_item?.image_url ||
        existing?.image ||
        "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=100&h=100&fit=crop",
      customerName:
        record.customer_name ||
        record.customer?.name ||
        record.order?.customer_name ||
        existing?.customerName ||
        "Customer",
      customerPhone:
        record.customer_phone ||
        record.customer?.phone ||
        record.order?.customer_phone ||
        existing?.customerPhone ||
        "",
      address:
        record.address ||
        record.delivery_address ||
        record.customer?.address ||
        record.customer?.delivery_address ||
        record.order?.delivery_address ||
        existing?.address ||
        "",
      status: targetStatus,
      pickedAt,
      pickerName,
      technicianReceivedAt: existing?.technicianReceivedAt || null,
      startedAt: existing?.startedAt || null,
      isRescheduled: record.is_rescheduled ?? existing?.isRescheduled ?? false,
      rescheduleCount: record.reschedule_count ?? existing?.rescheduleCount ?? 0,
      latestRescheduleReason: record.latest_reschedule_reason || existing?.latestRescheduleReason || null,
      rescheduleHistory: record.reschedule_history || existing?.rescheduleHistory || [],
      rescheduledAt: rawRescheduledAt,
      rescheduledDate,
      productTags: record.product_tags || record.order_item?.product_tags || existing?.productTags || null,
      giftWrap: record.gift_wrap || record.order_item?.gift_wrap || existing?.giftWrap || null,
      giftMessage: record.gift_message || record.order_item?.gift_message || existing?.giftMessage || null,
      scheduledAt:
        record.scheduled_at ||
        record.scheduled_date ||
        record.created_at ||
        existing?.scheduledAt ||
        new Date().toISOString(),
      scheduledDate: normalizeDateStr(scheduledDateStr) || (scheduledDateStr ? String(scheduledDateStr).slice(0, 10) : undefined),
      startTime: record.start_time || record.technician_schedule?.start_time || existing?.startTime,
      endTime: record.end_time || record.technician_schedule?.end_time || existing?.endTime,
      scheduledTimeRange: timeRange,
      technicianId:
        record.technician_id ||
        record.technician?.id ||
        record.technician_schedule?.technician_id ||
        existing?.technicianId,
      technicianName:
        record.technician_name ||
        record.technician?.name ||
        record.technician_schedule?.technician_name ||
        existing?.technicianName ||
        "Technician",
      assignedDriver:
        record.assigned_driver ||
        record.driver_name ||
        record.order?.driver_assignment?.driver_name ||
        existing?.assignedDriver ||
        null,
      driverId:
        record.driver_id ||
        record.order?.driver_assignment?.assigned_driver_user_id ||
        existing?.driverId ||
        null,
      installationMethod:
        record.installation_type
          ? `${record.installation_type} (${record.installation_level || "Installation"})`
          : record.installation?.installation_type
            ? `${record.installation.installation_type} (${record.installation.installation_level || "Installation"})`
            : existing?.installationMethod || "Standard Assembly",
      installationNotes:
        record.notes ||
        record.installation?.notes ||
        existing?.installationNotes ||
        null,
      completedAt: existing?.completedAt || record.completed_at || null,
      images: extractedImages.length > 0 ? extractedImages : existing?.images || [],
      raw: record,
    };

    if (!existing) {
      _items.push(mappedItem);
      currentMap.set(mappedItem.id, mappedItem);
      if (mappedItem.orderItemId) orderItemMap.set(String(mappedItem.orderItemId), mappedItem);
      if (mappedItem.orderInstallationId) orderInstallationMap.set(String(mappedItem.orderInstallationId), mappedItem);
      hasChanges = true;
    } else {
      let updated = false;
      if (existing.status !== targetStatus) {
        existing.status = targetStatus;
        updated = true;
      }
      if (existing.orderItemStatus !== "picked") {
        existing.orderItemStatus = "picked";
        updated = true;
      }
      if (!existing.pickedAt && pickedAt) {
        existing.pickedAt = pickedAt;
        updated = true;
      }
      if ((!existing.pickerName || existing.pickerName === "Main Warehouse Picker") && pickerName) {
        existing.pickerName = pickerName;
        updated = true;
      }
      if (mappedItem.scheduledDate && mappedItem.scheduledDate !== existing.scheduledDate) {
        existing.scheduledDate = mappedItem.scheduledDate;
        updated = true;
      }
      if (timeRange && timeRange !== existing.scheduledTimeRange) {
        existing.scheduledTimeRange = timeRange;
        updated = true;
      }
      if (mappedItem.customerName && mappedItem.customerName !== "Customer" && existing.customerName === "Customer") {
        existing.customerName = mappedItem.customerName;
        updated = true;
      }
      if (mappedItem.address && !existing.address) {
        existing.address = mappedItem.address;
        updated = true;
      }
      if (mappedItem.customerPhone && !existing.customerPhone) {
        existing.customerPhone = mappedItem.customerPhone;
        updated = true;
      }
      if (mappedItem.sku && !existing.sku) {
        existing.sku = mappedItem.sku;
        updated = true;
      }
      if (mappedItem.barcode && !existing.barcode) {
        existing.barcode = mappedItem.barcode;
        updated = true;
      }
      if (extractedImages.length > 0 && (!existing.images || existing.images.length === 0)) {
        existing.images = extractedImages;
        updated = true;
      }
      if (updated) {
        hasChanges = true;
      }
    }
  });

  if (hasChanges) {
    _notify();
  }
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
  "Omar Farooq",
];
