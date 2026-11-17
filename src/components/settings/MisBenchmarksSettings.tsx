import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  CheckCircle2,
  RotateCcw,
  Save,
  Timer,
  Package,
  Boxes,
  Truck,
  RefreshCw,
  Loader2,
  AlertCircle,
  Snowflake,
  Plus,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  getStoredRoleBenchmarks,
  DEFAULT_ROLE_BENCHMARKS,
  roleBenchmarksToFlat,
  type MisRoleBenchmark,
  type BenchmarkRole,
  type OperationalBenchmarksData,
  formatDuration,
} from "@/lib/mis/sla-config";
import {
  fetchDeliveryBenchmarkSettings,
  updateDeliveryBenchmarkSettings,
  buildDeliveryBenchmarkPayload,
  toRoleBenchmarkPayload,
} from "@/lib/api/settings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ROLE_META: Record<
  BenchmarkRole,
  {
    title: string;
    inputLabel: string;
    fieldId: string;
    placeholder: string;
    Icon: typeof Package;
    iconColor: string;
  }
> = {
  picker: {
    title: "Picking",
    inputLabel: "Picking Benchmark (min)",
    fieldId: "picking-benchmark",
    placeholder: "15",
    Icon: Package,
    iconColor: "text-blue-500",
  },
  packer: {
    title: "Packing",
    inputLabel: "Packing Benchmark (min)",
    fieldId: "packing-benchmark",
    placeholder: "15",
    Icon: Boxes,
    iconColor: "text-amber-500",
  },
  packed_to_driver: {
    title: "Packed → Driver",
    inputLabel: "Packed → Driver Benchmark (min)",
    fieldId: "packed-to-driver-benchmark",
    placeholder: "30",
    Icon: Timer,
    iconColor: "text-purple-500",
  },
  driver: {
    title: "Delivery",
    inputLabel: "Delivery Benchmark (min)",
    fieldId: "delivery-benchmark",
    placeholder: "180",
    Icon: Truck,
    iconColor: "text-emerald-500",
  },
};

export function MisBenchmarksSettings() {
  const [roleBenchmarks, setRoleBenchmarks] = useState<MisRoleBenchmark[]>(() =>
    getStoredRoleBenchmarks(),
  );
  const [serverRoleBenchmarks, setServerRoleBenchmarks] = useState<MisRoleBenchmark[]>(() =>
    getStoredRoleBenchmarks(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadBenchmarksFromApi = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const items = await fetchDeliveryBenchmarkSettings();
      setRoleBenchmarks(items);
      setServerRoleBenchmarks(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load benchmarks from server";
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBenchmarksFromApi();
  }, [loadBenchmarksFromApi]);

  const benchmarks: OperationalBenchmarksData = useMemo(
    () => roleBenchmarksToFlat(roleBenchmarks),
    [roleBenchmarks],
  );

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(roleBenchmarks) !== JSON.stringify(serverRoleBenchmarks),
    [roleBenchmarks, serverRoleBenchmarks],
  );

  const handleMinutesChange = (role: BenchmarkRole, val: string) => {
    const parsed = parseInt(val, 10);
    const mins = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setRoleBenchmarks((prev) =>
      prev.map((item) => (item.role === role ? { ...item, benchmark_minutes: mins } : item)),
    );
  };

  const handleToggleFreeze = (role: BenchmarkRole, checked: boolean) => {
    setRoleBenchmarks((prev) =>
      prev.map((item) => {
        if (item.role !== role) return item;
        const nextWindows =
          checked && item.freeze_windows.length === 0
            ? [{ start: "12:00", end: "13:00" }]
            : item.freeze_windows;
        return {
          ...item,
          is_freeze_active: checked,
          freeze_windows: nextWindows,
        };
      }),
    );
  };

  const handleAddFreezeWindow = (role: BenchmarkRole) => {
    setRoleBenchmarks((prev) =>
      prev.map((item) => {
        if (item.role !== role) return item;
        return {
          ...item,
          is_freeze_active: true,
          freeze_windows: [...item.freeze_windows, { start: "13:00", end: "14:00" }],
        };
      }),
    );
  };

  const handleUpdateFreezeWindow = (
    role: BenchmarkRole,
    index: number,
    edge: "start" | "end",
    value: string,
  ) => {
    setRoleBenchmarks((prev) =>
      prev.map((item) => {
        if (item.role !== role) return item;
        const nextWindows = item.freeze_windows.map((w, idx) =>
          idx === index ? { ...w, [edge]: value } : w,
        );
        return { ...item, freeze_windows: nextWindows };
      }),
    );
  };

  const handleRemoveFreezeWindow = (role: BenchmarkRole, index: number) => {
    setRoleBenchmarks((prev) =>
      prev.map((item) => {
        if (item.role !== role) return item;
        const nextWindows = item.freeze_windows.filter((_, idx) => idx !== index);
        return {
          ...item,
          freeze_windows: nextWindows,
          is_freeze_active: nextWindows.length > 0 ? item.is_freeze_active : false,
        };
      }),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = buildDeliveryBenchmarkPayload(serverRoleBenchmarks, roleBenchmarks);
      const updated = await updateDeliveryBenchmarkSettings(payload, roleBenchmarks);
      setRoleBenchmarks(updated);
      setServerRoleBenchmarks(updated);
      setSaved(true);
      toast.success("MIS Benchmarks saved successfully.");
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save MIS Benchmarks";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset MIS benchmarks and freeze windows to default values?")) return;

    setIsSaving(true);
    try {
      const bulkPayload = {
        benchmarks: DEFAULT_ROLE_BENCHMARKS.map(toRoleBenchmarkPayload),
      };
      const updated = await updateDeliveryBenchmarkSettings(bulkPayload, DEFAULT_ROLE_BENCHMARKS);
      setRoleBenchmarks(updated);
      setServerRoleBenchmarks(updated);
      toast.info("Reset to default operational benchmarks.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset benchmarks";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const totalTargetMinutes =
    benchmarks.picking + benchmarks.packing + benchmarks.packedToDriver + benchmarks.delivery;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-6">
        {/* Main Title & Description */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">MIS Benchmarks</h2>
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </span>
              )}
              {hasUnsavedChanges && !isLoading && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Configure SLA time-freezing windows for picking, packing, and delivery. Time in these
              ranges does NOT count toward SLAs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadBenchmarksFromApi()}
            disabled={isLoading || isSaving}
            title="Refresh benchmarks from server"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Sync</span>
          </button>
        </div>

        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Showing cached benchmarks ({fetchError})</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadBenchmarksFromApi()}
              className="h-7 px-2.5 text-xs font-semibold"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Operational Benchmarks Section */}
        <div className="space-y-4 pt-1">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">Operational Benchmarks</h3>
            <p className="text-xs text-muted-foreground">
              Target times for operational SLA metrics (in minutes).
            </p>
          </div>

          {/* 4 Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {roleBenchmarks.map((item) => {
              const meta = ROLE_META[item.role];
              return (
                <div key={item.role} className="space-y-1.5">
                  <label
                    htmlFor={meta.fieldId}
                    className="text-xs font-semibold text-foreground block"
                  >
                    {meta.inputLabel}
                  </label>
                  <input
                    id={meta.fieldId}
                    type="number"
                    min="1"
                    value={item.benchmark_minutes || ""}
                    onChange={(e) => handleMinutesChange(item.role, e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-card border border-border/80 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 shadow-2xs transition-colors"
                    placeholder={meta.placeholder}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA Freeze Windows per Role */}
        <div className="space-y-3 pt-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Snowflake className="h-4 w-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-foreground">Role Freeze Windows</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Optionally pause SLA clocks during scheduled breaks or cutoffs per operational role.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleBenchmarks.map((item) => {
              const meta = ROLE_META[item.role];
              const Icon = meta.Icon;

              return (
                <div
                  key={item.role}
                  className={cn(
                    "rounded-xl border p-4 space-y-3 transition-colors",
                    item.is_freeze_active
                      ? "border-sky-200 bg-sky-50/20 dark:border-sky-900/50 dark:bg-sky-950/10"
                      : "border-border bg-muted/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4 shrink-0", meta.iconColor)} />
                      <span className="text-xs font-bold text-foreground">{meta.title}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {item.role}
                      </span>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <span>{item.is_freeze_active ? "Freeze On" : "Off"}</span>
                      <Switch
                        checked={item.is_freeze_active}
                        onCheckedChange={(checked) => handleToggleFreeze(item.role, checked)}
                      />
                    </label>
                  </div>

                  {item.is_freeze_active ? (
                    <div className="space-y-2 pt-1">
                      {item.freeze_windows.map((win, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={win.start}
                            onChange={(e) =>
                              handleUpdateFreezeWindow(item.role, idx, "start", e.target.value)
                            }
                            className="h-8.5 flex-1 rounded-lg border border-border bg-card px-2.5 text-xs font-mono font-semibold text-foreground"
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <input
                            type="time"
                            value={win.end}
                            onChange={(e) =>
                              handleUpdateFreezeWindow(item.role, idx, "end", e.target.value)
                            }
                            className="h-8.5 flex-1 rounded-lg border border-border bg-card px-2.5 text-xs font-mono font-semibold text-foreground"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFreezeWindow(item.role, idx)}
                            title="Remove freeze window"
                            className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddFreezeWindow(item.role)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer pt-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Freeze Window</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      No time-freezing break windows active for this stage.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Overview & Flow Visualization */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground">
                  Operational Flow Target Overview
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  Cumulative Target:{" "}
                  <strong className="text-foreground">{formatDuration(totalTargetMinutes)}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={isSaving || isLoading}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer self-end sm:self-auto disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </button>
          </div>

          {/* Step summary pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {roleBenchmarks.map((item) => {
              const meta = ROLE_META[item.role];
              const Icon = meta.Icon;
              return (
                <div
                  key={item.role}
                  className="p-2.5 rounded-lg bg-card border border-border/60 space-y-1"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("h-3.5 w-3.5", meta.iconColor)} />
                      <span>{meta.title}</span>
                    </div>
                    {item.is_freeze_active && item.freeze_windows.length > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-sky-100 px-1 py-0.2 text-[9px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                        title={`${item.freeze_windows.length} freeze window(s)`}
                      >
                        <Snowflake className="h-2.5 w-2.5" />
                        {item.freeze_windows.length}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {item.benchmark_minutes}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      min
                      {item.role === "driver" ? ` (${formatDuration(item.benchmark_minutes)})` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Success Alert Banner */}
        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-4 py-2.5 text-sm text-success font-medium">
            <CheckCircle2 className="h-4 w-4" />
            MIS Benchmarks saved successfully.
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            id="save-benchmarks-btn"
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isLoading}
            className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl bg-gradient-primary text-white text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSaving ? "Saving..." : "Save Benchmarks"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
