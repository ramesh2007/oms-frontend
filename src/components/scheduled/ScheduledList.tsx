import { Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScheduledRow } from "./ScheduledRow";
import type { ScheduledItem } from "@/lib/scheduled-installations";

export interface ScheduledListProps {
  items: ScheduledItem[];
  selectedIds: Set<string>;
  activeTab: "Pending" | "Assigned";
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRemoveItem: (item: ScheduledItem) => void;
  onViewOrder: (orderId: string) => void;
  formatTime: (iso: string) => string;
}

export function ScheduledList({
  items,
  selectedIds,
  activeTab,
  onToggleSelect,
  onToggleSelectAll,
  onRemoveItem,
  onViewOrder,
  formatTime,
}: ScheduledListProps) {
  const allVisibleSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someVisibleSelected = items.some((i) => selectedIds.has(i.id)) && !allVisibleSelected;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-[48px_2.5fr_1fr_1.5fr_1.2fr_1.2fr_2fr] items-center gap-4 border-b border-slate-100 dark:border-slate-800 bg-[#f8f9fa] dark:bg-slate-800/30 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <div className="flex items-center justify-center">
          <Checkbox
            checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
            onCheckedChange={onToggleSelectAll}
            className="h-5 w-5 rounded-[6px] border border-slate-300 dark:border-slate-600 focus-visible:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>
        <div>Product</div>
        <div>Order</div>
        <div>Customer</div>
        <div>Status</div>
        <div>Scheduled At</div>
        <div className="text-right">Actions</div>
      </div>

      {/* Table Body */}
      {items.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
          <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">No installations found</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            {activeTab === "Pending"
              ? "Schedule installations from the order details page."
              : "No assigned installations yet."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {items.map((item) => (
            <ScheduledRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              onToggle={() => onToggleSelect(item.id)}
              onRemove={() => onRemoveItem(item)}
              onViewOrder={() => onViewOrder(item.orderId)}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}
