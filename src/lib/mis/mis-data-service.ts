/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  MIS Data Service — Mock Adapter                                              ║
 * ║                                                                              ║
 * ║  Extracts SLA events from the existing order lifecycle (MOCK_ORDERS +        ║
 * ║  timeline events) and evaluates them against the Business Time Engine.        ║
 * ║                                                                              ║
 * ║  PRODUCTION SWAP: Replace this adapter's internal logic with real API calls  ║
 * ║  while keeping the same MisDataProvider interface. Zero UI changes needed.   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { MOCK_ORDERS, getEnrichedOrder, type Order, type OrderTimelineEvent } from "@/lib/orders";
import { getSharedOrders } from "@/lib/sync";
import { isDemoMode } from "@/lib/api";
import { evaluateSla, summarizeSla } from "./sla-evaluator";
import { parseOrderDateTime } from "./business-time";
import { DEFAULT_SLA_CONFIG } from "./sla-config";
import type {
  MisDataProvider,
  MisFilters,
  MisOrderMetrics,
  MisSummary,
  SlaSummary,
  GapSummary,
  DelayedOrderEntry,
  SlaEvaluation,
} from "./mis-types";
import type { SlaType } from "./sla-config";

// ─── Timeline Event Extraction ───────────────────────────────────────────────

interface TimelineTimestamps {
  orderCreated: Date | null;
  pickerAssigned: Date | null;
  pickingCompleted: Date | null;
  packerAssigned: Date | null;
  packingCompleted: Date | null;
  driverAssigned: Date | null;
  driverStarted: Date | null;
  delivered: Date | null;
  deliveryFailed: Date | null;
}

/**
 * Extract key SLA timestamps from an order's timeline events.
 */
function extractTimestamps(
  order: Order,
  timeline: OrderTimelineEvent[],
): TimelineTimestamps {
  const result: TimelineTimestamps = {
    orderCreated: null,
    pickerAssigned: null,
    pickingCompleted: null,
    packerAssigned: null,
    packingCompleted: null,
    driverAssigned: null,
    driverStarted: null,
    delivered: null,
    deliveryFailed: null,
  };

  // Order creation time from the order's date + time
  result.orderCreated = parseOrderDateTime(order.date, order.time);

  // Walk the timeline to extract event timestamps
  for (const event of timeline) {
    const eventDate = parseOrderDateTime(event.date, event.time);

    switch (event.type) {
      case "picker_assigned":
        if (!result.pickerAssigned) result.pickerAssigned = eventDate;
        break;
      case "picking_completed":
        if (!result.pickingCompleted) result.pickingCompleted = eventDate;
        break;
      case "packer_assigned":
        if (!result.packerAssigned) result.packerAssigned = eventDate;
        break;
      case "packing_completed":
        if (!result.packingCompleted) result.packingCompleted = eventDate;
        break;
      case "driver_assigned":
        if (!result.driverAssigned) result.driverAssigned = eventDate;
        break;
      case "started":
        if (!result.driverStarted) result.driverStarted = eventDate;
        break;
      case "delivered":
        if (!result.delivered) result.delivered = eventDate;
        break;
      case "delivery_failed":
        if (!result.deliveryFailed) result.deliveryFailed = eventDate;
        break;
    }
  }

  return result;
}

// ─── Warehouse Resolution ────────────────────────────────────────────────────

const WAREHOUSE_MAP: Record<string, { name: string; code: string }> = {
  F01: { name: "Fulfillment Center Hilal", code: "F01" },
  F02: { name: "Main Warehouse - Safety Stock", code: "F02" },
  MWO: { name: "Main Warehouse Outdoor", code: "MWO" },
  VS:  { name: "Virtual Stock", code: "VS" },
};

function resolveWarehouse(order: Order): { name: string; code: string } {
  // Try to get from items
  if (order.itemsList && order.itemsList.length > 0) {
    const fc = order.itemsList[0].fc;
    if (WAREHOUSE_MAP[fc]) return WAREHOUSE_MAP[fc];
  }
  // Default to F01
  return WAREHOUSE_MAP.F01;
}

// ─── Delay Reason Inference ──────────────────────────────────────────────────

function inferDelayReason(
  slaType: SlaType,
  order: Order,
  timestamps: TimelineTimestamps,
): string {
  switch (slaType) {
    case "picking": {
      if (!timestamps.pickerAssigned) return "No picker assigned";
      if (!timestamps.pickingCompleted) return "Picking not completed";
      const tatHours = parseTatHoursLocal(order.tat);
      if (tatHours > 24) return "Order aged > 24h";
      return "Picking exceeded benchmark";
    }
    case "packing": {
      if (!timestamps.packerAssigned) return "No packer assigned";
      if (!timestamps.packingCompleted) return "Packing not completed";
      return "Packing exceeded benchmark";
    }
    case "delivery": {
      if (!timestamps.driverStarted) return "Driver not started";
      if (order.status === "Delivery Failed") return "Delivery attempt failed";
      return "Delivery exceeded benchmark";
    }
    default:
      return "Unknown delay";
  }
}

function parseTatHoursLocal(tat: string): number {
  const hMatch = tat.match(/(\d+)h/);
  const mMatch = tat.match(/(\d+)m/);
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hours + minutes / 60;
}

// ─── Core: Compute Metrics for One Order ─────────────────────────────────────

function computeOrderMetrics(order: Order): MisOrderMetrics | null {
  // Get enriched order with timeline
  const enriched = getEnrichedOrder(order.id);
  if (!enriched) return null;

  const timestamps = extractTimestamps(order, enriched.timeline);
  const warehouse = resolveWarehouse(order);

  // ── Picking SLA ──
  let pickingEval: SlaEvaluation | null = null;
  if (timestamps.orderCreated && timestamps.pickingCompleted) {
    pickingEval = evaluateSla(
      timestamps.orderCreated,
      timestamps.pickingCompleted,
      "picking",
    );
  }

  // ── Packing SLA ──
  let packingEval: SlaEvaluation | null = null;
  if (timestamps.pickingCompleted && timestamps.packingCompleted) {
    packingEval = evaluateSla(
      timestamps.pickingCompleted,
      timestamps.packingCompleted,
      "packing",
    );
  }

  // ── Delivery SLA ──
  // Clock starts ONLY when driver hits "Start Delivery" (not at assignment)
  let deliveryEval: SlaEvaluation | null = null;
  const deliveryEnd = timestamps.delivered || timestamps.deliveryFailed;
  if (timestamps.driverStarted && deliveryEnd) {
    deliveryEval = evaluateSla(
      timestamps.driverStarted,
      deliveryEnd,
      "delivery",
    );
  }

  // ── Operational Gaps ──
  let pickToPackMinutes: number | null = null;
  if (timestamps.pickingCompleted && timestamps.packerAssigned) {
    pickToPackMinutes =
      (timestamps.packerAssigned.getTime() - timestamps.pickingCompleted.getTime()) / (1000 * 60);
  }

  let packToDriverMinutes: number | null = null;
  if (timestamps.packingCompleted && timestamps.driverAssigned) {
    packToDriverMinutes =
      (timestamps.driverAssigned.getTime() - timestamps.packingCompleted.getTime()) / (1000 * 60);
  }

  return {
    orderId: order.id,
    orderDate: order.date,
    warehouse: warehouse.name,
    warehouseCode: warehouse.code,
    picking: pickingEval,
    packing: packingEval,
    delivery: deliveryEval,
    pickerName: order.picker,
    packerName: order.packer,
    driverName: order.driver,
    operationalGaps: {
      pickToPackMinutes,
      packToDriverMinutes,
    },
  };
}

// ─── Filter Orders by Date & Warehouse ───────────────────────────────────────

function getFilteredOrders(filters: MisFilters, customOrders?: Order[]): Order[] {
  let orders: Order[];
  if (customOrders) {
    orders = customOrders;
  } else {
    orders = isDemoMode() ? getSharedOrders() : [];
  }

  return orders.filter((order) => {
    // Skip cancelled, new (no lifecycle events), and installation orders
    if (["Cancelled", "Installation", "PayLater"].includes(order.status)) return false;

    // Warehouse filter
    if (filters.warehouse !== "all") {
      const wh = resolveWarehouse(order);
      if (wh.code !== filters.warehouse) return false;
    }

    // Date filter — normalize order date to ISO format for comparison
    const orderDate = parseOrderDateTime(order.date, order.time);
    const orderDateStr = orderDate.toISOString().split("T")[0];
    if (orderDateStr < filters.dateStart || orderDateStr > filters.dateEnd) return false;

    return true;
  });
}

// ─── MIS Data Provider Implementation ────────────────────────────────────────

class MockMisDataProvider implements MisDataProvider {
  getOrderMetrics(filters: MisFilters, orders?: Order[]): MisOrderMetrics[] {
    const filteredOrders = getFilteredOrders(filters, orders);
    const metrics: MisOrderMetrics[] = [];

    for (const order of filteredOrders) {
      const m = computeOrderMetrics(order);
      if (m) metrics.push(m);
    }

    return metrics;
  }

  getSummary(filters: MisFilters, orders?: Order[]): MisSummary {
    const allMetrics = this.getOrderMetrics(filters, orders);

    // Collect evaluations per SLA type
    const pickingEvals = allMetrics
      .map((m) => m.picking)
      .filter((e): e is SlaEvaluation => e !== null);
    const packingEvals = allMetrics
      .map((m) => m.packing)
      .filter((e): e is SlaEvaluation => e !== null);
    const deliveryEvals = allMetrics
      .map((m) => m.delivery)
      .filter((e): e is SlaEvaluation => e !== null);

    // Summarize
    const pickingSummary = summarizeSla(pickingEvals, "picking");
    const packingSummary = summarizeSla(packingEvals, "packing");
    const deliverySummary = summarizeSla(deliveryEvals, "delivery");

    // Operational gaps
    const pickToPackValues = allMetrics
      .map((m) => m.operationalGaps.pickToPackMinutes)
      .filter((v): v is number => v !== null && v >= 0);
    const packToDriverValues = allMetrics
      .map((m) => m.operationalGaps.packToDriverMinutes)
      .filter((v): v is number => v !== null && v >= 0);

    const gapSummary: GapSummary = {
      pickToPack: {
        avgMinutes: pickToPackValues.length > 0
          ? Math.round((pickToPackValues.reduce((s, v) => s + v, 0) / pickToPackValues.length) * 10) / 10
          : 0,
        maxMinutes: pickToPackValues.length > 0
          ? Math.round(Math.max(...pickToPackValues) * 10) / 10
          : 0,
        count: pickToPackValues.length,
      },
      packToDriver: {
        avgMinutes: packToDriverValues.length > 0
          ? Math.round((packToDriverValues.reduce((s, v) => s + v, 0) / packToDriverValues.length) * 10) / 10
          : 0,
        maxMinutes: packToDriverValues.length > 0
          ? Math.round(Math.max(...packToDriverValues) * 10) / 10
          : 0,
        count: packToDriverValues.length,
      },
    };

    return {
      picking: pickingSummary,
      packing: packingSummary,
      delivery: deliverySummary,
      operationalGaps: gapSummary,
      totalOrders: allMetrics.length,
      dateRange: { start: filters.dateStart, end: filters.dateEnd },
      warehouseFilter: filters.warehouse,
    };
  }

  getDelayedOrders(filters: MisFilters, slaType: SlaType, orders?: Order[]): DelayedOrderEntry[] {
    const allMetrics = this.getOrderMetrics(filters, orders);
    const delayed: DelayedOrderEntry[] = [];

    for (const m of allMetrics) {
      const eval_ = m[slaType];
      if (!eval_ || eval_.status !== "FAIL") continue;

      const assignedTo =
        slaType === "picking"
          ? m.pickerName || "—"
          : slaType === "packing"
            ? m.packerName || "—"
            : m.driverName || "—";

      // Get original order for delay reason inference
      let originalOrders: Order[];
      if (orders) {
        originalOrders = orders;
      } else {
        try { originalOrders = isDemoMode() ? getSharedOrders() : []; } catch { originalOrders = []; }
      }
      const order = originalOrders.find((o) => o.id === m.orderId);
      const enriched = order ? getEnrichedOrder(order.id) : null;
      const timestamps = order && enriched
        ? extractTimestamps(order, enriched.timeline)
        : null;

      delayed.push({
        orderId: m.orderId,
        slaType,
        warehouse: m.warehouse,
        warehouseCode: m.warehouseCode,
        assignedTo,
        actualDurationMinutes: eval_.actualDurationMinutes,
        businessDurationMinutes: eval_.businessDurationMinutes,
        benchmarkMinutes: eval_.benchmarkMinutes,
        overshootFactor: eval_.overshootFactor,
        delayMinutes: eval_.delayMinutes,
        delayReason: order && timestamps
          ? inferDelayReason(slaType, order, timestamps)
          : "Unknown",
        status: "FAIL",
      });
    }

    // Sort by overshoot factor descending
    delayed.sort((a, b) => b.overshootFactor - a.overshootFactor);

    return delayed;
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

/** The MIS data provider instance. In production, swap this with a live API adapter. */
export const misDataProvider: MisDataProvider = new MockMisDataProvider();
