import { useEffect, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Barcode,
  Building2,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  X,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { EnrichedOrder } from "@/lib/orders";
import { cn } from "@/lib/utils";
import {
  scheduleItem,
  removeItem,
  isItemScheduled,
  getSnapshot,
  subscribe,
} from "@/lib/scheduled-installations";
import { assignItemSchedule, assignItemToPicker, unassignItemFromPicker } from "@/lib/api/services";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPickers, type ManagedUser } from "@/lib/sync";

const LOCATION_INFO: Record<
  string,
  { name: string; address: string; method: string; flow: string }
> = {
  F01: {
    name: "Fulfillment Center Hilal",
    address: "Street - 230, Zone - 42, Building No - 151, الدوحة, Qatar",
    method: "Standard Assembly (Hilal Team)",
    flow: "Picker App Flow",
  },
  F02: {
    name: "Main Warehouse - Safety Stock",
    address: "Birkat Al Awamer, Birkat Al Awamer, Qatar",
    method: "Standard Safety Stock Allocation",
    flow: "Warehouse Direct Flow",
  },
  MWO: {
    name: "Main Warehouse Outdoor",
    address: "Birkat Al Awamer, Birkat Al Awamer, Qatar",
    method: "Main Warehouse Outdoor Installation (Specialist Team)",
    flow: "Warehouse Direct Flow",
  },
  VS: {
    name: "Virtual Stock",
    address: "Qatar",
    method: "Virtual Stock Direct Delivery & Setup (Third-Party Partner)",
    flow: "Warehouse Direct Flow",
  },
};

export function FulfillmentSection({ order }: { order: EnrichedOrder }) {
  const fcs = Array.from(new Set(order.itemsList.map((item) => item.fc)));
  const itemIndexMap = new Map<string, number>(
    order.itemsList.map((item, idx) => [item.id, idx + 1]),
  );

  // Subscribe to scheduled installations store for reactivity
  const scheduled = useSyncExternalStore(subscribe, getSnapshot);

  // Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<EnrichedOrder["itemsList"][number] | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  // Cancel Dialog state
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<EnrichedOrder["itemsList"][number] | null>(null);
  const [pickers, setPickers] = useState<ManagedUser[]>([]);
  const [selectedPickers, setSelectedPickers] = useState<Record<string, string>>({});
  const [itemStatuses, setItemStatuses] = useState<Record<string, string>>({});
  const [unassignedItems, setUnassignedItems] = useState<Record<string, boolean>>({});
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);

  useEffect(() => {
    getPickers().then((data) => setPickers(Array.isArray(data) ? data : []));
  }, []);

  // Order-level flagged condition
  const isOrderFlagged =
    order.status === "Flagged" ||
    order.status === "Delivery Failed" ||
    Boolean(order.returns && order.returns.count > 0);

  const isItemFlagged = (item: EnrichedOrder["itemsList"][number]) => {
    const statusStr = String(item.status || "");
    const rawStatus =
      (item as any).custom_status || (item as any).is_flagged || (item as any).flagged;
    return (
      statusStr === "Flagged" ||
      statusStr === "Delivery Failed" ||
      Boolean((item as any).isFlagged) ||
      Boolean((item as any).flaggedReason) ||
      Boolean((item as any).reason) ||
      rawStatus === "Flagged" ||
      rawStatus === true
    );
  };

  const handleScheduleClick = (item: EnrichedOrder["itemsList"][number]) => {
    setPendingItem(item);
    setConfirmOpen(true);
  };

  const handleConfirmSchedule = async () => {
    if (!pendingItem) return;
    setIsScheduling(true);

    const rawItemId = (pendingItem as any).order_item_id ?? pendingItem.id;
    const resolvedId = !isNaN(Number(rawItemId))
      ? Number(rawItemId)
      : typeof rawItemId === "string" && rawItemId.match(/\d+/)
        ? Number(rawItemId.match(/\d+/)![0])
        : rawItemId;

    try {
      // POST /api/admin/schedule/assign/{order_item_id?} with { order_item_id, is_scheduled_assigned: true }
      await assignItemSchedule(resolvedId, true);
    } catch (apiErr) {
      console.warn("[FulfillmentSection] assignItemSchedule API error:", apiErr);
    } finally {
      setIsScheduling(false);
    }

    const info = LOCATION_INFO[pendingItem.fc] || { method: "Standard Assembly (Hilal Team)" };
    scheduleItem({
      orderId: order.id,
      productName: pendingItem.name,
      sku: pendingItem.sku,
      image: pendingItem.image,
      customerName: order.customer.name,
      installationMethod: info.method,
      orderItemId: resolvedId,
    });
    toast.success(`Installation scheduled for ${pendingItem.name}`);
    setConfirmOpen(false);
    setPendingItem(null);
  };

  const handleCancelClick = (item: EnrichedOrder["itemsList"][number]) => {
    setItemToCancel(item);
    setCancelConfirmOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!itemToCancel) return;
    const entry = scheduled.find((s) => s.orderId === order.id && s.sku === itemToCancel.sku);
    if (entry) {
      const rawItemId = (itemToCancel as any).order_item_id ?? entry.orderItemId ?? itemToCancel.id;
      const resolvedId = !isNaN(Number(rawItemId))
        ? Number(rawItemId)
        : typeof rawItemId === "string" && rawItemId.match(/\d+/)
          ? Number(rawItemId.match(/\d+/)![0])
          : rawItemId;

      try {
        await assignItemSchedule(resolvedId, false);
      } catch (err) {
        console.warn("[FulfillmentSection] Unassign schedule API warning:", err);
      }

      removeItem(entry.id);
      toast.info("Installation schedule removed");
    }
    setCancelConfirmOpen(false);
    setItemToCancel(null);
  };

  const handleAssignPicker = async (
    item: EnrichedOrder["itemsList"][number],
    pickerValue: string,
  ) => {
    const picker = pickers.find(
      (candidate) => candidate.id === pickerValue || candidate.email === pickerValue,
    );
    if (!picker) return;

    setSelectedPickers((current) => ({ ...current, [item.id]: pickerValue }));
    setAssigningItemId(item.id);
    try {
      const orderLineItemId = item.id;
      const pickerId = !isNaN(Number(picker.id)) ? Number(picker.id) : picker.id;

      const response = await assignItemToPicker(orderLineItemId, pickerId);
      setUnassignedItems((current) => ({ ...current, [item.id]: false }));
      const assignedStatus = response?.data?.status;
      if (String(assignedStatus || "").toLowerCase() === "picker_assigned") {
        setItemStatuses((current) => ({ ...current, [item.id]: assignedStatus }));
      }
      toast.success(`${picker.name} assigned to ${item.name}`);
    } catch (error) {
      console.error("[FulfillmentSection] picker assignment failed:", error);
      setSelectedPickers((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      toast.error("Unable to assign picker");
    } finally {
      setAssigningItemId(null);
    }
  };

  const handleUnassignPicker = async (item: EnrichedOrder["itemsList"][number]) => {
    setAssigningItemId(item.id);
    try {
      await unassignItemFromPicker(item.id);
      setUnassignedItems((current) => ({ ...current, [item.id]: true }));
      setItemStatuses((current) => ({ ...current, [item.id]: "Pending" }));
      setSelectedPickers((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      toast.success(`Picker unassigned from ${item.name}`);
    } catch (error) {
      console.error("[FulfillmentSection] picker unassignment failed:", error);
      toast.error("Unable to unassign picker");
    } finally {
      setAssigningItemId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        {fcs.map((fcId) => {
          const items = order.itemsList.filter((item) => item.fc === fcId);
          const info = LOCATION_INFO[fcId] || {
            name: items[0]?.fcName || fcId,
            address: "Qatar",
            method: "Standard Assembly (Hilal Team)",
            flow: "Warehouse Direct Flow",
          };

          const isFcFlagged = isOrderFlagged || items.some(isItemFlagged);

          return (
            <div
              key={fcId}
              className={cn(
                "overflow-hidden rounded-xl border transition-all shadow-sm",
                isFcFlagged
                  ? "border-red-500/60 dark:border-red-500/50 bg-red-500/[0.02] dark:bg-red-950/20 ring-1 ring-red-500/30 shadow-red-500/10"
                  : "border-border bg-card",
              )}
            >
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const itemIsScheduled = isItemScheduled(order.id, item.sku);
                  const itemHasFlag = isItemFlagged(item);
                  const itemStatus = itemStatuses[item.id] || item.status;
                  const selectedPicker = pickers.find(
                    (picker) =>
                      picker.id === selectedPickers[item.id] ||
                      picker.email === selectedPickers[item.id],
                  );
                  const hasAssignedPicker =
                    !unassignedItems[item.id] &&
                    Boolean(item.assigned_to || selectedPickers[item.id]);
                  const flagReason =
                    (item as any).flaggedReason ||
                    (item as any).reason ||
                    (item as any).flag_reason;

                  const isInstallable = Boolean(
                    item.is_installable === true ||
                    (item as any).is_installable === 1 ||
                    (item as any).is_installable === "1" ||
                    (item as any).is_installable === "true" ||
                    item.isInstallable === true ||
                    (item as any).isInstallable === 1 ||
                    (item as any).isInstallable === "1" ||
                    (item as any).isInstallable === "true" ||
                    (item as any).custom_is_installable === 1 ||
                    (item as any).custom_is_installable === true ||
                    (item as any).custom_is_installable === "1" ||
                    (item as any).custom_is_installable === "true" ||
                    (item as any).requires_installation === true ||
                    (item as any).requires_installation === 1 ||
                    (item as any).requires_installation === "1" ||
                    (item as any).requires_installation === "true" ||
                    item.itemType === "MWH" ||
                    item.itemType === "VL_SUPPLIER",
                  );

                  return (
                    <article
                      key={item.id}
                      className={cn(
                        "grid gap-4 p-4 transition-colors sm:grid-cols-[72px_72px_1fr_auto] sm:p-5 border-l-4",
                        itemHasFlag
                          ? "bg-red-500/[0.05] dark:bg-red-950/25 hover:bg-red-500/[0.09] border-l-red-500 border-b border-b-red-200/40 dark:border-b-red-950/40"
                          : "hover:bg-muted/10 border-l-transparent",
                      )}
                    >
                      {/* SL No. */}
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-xs dark:bg-slate-100 dark:text-slate-950 shrink-0 self-center">
                        #{itemIndexMap.get(item.id) ?? 1}
                      </div>

                      <div
                        className={cn(
                          "h-20 w-20 overflow-hidden rounded-lg border bg-muted/30 sm:h-[72px] sm:w-[72px]",
                          itemHasFlag
                            ? "border-red-400/60 dark:border-red-500/40 ring-2 ring-red-500/20"
                            : "border-border",
                        )}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="space-y-1">
                          <h4 className="font-semibold leading-snug text-foreground">
                            {item.name}
                          </h4>
                        </div>

                        <div className="flex flex-col gap-0.5 mt-1">
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          )}
                          {item.barcode && (
                            <p className="text-xs text-muted-foreground">Barcode: {item.barcode}</p>
                          )}
                          {flagReason && (
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Reason: {flagReason}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* Fulfillment status — always visible */}
                          <ItemStatus
                            status={itemStatus}
                            assignedUserName={
                              hasAssignedPicker
                                ? item.assigned_user_name || selectedPicker?.name
                                : null
                            }
                            isFlagged={itemHasFlag}
                          />

                          {hasAssignedPicker ? (
                            <button
                              type="button"
                              onClick={() => handleUnassignPicker(item)}
                              disabled={assigningItemId === item.id}
                              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50/70 px-3 text-xs font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-400"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              Unassign
                            </button>
                          ) : (
                            String(itemStatus || "").toLowerCase() === "pending" && (
                              <Select
                                value={selectedPickers[item.id] || ""}
                                onValueChange={(value) => handleAssignPicker(item, value)}
                                disabled={assigningItemId === item.id}
                              >
                                <SelectTrigger className="inline-flex h-7 w-auto shrink-0 gap-1.5 rounded-full border border-rose-300 bg-rose-50/70 px-3 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
                                  <UserPlus className="h-3.5 w-3.5" />
                                  <SelectValue placeholder="Assign to Picker" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pickers.length === 0 ? (
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                      No pickers available
                                    </div>
                                  ) : (
                                    pickers.map((picker) => (
                                      <SelectItem key={picker.id} value={picker.email || picker.id}>
                                        {picker.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            )
                          )}

                          {/* Installation status — shown only if item is installable or already scheduled */}
                          {itemIsScheduled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Scheduled
                              <button
                                type="button"
                                onClick={() => handleCancelClick(item)}
                                className="ml-0.5 rounded-full p-0.5 cursor-pointer transition-colors hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Cancel scheduled installation"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ) : isInstallable ? (
                            <button
                              type="button"
                              onClick={() => handleScheduleClick(item)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted"
                            >
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              Schedule
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-muted/20 p-3 text-left sm:min-w-[150px] sm:text-right">
                        <div className="text-sm font-medium text-foreground">
                          QAR {item.price.toFixed(2)}{" "}
                          <span className="font-normal text-muted-foreground">x {item.qty}</span>
                        </div>
                        <div className="mt-1 text-base font-bold text-foreground">
                          QAR {(item.price * item.qty).toFixed(2)}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Installation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[480px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl">
          <div className="p-5 sm:p-7">
            <DialogHeader className="mb-5 text-center sm:text-left">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                Confirm Installation
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                Are you sure you want to schedule an installation for this item?
              </DialogDescription>
            </DialogHeader>

            {pendingItem && (
              <div className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                  <img
                    src={pendingItem.image}
                    alt={pendingItem.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-foreground truncate">
                    {pendingItem.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    SKU: {pendingItem.sku}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-border/40 bg-muted/20 px-5 sm:px-7 py-4 sm:py-5">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="w-full sm:w-auto rounded-xl font-semibold h-10 sm:h-11 text-xs sm:text-sm shadow-sm border-border/60 text-slate-800 dark:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSchedule}
              disabled={isScheduling}
              className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-md font-semibold h-10 sm:h-11 text-xs sm:text-sm px-8 transition-all disabled:opacity-50"
            >
              {isScheduling ? "Scheduling..." : "Confirm Schedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Cancel Dialog */}
      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[480px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl">
          <div className="p-5 sm:p-7">
            <DialogHeader className="mb-5 text-center sm:text-left">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-destructive">
                Remove Installation
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                Are you sure you want to remove the scheduled installation for this item?
              </DialogDescription>
            </DialogHeader>

            {itemToCancel && (
              <div className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                  <img
                    src={itemToCancel.image}
                    alt={itemToCancel.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-foreground truncate">
                    {itemToCancel.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    SKU: {itemToCancel.sku}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-border/40 bg-muted/20 px-5 sm:px-7 py-4 sm:py-5">
            <Button
              variant="outline"
              onClick={() => setCancelConfirmOpen(false)}
              className="w-full sm:w-auto rounded-xl font-semibold h-10 sm:h-11 text-xs sm:text-sm shadow-sm border-border/60 text-slate-800 dark:text-slate-200"
            >
              Keep Scheduled
            </Button>
            <Button
              onClick={handleConfirmCancel}
              className="w-full sm:w-auto rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md font-semibold h-10 sm:h-11 text-xs sm:text-sm px-8 transition-all"
            >
              Remove Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald" | "red";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "blue" &&
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400",
        tone === "emerald" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
        tone === "red" &&
          "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      {value}
    </span>
  );
}

function ItemStatus({
  status,
  assignedUserName,
  isFlagged,
}: {
  status: EnrichedOrder["itemsList"][number]["status"] | string;
  assignedUserName?: string | null;
  isFlagged?: boolean;
}) {
  const displayStatus = isFlagged
    ? "Flagged"
    : assignedUserName && String(status).toLowerCase() === "picker assigned"
      ? assignedUserName
      : String(status).toLowerCase() === "picker_assigned"
        ? "Picker Assigned"
        : status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        displayStatus === "Flagged" &&
          "border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-950/70 dark:text-red-300 shadow-sm",
        displayStatus === "Prepared" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
        displayStatus === "Allocated" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
        displayStatus === "Accepted" &&
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400",
        displayStatus === "Pending" && "border-border bg-muted text-muted-foreground",
        displayStatus === "Picker Assigned" &&
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400",
      )}
    >
      {displayStatus === "Flagged" ? (
        <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
      ) : null}
      {displayStatus === "Prepared" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {displayStatus}
    </span>
  );
}
