import { isDemoMode } from "./config";
import { erpNextClient, ApiError } from "./client";
import {
  DEFAULT_SHIFT_SCHEDULES,
  DEFAULT_SLA_CONFIGS,
  DEFAULT_ROLE_BENCHMARKS,
  getStoredShiftSchedules,
  saveStoredShiftSchedules,
  saveStoredShiftSlaSettings,
  getStoredSlaConfigs,
  saveStoredSlaConfigs,
  getStoredRoleBenchmarks,
  saveStoredRoleBenchmarks,
  roleBenchmarksToFlat,
  dbTimeTo12h,
  type MisShiftSchedule,
  type MisSlaConfig,
  type MisRoleBenchmark,
  type BenchmarkRole,
  type FreezeWindowRange,
} from "@/lib/mis/sla-config";

export interface RejectionReason {
  id: string;
  text: string;
  type: "driver" | "outlet" | "both";
  sortOrder: number;
}

const STORAGE_KEY = "hm_rejection_reasons";

const DEFAULT_REASONS: RejectionReason[] = [
  { id: "1", text: "Other", type: "both", sortOrder: 9999 },
  { id: "2", text: "Customer not available", type: "driver", sortOrder: 100 },
  { id: "3", text: "Wrong address", type: "driver", sortOrder: 200 },
  { id: "4", text: "Item damaged", type: "outlet", sortOrder: 300 },
  { id: "5", text: "Out of stock", type: "outlet", sortOrder: 400 },
];

function getMockReasons(): RejectionReason[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_REASONS;
}

function saveMockReasons(reasons: RejectionReason[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reasons));
}

export async function fetchRejectionReasons(): Promise<RejectionReason[]> {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 200));
    return getMockReasons();
  }

  const response = await erpNextClient.get<{ data: any[] }>("/api/resource/Rejection Reason", {
    fields: JSON.stringify(["name", "reason_text", "type", "sort_order"]),
    limit_page_length: "0",
  });

  return response.data.map((r) => ({
    id: r.name,
    text: r.reason_text || "",
    type: r.type?.toLowerCase() || "both",
    sortOrder: r.sort_order || 500,
  }));
}

export async function createRejectionReason(data: Omit<RejectionReason, "id">): Promise<RejectionReason> {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 200));
    const reasons = getMockReasons();
    const newReason = { ...data, id: `r${Date.now()}` };
    saveMockReasons([...reasons, newReason]);
    return newReason;
  }

  const response = await erpNextClient.post<{ data: any }>("/api/resource/Rejection Reason", {
    reason_text: data.text,
    type: data.type.charAt(0).toUpperCase() + data.type.slice(1), // Capitalize
    sort_order: data.sortOrder,
  });

  return {
    id: response.data.name,
    text: response.data.reason_text || "",
    type: response.data.type?.toLowerCase() || "both",
    sortOrder: response.data.sort_order || 500,
  };
}

export async function updateRejectionReason(id: string, data: Partial<RejectionReason>): Promise<RejectionReason> {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 200));
    const reasons = getMockReasons();
    const index = reasons.findIndex((r) => r.id === id);
    if (index === -1) throw new Error("Not found");
    const updated = { ...reasons[index], ...data };
    reasons[index] = updated;
    saveMockReasons(reasons);
    return updated;
  }

  const payload: any = {};
  if (data.text !== undefined) payload.reason_text = data.text;
  if (data.type !== undefined) payload.type = data.type.charAt(0).toUpperCase() + data.type.slice(1);
  if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;

  const response = await erpNextClient.put<{ data: any }>(`/api/resource/Rejection Reason/${id}`, payload);

  return {
    id: response.data.name,
    text: response.data.reason_text || "",
    type: response.data.type?.toLowerCase() || "both",
    sortOrder: response.data.sort_order || 500,
  };
}

export async function deleteRejectionReason(id: string): Promise<void> {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 200));
    const reasons = getMockReasons();
    saveMockReasons(reasons.filter((r) => r.id !== id));
    return;
  }

  await erpNextClient.delete(`/api/resource/Rejection Reason/${id}`);
}

export const DELIVERY_SCHEDULE_SETTINGS_ENDPOINT = "/api/admin/delivery-schedule-settings";
export const DELIVERY_SLA_SETTINGS_ENDPOINT = "/api/admin/delivery-sla-settings";
export const DELIVERY_BENCHMARK_SETTINGS_ENDPOINT = "/api/admin/delivery-benchmark-settings";

export interface DeliveryScheduleDayPayload {
  day_of_week?: number;
  day_name?: string;
  is_working_day?: boolean;
  is_half_day?: boolean;
  shift_start?: string;
  shift_end?: string;
}

export interface BulkDeliverySchedulePayload {
  schedules: DeliveryScheduleDayPayload[];
}

export type UpdateDeliverySchedulePayload =
  | BulkDeliverySchedulePayload
  | DeliveryScheduleDayPayload;

export interface DeliveryScheduleSettingsResult {
  schedules: MisShiftSchedule[];
  slaConfigs?: MisSlaConfig[];
}

export interface DeliverySlaConfigPayload {
  sla_type: string;
  display_name?: string;
  duration_minutes?: number;
  is_active?: boolean;
}

export interface BulkDeliverySlaPayload {
  configs: DeliverySlaConfigPayload[];
}

export type UpdateDeliverySlaPayload = BulkDeliverySlaPayload | DeliverySlaConfigPayload;

export interface DeliveryBenchmarkRolePayload {
  role: BenchmarkRole;
  benchmark_minutes: number;
  is_freeze_active?: boolean;
  freeze_start?: string;
  freeze_end?: string;
  freeze_windows?: FreezeWindowRange[];
}

export interface BulkDeliveryBenchmarkPayload {
  benchmarks: DeliveryBenchmarkRolePayload[];
}

export interface FlatDeliveryBenchmarkPayload {
  picking_benchmark_minutes: number;
  packing_benchmark_minutes: number;
  packed_to_driver_benchmark_minutes: number;
  delivery_benchmark_minutes: number;
}

export type UpdateDeliveryBenchmarkPayload =
  | BulkDeliveryBenchmarkPayload
  | FlatDeliveryBenchmarkPayload;

function toBooleanFlag(val: unknown, fallback = false): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    const clean = val.trim().toLowerCase();
    if (clean === "1" || clean === "true") return true;
    if (clean === "0" || clean === "false") return false;
  }
  return fallback;
}

function normalizeDbTime(val: unknown, fallback = "00:00:00"): string {
  if (!val || typeof val !== "string") return fallback;
  const match = val.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return fallback;
  const hh = match[1].padStart(2, "0");
  const mm = match[2].padStart(2, "0");
  const ss = (match[3] ?? "00").padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Format "HH:mm:ss" or "HH:mm" into API "HH:mm" string. */
export function toApiTimeHhMm(timeStr: string): string {
  if (!timeStr) return "09:00";
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "09:00";
  return `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}`;
}

type JsonRecord = Record<string, unknown>;

function isRecord(val: unknown): val is JsonRecord {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function normalizeSchedulesList(
  rawList: unknown[],
  fallbackSchedules: MisShiftSchedule[] = DEFAULT_SHIFT_SCHEDULES,
): MisShiftSchedule[] {
  return fallbackSchedules.map((baseDay) => {
    const matched = rawList.find((item): item is JsonRecord => {
      if (!isRecord(item)) return false;
      if (item.day_of_week !== undefined && item.day_of_week !== null) {
        return Number(item.day_of_week) === baseDay.day_of_week;
      }
      if (typeof item.day_name === "string") {
        return item.day_name.trim().toLowerCase() === baseDay.day_name.toLowerCase();
      }
      return false;
    });

    if (!matched) return baseDay;

    const isWorking = toBooleanFlag(matched.is_working_day, baseDay.is_working_day);
    const isHalf = isWorking ? toBooleanFlag(matched.is_half_day, baseDay.is_half_day) : false;

    return {
      id: Number(matched.id) || baseDay.id,
      day_of_week: baseDay.day_of_week,
      day_name:
        typeof matched.day_name === "string" && matched.day_name.trim()
          ? matched.day_name.trim()
          : baseDay.day_name,
      is_working_day: isWorking,
      is_half_day: isHalf,
      shift_start: isWorking
        ? normalizeDbTime(
            matched.shift_start,
            baseDay.shift_start === "00:00:00" ? "09:00:00" : baseDay.shift_start,
          )
        : "00:00:00",
      shift_end: isWorking
        ? normalizeDbTime(
            matched.shift_end,
            baseDay.shift_end === "00:00:00" ? "18:00:00" : baseDay.shift_end,
          )
        : "00:00:00",
    };
  });
}

function extractRawSchedules(response: unknown): unknown[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];
  if (Array.isArray(response.schedules)) return response.schedules;
  if (Array.isArray(response.shift_schedules)) return response.shift_schedules;
  if (Array.isArray(response.data)) return response.data;
  if (isRecord(response.data)) {
    if (Array.isArray(response.data.schedules)) return response.data.schedules;
    if (Array.isArray(response.data.shift_schedules)) return response.data.shift_schedules;
    if (response.data.day_of_week !== undefined || response.data.day_name) {
      return [response.data];
    }
  }
  if (isRecord(response.schedule)) {
    return [response.schedule];
  }
  if (response.day_of_week !== undefined || response.day_name) {
    return [response];
  }
  return [];
}

function extractRawSlaList(response: unknown): unknown[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];
  if (Array.isArray(response.configs)) return response.configs;
  if (Array.isArray(response.sla_configs)) return response.sla_configs;
  if (Array.isArray(response.data)) return response.data;
  if (isRecord(response.data)) {
    if (Array.isArray(response.data.configs)) return response.data.configs;
    if (Array.isArray(response.data.sla_configs)) return response.data.sla_configs;
    if (typeof response.data.sla_type === "string") {
      return [response.data];
    }
  }
  if (isRecord(response.config)) {
    return [response.config];
  }
  if (typeof response.sla_type === "string") {
    return [response];
  }
  return [];
}

function normalizeSlaConfigsList(
  rawList: unknown[],
  fallbackConfigs: MisSlaConfig[] = DEFAULT_SLA_CONFIGS,
): MisSlaConfig[] {
  const updatedBase = fallbackConfigs.map((baseCfg, idx) => {
    const matched = rawList.find((item): item is JsonRecord => {
      if (!isRecord(item)) return false;
      if (typeof item.sla_type === "string" && baseCfg.sla_type) {
        return item.sla_type.trim().toLowerCase() === baseCfg.sla_type.toLowerCase();
      }
      if (item.id !== undefined && item.id !== null) {
        return Number(item.id) === baseCfg.id;
      }
      return false;
    });

    if (!matched) return baseCfg;

    const duration =
      matched.duration_minutes !== undefined && matched.duration_minutes !== null
        ? Number(matched.duration_minutes) || baseCfg.duration_minutes
        : baseCfg.duration_minutes;

    return {
      id: Number(matched.id) || baseCfg.id || idx + 1,
      sla_type:
        typeof matched.sla_type === "string" && matched.sla_type.trim()
          ? matched.sla_type.trim()
          : baseCfg.sla_type,
      display_name:
        typeof matched.display_name === "string" && matched.display_name.trim()
          ? matched.display_name.trim()
          : baseCfg.display_name,
      duration_minutes: duration,
      is_active: toBooleanFlag(matched.is_active, baseCfg.is_active),
    };
  });

  for (const item of rawList) {
    if (!isRecord(item) || typeof item.sla_type !== "string" || !item.sla_type.trim()) continue;
    const typeLower = item.sla_type.trim().toLowerCase();
    if (updatedBase.some((c) => c.sla_type.toLowerCase() === typeLower)) continue;
    const duration = Number(item.duration_minutes) || 60;
    updatedBase.push({
      id: Number(item.id) || updatedBase.length + 1,
      sla_type: item.sla_type.trim(),
      display_name:
        typeof item.display_name === "string" && item.display_name.trim()
          ? item.display_name.trim()
          : `${item.sla_type.trim()} (${duration} mins)`,
      duration_minutes: duration,
      is_active: toBooleanFlag(item.is_active, true),
    });
  }

  return updatedBase;
}

function extractRawSlaConfigs(response: unknown): MisSlaConfig[] | undefined {
  if (!isRecord(response)) return undefined;
  const raw =
    (Array.isArray(response.sla_configs) && response.sla_configs) ||
    (isRecord(response.data) &&
      Array.isArray(response.data.sla_configs) &&
      response.data.sla_configs);
  if (!raw || raw.length === 0) return undefined;
  return normalizeSlaConfigsList(raw, DEFAULT_SLA_CONFIGS);
}

function syncLocalScheduleCache(schedules: MisShiftSchedule[], slaConfigs?: MisSlaConfig[]) {
  saveStoredShiftSchedules(schedules);
  const sunday = schedules[0];
  if (sunday && sunday.is_working_day) {
    saveStoredShiftSlaSettings({
      opsStartTime: dbTimeTo12h(sunday.shift_start),
      opsEndTime: dbTimeTo12h(sunday.shift_end),
      nextDay: false,
    });
  }
  if (slaConfigs && slaConfigs.length > 0) {
    saveStoredSlaConfigs(slaConfigs);
  }
}

/** Build a schedule entry in the exact API payload shape. */
export function toScheduleDayPayload(day: MisShiftSchedule): DeliveryScheduleDayPayload {
  if (!day.is_working_day) {
    return {
      day_of_week: day.day_of_week,
      day_name: day.day_name,
      is_working_day: false,
      is_half_day: false,
    };
  }

  return {
    day_of_week: day.day_of_week,
    is_working_day: true,
    is_half_day: Boolean(day.is_half_day),
    shift_start: toApiTimeHhMm(day.shift_start),
    shift_end: toApiTimeHhMm(day.shift_end),
  };
}

/** Build a single-day partial diff payload (e.g. `{ day_of_week: 6, shift_end: "14:30" }`). */
export function buildSingleDayDiffPayload(
  prevDay: MisShiftSchedule,
  nextDay: MisShiftSchedule,
): DeliveryScheduleDayPayload | null {
  const diff: DeliveryScheduleDayPayload = {
    day_of_week: nextDay.day_of_week,
  };
  let changed = false;

  if (prevDay.is_working_day !== nextDay.is_working_day) {
    diff.is_working_day = nextDay.is_working_day;
    changed = true;
  }

  if (prevDay.is_half_day !== nextDay.is_half_day) {
    diff.is_half_day = nextDay.is_half_day;
    changed = true;
  }

  if (nextDay.is_working_day) {
    const prevStart = toApiTimeHhMm(prevDay.shift_start);
    const nextStart = toApiTimeHhMm(nextDay.shift_start);
    if (!prevDay.is_working_day || prevStart !== nextStart) {
      diff.shift_start = nextStart;
      changed = true;
    }

    const prevEnd = toApiTimeHhMm(prevDay.shift_end);
    const nextEnd = toApiTimeHhMm(nextDay.shift_end);
    if (!prevDay.is_working_day || prevEnd !== nextEnd) {
      diff.shift_end = nextEnd;
      changed = true;
    }
  }

  return changed ? diff : null;
}

/**
 * Determine whether to send a single-day update payload or `{ schedules: [...] }`
 * based on how many days changed compared to the baseline schedules.
 */
export function buildDeliverySchedulePayload(
  prevSchedules: MisShiftSchedule[],
  nextSchedules: MisShiftSchedule[],
): UpdateDeliverySchedulePayload | null {
  const changedDays: { prev: MisShiftSchedule; next: MisShiftSchedule }[] = [];

  for (const nextDay of nextSchedules) {
    const prevDay =
      prevSchedules.find((d) => d.day_of_week === nextDay.day_of_week) ||
      DEFAULT_SHIFT_SCHEDULES.find((d) => d.day_of_week === nextDay.day_of_week);
    if (!prevDay) continue;
    if (buildSingleDayDiffPayload(prevDay, nextDay)) {
      changedDays.push({ prev: prevDay, next: nextDay });
    }
  }

  if (changedDays.length === 0) return null;

  if (changedDays.length === 1) {
    return buildSingleDayDiffPayload(changedDays[0].prev, changedDays[0].next);
  }

  return {
    schedules: changedDays.map(({ next }) => toScheduleDayPayload(next)),
  };
}

/** Fetch weekly shift schedule settings from GET /api/admin/delivery-schedule-settings. */
export async function fetchDeliveryScheduleSettings(): Promise<DeliveryScheduleSettingsResult> {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 150));
    return { schedules: getStoredShiftSchedules() };
  }

  const response = await erpNextClient.get<unknown>(DELIVERY_SCHEDULE_SETTINGS_ENDPOINT);
  const rawList = extractRawSchedules(response);
  const schedules =
    rawList.length > 0 ? normalizeSchedulesList(rawList) : getStoredShiftSchedules();
  const slaConfigs = extractRawSlaConfigs(response);

  syncLocalScheduleCache(schedules, slaConfigs);

  return { schedules, slaConfigs };
}

async function sendEndpointMutation(endpoint: string, payload: unknown): Promise<unknown> {
  try {
    return await erpNextClient.post<unknown>(endpoint, payload);
  } catch (err) {
    if (err instanceof ApiError && err.status === 405) {
      try {
        return await erpNextClient.put<unknown>(endpoint, payload);
      } catch (putErr) {
        if (putErr instanceof ApiError && putErr.status === 405) {
          return await erpNextClient.patch<unknown>(endpoint, payload);
        }
        throw putErr;
      }
    }
    throw err;
  }
}

/**
 * Update weekly shift schedule settings via /api/admin/delivery-schedule-settings.
 * Accepts either `{ schedules: [...] }` or a single-day payload `{ day_of_week, ... }`.
 */
export async function updateDeliveryScheduleSettings(
  payload: UpdateDeliverySchedulePayload,
  currentSchedules: MisShiftSchedule[] = getStoredShiftSchedules(),
): Promise<DeliveryScheduleSettingsResult> {
  const applyLocalFallback = (): MisShiftSchedule[] => {
    const items = "schedules" in payload ? payload.schedules : [payload];
    return normalizeSchedulesList(items, currentSchedules);
  };

  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 150));
    const updated = applyLocalFallback();
    syncLocalScheduleCache(updated);
    return { schedules: updated };
  }

  const response = await sendEndpointMutation(DELIVERY_SCHEDULE_SETTINGS_ENDPOINT, payload);
  const rawList = extractRawSchedules(response);
  const merged =
    rawList.length > 0
      ? normalizeSchedulesList(rawList, applyLocalFallback())
      : applyLocalFallback();
  const slaConfigs = extractRawSlaConfigs(response);

  syncLocalScheduleCache(merged, slaConfigs);

  return { schedules: merged, slaConfigs };
}

/** Build a full SLA config entry in the exact API payload shape. */
export function toSlaConfigPayload(cfg: MisSlaConfig): DeliverySlaConfigPayload {
  return {
    sla_type: cfg.sla_type,
    display_name: cfg.display_name,
    duration_minutes: cfg.duration_minutes,
    is_active: Boolean(cfg.is_active),
  };
}

/** Build a single SLA config diff payload (e.g. `{ sla_type: "express", display_name: "...", duration_minutes: 45 }`). */
export function buildSingleSlaDiffPayload(
  prevCfg: MisSlaConfig,
  nextCfg: MisSlaConfig,
): DeliverySlaConfigPayload | null {
  const diff: DeliverySlaConfigPayload = {
    sla_type: nextCfg.sla_type,
  };
  let changed = false;

  if (prevCfg.display_name !== nextCfg.display_name) {
    diff.display_name = nextCfg.display_name;
    changed = true;
  }
  if (prevCfg.duration_minutes !== nextCfg.duration_minutes) {
    diff.duration_minutes = nextCfg.duration_minutes;
    changed = true;
  }
  if (prevCfg.is_active !== nextCfg.is_active) {
    diff.is_active = nextCfg.is_active;
    changed = true;
  }

  return changed ? diff : null;
}

/**
 * Determine whether to send a single-SLA diff payload or `{ configs: [...] }`
 * based on how many SLA configs changed compared to baseline.
 */
export function buildDeliverySlaPayload(
  prevConfigs: MisSlaConfig[],
  nextConfigs: MisSlaConfig[],
): UpdateDeliverySlaPayload | null {
  const changedItems: { prev: MisSlaConfig; next: MisSlaConfig }[] = [];

  for (const nextCfg of nextConfigs) {
    const prevCfg =
      prevConfigs.find((c) => c.sla_type === nextCfg.sla_type || c.id === nextCfg.id) ||
      DEFAULT_SLA_CONFIGS.find((c) => c.sla_type === nextCfg.sla_type);
    if (!prevCfg) continue;
    if (buildSingleSlaDiffPayload(prevCfg, nextCfg)) {
      changedItems.push({ prev: prevCfg, next: nextCfg });
    }
  }

  if (changedItems.length === 0) return null;

  if (changedItems.length === 1) {
    return buildSingleSlaDiffPayload(changedItems[0].prev, changedItems[0].next);
  }

  return {
    configs: changedItems.map(({ next }) => toSlaConfigPayload(next)),
  };
}

/** Fetch delivery SLA configs from GET /api/admin/delivery-sla-settings. */
export async function fetchDeliverySlaSettings(): Promise<MisSlaConfig[]> {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 150));
    return getStoredSlaConfigs();
  }

  const response = await erpNextClient.get<unknown>(DELIVERY_SLA_SETTINGS_ENDPOINT);
  const rawList = extractRawSlaList(response);
  const configs = rawList.length > 0 ? normalizeSlaConfigsList(rawList) : getStoredSlaConfigs();

  saveStoredSlaConfigs(configs);
  return configs;
}

/**
 * Update delivery SLA settings via /api/admin/delivery-sla-settings.
 * Accepts either `{ configs: [...] }` or a single SLA config payload `{ sla_type, ... }`.
 */
export async function updateDeliverySlaSettings(
  payload: UpdateDeliverySlaPayload,
  currentConfigs: MisSlaConfig[] = getStoredSlaConfigs(),
): Promise<MisSlaConfig[]> {
  const applyLocalFallback = (): MisSlaConfig[] => {
    const items = "configs" in payload ? payload.configs : [payload];
    return normalizeSlaConfigsList(items, currentConfigs);
  };

  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 150));
    const updated = applyLocalFallback();
    saveStoredSlaConfigs(updated);
    return updated;
  }

  const response = await sendEndpointMutation(DELIVERY_SLA_SETTINGS_ENDPOINT, payload);
  const rawList = extractRawSlaList(response);
  const merged =
    rawList.length > 0
      ? normalizeSlaConfigsList(rawList, applyLocalFallback())
      : applyLocalFallback();

  saveStoredSlaConfigs(merged);
  return merged;
}

function normalizeFreezeWindowsFromRecord(rec: JsonRecord): FreezeWindowRange[] {
  if (Array.isArray(rec.freeze_windows) && rec.freeze_windows.length > 0) {
    const clean = rec.freeze_windows
      .filter(isRecord)
      .map((w) => ({
        start: typeof w.start === "string" ? toApiTimeHhMm(w.start) : "",
        end: typeof w.end === "string" ? toApiTimeHhMm(w.end) : "",
      }))
      .filter((w) => w.start && w.end);
    if (clean.length > 0) return clean;
  }

  if (
    typeof rec.freeze_start === "string" &&
    rec.freeze_start.trim() &&
    typeof rec.freeze_end === "string" &&
    rec.freeze_end.trim()
  ) {
    return [
      {
        start: toApiTimeHhMm(rec.freeze_start),
        end: toApiTimeHhMm(rec.freeze_end),
      },
    ];
  }

  return [];
}

function normalizeBenchmarksResponse(
  response: unknown,
  fallback: MisRoleBenchmark[] = DEFAULT_ROLE_BENCHMARKS,
): MisRoleBenchmark[] | null {
  if (!response) return null;

  let rawList: unknown[] = [];
  if (Array.isArray(response)) {
    rawList = response;
  } else if (isRecord(response)) {
    if (Array.isArray(response.benchmarks)) {
      rawList = response.benchmarks;
    } else if (Array.isArray(response.data)) {
      rawList = response.data;
    } else if (isRecord(response.data) && Array.isArray(response.data.benchmarks)) {
      rawList = response.data.benchmarks;
    }
  }

  if (rawList.length > 0) {
    return fallback.map((baseItem) => {
      const matched = rawList.find(
        (item): item is JsonRecord =>
          isRecord(item) &&
          typeof item.role === "string" &&
          item.role.trim().toLowerCase() === baseItem.role,
      );
      if (!matched) return baseItem;

      const mins =
        matched.benchmark_minutes !== undefined && matched.benchmark_minutes !== null
          ? Number(matched.benchmark_minutes) || baseItem.benchmark_minutes
          : baseItem.benchmark_minutes;
      const isFreeze = toBooleanFlag(matched.is_freeze_active, baseItem.is_freeze_active);
      const windows = normalizeFreezeWindowsFromRecord(matched);

      return {
        id: matched.id !== undefined ? Number(matched.id) : baseItem.id,
        role: baseItem.role,
        benchmark_minutes: mins,
        is_freeze_active: isFreeze,
        freeze_windows: windows.length > 0 ? windows : isFreeze ? baseItem.freeze_windows : [],
      };
    });
  }

  const flatObj = isRecord(response)
    ? isRecord(response.data) &&
      (response.data.picking_benchmark_minutes !== undefined ||
        response.data.packing_benchmark_minutes !== undefined ||
        response.data.packed_to_driver_benchmark_minutes !== undefined ||
        response.data.delivery_benchmark_minutes !== undefined)
      ? response.data
      : response.picking_benchmark_minutes !== undefined ||
          response.packing_benchmark_minutes !== undefined ||
          response.packed_to_driver_benchmark_minutes !== undefined ||
          response.delivery_benchmark_minutes !== undefined
        ? response
        : null
    : null;

  if (!flatObj) return null;

  const flatRoleMap: Record<BenchmarkRole, string> = {
    picker: "picking_benchmark_minutes",
    packer: "packing_benchmark_minutes",
    packed_to_driver: "packed_to_driver_benchmark_minutes",
    driver: "delivery_benchmark_minutes",
  };

  return fallback.map((baseItem) => {
    const val = flatObj[flatRoleMap[baseItem.role]];
    const mins = val !== undefined && val !== null ? Number(val) || baseItem.benchmark_minutes : baseItem.benchmark_minutes;
    return {
      ...baseItem,
      benchmark_minutes: mins,
    };
  });
}

/** Build one role entry matching `{ role, benchmark_minutes, is_freeze_active, freeze_windows }`. */
export function toRoleBenchmarkPayload(item: MisRoleBenchmark): DeliveryBenchmarkRolePayload {
  const validWindows = item.freeze_windows
    .filter((w) => w.start && w.end)
    .map((w) => ({
      start: toApiTimeHhMm(w.start),
      end: toApiTimeHhMm(w.end),
    }));

  if (!item.is_freeze_active || validWindows.length === 0) {
    return {
      role: item.role,
      benchmark_minutes: item.benchmark_minutes,
      is_freeze_active: false,
    };
  }

  if (validWindows.length === 1) {
    return {
      role: item.role,
      benchmark_minutes: item.benchmark_minutes,
      is_freeze_active: true,
      freeze_start: validWindows[0].start,
      freeze_end: validWindows[0].end,
      freeze_windows: validWindows,
    };
  }

  return {
    role: item.role,
    benchmark_minutes: item.benchmark_minutes,
    is_freeze_active: true,
    freeze_windows: validWindows,
  };
}

/** Build flat summary payload (`picking_benchmark_minutes`, etc.). */
export function toFlatBenchmarkPayload(
  benchmarks: MisRoleBenchmark[],
): FlatDeliveryBenchmarkPayload {
  const flat = roleBenchmarksToFlat(benchmarks);
  return {
    picking_benchmark_minutes: flat.picking,
    packing_benchmark_minutes: flat.packing,
    packed_to_driver_benchmark_minutes: flat.packedToDriver,
    delivery_benchmark_minutes: flat.delivery,
  };
}

/**
 * Choose `{ benchmarks: [...] }` when freeze rules are active or modified,
 * or the flat `*_benchmark_minutes` payload when only duration targets changed without freeze windows.
 */
export function buildDeliveryBenchmarkPayload(
  prevBenchmarks: MisRoleBenchmark[],
  nextBenchmarks: MisRoleBenchmark[],
): UpdateDeliveryBenchmarkPayload {
  const usesFreezeRules = [...prevBenchmarks, ...nextBenchmarks].some(
    (b) => b.is_freeze_active || b.freeze_windows.length > 0,
  );

  if (usesFreezeRules) {
    return {
      benchmarks: nextBenchmarks.map(toRoleBenchmarkPayload),
    };
  }

  return toFlatBenchmarkPayload(nextBenchmarks);
}

/** Fetch delivery benchmark settings from GET /api/admin/delivery-benchmark-settings. */
export async function fetchDeliveryBenchmarkSettings(): Promise<MisRoleBenchmark[]> {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 150));
    return getStoredRoleBenchmarks();
  }

  const response = await erpNextClient.get<unknown>(DELIVERY_BENCHMARK_SETTINGS_ENDPOINT);
  const parsed = normalizeBenchmarksResponse(response, DEFAULT_ROLE_BENCHMARKS);
  const benchmarks = parsed ?? getStoredRoleBenchmarks();

  saveStoredRoleBenchmarks(benchmarks);
  return benchmarks;
}

/**
 * Create or update delivery benchmark settings via /api/admin/delivery-benchmark-settings.
 * Supports both `{ benchmarks: [...] }` (with freeze windows) and flat `*_benchmark_minutes` payloads.
 */
export async function updateDeliveryBenchmarkSettings(
  payload: UpdateDeliveryBenchmarkPayload,
  currentBenchmarks: MisRoleBenchmark[] = getStoredRoleBenchmarks(),
): Promise<MisRoleBenchmark[]> {
  const applyLocalFallback = (): MisRoleBenchmark[] => {
    const parsed = normalizeBenchmarksResponse(payload, currentBenchmarks);
    return parsed ?? currentBenchmarks;
  };

  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 150));
    const updated = applyLocalFallback();
    saveStoredRoleBenchmarks(updated);
    return updated;
  }

  const response = await sendEndpointMutation(DELIVERY_BENCHMARK_SETTINGS_ENDPOINT, payload);
  const parsed = normalizeBenchmarksResponse(response, applyLocalFallback());
  const merged = parsed ?? applyLocalFallback();

  saveStoredRoleBenchmarks(merged);
  return merged;
}

export const settingsApi = {
  fetchRejectionReasons,
  createRejectionReason,
  updateRejectionReason,
  deleteRejectionReason,
  fetchDeliveryScheduleSettings,
  updateDeliveryScheduleSettings,
  fetchDeliverySlaSettings,
  updateDeliverySlaSettings,
  fetchDeliveryBenchmarkSettings,
  updateDeliveryBenchmarkSettings,
};
