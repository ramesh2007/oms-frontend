import { ExternalLink, Truck, User, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ScheduledItem } from "@/lib/scheduled-installations";

export interface ScheduledRowProps {
  item: ScheduledItem;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onViewOrder: () => void;
  formatTime: (iso: string) => string;
}

export function ScheduledRow({
  item,
  selected,
  onToggle,
  onRemove,
  onViewOrder,
  formatTime,
}: ScheduledRowProps) {
  return (
    <>
      {/* Desktop Row */}
      <div
        className={cn(
          "hidden md:grid md:grid-cols-[48px_2.5fr_1fr_1.5fr_1.2fr_1.2fr_2fr] items-center gap-4 px-6 py-[18px] transition-colors",
          selected ? "bg-slate-50 dark:bg-slate-800/40" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
        )}
      >
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="h-5 w-5 rounded-[6px] border border-slate-300 dark:border-slate-600 focus-visible:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>

        {/* Product */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-muted/20">
            <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{item.productName}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">SKU: {item.sku}</span>
              {item.installationMethod && (
                <span className="inline-flex items-center rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                  {item.installationMethod}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Order */}
        <div>
          <button
            type="button"
            onClick={onViewOrder}
            className="inline-flex items-center rounded-md border border-[#c6f6d5] dark:border-emerald-950 bg-[#e6f9f0] dark:bg-emerald-950/20 px-2.5 py-1 text-xs font-bold text-[#107c41] dark:text-emerald-400 transition-colors hover:bg-[#d4f5e2] hover:border-[#a3f0be] cursor-pointer"
          >
            #{item.orderId.replace("HM", "")}
          </button>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 min-w-0">
          <User className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="font-medium truncate">{item.customerName}</span>
        </div>

        {/* Status */}
        <div>
          {item.status === "Assigned" ? (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center w-fit rounded-full border border-blue-200 dark:border-blue-950 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Assigned
              </span>
              {item.assignedDriver && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  <Truck className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>{item.assignedDriver}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center rounded-full border border-[#fde68a] dark:border-amber-950 bg-[#fffbeb] dark:bg-amber-950/20 px-3 py-1 text-[11px] font-bold text-[#b45405] dark:text-amber-400 uppercase tracking-wider">
              Scheduled
            </span>
          )}
        </div>

        {/* Scheduled At */}
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {formatTime(item.scheduledAt)}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onViewOrder}
            className="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            View Order
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="grid h-8 w-8 place-items-center rounded-lg text-[#e3292b] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            aria-label="Remove scheduled installation"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Mobile Card */}
      <div
        className={cn(
          "md:hidden p-4 transition-colors border-b border-slate-100 dark:border-slate-800/50",
          selected ? "bg-slate-50 dark:bg-slate-800/40" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
        )}
      >
        <div className="flex items-start gap-3.5">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="mt-1 h-5 w-5 rounded-[6px] border border-slate-300 dark:border-slate-600 focus-visible:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-muted/20">
            <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{item.productName}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">SKU: {item.sku}</span>
                {item.installationMethod && (
                  <span className="inline-flex items-center rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                    {item.installationMethod}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onViewOrder}
                className="inline-flex items-center rounded-md border border-[#c6f6d5] dark:border-emerald-950 bg-[#e6f9f0] dark:bg-emerald-950/20 px-2.5 py-1 text-xs font-bold text-[#107c41] dark:text-emerald-400 transition-colors hover:bg-[#d4f5e2] hover:border-[#a3f0be] cursor-pointer"
              >
                #{item.orderId.replace("HM", "")}
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="font-semibold">{item.customerName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/40 pt-2.5">
              <div className="flex items-center gap-3">
                {item.status === "Assigned" ? (
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center w-fit rounded-full border border-blue-200 dark:border-blue-950 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Assigned
                    </span>
                    {item.assignedDriver && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        <Truck className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{item.assignedDriver}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-[#fde68a] dark:border-amber-950 bg-[#fffbeb] dark:bg-amber-950/20 px-2.5 py-0.5 text-[10px] font-bold text-[#b45405] dark:text-amber-400 uppercase tracking-wider">
                    Scheduled
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold self-center">
                  {formatTime(item.scheduledAt)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onViewOrder}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="text-xs font-bold text-[#e3292b] hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
