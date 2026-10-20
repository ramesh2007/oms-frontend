import { cn } from "@/lib/utils";

export type OrderStatus =
  | "new"
  | "picked"
  | "packed"
  | "ready"
  | "out"
  | "delivered"
  | "failed"
  // Full status names from lib/orders.ts
  | "New"
  | "Unfulfilled"
  | "Picking"
  | "Picked"
  | "Packing"
  | "Ready to Assign"
  | "Driver Accepted"
  | "Started"
  | "Delivered"
  | "Delivery Failed"
  | "Flagged"
  | "Cancelled"
  | "Replacement"
  | "Exchange"
  | "Installation";

const config: Record<string, { label: string; varName: string }> = {
  // Short keys (legacy dashboard table)
  new: { label: "New", varName: "--status-new" },
  picked: { label: "Picked", varName: "--status-picked" },
  packed: { label: "Packing", varName: "--status-packed" },
  ready: { label: "Ready to Assign", varName: "--status-ready" },
  out: { label: "Out for Delivery", varName: "--status-out" },
  delivered: { label: "Delivered", varName: "--status-delivered" },
  failed: { label: "Failed", varName: "--status-failed" },
  // Full status names
  New: { label: "New", varName: "--status-new" },
  Unfulfilled: { label: "Unfulfilled", varName: "--status-new" },
  Picking: { label: "Picking", varName: "--status-picked" },
  Picked: { label: "Picked", varName: "--status-picked" },
  Packing: { label: "Packing", varName: "--status-packed" },
  "Ready to Assign": { label: "Ready to Assign", varName: "--status-ready" },
  "Driver Accepted": { label: "Driver Accepted", varName: "--status-out" },
  assigned_to_driver: { label: "Driver Accepted", varName: "--status-out" },
  partial_assigned_driver: { label: "Driver Accepted", varName: "--status-out" },
  "In Delivery": { label: "Out for Delivery", varName: "--status-out" },
  Started: { label: "Out for Delivery", varName: "--status-out" },
  Delivered: { label: "Delivered", varName: "--status-delivered" },
  "Delivery Failed": { label: "Failed", varName: "--status-failed" },
  Flagged: { label: "Flagged", varName: "--status-failed" },
  Cancelled: { label: "Cancelled", varName: "--status-failed" },
  Replacement: { label: "Replacement", varName: "--status-packed" },
  Exchange: { label: "Exchange", varName: "--status-packed" },
  Installation: { label: "Installation", varName: "--status-delivered" },
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const c = config[status] ?? { label: String(status), varName: "--status-new" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 h-6 rounded-md text-[11px] font-semibold whitespace-nowrap",
        className,
      )}
      style={{
        color: `var(${c.varName})`,
        backgroundColor: `color-mix(in oklab, var(${c.varName}) 12%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `var(${c.varName})` }} />
      {c.label}
    </span>
  );
}
