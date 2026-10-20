/**
 * Scheduled Installations Store
 *
 * A reactive store that holds the list of scheduled installations.
 * Data is persisted to localStorage so changes are reactive across tabs
 * and merge cleanly with live backend technician schedule data.
 */

import type { TechnicianScheduleRecord, CompletedInstallationRecord } from "@/lib/api/services";

const STORAGE_KEY = 'hm_scheduled_installations';

export type ScheduledTabType = "Scheduled" | "Driver Assigned" | "Completed";

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

export function normalizeScheduledStatus(
  status: string | undefined | null,
  assignedDriver?: string | null,
  completedAt?: string | null,
): ScheduledTabType {
  const s = String(status || "").toLowerCase().trim();
  // Actively scheduled or rescheduled items belong in Scheduled tab (unless driver assigned)
  if (s === "scheduled" || s === "rescheduled" || s === "pending") {
    if (assignedDriver) return "Driver Assigned";
    return "Scheduled";
  }
  if (s === "completed" || s === "installed" || s === "delivered") {
    return "Completed";
  }
  if (assignedDriver || s === "assigned" || s === "driver assigned" || s === "driver_assigned" || s === "assigned_to_driver") {
    return "Driver Assigned";
  }
  if (completedAt) {
    return "Completed";
  }
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

        // Migrate legacy statuses: "Pending" -> "Scheduled", "Assigned" -> "Driver Assigned"
        const migrated = nonMock.map((item) => {
          let currentStatus: ScheduledTabType = "Scheduled";
          if (item.status === "Completed" || (!["Scheduled", "Driver Assigned", "Completed"].includes(item.status) && item.completedAt)) {
            currentStatus = "Completed";
          } else if (item.status === "Driver Assigned" || item.status === "Assigned" || item.assignedDriver) {
            currentStatus = "Driver Assigned";
          } else {
            currentStatus = "Scheduled";
          }

          const timeRange =
            item.scheduledTimeRange ||
            (item.startTime ? formatCustomerTimeRange(item.startTime, item.endTime) : undefined);

          return {
            ...item,
            status: currentStatus,
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

/** Assign a driver to selected items. */
export function assignDriver(ids: string[], driver: string, driverId?: number | string) {
  _items = _items.map((item) =>
    ids.includes(item.id)
      ? {
          ...item,
          assignedDriver: driver,
          driverId: driverId ?? item.driverId,
          status: "Driver Assigned" as const,
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
    const rawId = `tech-${record.id}`;
    const orderItemIdKey = record.order_item_id ? String(record.order_item_id) : null;
    const existing = currentMap.get(rawId) || (orderItemIdKey ? orderItemMap.get(orderItemIdKey) : null);

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
    );

    const timeRange = formatCustomerTimeRange(record.start_time, record.end_time);

    const mappedItem: ScheduledItem = {
      id: existing ? existing.id : rawId,
      orderId: String(record.order_number || record.order_id || ""),
      orderNumber: record.order_number || (record.order_id ? `#${record.order_id}` : undefined),
      orderItemId: record.order_item_id,
      orderInstallationId: record.order_installation_id || record.installation?.id,
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
      isRescheduled: record.is_rescheduled ?? existing?.isRescheduled ?? (record.status === "rescheduled"),
      rescheduleCount: record.reschedule_count ?? existing?.rescheduleCount ?? 0,
      latestRescheduleReason: record.latest_reschedule_reason || existing?.latestRescheduleReason || null,
      rescheduleHistory: record.reschedule_history || existing?.rescheduleHistory || [],
      productTags: record.product_tags || record.order_item?.product_tags || existing?.productTags || null,
      giftWrap: record.gift_wrap || record.order_item?.gift_wrap || existing?.giftWrap || null,
      giftMessage: record.gift_message || record.order_item?.gift_message || existing?.giftMessage || null,
      scheduledAt: record.scheduled_at || record.scheduled_date || record.created_at || new Date().toISOString(),
      scheduledDate: record.scheduled_date ? String(record.scheduled_date).slice(0, 10) : existing?.scheduledDate,
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
      hasChanges = true;
    } else {
      // Merge updates
      let updated = false;
      if (status && status !== existing.status) {
        existing.status = status;
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
