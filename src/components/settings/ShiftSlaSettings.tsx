import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Save,
  Calendar,
  Zap,
  Truck,
  Copy,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getStoredShiftSchedules,
  DEFAULT_SHIFT_SCHEDULES,
  getStoredSlaConfigs,
  DEFAULT_SLA_CONFIGS,
  type MisShiftSchedule,
  type MisSlaConfig,
  dbTimeTo12h,
  calculateShiftDurationHours,
} from "@/lib/mis/sla-config";
import {
  fetchDeliveryScheduleSettings,
  updateDeliveryScheduleSettings,
  buildDeliverySchedulePayload,
  buildSingleDayDiffPayload,
  toScheduleDayPayload,
  fetchDeliverySlaSettings,
  updateDeliverySlaSettings,
  buildDeliverySlaPayload,
  buildSingleSlaDiffPayload,
  toSlaConfigPayload,
} from "@/lib/api/settings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatSlaDisplayName(slaType: string, durationMinutes: number): string {
  const prefix =
    slaType === "express" ? "Express Delivery" : slaType === "normal" ? "Normal Delivery" : slaType;
  if (durationMinutes >= 60) {
    const hrs = Math.round((durationMinutes / 60) * 10) / 10;
    return `${prefix} (${hrs} ${hrs === 1 ? "hr" : "hrs"})`;
  }
  return `${prefix} (${durationMinutes} ${durationMinutes === 1 ? "min" : "mins"})`;
}

function toTime24(dbTime: string): string {
  if (!dbTime || dbTime === "00:00:00") return "09:00";
  return dbTime.slice(0, 5);
}

function fromTime24(time24: string): string {
  if (!time24) return "09:00:00";
  return `${time24}:00`;
}

export function ShiftSlaSettings() {
  const [schedules, setSchedules] = useState<MisShiftSchedule[]>(() => getStoredShiftSchedules());
  const [serverSchedules, setServerSchedules] = useState<MisShiftSchedule[]>(() =>
    getStoredShiftSchedules(),
  );
  const [slaConfigs, setSlaConfigs] = useState<MisSlaConfig[]>(() => getStoredSlaConfigs());
  const [serverSlaConfigs, setServerSlaConfigs] = useState<MisSlaConfig[]>(() =>
    getStoredSlaConfigs(),
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = Sunday
  const [viewAllDays, setViewAllDays] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlaLoading, setIsSlaLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [slaFetchError, setSlaFetchError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadSchedulesFromApi = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await fetchDeliveryScheduleSettings();
      setSchedules(result.schedules);
      setServerSchedules(result.schedules);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not load schedule settings from server";
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSlaConfigsFromApi = useCallback(async () => {
    setIsSlaLoading(true);
    setSlaFetchError(null);
    try {
      const configs = await fetchDeliverySlaSettings();
      setSlaConfigs(configs);
      setServerSlaConfigs(configs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load SLA settings from server";
      setSlaFetchError(msg);
    } finally {
      setIsSlaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedulesFromApi();
    void loadSlaConfigsFromApi();
  }, [loadSchedulesFromApi, loadSlaConfigsFromApi]);

  const currentDay = schedules[selectedDayIndex] || schedules[0];

  // Track days that have unsaved edits compared to the server baseline
  const dirtyDaySet = useMemo(() => {
    const dirty = new Set<number>();
    for (const day of schedules) {
      const baseline = serverSchedules.find((s) => s.day_of_week === day.day_of_week);
      if (baseline && buildSingleDayDiffPayload(baseline, day)) {
        dirty.add(day.day_of_week);
      }
    }
    return dirty;
  }, [schedules, serverSchedules]);

  // Track SLA configs that have unsaved edits compared to the server baseline
  const dirtySlaSet = useMemo(() => {
    const dirty = new Set<string>();
    for (const cfg of slaConfigs) {
      const baseline = serverSlaConfigs.find((s) => s.sla_type === cfg.sla_type || s.id === cfg.id);
      if (baseline && buildSingleSlaDiffPayload(baseline, cfg)) {
        dirty.add(cfg.sla_type);
      }
    }
    return dirty;
  }, [slaConfigs, serverSlaConfigs]);

  const isCurrentDayDirty = currentDay ? dirtyDaySet.has(currentDay.day_of_week) : false;

  // Update a single day's schedule
  const updateDay = (dayIndex: number, updates: Partial<MisShiftSchedule>) => {
    setSchedules((prev) =>
      prev.map((item, idx) => (idx === dayIndex ? { ...item, ...updates } : item)),
    );
  };

  // Toggle working day
  const handleToggleWorkingDay = (dayIndex: number) => {
    const day = schedules[dayIndex];
    if (!day) return;
    const newWorking = !day.is_working_day;
    updateDay(dayIndex, {
      is_working_day: newWorking,
      is_half_day: newWorking ? day.is_half_day : false,
      shift_start: newWorking
        ? day.shift_start === "00:00:00"
          ? "09:00:00"
          : day.shift_start
        : "00:00:00",
      shift_end: newWorking
        ? day.shift_end === "00:00:00"
          ? "18:00:00"
          : day.shift_end
        : "00:00:00",
    });
  };

  // Toggle half day
  const handleToggleHalfDay = (dayIndex: number) => {
    const day = schedules[dayIndex];
    if (!day) return;
    const newHalf = !day.is_half_day;
    let newEnd = day.shift_end;
    if (newHalf && day.shift_end === "18:00:00") {
      newEnd = "13:00:00"; // 1:00 PM
    } else if (!newHalf && day.shift_end === "13:00:00") {
      newEnd = "18:00:00"; // 6:00 PM
    }
    updateDay(dayIndex, {
      is_half_day: newHalf,
      is_working_day: true,
      shift_end: newEnd,
    });
  };

  // Copy current day's hours to Mon-Thu weekdays
  const handleCopyHoursToWeekdays = () => {
    if (!currentDay) return;
    setSchedules((prev) =>
      prev.map((day) => {
        if (day.day_of_week >= 1 && day.day_of_week <= 4) {
          return {
            ...day,
            is_working_day: currentDay.is_working_day,
            is_half_day: false,
            shift_start: currentDay.shift_start,
            shift_end: currentDay.shift_end,
          };
        }
        return day;
      }),
    );
    toast.info(
      `Copied ${currentDay.day_name} hours to Monday through Thursday. Click Save to apply.`,
    );
  };

  // Update SLA config
  const updateSlaConfig = (id: number, updates: Partial<MisSlaConfig>) => {
    setSlaConfigs((prev) => prev.map((cfg) => (cfg.id === id ? { ...cfg, ...updates } : cfg)));
  };

  // Save a single day directly using single-day API payload
  const handleSaveSingleDay = async () => {
    if (!currentDay) return;
    const baseline = serverSchedules.find((s) => s.day_of_week === currentDay.day_of_week);
    const singlePayload = baseline
      ? buildSingleDayDiffPayload(baseline, currentDay)
      : toScheduleDayPayload(currentDay);

    if (!singlePayload) {
      toast.info(`No changes to save for ${currentDay.day_name}.`);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateDeliveryScheduleSettings(singlePayload, schedules);
      setSchedules(result.schedules);
      setServerSchedules(result.schedules);
      setSaved(true);
      toast.success(`${currentDay.day_name} schedule updated!`);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : `Failed to update ${currentDay.day_name} schedule`;
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Save a single SLA config directly using partial single-SLA payload
  const handleSaveSingleSla = async (cfg: MisSlaConfig) => {
    const baseline = serverSlaConfigs.find((s) => s.sla_type === cfg.sla_type || s.id === cfg.id);
    const singlePayload = baseline
      ? buildSingleSlaDiffPayload(baseline, cfg)
      : toSlaConfigPayload(cfg);

    if (!singlePayload) {
      toast.info(`No changes to save for ${cfg.display_name}.`);
      return;
    }

    setIsSaving(true);
    try {
      const updatedConfigs = await updateDeliverySlaSettings(singlePayload, slaConfigs);
      setSlaConfigs(updatedConfigs);
      setServerSlaConfigs(updatedConfigs);
      setSaved(true);
      toast.success(`${cfg.display_name} updated!`);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to update ${cfg.sla_type} SLA`;
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const schedulePayload = buildDeliverySchedulePayload(serverSchedules, schedules);
      const slaPayload = buildDeliverySlaPayload(serverSlaConfigs, slaConfigs);

      if (schedulePayload) {
        const result = await updateDeliveryScheduleSettings(schedulePayload, schedules);
        setSchedules(result.schedules);
        setServerSchedules(result.schedules);
      }

      if (slaPayload) {
        const updatedConfigs = await updateDeliverySlaSettings(slaPayload, slaConfigs);
        setSlaConfigs(updatedConfigs);
        setServerSlaConfigs(updatedConfigs);
      }

      setSaved(true);
      toast.success("Shift & SLA settings saved successfully!");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm("Reset schedules and SLAs to database defaults?")) return;

    setIsSaving(true);
    try {
      const bulkSchedulesPayload = {
        schedules: DEFAULT_SHIFT_SCHEDULES.map(toScheduleDayPayload),
      };
      const bulkSlaPayload = {
        configs: DEFAULT_SLA_CONFIGS.map(toSlaConfigPayload),
      };

      const [scheduleResult, slaResult] = await Promise.all([
        updateDeliveryScheduleSettings(bulkSchedulesPayload, DEFAULT_SHIFT_SCHEDULES),
        updateDeliverySlaSettings(bulkSlaPayload, DEFAULT_SLA_CONFIGS),
      ]);

      setSchedules(scheduleResult.schedules);
      setServerSchedules(scheduleResult.schedules);
      setSlaConfigs(slaResult);
      setServerSlaConfigs(slaResult);
      setSelectedDayIndex(0);
      toast.info("Reset to database defaults.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset settings";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const anyLoading = isLoading || isSlaLoading;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            MIS Shift &amp; SLA Windows
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose a day to configure shift timings and set delivery SLA targets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            disabled={isSaving || anyLoading}
            className="text-xs h-9 font-semibold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            <span>Reset</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveAll}
            disabled={isSaving || anyLoading}
            className="text-xs h-9 font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs px-4"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </Button>
        </div>
      </div>

      {/* ── Fetch Error Banner (if server unreachable) ── */}
      {(fetchError || slaFetchError) && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Showing cached settings ({fetchError || slaFetchError})</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void loadSchedulesFromApi();
              void loadSlaConfigsFromApi();
            }}
            className="h-7 px-2.5 text-xs font-semibold"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── SECTION 1: SHIFT SCHEDULES ── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-bold text-foreground">
              Weekly Shift Schedule (Choose a Day)
            </h3>
            {isLoading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </span>
            )}
            {dirtyDaySet.size > 0 && !isLoading && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {dirtyDaySet.size} unsaved
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadSchedulesFromApi()}
              disabled={isLoading || isSaving}
              title="Refresh schedule from server"
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </button>

            {/* Toggle between "Choose Day" and "View All Days" */}
            <button
              type="button"
              onClick={() => setViewAllDays(!viewAllDays)}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
            >
              {viewAllDays ? "← Back to Choose a Day" : "View All 7 Days"}
            </button>
          </div>
        </div>

        {!viewAllDays ? (
          <>
            {/* Day Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {schedules.map((day, idx) => {
                const isSelected = selectedDayIndex === idx;
                const isDirty = dirtyDaySet.has(day.day_of_week);
                const isOff = !day.is_working_day;
                const isHalf = day.is_working_day && day.is_half_day;

                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none",
                      isSelected
                        ? "border-teal-600 bg-teal-50/80 text-teal-950 dark:bg-teal-950/50 dark:text-teal-100 ring-2 ring-teal-500/20 shadow-xs"
                        : "border-border bg-card hover:bg-muted/40 text-foreground",
                    )}
                  >
                    {isDirty && (
                      <span
                        className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500"
                        title="Unsaved changes"
                      />
                    )}
                    <span className="text-xs font-bold">{day.day_name.slice(0, 3)}</span>

                    <span className="mt-1">
                      {isOff ? (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                          Off
                        </span>
                      ) : isHalf ? (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          Half
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          Work
                        </span>
                      )}
                    </span>

                    <span className="text-[10px] text-muted-foreground font-mono mt-1">
                      {isOff ? "--" : `${toTime24(day.shift_start)}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Configuration Card */}
            {currentDay && (
              <div className="rounded-xl border border-teal-200/80 bg-teal-50/30 p-4 dark:border-teal-900/60 dark:bg-teal-950/20 space-y-4">
                <div className="flex items-center justify-between border-b border-teal-200/50 dark:border-teal-800/50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-foreground">
                      {currentDay.day_name}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      (Day {currentDay.day_of_week})
                    </span>
                  </div>

                  <span className="text-xs font-bold font-mono text-teal-700 dark:text-teal-300">
                    {currentDay.is_working_day
                      ? `${calculateShiftDurationHours(currentDay.shift_start, currentDay.shift_end, true)} hrs shift`
                      : "Off Day (0 hrs)"}
                  </span>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Working Day Toggle */}
                  <div className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Working Day</span>
                      <span className="text-[11px] text-muted-foreground">
                        {currentDay.is_working_day ? "Active operations" : "Off day (SLA paused)"}
                      </span>
                    </div>
                    <Switch
                      checked={currentDay.is_working_day}
                      onCheckedChange={() => handleToggleWorkingDay(selectedDayIndex)}
                    />
                  </div>

                  {/* Half Day Toggle */}
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg bg-card border border-border p-3 transition-opacity",
                      !currentDay.is_working_day && "opacity-50 pointer-events-none",
                    )}
                  >
                    <div>
                      <span className="text-xs font-bold text-foreground block">Half Day</span>
                      <span className="text-[11px] text-muted-foreground">
                        {currentDay.is_half_day ? "09:00 AM – 01:00 PM" : "Full day shift"}
                      </span>
                    </div>
                    <Switch
                      checked={currentDay.is_half_day}
                      disabled={!currentDay.is_working_day}
                      onCheckedChange={() => handleToggleHalfDay(selectedDayIndex)}
                    />
                  </div>
                </div>

                {/* Time Inputs */}
                {currentDay.is_working_day ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Shift Start Time</span>
                        <span className="text-muted-foreground font-mono font-normal">
                          {dbTimeTo12h(currentDay.shift_start)}
                        </span>
                      </label>
                      <Input
                        type="time"
                        value={toTime24(currentDay.shift_start)}
                        onChange={(e) =>
                          updateDay(selectedDayIndex, { shift_start: fromTime24(e.target.value) })
                        }
                        className="h-10 text-sm font-mono font-semibold bg-card"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Shift End Time</span>
                        <span className="text-muted-foreground font-mono font-normal">
                          {dbTimeTo12h(currentDay.shift_end)}
                        </span>
                      </label>
                      <Input
                        type="time"
                        value={toTime24(currentDay.shift_end)}
                        onChange={(e) =>
                          updateDay(selectedDayIndex, { shift_end: fromTime24(e.target.value) })
                        }
                        className="h-10 text-sm font-mono font-semibold bg-card"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                    This day is set as an <strong>Off Day</strong>. Shift hours are 00:00:00 and SLA
                    clocks are frozen.
                  </div>
                )}

                {/* Day actions bar (Apply to Mon-Thu & Save single day) */}
                {(isCurrentDayDirty || (currentDay.is_working_day && !currentDay.is_half_day)) && (
                  <div className="pt-2 flex items-center justify-end gap-2 flex-wrap">
                    {currentDay.is_working_day && !currentDay.is_half_day && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyHoursToWeekdays}
                        className="text-xs text-teal-700 hover:text-teal-800 dark:text-teal-300 gap-1.5 h-8"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Apply this shift to Mon–Thu</span>
                      </Button>
                    )}

                    {isCurrentDayDirty && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSaving || isLoading}
                        onClick={() => void handleSaveSingleDay()}
                        className="h-8 px-3 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs gap-1.5"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        <span>Save {currentDay.day_name}</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* View All 7 Days Mode */
          <div className="space-y-2 divide-y divide-border/60">
            {schedules.map((day, idx) => (
              <div
                key={day.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-1"
              >
                <div className="flex items-center gap-2.5 min-w-[130px]">
                  <span className="font-bold text-sm text-foreground">{day.day_name}</span>
                  {!day.is_working_day ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                      Off
                    </span>
                  ) : day.is_half_day ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Half
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Work
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Working Toggle */}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <Switch
                      checked={day.is_working_day}
                      onCheckedChange={() => handleToggleWorkingDay(idx)}
                    />
                    <span>Working</span>
                  </label>

                  {/* Half Day Toggle */}
                  <label
                    className={cn(
                      "flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer",
                      !day.is_working_day && "opacity-40 pointer-events-none",
                    )}
                  >
                    <Switch
                      checked={day.is_half_day}
                      disabled={!day.is_working_day}
                      onCheckedChange={() => handleToggleHalfDay(idx)}
                    />
                    <span>Half Day</span>
                  </label>

                  {/* Time Inputs */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      disabled={!day.is_working_day}
                      value={toTime24(day.shift_start)}
                      onChange={(e) => updateDay(idx, { shift_start: fromTime24(e.target.value) })}
                      className="w-28 h-8 text-xs font-mono font-semibold bg-card"
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input
                      type="time"
                      disabled={!day.is_working_day}
                      value={toTime24(day.shift_end)}
                      onChange={(e) => updateDay(idx, { shift_end: fromTime24(e.target.value) })}
                      className="w-28 h-8 text-xs font-mono font-semibold bg-card"
                    />
                  </div>

                  <span className="text-xs font-mono font-bold text-muted-foreground min-w-[50px] text-right">
                    {day.is_working_day
                      ? `${calculateShiftDurationHours(day.shift_start, day.shift_end, true)}h`
                      : "0h"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: DELIVERY SLA CONFIGURATIONS ── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-foreground">Delivery SLA Configurations</h3>
            {isSlaLoading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </span>
            )}
            {dirtySlaSet.size > 0 && !isSlaLoading && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {dirtySlaSet.size} unsaved
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => void loadSlaConfigsFromApi()}
            disabled={isSlaLoading || isSaving}
            title="Refresh SLA settings from server"
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSlaLoading && "animate-spin")} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {slaConfigs.map((cfg) => {
            const isExpress = cfg.sla_type === "express";
            const isSlaDirty = dirtySlaSet.has(cfg.sla_type);

            return (
              <div
                key={cfg.id}
                className={cn(
                  "rounded-xl border p-4 space-y-3 transition-all",
                  isExpress
                    ? "border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10"
                    : "border-sky-200 bg-sky-50/20 dark:border-sky-900/40 dark:bg-sky-950/10",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg text-white",
                        isExpress ? "bg-amber-500" : "bg-sky-600",
                      )}
                    >
                      {isExpress ? <Zap className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-foreground block">
                          {cfg.display_name}
                        </span>
                        {isSlaDirty && (
                          <span
                            className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
                            title="Unsaved changes"
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        {cfg.sla_type}
                      </span>
                    </div>
                  </div>

                  <Switch
                    checked={cfg.is_active}
                    onCheckedChange={(checked) => updateSlaConfig(cfg.id, { is_active: checked })}
                  />
                </div>

                {/* Duration Input */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Target Duration</span>
                    <span className="font-bold font-mono text-primary">
                      {cfg.duration_minutes >= 60
                        ? `${Math.round((cfg.duration_minutes / 60) * 10) / 10} hours (${cfg.duration_minutes}m)`
                        : `${cfg.duration_minutes} mins`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step={15}
                      min={15}
                      max={1440}
                      value={cfg.duration_minutes}
                      onChange={(e) => {
                        const mins = parseInt(e.target.value, 10) || 60;
                        updateSlaConfig(cfg.id, {
                          duration_minutes: mins,
                          display_name: formatSlaDisplayName(cfg.sla_type, mins),
                        });
                      }}
                      className="h-9 text-sm font-mono font-bold bg-card"
                    />
                    <span className="text-xs text-muted-foreground font-mono">minutes</span>
                  </div>

                  {/* Simple Quick Buttons & Per-Card Save */}
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(isExpress ? [30, 45, 60, 90, 120] : [60, 120, 180, 240, 360]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() =>
                            updateSlaConfig(cfg.id, {
                              duration_minutes: m,
                              display_name: formatSlaDisplayName(cfg.sla_type, m),
                            })
                          }
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer",
                            cfg.duration_minutes === m
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                              : "bg-card border-border hover:bg-muted text-foreground",
                          )}
                        >
                          {m >= 60 ? `${m / 60}h` : `${m}m`}
                        </button>
                      ))}
                    </div>

                    {isSlaDirty && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSaving || isSlaLoading}
                        onClick={() => void handleSaveSingleSla(cfg)}
                        className="h-7 px-2.5 text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs gap-1"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        <span>Save</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Save Bar ── */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        {saved ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved successfully!
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Non-working days and hours outside active shifts pause the SLA countdown.
          </span>
        )}

        <Button
          type="button"
          onClick={() => void handleSaveAll()}
          disabled={isSaving || anyLoading}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs px-5 h-9"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          <span>{isSaving ? "Saving..." : "Save Settings"}</span>
        </Button>
      </div>
    </div>
  );
}
