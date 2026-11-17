import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageIcon,
  Phone,
  Truck,
  Upload,
  User,
  Wrench,
  X,
  UserPlus,
  PackageCheck,
  Package,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ScheduledItem, ScheduledTabType } from "@/lib/scheduled-installations";

export interface ScheduledRowProps {
  item: ScheduledItem;
  selected: boolean;
  activeTab: ScheduledTabType;
  onToggle: () => void;
  onRemove: () => void;
  onViewOrder: () => void;
  onConfirmSchedule?: () => void;
  onMarkPicked?: () => void;
  onTechnicianReceive?: () => void;
  onAssignDriver?: () => void;
  onCompleteInstallation?: () => void;
  onUploadPhotos?: () => void;
  onPreviewImage?: (imageUrl: string) => void;
  formatTime: (iso: string) => string;
}

export function ScheduledRow({
  item,
  selected,
  activeTab,
  onToggle,
  onRemove,
  onViewOrder,
  onConfirmSchedule,
  onMarkPicked,
  onTechnicianReceive,
  onAssignDriver,
  onCompleteInstallation,
  onUploadPhotos,
  onPreviewImage,
  formatTime,
}: ScheduledRowProps) {
  const displayOrderNum =
    item.orderNumber ||
    (item.orderId.startsWith("#") ? item.orderId : `#${item.orderId.replace(/^HM/i, "")}`);

  const hasPhotos = Array.isArray(item.images) && item.images.length > 0;

  return (
    <>
      {/* Desktop Row */}
      <div
        className={cn(
          "hidden lg:grid lg:grid-cols-[44px_2.3fr_1fr_1.6fr_2fr_1.8fr_auto] items-center gap-4 px-6 py-[18px] transition-colors",
          selected
            ? "bg-primary/[0.04] dark:bg-primary/[0.08]"
            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/20",
        )}
      >
        {/* 1. Selection Checkbox */}
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="h-5 w-5 rounded-[6px] border border-slate-300 dark:border-slate-600 focus-visible:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>

        {/* 2. Product */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-800 bg-muted/20">
            <img
              src={item.image}
              alt={item.productName}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
              loading="lazy"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
              {item.productName}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.sku && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  SKU: {item.sku}
                </span>
              )}
              {item.lineItemId && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Item #{item.lineItemId}
                </span>
              )}
              {item.installationMethod && (
                <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                  {item.installationMethod}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Order */}
        <div>
          <button
            type="button"
            onClick={onViewOrder}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-950 bg-emerald-50/80 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-950/50 cursor-pointer shadow-2xs"
            title="Open Order Details"
          >
            <span>{displayOrderNum}</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </button>
        </div>

        {/* 4. Customer */}
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{item.customerName}</span>
          </div>
          {item.customerPhone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
              <span>{item.customerPhone}</span>
            </div>
          )}
          {item.address && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate" title={item.address}>
              {item.address}
            </p>
          )}
        </div>

        {/* 5. Customer Scheduled Time & Technician */}
        <div className="min-w-0 space-y-1.5">
          {/* Customer scheduled date & time */}
          <div className="flex flex-col gap-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                {item.scheduledDate ? item.scheduledDate : formatTime(item.scheduledAt).split(" ")[0]}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {item.scheduledTimeRange || (item.startTime ? `${item.startTime} - ${item.endTime || ""}` : formatTime(item.scheduledAt))}
              </span>
            </div>
          </div>

          {/* Technician assigned */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
            <Wrench className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            <span>Tech: {item.technicianName || "Assigned"}</span>
          </div>
        </div>

        {/* 6. Status, Driver & Uploaded Photos */}
        <div className="min-w-0 space-y-1.5">
          {activeTab === "Pending Scheduled" && (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center w-fit gap-1 rounded-full border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                <Clock className="h-3 w-3 shrink-0" />
                Installation Pending (Scheduled Items)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {item.technicianName ? `Tech: ${item.technicianName}` : "Awaiting schedule confirmation"}
              </span>
            </div>
          )}

          {activeTab === "Scheduled" && (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {item.orderItemStatus === "picker_assigned" ? (
                  <span className="inline-flex items-center w-fit gap-1 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    <User className="h-3 w-3" />
                    Picker Assigned
                  </span>
                ) : item.orderItemStatus === "picking" ? (
                  <span className="inline-flex items-center w-fit gap-1 rounded-full border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    <Package className="h-3 w-3" />
                    Picking
                  </span>
                ) : (
                  <span className="inline-flex items-center w-fit gap-1 rounded-full border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    <Clock className="h-3 w-3" />
                    {item.orderItemStatus ? item.orderItemStatus.toUpperCase() : "PENDING"}
                  </span>
                )}

                {item.isRescheduled && (
                  <span
                    className="inline-flex items-center w-fit gap-1 rounded-full border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider"
                    title={item.latestRescheduleReason ? `Reason: ${item.latestRescheduleReason}` : "Rescheduled installation"}
                  >
                    Rescheduled {item.rescheduleCount && item.rescheduleCount > 1 ? `(${item.rescheduleCount}x)` : ""}
                  </span>
                )}
              </div>

              {item.latestRescheduleReason ? (
                <span
                  className="text-[11px] text-orange-600 dark:text-orange-400 font-medium truncate max-w-[180px]"
                  title={item.latestRescheduleReason}
                >
                  {item.latestRescheduleReason}
                </span>
              ) : item.orderItemStatus === "picker_assigned" ? (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {item.pickerName ? `Assigned to ${item.pickerName}` : "Picker assigned in warehouse"}
                </span>
              ) : item.orderItemStatus === "picking" ? (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Picking in progress
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Awaiting warehouse picker
                </span>
              )}
            </div>
          )}

          {activeTab === "Main Warehouse Picked" && (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center w-fit gap-1 rounded-full border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                <PackageCheck className="h-3 w-3" />
                Main Warehouse Picked
              </span>
              <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {item.pickerName || "Picked in Warehouse"}
                </span>
                {item.pickedAt && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Picked: {formatTime(item.pickedAt)}
                  </span>
                )}
              </div>
            </div>
          )}

          {(activeTab === "Technician Received" || activeTab === "Driver Assigned") && (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center w-fit gap-1 rounded-full border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                <Wrench className="h-3 w-3" />
                Technician Received
              </span>
              <div className="flex flex-col gap-0.5 text-xs text-slate-700 dark:text-slate-200 font-bold">
                <div className="flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>{item.technicianName || item.assignedDriver || "In Progress"}</span>
                </div>
                {item.technicianReceivedAt && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Received: {formatTime(item.technicianReceivedAt)}
                  </span>
                )}
              </div>
            </div>
          )}

          {activeTab === "Completed" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center w-fit gap-1 rounded-full border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </span>
                {item.assignedDriver && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    by {item.assignedDriver}
                  </span>
                )}
              </div>

              {item.completedAt && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Finished: {formatTime(item.completedAt)}
                </span>
              )}

              {/* Uploaded installation proof images preview */}
              {hasPhotos ? (
                <div className="flex items-center gap-1.5 pt-0.5">
                  {item.images!.slice(0, 3).map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onPreviewImage?.(imgUrl)}
                      className="group relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-emerald-300/80 dark:border-emerald-700 bg-black/5 hover:border-emerald-500 transition-all cursor-pointer shadow-2xs hover:scale-105"
                      title="Click to view full image"
                    >
                      <img src={imgUrl} alt="Installation photo" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                  {item.images!.length > 3 && (
                    <button
                      type="button"
                      onClick={() => onPreviewImage?.(item.images![0])}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer"
                    >
                      +{item.images!.length - 3}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onUploadPhotos}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer"
                >
                  <Upload className="h-3 w-3" />
                  Attach Photos
                </button>
              )}
            </div>
          )}
        </div>

        {/* 7. Action Buttons */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {activeTab === "Pending Scheduled" && (
            <button
              type="button"
              onClick={onConfirmSchedule}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 transition-colors cursor-pointer shadow-2xs"
              title="Confirm schedule and move to Scheduled tab"
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </button>
          )}

          {activeTab === "Scheduled" && (
            <button
              type="button"
              onClick={onMarkPicked}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs",
                item.orderItemStatus === "picker_assigned"
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                  : item.orderItemStatus === "picking"
                    ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                    : item.orderItemStatus === "picked"
                      ? "border-sky-300 dark:border-sky-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-950/60 text-sky-700 dark:text-sky-300"
                      : "border-amber-300 dark:border-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-300",
              )}
              title={
                item.lineItemId
                  ? `Line Item #${item.lineItemId} status in order_items table: ${item.orderItemStatus || "pending"}`
                  : `Line item status in order_items table: ${item.orderItemStatus || "pending"}`
              }
            >
              {item.orderItemStatus === "picker_assigned" ? (
                <>
                  <User className="h-3.5 w-3.5" />
                  Picker Assigned
                </>
              ) : item.orderItemStatus === "picking" ? (
                <>
                  <Package className="h-3.5 w-3.5" />
                  Picking
                </>
              ) : item.orderItemStatus === "picked" ? (
                <>
                  <PackageCheck className="h-3.5 w-3.5" />
                  Picked
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  {item.orderItemStatus ? item.orderItemStatus.toUpperCase() : "PENDING"}
                </>
              )}
            </button>
          )}

          {activeTab === "Main Warehouse Picked" && (
            <button
              type="button"
              onClick={onTechnicianReceive}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer shadow-2xs"
            >
              <Wrench className="h-3.5 w-3.5" />
              Tech Received
            </button>
          )}

          {(activeTab === "Technician Received" || activeTab === "Driver Assigned") && (
            <>
              <button
                type="button"
                onClick={onCompleteInstallation}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </button>
              {onAssignDriver && (
                <button
                  type="button"
                  onClick={onAssignDriver}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Change technician/driver"
                >
                  <Wrench className="h-3.5 w-3.5 text-indigo-500" />
                </button>
              )}
            </>
          )}

          {activeTab === "Completed" && (
            <button
              type="button"
              onClick={onUploadPhotos}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              {hasPhotos ? "Add Photos" : "Upload Photos"}
            </button>
          )}

          <button
            type="button"
            onClick={onViewOrder}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            View
          </button>

          {activeTab !== "Completed" && (
            <button
              type="button"
              onClick={onRemove}
              className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              aria-label="Remove installation schedule"
              title="Cancel schedule"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card */}
      <div
        className={cn(
          "lg:hidden p-4 sm:p-5 transition-colors border-b border-slate-100 dark:border-slate-800/60 space-y-3.5",
          selected ? "bg-primary/[0.04] dark:bg-primary/[0.08]" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
        )}
      >
        <div className="flex items-start gap-3.5">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="mt-1 h-5 w-5 rounded-[6px] border border-slate-300 dark:border-slate-600 focus-visible:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />

          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-muted/20">
            <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onViewOrder}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-950 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer"
              >
                <span>{displayOrderNum}</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </button>

              {activeTab === "Scheduled" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                  {item.orderItemStatus ? item.orderItemStatus.replace(/_/g, " ") : "Pending"}
                </span>
              )}
              {activeTab === "Main Warehouse Picked" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase">
                  Picked
                </span>
              )}
              {(activeTab === "Technician Received" || activeTab === "Driver Assigned") && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                  Tech Received
                </span>
              )}
              {activeTab === "Completed" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                  Completed
                </span>
              )}
            </div>

            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
              {item.productName}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {item.sku && (
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">SKU: {item.sku}</p>
              )}
              {item.lineItemId && (
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Item #{item.lineItemId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Customer and Scheduled Slot info */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {item.customerName}
            </span>
            {item.customerPhone && (
              <span className="text-slate-500 dark:text-slate-400">{item.customerPhone}</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
            <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {item.scheduledDate || formatTime(item.scheduledAt).split(" ")[0]}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              {item.scheduledTimeRange || formatTime(item.scheduledAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
              <Wrench className="h-3 w-3 text-slate-400" />
              Tech: {item.technicianName || "Assigned"}
            </span>
            {item.assignedDriver && (
              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
                <Truck className="h-3 w-3" />
                {item.assignedDriver}
              </span>
            )}
          </div>

          {/* Uploaded Photos thumbnail list on mobile */}
          {hasPhotos && (
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                Uploaded Installation Proof ({item.images!.length}):
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {item.images!.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onPreviewImage?.(imgUrl)}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-emerald-300 dark:border-emerald-700 bg-muted cursor-pointer"
                  >
                    <img src={imgUrl} alt="Installation photo" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {activeTab === "Pending Scheduled" && (
            <button
              type="button"
              onClick={onConfirmSchedule}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </button>
          )}

          {activeTab === "Scheduled" && (
            <button
              type="button"
              onClick={onMarkPicked}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase cursor-pointer",
                item.orderItemStatus === "picker_assigned"
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                  : item.orderItemStatus === "picking"
                    ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                    : item.orderItemStatus === "picked"
                      ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
                      : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
              )}
            >
              {item.orderItemStatus === "picker_assigned" ? (
                <>
                  <User className="h-3.5 w-3.5" />
                  Picker Assigned
                </>
              ) : item.orderItemStatus === "picking" ? (
                <>
                  <Package className="h-3.5 w-3.5" />
                  Picking
                </>
              ) : item.orderItemStatus === "picked" ? (
                <>
                  <PackageCheck className="h-3.5 w-3.5" />
                  Picked
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  {item.orderItemStatus ? item.orderItemStatus.toUpperCase() : "PENDING"}
                </>
              )}
            </button>
          )}

          {activeTab === "Main Warehouse Picked" && (
            <button
              type="button"
              onClick={onTechnicianReceive}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer"
            >
              <Wrench className="h-3.5 w-3.5" />
              Tech Received
            </button>
          )}

          {(activeTab === "Technician Received" || activeTab === "Driver Assigned") && (
            <>
              <button
                type="button"
                onClick={onCompleteInstallation}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </button>
            </>
          )}

          {activeTab === "Completed" && (
            <button
              type="button"
              onClick={onUploadPhotos}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              {hasPhotos ? "Add Photos" : "Upload Photos"}
            </button>
          )}

          <button
            type="button"
            onClick={onViewOrder}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </button>

          {activeTab !== "Completed" && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
