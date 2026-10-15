import { CheckCircle2, Clock, Calendar, Package, Truck, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScheduledRow } from "./ScheduledRow";
import { formatDisplayDate, type ScheduledItem, type ScheduledTabType } from "@/lib/scheduled-installations";

export interface ScheduledListProps {
  items: ScheduledItem[];
  selectedIds: Set<string>;
  activeTab: ScheduledTabType;
  selectedDate?: string | null;
  todayStr?: string;
  onResetToToday?: () => void;
  onShowAllDates?: () => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRemoveItem: (item: ScheduledItem) => void;
  onViewOrder: (orderId: string) => void;
  onAssignDriver?: (item: ScheduledItem) => void;
  onCompleteInstallation?: (item: ScheduledItem) => void;
  onUploadPhotos?: (item: ScheduledItem) => void;
  onPreviewImage?: (imageUrl: string) => void;
  formatTime: (iso: string) => string;
}

export function ScheduledList({
  items,
  selectedIds,
  activeTab,
  selectedDate,
  todayStr,
  onResetToToday,
  onShowAllDates,
  onToggleSelect,
  onToggleSelectAll,
  onRemoveItem,
  onViewOrder,
  onAssignDriver,
  onCompleteInstallation,
  onUploadPhotos,
  onPreviewImage,
  formatTime,
}: ScheduledListProps) {
  const allVisibleSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someVisibleSelected = items.some((i) => selectedIds.has(i.id)) && !allVisibleSelected;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      {/* Table Header (Desktop) */}
      <div className="hidden lg:grid lg:grid-cols-[44px_2.3fr_1fr_1.6fr_2fr_1.8fr_auto] items-center gap-4 border-b border-slate-100 dark:border-slate-800 bg-[#f8f9fa] dark:bg-slate-800/40 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
        <div>Customer Time & Tech</div>
        <div>
          {activeTab === "Completed" ? "Status & Proof Photos" : "Status & Assignment"}
        </div>
        <div className="text-right">Actions</div>
      </div>

      {/* Table Body */}
      {items.length === 0 ? (
        <div className="px-6 py-16 text-center">
          {activeTab === "Scheduled" && (
            <>
              <Clock className="mx-auto h-12 w-12 text-amber-400/80 dark:text-amber-500/60" />
              {selectedDate ? (
                <>
                  <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
                    No installations scheduled for {formatDisplayDate(selectedDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                    There are no technician installations scheduled on this date. You can choose another date or view all scheduled items.
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-2.5">
                    {selectedDate !== todayStr && onResetToToday && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onResetToToday}
                        className="h-8.5 rounded-xl border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Back to Today
                      </Button>
                    )}
                    {onShowAllDates && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onShowAllDates}
                        className="h-8.5 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        View All Dates
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
                    No scheduled installations found
                  </p>
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                    Items scheduled with customer appointment dates from Customer Care will appear here ready to be assigned to drivers.
                  </p>
                </>
              )}
            </>
          )}

          {activeTab === "Driver Assigned" && (
            <>
              <Truck className="mx-auto h-12 w-12 text-blue-400/80 dark:text-blue-500/60" />
              {selectedDate ? (
                <>
                  <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
                    No driver-assigned installations for {formatDisplayDate(selectedDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                    No installations are currently assigned to drivers on this scheduled date.
                  </p>
                  {onShowAllDates && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onShowAllDates}
                        className="h-8.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        View All Dates
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
                    No driver-assigned installations
                  </p>
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                    Select items in the "Scheduled" tab and click "Assign Driver" to assign drivers and dispatch them.
                  </p>
                </>
              )}
            </>
          )}

          {activeTab === "Completed" && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400/80 dark:text-emerald-500/60" />
              {selectedDate ? (
                <>
                  <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
                    No completed installations for {formatDisplayDate(selectedDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                    No installations have been marked as completed for this scheduled date.
                  </p>
                  {onShowAllDates && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onShowAllDates}
                        className="h-8.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        View All Dates
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
                    No completed installations yet
                  </p>
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                    Once drivers/technicians finish an installation, their status, completion timestamp, and uploaded proof photos will appear here.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {items.map((item) => (
            <ScheduledRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              activeTab={activeTab}
              onToggle={() => onToggleSelect(item.id)}
              onRemove={() => onRemoveItem(item)}
              onViewOrder={() => onViewOrder(item.orderId)}
              onAssignDriver={() => onAssignDriver?.(item)}
              onCompleteInstallation={() => onCompleteInstallation?.(item)}
              onUploadPhotos={() => onUploadPhotos?.(item)}
              onPreviewImage={onPreviewImage}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}
