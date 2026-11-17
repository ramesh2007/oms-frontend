/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  MIS Types — TypeScript Interfaces for the MIS Benchmarks Module             ║
 * ║                                                                              ║
 * ║  All MIS-specific types live here so they can be imported by:                ║
 * ║    • The SLA engine (business-time, sla-evaluator)                           ║
 * ║    • The data service (mis-data-service)                                     ║
 * ║    • The dashboard UI (mis-benchmarks route)                                 ║
 * ║    • Future MIS modules                                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Order } from "@/lib/orders";
import type { SlaType } from "./sla-config";

// ─── Time Span ───────────────────────────────────────────────────────────────

/** A contiguous period of time classified as active or frozen. */
export interface TimeSpan {
  start: Date;
  end: Date;
  type: "active" | "frozen";
  /** Why this span is frozen (for debugging/reporting). */
  reason?: string;
}

// ─── Business Duration ───────────────────────────────────────────────────────

/** Result of a business-time calculation. */
export interface BusinessDurationResult {
  /** Total wall-clock minutes between start and end. */
  rawDurationMinutes: number;
  /** Minutes of actual business time (frozen periods removed). */
  businessDurationMinutes: number;
  /** Total minutes that were frozen/excluded. */
  frozenMinutes: number;
  /** Breakdown of active vs frozen periods. */
  spans: TimeSpan[];
}

// ─── SLA Evaluation ──────────────────────────────────────────────────────────

/** The result of evaluating one order against one SLA benchmark. */
export interface SlaEvaluation {
  /** Raw wall-clock duration in minutes. */
  actualDurationMinutes: number;
  /** Business-hours-adjusted duration in minutes. */
  businessDurationMinutes: number;
  /** The SLA benchmark target in minutes. */
  benchmarkMinutes: number;
  /** Whether the order met the SLA. */
  status: "PASS" | "FAIL";
  /** Minutes of delay beyond the benchmark (0 if passed). */
  delayMinutes: number;
  /** How many times over the benchmark (e.g. 7.94 means "7.94x"). */
  overshootFactor: number;
  /** Percentage over the benchmark (e.g. 694 means "694%"). */
  overshootPercent: number;
  /** Start timestamp of the SLA window. */
  startTime: Date;
  /** End timestamp of the SLA window. */
  endTime: Date;
}

// ─── Order Metrics ───────────────────────────────────────────────────────────

/** Complete MIS metrics for a single order. */
export interface MisOrderMetrics {
  orderId: string;
  orderDate: string;
  warehouse: string;
  warehouseCode: string;
  picking: SlaEvaluation | null;
  packing: SlaEvaluation | null;
  delivery: SlaEvaluation | null;
  pickerName: string | null;
  packerName: string | null;
  driverName: string | null;
  /** Operational gap durations (in minutes). */
  operationalGaps: {
    /** Minutes between Picking Completed and Packing Started. */
    pickToPackMinutes: number | null;
    /** Minutes between Packing Completed and Driver Assignment. */
    packToDriverMinutes: number | null;
  };
}

// ─── Summary / Aggregate Types ───────────────────────────────────────────────

/** Aggregated SLA summary for one SLA type across many orders. */
export interface SlaSummary {
  totalOrders: number;
  metCount: number;
  missedCount: number;
  metPercent: number;
  avgDurationMinutes: number;
  benchmarkMinutes: number;
  /** Trend: positive means improvement vs previous period. */
  trendPercent: number | null;
}

/** Operational gap summary across many orders. */
export interface GapSummary {
  pickToPack: {
    avgMinutes: number;
    maxMinutes: number;
    count: number;
  };
  packToDriver: {
    avgMinutes: number;
    maxMinutes: number;
    count: number;
  };
}

/** Top-level MIS summary for the dashboard. */
export interface MisSummary {
  picking: SlaSummary;
  packing: SlaSummary;
  delivery: SlaSummary;
  packedToDriver: SlaSummary;
  operationalGaps: GapSummary;
  /** Total unique orders evaluated. */
  totalOrders: number;
  /** Date range covered. */
  dateRange: { start: string; end: string };
  /** Warehouse filter applied ("all" or a specific code). */
  warehouseFilter: string;
}

// ─── Delayed Order Entry ─────────────────────────────────────────────────────

/** A single delayed order row for the Delayed Orders table. */
export interface DelayedOrderEntry {
  orderId: string;
  slaType: SlaType | "packedToDriver";
  warehouse: string;
  warehouseCode: string;
  assignedTo: string;
  actualDurationMinutes: number;
  businessDurationMinutes: number;
  benchmarkMinutes: number;
  overshootFactor: number;
  delayMinutes: number;
  /** Inferred reason for the delay, if determinable. */
  delayReason: string;
  status: "FAIL";
}

// ─── Data Provider Interface ─────────────────────────────────────────────────

/** Interface for the MIS data provider (mock or production). */
export interface MisDataProvider {
  /** Get MIS metrics for all qualifying orders within filters. */
  getOrderMetrics(filters: MisFilters, orders?: Order[]): MisOrderMetrics[];
  /** Get aggregated summary. */
  getSummary(filters: MisFilters, orders?: Order[]): MisSummary;
  /** Get delayed orders for a specific SLA type. */
  getDelayedOrders(
    filters: MisFilters,
    slaType: SlaType | "packedToDriver",
    orders?: Order[],
  ): DelayedOrderEntry[];
}

/** Filters applied to MIS queries. */
export interface MisFilters {
  dateStart: string; // ISO date "YYYY-MM-DD"
  dateEnd: string; // ISO date "YYYY-MM-DD"
  warehouse: string; // "all" or warehouse code (e.g. "F01")
}
