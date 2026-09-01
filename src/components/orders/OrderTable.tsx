import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order, LegacyTabId } from "@/lib/orders";
import { OrderTableRow } from "./OrderTableRow";

/** Determine which dynamic column to show based on the active tab */
function getDynamicColumn(activeTab: LegacyTabId): "driver" | "picker" | "packer" | null {
  switch (activeTab) {
    case "Unfulfilled":
    case "In Delivery":
    case "Delivered":
    case "Delivery Failed":
    case "Installation":
    case "All":
      return "driver";
    case "Ready to Assign":
      return "packer";
    default:
      return null;
  }
}

export function OrderTable({
  orders,
  selectedIds,
  onSelect,
  onSelectAllVisible,
  allVisibleSelected,
  someVisibleSelected,
  expandedId,
  onExpandedChange,
  onViewOrder,
  loading,
  activeTab,
  sortColumn,
  sortDirection,
  onSort,
}: {
  orders: Order[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAllVisible: (select: boolean) => void;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  expandedId: string | null;
  onExpandedChange: (id: string | null) => void;
  onViewOrder: (order: Order) => void;
  loading: boolean;
  activeTab?: LegacyTabId;
  sortColumn?: "id" | "date" | "customer" | "tat" | "total" | null;
  sortDirection?: "asc" | "desc";
  onSort?: (col: "id" | "date" | "customer" | "tat" | "total") => void;
}) {
  const dynamicCol = getDynamicColumn(activeTab ?? "All");

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3 max-w-xs" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const dynamicLabel = dynamicCol === "driver" ? "Driver" : dynamicCol === "picker" ? "Picker" : dynamicCol === "packer" ? "Packer" : null;
  const isPickingOrPicked = activeTab === "Picking" || activeTab === "Picked";
  const isPacking = activeTab === "Packing";

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[1200px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="w-12 py-3 pl-3 pr-0">
              <div className="flex min-h-11 min-w-11 items-center justify-center">
                <Checkbox
                  checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => onSelectAllVisible(v === true)}
                  aria-label="Select all visible orders"
                />
              </div>
            </th>
            <th className="py-3 pr-3 font-semibold">
              <button
                onClick={() => onSort?.("id")}
                className="flex items-center gap-1 hover:text-foreground font-semibold uppercase tracking-wide focus:outline-none"
              >
                Order
                <span className="text-muted-foreground/50 text-[10px]">
                  {sortColumn === "id" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            </th>
            <th className="py-3 pr-3 font-semibold">
              <button
                onClick={() => onSort?.("date")}
                className="flex items-center gap-1 hover:text-foreground font-semibold uppercase tracking-wide focus:outline-none"
              >
                Date & Time
                <span className="text-muted-foreground/50 text-[10px]">
                  {sortColumn === "date" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            </th>
            <th className="py-3 pr-3 font-semibold">
              <button
                onClick={() => onSort?.("tat")}
                className="flex items-center gap-1 hover:text-foreground font-semibold uppercase tracking-wide focus:outline-none"
              >
                TAT
                <span className="text-muted-foreground/50 text-[10px]">
                  {sortColumn === "tat" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            </th>
            <th className="py-3 pr-3 font-semibold">
              <button
                onClick={() => onSort?.("customer")}
                className="flex items-center gap-1 hover:text-foreground font-semibold uppercase tracking-wide focus:outline-none"
              >
                Customer
                <span className="text-muted-foreground/50 text-[10px]">
                  {sortColumn === "customer" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            </th>
            {!isPickingOrPicked && !isPacking && (
              <th className="py-3 pr-3 font-semibold">Channel</th>
            )}
            <th className="py-3 pr-3 font-semibold">Items</th>
            {!isPickingOrPicked && !isPacking && activeTab !== "Ready to Assign" && (
              <th className="py-3 pr-3 font-semibold">Returns</th>
            )}
            {isPickingOrPicked && (
              <>
                <th className="py-3 pr-3 font-semibold">Picking Status</th>
                <th className="py-3 pr-3 font-semibold">Picker</th>
              </>
            )}
            {isPacking && (
              <>
                <th className="py-3 pr-3 font-semibold">Packing Status</th>
                <th className="py-3 pr-3 font-semibold">Assigned Packer</th>
                <th className="py-3 pr-3 font-semibold">Bags</th>
              </>
            )}
            {!isPacking && !isPickingOrPicked && (
              <th className="py-3 pr-3 font-semibold">City</th>
            )}
            {!isPickingOrPicked && !isPacking && (
              <th className="py-3 pr-3 font-semibold">Coordinator</th>
            )}
            {dynamicLabel && (
              <th className="py-3 pr-3 font-semibold">{dynamicLabel}</th>
            )}
            {!isPacking && !isPickingOrPicked && (
              <th className="py-3 pr-3 font-semibold">
                <button
                  onClick={() => onSort?.("total")}
                  className="flex items-center gap-1 hover:text-foreground font-semibold uppercase tracking-wide focus:outline-none"
                >
                  Total
                  <span className="text-muted-foreground/50 text-[10px]">
                    {sortColumn === "total" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </button>
              </th>
            )}
            <th className="py-3 pr-3 font-semibold">Actions</th>
            {!isPacking && !isPickingOrPicked && (
              <th className="py-3 pr-3 font-semibold">Shopify Status</th>
            )}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderTableRow
              key={order.id}
              order={order}
              selected={selectedIds.has(order.id)}
              onSelectChange={(sel) => onSelect(order.id, sel)}
              expanded={expandedId === order.id}
              onToggleExpand={() =>
                onExpandedChange(expandedId === order.id ? null : order.id)
              }
              onViewOrder={onViewOrder}
              dynamicCol={dynamicCol}
              activeTab={activeTab}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
