/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  SLA Configuration Module                                                     ║
 * ║                                                                              ║
 * ║  Centralized, configurable SLA parameters for the MIS Benchmarks engine.     ║
 * ║  Operations staff can modify benchmarks here without touching UI code.        ║
 * ║                                                                              ║
 * ║  Supports:                                                                    ║
 * ║    • Per-SLA-type benchmark targets                                           ║
 * ║    • Operational hour windows                                                 ║
 * ║    • Overnight freeze periods (general & picking-specific)                    ║
 * ║    • Dispatch windows (morning & second shift)                                ║
 * ║    • Future: warehouse-specific overrides, holiday calendars                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SlaType = "picking" | "packing" | "delivery";

/** A time-of-day expressed as hours and minutes (24h format). */
export interface TimeOfDay {
  hour: number; // 0–23
  minute: number; // 0–59
}

/** A window defined by a start and end time-of-day. */
export interface TimeWindow {
  start: TimeOfDay;
  end: TimeOfDay;
}

/** Complete SLA configuration for one warehouse or the global default. */
export interface SlaConfig {
  /** SLA benchmark targets in minutes per type. */
  benchmarks: Record<SlaType, number>;

  /** Warehouse operational hours. */
  operationalHours: {
    /** When active operations (picking/packing) begin. Default: 06:00. */
    start: TimeOfDay;
    /** When active operations conclude (next day if < start). Default: 01:00. */
    end: TimeOfDay;
  };

  /** General business freeze window — no SLA tracking during this period. */
  businessFreeze: TimeWindow;

  /**
   * Picking-specific freeze window.
   * Picking tasks left untouched during this window do not accrue SLA time.
   * Typically wider than the general freeze (starts at midnight).
   */
  pickingFreeze: TimeWindow;

  /** Dispatch windows for driver departures. */
  dispatch: {
    /** Morning dispatch start time. Default: 09:00. */
    morningStart: TimeOfDay;
    /** Second-shift dispatch window. Default: 13:00–16:00. */
    secondShift: TimeWindow;
  };
}

// ─── Default Configuration ───────────────────────────────────────────────────

export const DEFAULT_SLA_CONFIG: SlaConfig = {
  benchmarks: {
    picking: 10, // 10 minutes
    packing: 10, // 10 minutes
    delivery: 210, // 3.5 hours (210 minutes)
  },

  operationalHours: {
    start: { hour: 6, minute: 0 }, // 06:00 AM
    end: { hour: 1, minute: 0 }, // 01:00 AM (next day)
  },

  businessFreeze: {
    start: { hour: 1, minute: 0 }, // 01:00 AM
    end: { hour: 6, minute: 0 }, // 06:00 AM
  },

  pickingFreeze: {
    start: { hour: 0, minute: 0 }, // 12:00 AM (midnight)
    end: { hour: 6, minute: 0 }, // 06:00 AM
  },

  dispatch: {
    morningStart: { hour: 9, minute: 0 }, // 09:00 AM
    secondShift: {
      start: { hour: 13, minute: 0 }, // 01:00 PM
      end: { hour: 16, minute: 0 }, // 04:00 PM
    },
  },
};

// ─── Shift Settings Storage & Helpers ────────────────────────────────────────

export const SLA_SETTINGS_KEY = "hm_mis_shift_sla_settings";

export interface ShiftSlaSettingsData {
  opsStartTime: string;
  opsEndTime: string;
  nextDay: boolean;
}

export const DEFAULT_SHIFT_SLA_DATA: ShiftSlaSettingsData = {
  opsStartTime: "09:00 AM",
  opsEndTime: "06:00 PM",
  nextDay: false,
};

// ─── MIS Shift Schedules (Table: mis_shift_schedules) ─────────────────────────

export interface MisShiftSchedule {
  id: number;
  day_of_week: number; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  day_name: string;
  is_working_day: boolean;
  is_half_day: boolean;
  shift_start: string; // e.g. "09:00:00"
  shift_end: string; // e.g. "18:00:00"
}

export const SHIFT_SCHEDULES_KEY = "hm_mis_shift_schedules";

export const DEFAULT_SHIFT_SCHEDULES: MisShiftSchedule[] = [
  {
    id: 1,
    day_of_week: 0,
    day_name: "Sunday",
    is_working_day: true,
    is_half_day: false,
    shift_start: "09:00:00",
    shift_end: "18:00:00",
  },
  {
    id: 2,
    day_of_week: 1,
    day_name: "Monday",
    is_working_day: true,
    is_half_day: false,
    shift_start: "09:00:00",
    shift_end: "18:00:00",
  },
  {
    id: 3,
    day_of_week: 2,
    day_name: "Tuesday",
    is_working_day: true,
    is_half_day: false,
    shift_start: "09:00:00",
    shift_end: "18:00:00",
  },
  {
    id: 4,
    day_of_week: 3,
    day_name: "Wednesday",
    is_working_day: true,
    is_half_day: false,
    shift_start: "09:00:00",
    shift_end: "18:00:00",
  },
  {
    id: 5,
    day_of_week: 4,
    day_name: "Thursday",
    is_working_day: true,
    is_half_day: false,
    shift_start: "09:00:00",
    shift_end: "18:00:00",
  },
  {
    id: 6,
    day_of_week: 5,
    day_name: "Friday",
    is_working_day: false,
    is_half_day: false,
    shift_start: "00:00:00",
    shift_end: "00:00:00",
  },
  {
    id: 7,
    day_of_week: 6,
    day_name: "Saturday",
    is_working_day: true,
    is_half_day: true,
    shift_start: "09:00:00",
    shift_end: "13:00:00",
  },
];

export function getStoredShiftSchedules(): MisShiftSchedule[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(SHIFT_SCHEDULES_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (error) {
    void error;
  }
  return DEFAULT_SHIFT_SCHEDULES;
}

export function saveStoredShiftSchedules(schedules: MisShiftSchedule[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(SHIFT_SCHEDULES_KEY, JSON.stringify(schedules));
      window.dispatchEvent(new CustomEvent("hm_shift_schedules_updated", { detail: schedules }));
    }
  } catch (error) {
    void error;
  }
}

// ─── MIS SLA Configurations (Table: mis_sla_configs) ─────────────────────────

export interface MisSlaConfig {
  id: number;
  sla_type: "normal" | "express" | string;
  display_name: string;
  duration_minutes: number;
  is_active: boolean;
}

export const SLA_CONFIGS_KEY = "hm_mis_sla_configs";

export const DEFAULT_SLA_CONFIGS: MisSlaConfig[] = [
  {
    id: 1,
    sla_type: "normal",
    display_name: "Normal Delivery (4 hrs)",
    duration_minutes: 240,
    is_active: true,
  },
  {
    id: 2,
    sla_type: "express",
    display_name: "Express Delivery (1 hr)",
    duration_minutes: 60,
    is_active: true,
  },
];

export function getStoredSlaConfigs(): MisSlaConfig[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(SLA_CONFIGS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (error) {
    void error;
  }
  return DEFAULT_SLA_CONFIGS;
}

export function saveStoredSlaConfigs(configs: MisSlaConfig[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(SLA_CONFIGS_KEY, JSON.stringify(configs));
      window.dispatchEvent(new CustomEvent("hm_sla_configs_updated", { detail: configs }));
    }
  } catch (error) {
    void error;
  }
}

// ─── Operational Benchmarks Storage & Helpers ───────────────────────────────

export const MIS_BENCHMARKS_KEY = "hm_mis_operational_benchmarks";

export interface OperationalBenchmarksData {
  picking: number;
  packing: number;
  packedToDriver: number;
  delivery: number;
}

export const DEFAULT_OPERATIONAL_BENCHMARKS: OperationalBenchmarksData = {
  picking: 15,
  packing: 15,
  packedToDriver: 30,
  delivery: 180,
};

/** Retrieve persisted operational benchmarks from localStorage or fallback to defaults. */
export function getStoredOperationalBenchmarks(): OperationalBenchmarksData {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(MIS_BENCHMARKS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (error) {
    void error;
  }
  return DEFAULT_OPERATIONAL_BENCHMARKS;
}

/** Persist operational benchmarks to localStorage and update in-memory SLA config. */
export function saveStoredOperationalBenchmarks(data: OperationalBenchmarksData): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(MIS_BENCHMARKS_KEY, JSON.stringify(data));
    }
    if (data.picking > 0) DEFAULT_SLA_CONFIG.benchmarks.picking = data.picking;
    if (data.packing > 0) DEFAULT_SLA_CONFIG.benchmarks.packing = data.packing;
    if (data.delivery > 0) DEFAULT_SLA_CONFIG.benchmarks.delivery = data.delivery;
  } catch (error) {
    void error;
  }
}

// ─── Role Benchmarks & Freeze Windows (/api/admin/delivery-benchmark-settings) ──

export type BenchmarkRole = "picker" | "packer" | "packed_to_driver" | "driver";

export interface FreezeWindowRange {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface MisRoleBenchmark {
  id?: number;
  role: BenchmarkRole;
  benchmark_minutes: number;
  is_freeze_active: boolean;
  freeze_windows: FreezeWindowRange[];
}

export const ROLE_BENCHMARKS_KEY = "hm_mis_role_benchmarks";

export const DEFAULT_ROLE_BENCHMARKS: MisRoleBenchmark[] = [
  {
    role: "picker",
    benchmark_minutes: DEFAULT_OPERATIONAL_BENCHMARKS.picking,
    is_freeze_active: false,
    freeze_windows: [],
  },
  {
    role: "packer",
    benchmark_minutes: DEFAULT_OPERATIONAL_BENCHMARKS.packing,
    is_freeze_active: false,
    freeze_windows: [],
  },
  {
    role: "packed_to_driver",
    benchmark_minutes: DEFAULT_OPERATIONAL_BENCHMARKS.packedToDriver,
    is_freeze_active: false,
    freeze_windows: [],
  },
  {
    role: "driver",
    benchmark_minutes: DEFAULT_OPERATIONAL_BENCHMARKS.delivery,
    is_freeze_active: false,
    freeze_windows: [],
  },
];

export function roleBenchmarksToFlat(benchmarks: MisRoleBenchmark[]): OperationalBenchmarksData {
  const findMins = (role: BenchmarkRole, fallback: number): number => {
    const found = benchmarks.find((b) => b.role === role);
    return found && found.benchmark_minutes > 0 ? found.benchmark_minutes : fallback;
  };
  return {
    picking: findMins("picker", DEFAULT_OPERATIONAL_BENCHMARKS.picking),
    packing: findMins("packer", DEFAULT_OPERATIONAL_BENCHMARKS.packing),
    packedToDriver: findMins("packed_to_driver", DEFAULT_OPERATIONAL_BENCHMARKS.packedToDriver),
    delivery: findMins("driver", DEFAULT_OPERATIONAL_BENCHMARKS.delivery),
  };
}

export function getStoredRoleBenchmarks(): MisRoleBenchmark[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(ROLE_BENCHMARKS_KEY);
      if (raw) return JSON.parse(raw);
      const flat = getStoredOperationalBenchmarks();
      return [
        {
          role: "picker",
          benchmark_minutes: flat.picking,
          is_freeze_active: false,
          freeze_windows: [],
        },
        {
          role: "packer",
          benchmark_minutes: flat.packing,
          is_freeze_active: false,
          freeze_windows: [],
        },
        {
          role: "packed_to_driver",
          benchmark_minutes: flat.packedToDriver,
          is_freeze_active: false,
          freeze_windows: [],
        },
        {
          role: "driver",
          benchmark_minutes: flat.delivery,
          is_freeze_active: false,
          freeze_windows: [],
        },
      ];
    }
  } catch (error) {
    void error;
  }
  return DEFAULT_ROLE_BENCHMARKS;
}

export function saveStoredRoleBenchmarks(benchmarks: MisRoleBenchmark[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(ROLE_BENCHMARKS_KEY, JSON.stringify(benchmarks));
      window.dispatchEvent(new CustomEvent("hm_role_benchmarks_updated", { detail: benchmarks }));
    }
    saveStoredOperationalBenchmarks(roleBenchmarksToFlat(benchmarks));
  } catch (error) {
    void error;
  }
}

/** Parse a 12h or 24h time string into TimeOfDay { hour, minute }. */
export function parseTimeToTimeOfDay(timeStr: string): TimeOfDay | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24 && !clean.includes("AM") && !clean.includes("PM")) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);
    return { hour, minute };
  }
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return { hour, minute };
}

/** Format database time string (e.g., "09:00:00") into 12h display string (e.g., "09:00 AM"). */
export function dbTimeTo12h(dbTime: string): string {
  if (!dbTime || dbTime === "00:00:00") return "00:00";
  const tod = parseTimeToTimeOfDay(dbTime);
  if (!tod) return dbTime;
  return formatTimeOfDayTo12h(tod);
}

/** Format 12h or 24h string into database "HH:mm:ss" format. */
export function time12hToDb(time12h: string): string {
  const tod = parseTimeToTimeOfDay(time12h);
  if (!tod) return "09:00:00";
  const h = tod.hour.toString().padStart(2, "0");
  const m = tod.minute.toString().padStart(2, "0");
  return `${h}:${m}:00`;
}

/** Calculate net shift duration in decimal hours between start and end. */
export function calculateShiftDurationHours(
  startDb: string,
  endDb: string,
  isWorking: boolean,
): number {
  if (!isWorking || (startDb === "00:00:00" && endDb === "00:00:00")) return 0;
  const startTod = parseTimeToTimeOfDay(startDb);
  const endTod = parseTimeToTimeOfDay(endDb);
  if (!startTod || !endTod) return 0;
  const startMin = startTod.hour * 60 + startTod.minute;
  let endMin = endTod.hour * 60 + endTod.minute;
  if (endMin < startMin) {
    endMin += 24 * 60; // Overnight
  }
  const diff = (endMin - startMin) / 60;
  return Math.round(diff * 10) / 10;
}

/** Format TimeOfDay into a 12h display string (e.g., "09:00 AM"). */
export function formatTimeOfDayTo12h(tod: TimeOfDay): string {
  const ampm = tod.hour >= 12 ? "PM" : "AM";
  let h = tod.hour % 12;
  if (h === 0) h = 12;
  const m = tod.minute.toString().padStart(2, "0");
  return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
}

/** Retrieve persisted shift & SLA settings from localStorage or fallback to defaults. */
export function getStoredShiftSlaSettings(): ShiftSlaSettingsData {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(SLA_SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (error) {
    void error;
  }
  return DEFAULT_SHIFT_SLA_DATA;
}

/** Persist shift & SLA settings to localStorage and update in-memory SLA config. */
export function saveStoredShiftSlaSettings(data: ShiftSlaSettingsData): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(SLA_SETTINGS_KEY, JSON.stringify(data));
    }
    const s = parseTimeToTimeOfDay(data.opsStartTime);
    const e = parseTimeToTimeOfDay(data.opsEndTime);
    if (s) DEFAULT_SLA_CONFIG.operationalHours.start = s;
    if (e) DEFAULT_SLA_CONFIG.operationalHours.end = e;
  } catch (error) {
    void error;
  }
}

// Initialize operationalHours and benchmarks from localStorage if present
try {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(SLA_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.opsStartTime) {
        const s = parseTimeToTimeOfDay(parsed.opsStartTime);
        if (s) DEFAULT_SLA_CONFIG.operationalHours.start = s;
      }
      if (parsed.opsEndTime) {
        const e = parseTimeToTimeOfDay(parsed.opsEndTime);
        if (e) DEFAULT_SLA_CONFIG.operationalHours.end = e;
      }
    }

    const savedBenchmarks = localStorage.getItem(MIS_BENCHMARKS_KEY);
    if (savedBenchmarks) {
      const parsed = JSON.parse(savedBenchmarks);
      if (parsed.picking > 0) DEFAULT_SLA_CONFIG.benchmarks.picking = parsed.picking;
      if (parsed.packing > 0) DEFAULT_SLA_CONFIG.benchmarks.packing = parsed.packing;
      if (parsed.delivery > 0) DEFAULT_SLA_CONFIG.benchmarks.delivery = parsed.delivery;
    }
  }
} catch (error) {
  void error;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a TimeOfDay to total minutes from midnight. */
export function timeOfDayToMinutes(t: TimeOfDay): number {
  return t.hour * 60 + t.minute;
}

/** Get the benchmark target (in minutes) for a given SLA type. */
export function getBenchmarkMinutes(
  slaType: SlaType,
  config: SlaConfig = DEFAULT_SLA_CONFIG,
): number {
  return config.benchmarks[slaType];
}

/** Format a duration in minutes to a human-readable string. */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return "0 min";
  if (minutes < 60) return `${Math.round(minutes * 10) / 10} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format a duration in minutes to a compact string (e.g., "7m", "2h 15m"). */
export function formatDurationCompact(minutes: number): string {
  if (minutes < 0) return "0m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
