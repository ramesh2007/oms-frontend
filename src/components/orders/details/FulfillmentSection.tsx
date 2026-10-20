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
  XCircle,
  UserPlus,
  UserMinus,
  User,
  Sparkles,
  Gift,
  MessageSquareQuote,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { orderKeys } from "@/hooks/useOrders";
import { type EnrichedOrder, matchesLegacyTab, isItemCancelledOrReturned, isItemAddedNew, isOrderCancelled, isOrderReturnAndReplacement } from "@/lib/orders";
import { cn } from "@/lib/utils";
import {
  scheduleItem,
  removeItem,
  isItemScheduled,
  getSnapshot,
  subscribe,
} from "@/lib/scheduled-installations";
import { assignItemSchedule, assignItemToPicker, unassignItemFromPicker, updateOrderStatus } from "@/lib/api/services";
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

/**
 * Parses product tags from array, string, or comma-separated string.
 * Highlights the VS (Virtual Stock) tag, and extracts all other tags into a list.
 */
function parseProductTags(
  raw: unknown,
  fc?: string,
  itemType?: string,
  fcName?: string,
  sku?: string,
): { hasVs: boolean; otherTags: string[]; allTags: string[] } {
  const set = new Set<string>();

  const addTag = (val: string) => {
    const trimmed = val.trim().replace(/^["']|["']$/g, "").trim();
    if (trimmed) set.add(trimmed);
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        for (const part of item.split(",")) {
          addTag(part);
        }
      } else if (item && typeof item === "object") {
        const val =
          (item as any).name ??
          (item as any).tag ??
          (item as any).value ??
          (item as any).label ??
          (item as any).title;
        if (typeof val === "string") addTag(val);
      }
    }
  } else if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === "string") {
              addTag(item);
            } else if (item && typeof item === "object") {
              const val =
                (item as any).name ??
                (item as any).tag ??
                (item as any).value ??
                (item as any).label ??
                (item as any).title;
              if (typeof val === "string") addTag(val);
            }
          }
        }
      } catch {
        for (const part of trimmed.split(",")) {
          addTag(part);
        }
      }
    } else {
      for (const part of trimmed.split(",")) {
        addTag(part);
      }
    }
  }

  // If item is assigned to Virtual Stock FC, VL_SUPPLIER / VL_HMA type, or Virtual Stock warehouse
  if (
    fc === "VS" ||
    itemType === "VL_SUPPLIER" ||
    itemType === "VL_HMA" ||
    (typeof fcName === "string" && (fcName.toLowerCase().includes("virtual") || fcName.toLowerCase().includes("vendor"))) ||
    sku === "820304" ||
    sku === "58034"
  ) {
    set.add("VS");
  }

  const allTags = Array.from(set);
  const isVs = (tag: string) => {
    const u = tag.trim().toUpperCase();
    return (
      u === "VS" ||
      u === "VIRTUAL STOCK" ||
      u === "VIRTUAL_STOCK" ||
      u === "VIRTUALSTOCK" ||
      u.startsWith("VS ") ||
      u.startsWith("VS -") ||
      u.startsWith("VS:") ||
      u.includes("VIRTUAL STOCK")
    );
  };

  const hasVs = allTags.some(isVs);
  const otherTags = allTags.filter((t) => !isVs(t));

  return { hasVs, otherTags, allTags };
}

export function FulfillmentSection({
  order,
  from,
  initialTab,
}: {
  order: EnrichedOrder;
  from?: string;
  initialTab?: string;
}) {
  const fcs = Array.from(new Set(order.itemsList.map((item) => item.fc)));
  const itemIndexMap = new Map<string, number>(
    order.itemsList.map((item, idx) => [item.id, idx + 1]),
  );

  const effectiveFrom = from || (typeof window !== "undefined" ? sessionStorage.getItem("last_orders_from") : null);
  const effectiveTab = initialTab || (typeof window !== "undefined" ? sessionStorage.getItem("last_orders_tab") : null);

  const isPickingStage = Boolean(
    (effectiveTab && effectiveTab.toLowerCase() === "picking") ||
    (effectiveFrom && effectiveFrom.includes("/picking")) ||
    (
      (
        order.status === "Picking" ||
        String(order.status || "").toLowerCase() === "picking" ||
        matchesLegacyTab(order, "Picking")
      ) &&
      !effectiveFrom?.includes("/packing") &&
      !effectiveFrom?.includes("/in-delivery") &&
      !effectiveFrom?.includes("/delivered") &&
      !effectiveFrom?.includes("/ready") &&
      !effectiveFrom?.includes("/returns") &&
      !effectiveFrom?.includes("/cancelled") &&
      effectiveTab?.toLowerCase() !== "packing" &&
      effectiveTab?.toLowerCase() !== "delivered" &&
      effectiveTab?.toLowerCase() !== "in delivery" &&
      effectiveTab?.toLowerCase() !== "ready to assign" &&
      effectiveTab?.toLowerCase() !== "returns" &&
      effectiveTab?.toLowerCase() !== "cancelled"
    )
  );

  const isNewStage = Boolean(
    (effectiveTab && (effectiveTab.toLowerCase() === "new" || effectiveTab.toLowerCase() === "unfulfilled")) ||
    (effectiveFrom && (effectiveFrom.includes("/new") || effectiveFrom.includes("tab=New") || effectiveFrom.includes("tab=Unfulfilled"))) ||
    (
      (
        order.status === "New" ||
        order.status === "Unfulfilled" ||
        String(order.status || "").toLowerCase() === "new" ||
        String(order.status || "").toLowerCase() === "unfulfilled" ||
        matchesLegacyTab(order, "New") ||
        matchesLegacyTab(order, "Unfulfilled")
      ) &&
      !effectiveFrom?.includes("/picking") &&
      !effectiveFrom?.includes("/packing") &&
      !effectiveFrom?.includes("/in-delivery") &&
      !effectiveFrom?.includes("/delivered") &&
      !effectiveFrom?.includes("/ready") &&
      !effectiveFrom?.includes("/returns") &&
      !effectiveFrom?.includes("/cancelled") &&
      effectiveTab?.toLowerCase() !== "picking" &&
      effectiveTab?.toLowerCase() !== "packing" &&
      effectiveTab?.toLowerCase() !== "delivered" &&
      effectiveTab?.toLowerCase() !== "in delivery" &&
      effectiveTab?.toLowerCase() !== "ready to assign" &&
      effectiveTab?.toLowerCase() !== "returns" &&
      effectiveTab?.toLowerCase() !== "cancelled"
    )
  );

  const isNewOrPickingStage = isPickingStage || isNewStage;

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
  const [readyAssigningItemId, setReadyAssigningItemId] = useState<string | null>(null);

  const handleItemReadyToAssign = async (item: EnrichedOrder["itemsList"][number]) => {
    setReadyAssigningItemId(item.id);
    try {
      setItemStatuses((prev) => ({ ...prev, [item.id]: "Prepared" }));
      const targetOrderId = order.order_id || order.id;
      await updateOrderStatus(String(targetOrderId), "ready_to_assign");
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success(`"${item.name}" (VS) marked as Ready to Assign`);
    } catch (err: any) {
      console.error("[FulfillmentSection] Failed to mark Ready to Assign:", err);
      toast.error(err?.message || "Failed to update status to Ready to Assign");
    } finally {
      setReadyAssigningItemId(null);
    }
  };

  const queryClient = useQueryClient();
  const [cancelledItems, setCancelledItems] = useState<Record<string, boolean>>(() => {
    try {
      const list = JSON.parse(localStorage.getItem("hm_cancelled_items") || "[]");
      const map: Record<string, boolean> = {};
      if (Array.isArray(list)) {
        list.forEach((id: string) => {
          map[id] = true;
        });
      }
      return map;
    } catch {
      return {};
    }
  });
  const [cancelItemModalOpen, setCancelItemModalOpen] = useState(false);
  const [itemToCancelFromOrder, setItemToCancelFromOrder] = useState<EnrichedOrder["itemsList"][number] | null>(null);
  const [cancelItemReason, setCancelItemReason] = useState("");
  const [isCancellingItem, setIsCancellingItem] = useState(false);

  const isDelivered = Boolean(
    order.status === "Delivered" ||
    String(order.status || "").toLowerCase() === "delivered" ||
    (order as any).driverStatus === "Delivered"
  );

  const isInDelivery = Boolean(
    !isDelivered &&
    order.status !== "Ready to Assign" &&
    String(order.status || "").toLowerCase() !== "ready to assign" &&
    (
      (order as any).backend_status === "assigned_to_driver" ||
      (order as any).backend_status === "partial_assigned_driver" ||
      (order as any).rawOrder?.status === "assigned_to_driver" ||
      (order as any).rawOrder?.status === "partial_assigned_driver" ||
      matchesLegacyTab(order, "In Delivery")
    )
  );

  const handleConfirmCancelItem = async () => {
    if (!itemToCancelFromOrder) return;
    setIsCancellingItem(true);
    try {
      const itemId = itemToCancelFromOrder.id;
      const reason = cancelItemReason.trim() || "Item cancelled by admin during delivery";

      const existingCancelled: string[] = JSON.parse(localStorage.getItem("hm_cancelled_items") || "[]");
      if (!existingCancelled.includes(itemId)) {
        existingCancelled.push(itemId);
        localStorage.setItem("hm_cancelled_items", JSON.stringify(existingCancelled));
      }

      setCancelledItems((prev) => ({ ...prev, [itemId]: true }));
      setItemStatuses((prev) => ({ ...prev, [itemId]: "Cancelled" }));

      const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
      const timestamp = new Date().toISOString();

      const customEvents = JSON.parse(localStorage.getItem("hm_custom_timeline_events") || "[]");
      customEvents.push({
        orderId: order.id,
        id: `custom-tl-${Date.now()}`,
        title: "Item Cancelled",
        date: dateStr,
        time: timeStr,
        description: `Item "${itemToCancelFromOrder.name}" (${itemToCancelFromOrder.qty}x) cancelled from delivery.\nReason: ${reason}\nTimestamp: ${timestamp}`,
        actor: "Admin User",
        actorRole: "admin",
        type: "cancelled",
      });
      localStorage.setItem("hm_custom_timeline_events", JSON.stringify(customEvents));

      toast.success(`Item "${itemToCancelFromOrder.name}" has been cancelled`);
      setCancelItemModalOpen(false);
      setItemToCancelFromOrder(null);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    } catch (err: any) {
      console.error("Failed to cancel item:", err);
      toast.error(err?.message || "Failed to cancel item");
    } finally {
      setIsCancellingItem(false);
    }
  };

  useEffect(() => {
    getPickers().then((data) => setPickers(Array.isArray(data) ? data : []));
  }, []);

  // Order-level flagged condition
  const isOrderFlagged =
    order.status === "Flagged" ||
    order.status === "Delivery Failed";

  const isItemFlagged = (item: EnrichedOrder["itemsList"][number]) => {
    const statusStr = String(item.status || "").toLowerCase();
    const rawStatus = String((item as any).custom_status || "").toLowerCase();
    const isExplicitlyFlagged = Boolean(
      item.is_flagged === true ||
      (item as any).is_flagged === 1 ||
      (item as any).is_flagged === "1" ||
      (item as any).is_flagged === "true" ||
      (item as any).isFlagged === true ||
      (item as any).flagged === true
    );
    return (
      statusStr === "flagged" ||
      rawStatus === "flagged" ||
      isExplicitlyFlagged
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
      const pickerId = !isNaN(Number(picker.id)) ? Number(picker.id) : picker.id;

      const response = await assignItemToPicker(item, pickerId, order.id);
      setUnassignedItems((current) => ({ ...current, [item.id]: false }));
      const assignedStatus = response?.data?.status;
      if (String(assignedStatus || "").toLowerCase() === "picker_assigned") {
        setItemStatuses((current) => ({ ...current, [item.id]: assignedStatus }));
      }
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
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
      await unassignItemFromPicker(item, order.id);
      setUnassignedItems((current) => ({ ...current, [item.id]: true }));
      setItemStatuses((current) => ({ ...current, [item.id]: "Pending" }));
      setSelectedPickers((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
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
              {isDelivered && (
                <div className="flex items-center justify-between border-b border-border/60 bg-emerald-50/50 px-4 py-2.5 text-xs dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                      Fulfilled & Delivered
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{info.name}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Completed
                  </span>
                </div>
              )}
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const itemIsScheduled = isItemScheduled(order.id, item.sku);
                  const itemHasFlag = isItemFlagged(item);
                  const itemStatus = itemStatuses[item.id] || item.status;
                  const selectedPicker = pickers.find(
                    (picker) =>
                      picker.id === selectedPickers[item.id] ||
                      picker.email === selectedPickers[item.id] ||
                      picker.name === selectedPickers[item.id],
                  );

                  const assignedPickerName = (() => {
                    if (unassignedItems[item.id]) return null;
                    if (selectedPicker?.name) return selectedPicker.name;
                    if (item.assigned_user_name && String(item.assigned_user_name).trim()) {
                      return String(item.assigned_user_name).trim();
                    }
                    if ((item as any).picker_name && String((item as any).picker_name).trim()) {
                      return String((item as any).picker_name).trim();
                    }
                    if ((item as any).picker && typeof (item as any).picker === "string" && String((item as any).picker).trim()) {
                      return String((item as any).picker).trim();
                    }
                    if ((item as any).assignedUser?.name) {
                      return (item as any).assignedUser.name;
                    }
                    if ((item as any).pickedUser?.name) {
                      return (item as any).pickedUser.name;
                    }
                    if (item.picked_user_name && String(item.picked_user_name).trim()) {
                      return String(item.picked_user_name).trim();
                    }
                    if (item.assigned_to) {
                      const matched = pickers.find(
                        (p) =>
                          String(p.id) === String(item.assigned_to) ||
                          p.email === item.assigned_to ||
                          p.name === item.assigned_to,
                      );
                      if (matched?.name) return matched.name;
                      if (typeof item.assigned_to === "string" && isNaN(Number(item.assigned_to))) {
                        return item.assigned_to;
                      }
                    }
                    if (selectedPickers[item.id]) {
                      const matched = pickers.find(
                        (p) =>
                          String(p.id) === String(selectedPickers[item.id]) ||
                          p.email === selectedPickers[item.id],
                      );
                      return matched?.name || selectedPickers[item.id];
                    }
                    if (
                      order.picker &&
                      typeof order.picker === "string" &&
                      order.picker.trim() &&
                      order.picker.toLowerCase() !== "unassigned" &&
                      (String(itemStatus || "").toLowerCase() === "picker assigned" ||
                       String(itemStatus || "").toLowerCase() === "picker_assigned" ||
                       String(itemStatus || "").toLowerCase() === "prepared" ||
                       String(order.status || "").toLowerCase() === "picking")
                    ) {
                      return order.picker.trim();
                    }
                    return null;
                  })();

                  const hasAssignedPicker =
                    !unassignedItems[item.id] &&
                    Boolean(
                      assignedPickerName ||
                      item.assigned_to ||
                      item.assigned_user_name ||
                      selectedPickers[item.id],
                    );
                  const flagReason = itemHasFlag
                    ? (item as any).flag_reason || (item as any).flagged_reason || (item as any).flaggedReason || (item as any).flagReason || null
                    : null;

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

                  const { hasVs: hasVsTag, otherTags, allTags } = parseProductTags(
                    item.product_tags ??
                      (item as any).tags ??
                      (item as any).custom_product_tags ??
                      (item as any).product?.product_tags ??
                      (item as any).product?.tags ??
                      (item as any).product_tag,
                    item.fc,
                    item.itemType,
                    item.fcName,
                    item.sku,
                  );

                  // Extract gift wrap details (e.g. "GW-G")
                  const rawGiftWrap =
                    item.gift_wrap ??
                    (item as any).giftWrap ??
                    (item as any).gift_wrapper ??
                    (item as any).giftWrapper ??
                    (item as any).custom_gift_wrap ??
                    (item as any).product?.gift_wrap ??
                    null;

                  const giftWrapValue = (() => {
                    if (rawGiftWrap === true) return "Gift Wrapped";
                    if (typeof rawGiftWrap === "string") {
                      const trimmed = rawGiftWrap.trim();
                      if (
                        trimmed &&
                        trimmed.toLowerCase() !== "false" &&
                        trimmed.toLowerCase() !== "0" &&
                        trimmed.toLowerCase() !== "none" &&
                        trimmed.toLowerCase() !== "no" &&
                        trimmed.toLowerCase() !== "null"
                      ) {
                        return trimmed;
                      }
                    }
                    const props = (item as any).properties;
                    if (Array.isArray(props)) {
                      const found = props.find((p: any) => {
                        const k = String(p?.name || p?.key || "").toLowerCase();
                        return k.includes("gift") || k.includes("wrap");
                      });
                      if (found?.value && String(found.value).trim()) {
                        return String(found.value).trim();
                      }
                    }
                    return null;
                  })();

                  const hasGiftWrap = Boolean(giftWrapValue);

                  // Extract gift message (e.g. "Happy Birthday jhon")
                  const rawGiftMessage =
                    item.gift_message ??
                    (item as any).giftMessage ??
                    (item as any).custom_gift_message ??
                    (item as any).product?.gift_message ??
                    (item as any).product?.giftMessage ??
                    null;

                  const giftMessageValue = (() => {
                    if (typeof rawGiftMessage === "string") {
                      const trimmed = rawGiftMessage.trim();
                      if (
                        trimmed &&
                        trimmed.toLowerCase() !== "null" &&
                        trimmed.toLowerCase() !== "undefined"
                      ) {
                        return trimmed;
                      }
                    }
                    const props = (item as any).properties;
                    if (Array.isArray(props)) {
                      const found = props.find((p: any) => {
                        const k = String(p?.name || p?.key || "").toLowerCase();
                        return (
                          k.includes("gift_message") ||
                          k.includes("gift message") ||
                          k === "message" ||
                          k === "gift_note" ||
                          k === "gift note"
                        );
                      });
                      if (found?.value && String(found.value).trim()) {
                        return String(found.value).trim();
                      }
                    }
                    return null;
                  })();

                  const hasGiftMessage = Boolean(giftMessageValue);

                  const isWholeOrderCancelled = isOrderCancelled(order);
                  const isItemCancelled = isWholeOrderCancelled || isItemCancelledOrReturned(item) || Boolean(
                    cancelledItems[item.id] ||
                    itemStatuses[item.id] === "Cancelled" ||
                    (item as any).is_cancelled ||
                    (item as any).isCancelled ||
                    String(item.status || "").toLowerCase() === "cancelled" ||
                    String(item.status || "").toLowerCase() === "canceled" ||
                    String((item as any).custom_status || "").toLowerCase() === "cancelled" ||
                    String((item as any).raw_status || "").toLowerCase() === "cancelled" ||
                    String((item as any).raw_status || "").toLowerCase() === "canceled"
                  );

                  const isAddedNew = !isWholeOrderCancelled && isItemAddedNew(item, order);

                  return (
                    <article
                      key={item.id}
                      className={cn(
                        "grid gap-4 p-4 transition-colors sm:grid-cols-[72px_72px_1fr_auto] sm:p-5 border-l-4",
                        isItemCancelled
                          ? "bg-red-500/[0.06] dark:bg-red-950/30 hover:bg-red-500/[0.1] border-l-red-500 border-b border-b-red-200/50 dark:border-b-red-900/40"
                          : isAddedNew
                            ? "bg-sky-500/[0.05] dark:bg-sky-950/25 hover:bg-sky-500/[0.09] border-l-sky-500 border-b border-b-sky-200/40 dark:border-b-sky-900/40"
                            : itemHasFlag
                              ? "bg-amber-500/[0.05] dark:bg-amber-950/25 hover:bg-amber-500/[0.09] border-l-amber-500 border-b border-b-amber-200/40 dark:border-b-amber-950/40"
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
                          isItemCancelled
                            ? "border-red-400/60 dark:border-red-500/40 ring-2 ring-red-500/20"
                            : isAddedNew
                              ? "border-sky-400/60 dark:border-sky-500/40 ring-2 ring-sky-500/20"
                              : itemHasFlag
                                ? "border-amber-400/60 dark:border-amber-500/40 ring-2 ring-amber-500/20"
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
                          <div className="flex items-center flex-wrap gap-2">
                            <h4 className={cn("font-semibold leading-snug text-foreground", isItemCancelled && "line-through text-muted-foreground")}>
                              {item.name}
                            </h4>
                            {isItemCancelled && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800/80 px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs select-none"
                                title={isWholeOrderCancelled ? "Order Cancelled" : "Cancelled Before Delivery (Return)"}
                              >
                                {isWholeOrderCancelled ? (
                                  <>
                                    <XCircle className="h-3 w-3 text-red-600 dark:text-red-400 shrink-0" />
                                    (Cancelled)
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="h-3 w-3 text-red-600 dark:text-red-400 shrink-0" />
                                    (Return)
                                  </>
                                )}
                              </span>
                            )}
                            {isAddedNew && (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300 dark:border-sky-800/80 px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs select-none"
                                title={isOrderReturnAndReplacement(order) ? "Replacement Item" : "Newly Added Item"}
                              >
                                <Sparkles className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
                                {isOrderReturnAndReplacement(order) ? "(Replacement)" : "(Added New)"}
                              </span>
                            )}
                            {hasVsTag && (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs select-none"
                                title="Virtual Stock (VS) product"
                              >
                                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                VS (Virtual Stock)
                              </span>
                            )}
                            {hasGiftWrap && (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800/80 px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs select-none"
                                title={`Gift Wrapper: ${giftWrapValue}`}
                              >
                                <Gift className="h-3 w-3 text-pink-600 dark:text-pink-400" />
                                {giftWrapValue === "Gift Wrapped" ||
                                giftWrapValue === "true" ||
                                giftWrapValue === "1"
                                  ? "Gift Wrapper"
                                  : `Gift Wrapper: ${giftWrapValue}`}
                              </span>
                            )}
                            {hasGiftMessage && (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs select-none"
                                title={`Gift Message: ${giftMessageValue}`}
                              >
                                <MessageSquareQuote className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                Gift Message
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5 mt-1">
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          )}
                          {item.barcode && (
                            <p className="text-xs text-muted-foreground">Barcode: {item.barcode}</p>
                          )}
                          {isPickingStage && !hasVsTag && hasAssignedPicker && assignedPickerName && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/30">
                                <User className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>
                                  Picker Name : <strong className="font-semibold text-blue-800 dark:text-blue-200">{assignedPickerName}</strong>
                                </span>
                              </span>
                            </div>
                          )}
                          {hasGiftWrap && (
                            <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1.5 mt-0.5">
                              <Gift className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                Gift Wrapper:{" "}
                                <span className="font-bold underline decoration-pink-300 underline-offset-2">
                                  {giftWrapValue}
                                </span>
                              </span>
                            </p>
                          )}
                          {hasGiftMessage && (
                            <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-pink-200/80 bg-pink-50/50 p-2.5 text-xs dark:border-pink-900/50 dark:bg-pink-950/20">
                              <MessageSquareQuote className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="font-bold text-pink-900 dark:text-pink-300">Gift Message:</span>{" "}
                                <span className="italic font-medium text-foreground dark:text-pink-100 whitespace-pre-wrap">
                                  "{giftMessageValue}"
                                </span>
                              </div>
                            </div>
                          )}
                          {flagReason && (
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Reason: {flagReason}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* Fulfillment status */}
                          {(() => {
                            if (isWholeOrderCancelled) {
                              return (
                                <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-0.5 text-xs font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 shadow-2xs">
                                  <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                  Cancelled
                                </span>
                              );
                            }

                            if (isDelivered) {
                              if (isItemCancelled) {
                                return (
                                  <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-0.5 text-xs font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 shadow-2xs">
                                    <RotateCcw className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                    Cancelled Before Delivery (Return)
                                  </span>
                                );
                              }
                              if (isAddedNew) {
                                return (
                                  <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-sky-300 bg-sky-100 px-3 py-0.5 text-xs font-bold text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-300 shadow-2xs">
                                    <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                                    {isOrderReturnAndReplacement(order) ? "Replacement" : "Added New"}
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-2xs">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  Fulfilled
                                </span>
                              );
                            }

                            return (
                              <>
                                <ItemStatus
                                  status={isItemCancelled ? "Cancelled" : isAddedNew ? (isOrderReturnAndReplacement(order) ? "Replacement" : "Added New") : itemStatus}
                                  isFlagged={itemHasFlag && !isItemCancelled && !isAddedNew}
                                />

                                {isItemCancelled && (
                                  <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 shadow-2xs">
                                    <RotateCcw className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                    (Return)
                                  </span>
                                )}

                                {isAddedNew && (
                                  <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-sky-300 bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-300 shadow-2xs">
                                    <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                                    {isOrderReturnAndReplacement(order) ? "(Replacement)" : "(Added New)"}
                                  </span>
                                )}

                                {isInDelivery ? (
                                  !isItemCancelled ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setItemToCancelFromOrder(item);
                                        setCancelItemReason("");
                                        setCancelItemModalOpen(true);
                                      }}
                                      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-red-300 bg-red-50/70 px-3 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100 cursor-pointer dark:border-red-800 dark:bg-red-950/20 dark:text-red-400"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Cancel Item
                                    </button>
                                  ) : null
                                ) : isPickingStage && hasAssignedPicker && !hasVsTag ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignPicker(item)}
                                    disabled={assigningItemId === item.id}
                                    className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50/70 px-3 text-xs font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-400 cursor-pointer"
                                    title={assignedPickerName ? `Unassign ${assignedPickerName} from this item` : "Unassign picker"}
                                  >
                                    {assigningItemId === item.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <UserMinus className="h-3.5 w-3.5" />
                                    )}
                                    Unassign
                                  </button>
                                ) : isNewOrPickingStage ? (
                                  hasVsTag ? (
                                    <button
                                      type="button"
                                      onClick={() => handleItemReadyToAssign(item)}
                                      disabled={readyAssigningItemId === item.id}
                                      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/80 px-3 text-xs font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 cursor-pointer"
                                      title={`Mark ${item.name} as Ready to Assign`}
                                    >
                                      {readyAssigningItemId === item.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                      )}
                                      Ready to Assign
                                    </button>
                                  ) : (
                                    /* Virtual Stock (VS) items do not need a picker, regular pending items do */
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
                                  )
                                ) : null}
                              </>
                            );
                          })()}

                          {/* Installation status — shown only if item is installable or already scheduled */}
                          {itemIsScheduled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Scheduled
                              {!isDelivered && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelClick(item)}
                                  className="ml-0.5 rounded-full p-0.5 cursor-pointer transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  aria-label="Cancel scheduled installation"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          ) : !isDelivered && isInstallable ? (
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
        {fcs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm font-medium text-muted-foreground">
            No items found for this order.
          </div>
        )}
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
      {/* ── Cancel Item from Order Dialog ── */}
      <Dialog open={cancelItemModalOpen} onOpenChange={setCancelItemModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[480px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl">
          <div className="p-5 sm:p-7">
            <DialogHeader className="mb-4 text-left">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-destructive flex items-center gap-2">
                <XCircle className="h-6 w-6" />
                Cancel Item
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Are you sure you want to cancel this item from the delivery order?
              </DialogDescription>
            </DialogHeader>

            {itemToCancelFromOrder && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                    {itemToCancelFromOrder.image ? (
                      <img
                        src={itemToCancelFromOrder.image}
                        alt={itemToCancelFromOrder.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {itemToCancelFromOrder.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Qty: <span className="font-semibold text-foreground">{itemToCancelFromOrder.qty}</span> • SKU: <span className="font-mono">{itemToCancelFromOrder.sku}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Price: QAR {itemToCancelFromOrder.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cancel-item-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reason for Cancellation <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="cancel-item-reason"
                    value={cancelItemReason}
                    onChange={(e) => setCancelItemReason(e.target.value)}
                    placeholder="E.g., Customer requested cancellation, damaged, out of stock..."
                    className="h-10 text-xs bg-background border-border rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-border/40 bg-muted/20 px-5 sm:px-7 py-4 sm:py-5">
            <Button
              variant="outline"
              onClick={() => {
                setCancelItemModalOpen(false);
                setItemToCancelFromOrder(null);
              }}
              className="w-full sm:w-auto rounded-xl font-semibold h-10 text-xs sm:text-sm border-border/60"
              disabled={isCancellingItem}
            >
              Keep Item
            </Button>
            <Button
              onClick={handleConfirmCancelItem}
              disabled={isCancellingItem}
              className="w-full sm:w-auto rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md font-semibold h-10 text-xs sm:text-sm px-6 transition-all"
            >
              {isCancellingItem ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <XCircle className="h-4 w-4 mr-1.5" />
              )}
              Cancel Item
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
  const normStatus = String(status || "").toLowerCase().replace(/_/g, " ").trim();
  const displayStatus = isFlagged
    ? "Flagged"
    : normStatus === "cancelled"
      ? "Cancelled"
      : normStatus === "replacement"
        ? "Replacement"
        : normStatus === "added new" || normStatus === "added"
          ? "Added New"
        : normStatus === "fulfilled" || normStatus === "delivered"
          ? "Fulfilled"
          : assignedUserName && normStatus === "picker assigned"
            ? assignedUserName
            : normStatus === "picker assigned"
              ? "Picker Assigned"
              : normStatus === "ready to assign"
                ? "Ready to Assign"
                : normStatus === "prepared"
                  ? "Prepared"
                : normStatus === "allocated"
                  ? "Allocated"
                  : normStatus === "accepted"
                    ? "Accepted"
                    : normStatus === "pending"
                      ? "Pending"
                      : status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        (displayStatus === "Fulfilled" || displayStatus === "Delivered") &&
          "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-600/40 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs",
        (displayStatus === "Cancelled" || normStatus === "cancelled") &&
          "border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-950/70 dark:text-red-300 shadow-sm",
        (displayStatus === "Added New" || normStatus === "added new" || normStatus === "added" || displayStatus === "Replacement" || normStatus === "replacement") &&
          "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/70 dark:text-sky-300 shadow-xs",
        displayStatus === "Flagged" &&
          "border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-950/70 dark:text-red-300 shadow-sm",
        (displayStatus === "Prepared" || displayStatus === "Ready to Assign" || normStatus === "ready to assign") &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
        displayStatus === "Allocated" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
        displayStatus === "Accepted" &&
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400",
        displayStatus === "Pending" && "border-border bg-muted text-muted-foreground",
        (displayStatus === "Picker Assigned" || normStatus === "picker assigned") &&
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400",
      )}
    >
      {displayStatus === "Cancelled" || normStatus === "cancelled" ? (
        <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
      ) : null}
      {displayStatus === "Added New" || normStatus === "added new" || normStatus === "added" || displayStatus === "Replacement" || normStatus === "replacement" ? (
        <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
      ) : null}
      {displayStatus === "Fulfilled" || displayStatus === "Delivered" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : null}
      {displayStatus === "Flagged" ? (
        <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
      ) : null}
      {displayStatus === "Prepared" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {displayStatus}
    </span>
  );
}
