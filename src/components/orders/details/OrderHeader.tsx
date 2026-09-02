import {
  ChevronDown,
  Printer,
  UserPlus,
  RotateCcw,
  PackageCheck,
  Package,
  Truck,
  CreditCard,
  Warehouse,
  XCircle,
  Undo2,
  RefreshCw,
  Zap,
  Gift,
  Calendar,
  Clock,
  Globe,
  ShoppingBag,
  Store,
  Timer,
  CheckCircle2,
  User,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { PrintInvoiceDialog } from "../PrintInvoiceDialog";
import { useState, useEffect } from "react";
import { getOrderItemsCount, type EnrichedOrder, isUnpaidPayLaterOrder } from "@/lib/orders";
import { useQueryClient } from "@tanstack/react-query";
import { orderKeys } from "@/hooks/useOrders";
import { ordersApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getUsers, getPickers, getPackers, getDrivers, type ManagedUser } from "@/lib/sync";

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  action: string;
  variant: "default" | "destructive";
  onConfirm: () => void;
}

const INITIAL_CONFIRM: ConfirmState = {
  open: false,
  title: "",
  description: "",
  action: "",
  variant: "default",
  onConfirm: () => { },
};

export function OrderHeader({ order }: { order: EnrichedOrder }) {
  const [printOpen, setPrintOpen] = useState(false);
  const [giftPrintOpen, setGiftPrintOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(INITIAL_CONFIRM);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [pickersList, setPickersList] = useState<ManagedUser[]>([]);
  const [packersList, setPackersList] = useState<ManagedUser[]>([]);
  const [driversList, setDriversList] = useState<ManagedUser[]>([]);
  const [loadingPickers, setLoadingPickers] = useState(false);
  const [loadingPackers, setLoadingPackers] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  useEffect(() => {
    getUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load users:", err));

    setLoadingPickers(true);
    getPickers()
      .then((data) => setPickersList(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load pickers:", err))
      .finally(() => setLoadingPickers(false));

    setLoadingPackers(true);
    getPackers()
      .then((data) => setPackersList(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load packers:", err))
      .finally(() => setLoadingPackers(false));

    setLoadingDrivers(true);
    getDrivers()
      .then((data) => setDriversList(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load drivers:", err))
      .finally(() => setLoadingDrivers(false));
  }, []);

  // Custom dialog states
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selectedPicker, setSelectedPicker] = useState("");
  const [selectedPickerItems, setSelectedPickerItems] = useState<string[]>([]);

  const [packingOverrideOpen, setPackingOverrideOpen] = useState(false);
  const [selectedPacker, setSelectedPacker] = useState("");
  const [selectedPackerItems, setSelectedPackerItems] = useState<string[]>([]);

  useEffect(() => {
    if (overrideOpen && order?.itemsList) {
      setSelectedPickerItems(order.itemsList.map((i) => i.id));
    }
  }, [overrideOpen, order?.itemsList]);

  useEffect(() => {
    if (packingOverrideOpen && order?.itemsList) {
      setSelectedPackerItems(order.itemsList.map((i) => i.id));
    }
  }, [packingOverrideOpen, order?.itemsList]);

  const [adjustDriverOpen, setAdjustDriverOpen] = useState(false);
  const [driverNameInput, setDriverNameInput] = useState("");
  const [selectedDriverStatus, setSelectedDriverStatus] = useState("None");

  const [updatePaymentOpen, setUpdatePaymentOpen] = useState(false);
  const [paymentMethodInput, setPaymentMethodInput] = useState("Cash");
  const [paymentBalanceInput, setPaymentBalanceInput] = useState(0);

  const [bypassOpen, setBypassOpen] = useState(false);
  const [bypassReasonType, setBypassReasonType] = useState("");
  const [bypassReasonText, setBypassReasonText] = useState("");

  const [cancelAllocationOpen, setCancelAllocationOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedCancelItems, setSelectedCancelItems] = useState<string[]>([]);

  const [sendToDriverOpen, setSendToDriverOpen] = useState(false);
  const [selectedSendDriver, setSelectedSendDriver] = useState("");

  const [actionsLoading, setActionsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAction = async (
    actionName: string,
    actionFn: () => Promise<void>
  ) => {
    setActionsLoading(true);
    try {
      await actionFn();
      toast.success(`${actionName} completed successfully`);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    } catch (err) {
      toast.error(`Failed to perform action: ${actionName}`);
      console.error(err);
    } finally {
      setActionsLoading(false);
    }
  };

  const showConfirm = (
    title: string,
    description: string,
    action: string,
    onConfirm: () => void,
    variant: "default" | "destructive" = "default"
  ) => {
    setConfirm({
      open: true,
      title,
      description,
      action,
      variant,
      onConfirm: () => {
        onConfirm();
        setConfirm(INITIAL_CONFIRM);
      },
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col gap-6 p-4 sm:p-5">
        {/* Top Section: Redesigned Two-Column Layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">

          {/* Left Block: Order Info */}
          <div className="flex flex-col gap-3">
            <div>
              {(() => {
                const rawNum = order.shopifyOrderId || order.orderNumber || order.id;
                const cleanNum = String(rawNum).replace(/^#+/, "");
                return (
                  <>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                      #{cleanNum}
                    </h1>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      Order #{cleanNum}
                    </p>
                  </>
                );
              })()}
            </div>

            <div className="flex flex-col items-start gap-2.5 mt-2">
              {/* Dynamic Status Badge */}
              <div className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ring-inset shadow-sm",
                order.status === "Delivered" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20" :
                  order.status === "Delivery Failed" || order.status === "Cancelled" ? "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20" :
                    order.status === "Started" || order.status === "Driver Accepted" ? "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20" :
                      order.status === "Ready to Assign" ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20" :
                        "bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20"
              )}>
                {order.status === "Delivered" ? <CheckCircle2 className="h-4 w-4" /> :
                  order.status === "Delivery Failed" ? <XCircle className="h-4 w-4" /> :
                    order.status === "Started" ? <Clock className="h-4 w-4" /> :
                      <Package className="h-4 w-4" />}
                {order.status}
              </div>

              {/* Driver Badge */}
              {order.driver && order.driver.toLowerCase() !== "unassigned" && (
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                  <User className="h-3.5 w-3.5 opacity-70" />
                  {order.driver}
                </div>
              )}
            </div>
          </div>

          {/* Right Block: Actions */}
          <div className="flex flex-wrap items-center lg:items-start lg:justify-end gap-3 self-center">
            <Button variant="outline" className="gap-2 bg-background shrink-0 whitespace-nowrap" onClick={() => setPrintOpen(true)}>
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>

            <Button
              variant="outline"
              className="gap-2 bg-background border-pink-200 text-pink-700 hover:bg-pink-50/50 hover:text-pink-800 dark:border-pink-500/30 dark:text-pink-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-300 shrink-0 whitespace-nowrap"
              onClick={() => setGiftPrintOpen(true)}
            >
              <Gift className="h-4 w-4 text-pink-500" />
              Print Gift Invoice
            </Button>

            {/* ── Grouped Actions Dropdown ── */}
            {isUnpaidPayLaterOrder(order) ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="outline" className="gap-2 bg-background font-semibold shrink-0 whitespace-nowrap opacity-60" disabled>
                        <Zap className="h-4 w-4" />
                        Actions
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Actions blocked: Order payment is pending</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-background font-semibold shrink-0 whitespace-nowrap" disabled={actionsLoading}>
                    {actionsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Actions
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5">
                  {/* ── Determine active stage for contextual actions ── */}
                  {(() => {
                    const isNewStage = ["New", "Unfulfilled"].includes(order.status);
                    const isPickingStage = order.status === "Picking";
                    const isPickedStage = order.status === "Picked";
                    const isPackingStage = order.status === "Packing";
                    const isReadyToAssignStage = order.status === "Ready to Assign";
                    const isDriverStage = ["Driver Accepted", "Started", "Delivered", "Delivery Failed"].includes(order.status);
                    const isOtherStage = !isNewStage && !isPickingStage && !isPickedStage && !isPackingStage && !isReadyToAssignStage && !isDriverStage;

                    const showForceToPicking = isNewStage || isOtherStage;
                    const showResetPickerAssignment = isPickingStage || isOtherStage;

                    const showForceToPacking = isPickedStage || isOtherStage;
                    const showResetPackerAssignment = isPackingStage || isOtherStage;
                    const showRollbackToPicked = isPickedStage || isPackingStage || isReadyToAssignStage || isDriverStage || isOtherStage;

                    const showAdjustDriverStatus = isReadyToAssignStage || isDriverStage || isOtherStage;
                    const showSendToDriver = isReadyToAssignStage && order.itemsList.length > 0 && !order.driver;

                    return (
                      <>
                        {/* ── Picking Actions ── */}
                        {(showForceToPicking || showResetPickerAssignment) && (
                          <>
                            <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                              Picking
                            </DropdownMenuLabel>
                            <DropdownMenuGroup>
                              {showForceToPicking && (
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
                                  onClick={() => {
                                    setSelectedPicker(order.picker || "");
                                    setOverrideOpen(true);
                                  }}
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </div>
                                  Force to Picking
                                </DropdownMenuItem>
                              )}
                              {showResetPickerAssignment && (
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
                                  onClick={() =>
                                    showConfirm(
                                      "Reset Picker Assignment",
                                      "The currently assigned picker will be removed. The order will remain in its current status but become unassigned.",
                                      "Reset Assignment",
                                      () => handleAction("Reset Picker Assignment", async () => {
                                        const allItemIds = order.itemsList.map((i) => i.id);
                                        await ordersApi.unassignPickerItems(order.id, allItemIds);
                                        await ordersApi.assignPicker(order.id, "");
                                      })
                                    )
                                  }
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </div>
                                  Reset Picker Assignment
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="my-1.5" />
                          </>
                        )}

                        {/* ── Packing Actions ── */}
                        {(showForceToPacking || showResetPackerAssignment || showRollbackToPicked) && (
                          <>
                            <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                              Packing
                            </DropdownMenuLabel>
                            <DropdownMenuGroup>
                              {showForceToPacking && (
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
                                  onClick={() => {
                                    setSelectedPacker(order.packer || "");
                                    setPackingOverrideOpen(true);
                                  }}
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <PackageCheck className="h-3.5 w-3.5" />
                                  </div>
                                  Force to Packing
                                </DropdownMenuItem>
                              )}
                              {showResetPackerAssignment && (
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
                                  onClick={() =>
                                    showConfirm(
                                      "Reset Packer Assignment",
                                      "The currently assigned packer will be removed. The order will remain in its current status but become unassigned.",
                                      "Reset Assignment",
                                      () => handleAction("Reset Packer Assignment", async () => {
                                        const allItemIds = order.itemsList.map((i) => i.id);
                                        await ordersApi.unassignPackerItems(order.id, allItemIds);
                                        await ordersApi.assignPacker(order.id, "");
                                      })
                                    )
                                  }
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </div>
                                  Reset Packer Assignment
                                </DropdownMenuItem>
                              )}
                              {showRollbackToPicked && (
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
                                  onClick={() =>
                                    showConfirm(
                                      "Rollback to Picked",
                                      "This will revert the order status back to 'Picked', removing any packer progress. Use this if packing needs to be redone.",
                                      "Rollback",
                                      () => handleAction("Rollback to Picked", async () => {
                                        const allItemIds = order.itemsList.map((i) => i.id);
                                        await ordersApi.unassignPackerItems(order.id, allItemIds);
                                        await ordersApi.updateOrderStatus(order.id, "Picked");
                                        await ordersApi.assignPacker(order.id, "");
                                      })
                                    )
                                  }
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Undo2 className="h-3.5 w-3.5" />
                                  </div>
                                  Rollback to Picked
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="my-1.5" />
                          </>
                        )}

                        {/* ── Driver Actions ── */}
                        {(showAdjustDriverStatus || showSendToDriver) && (
                          <>
                            <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                              Driver
                            </DropdownMenuLabel>
                            <DropdownMenuGroup>
                              {showAdjustDriverStatus && (
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
                                  onClick={() => {
                                    setDriverNameInput(order.driver || "");
                                    setSelectedDriverStatus(order.driverStatus || "None");
                                    setAdjustDriverOpen(true);
                                  }}
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                    <Truck className="h-3.5 w-3.5" />
                                  </div>
                                  Adjust Driver Status
                                </DropdownMenuItem>
                              )}
                              {showSendToDriver && (
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
                                  onClick={() => {
                                    setSelectedSendDriver("");
                                    setSendToDriverOpen(true);
                                  }}
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Truck className="h-3.5 w-3.5" />
                                  </div>
                                  Send to Driver
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="my-1.5" />
                          </>
                        )}

                        {/* ── Payment Actions ── */}
                        <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                          Payment
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
                            onClick={() => {
                              setPaymentMethodInput(order.payment?.method || "Cash");
                              setPaymentBalanceInput(order.payment?.balance || 0);
                              setUpdatePaymentOpen(true);
                            }}
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <CreditCard className="h-3.5 w-3.5" />
                            </div>
                            Update Payment Details
                          </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator className="my-1.5" />

                        {/* ── Warehouse Actions ── */}
                        <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                          Warehouse
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
                            onClick={() => {
                              setBypassReasonType("");
                              setBypassReasonText("");
                              setBypassOpen(true);
                            }}
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              <Warehouse className="h-3.5 w-3.5" />
                            </div>
                            Bypass Warehouse (Direct)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-destructive focus:text-destructive"
                            onClick={() => {
                              setCancelReason("");
                              setSelectedCancelItems([]);
                              setCancelAllocationOpen(true);
                            }}
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                              <XCircle className="h-3.5 w-3.5" />
                            </div>
                            Cancel Allocation
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    );
                  })()}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Info Row: Date, Time, Channel */}
        <div className="grid gap-6 sm:grid-cols-3 lg:w-[60%]">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Order Date
            </div>
            <div className="mt-1.5 text-sm font-semibold text-foreground">{order.date}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Order Time
            </div>
            <div className="mt-1.5 text-sm font-semibold text-foreground">{order.time}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              {order.channel === "shopify" ? (
                <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
              ) : order.channel === "web" ? (
                <Globe className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Store className="h-3.5 w-3.5 shrink-0" />
              )}
              Channel
            </div>
            <div className="mt-1.5 text-sm font-semibold capitalize text-foreground">{order.channel}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        <SummaryItem
          label="Payment"
          value={
            order.payment?.status
              ? order.payment.status.replace(/_/g, " ").charAt(0).toUpperCase() + order.payment.status.replace(/_/g, " ").slice(1).toLowerCase()
              : order.payment?.balance > 0
              ? "Balance due"
              : "Paid"
          }
          Icon={CreditCard}
          tooltip="Current payment status of the order."
        />
        <SummaryItem
          label="Delivery"
          value={order.driverStatus ?? order.status}
          Icon={Truck}
          tooltip="Current delivery/driver assignment status."
        />
        <SummaryItem
          label="Items"
          value={`${getOrderItemsCount(order)} Item${getOrderItemsCount(order) === 1 ? "" : "s"}`}
          Icon={Package}
          tooltip="Total quantity of items in this order."
        />
        <SummaryItem
          label="TAT"
          value={order.tat}
          Icon={Timer}
          tooltip="Turnaround Time: Time elapsed since order creation."
        />
      </div>

      <PrintInvoiceDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        orders={[order]}
      />

      <PrintInvoiceDialog
        open={giftPrintOpen}
        onOpenChange={setGiftPrintOpen}
        orders={[order]}
        isGift
      />

      {/* ── Warehouse Override Dialog (Force to Picking) ── */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-xl border border-border bg-card shadow-lg p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Warehouse Override (Picking)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a picker and confirm items to assign for picking.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="picker-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Picker <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedPicker} onValueChange={setSelectedPicker}>
                <SelectTrigger id="picker-select" className="h-10 w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder={loadingPickers ? "Loading pickers..." : "Select a picker"} />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-border shadow-md">
                  {loadingPickers ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">Loading pickers...</div>
                  ) : (pickersList.length > 0 ? pickersList : users.filter((u) => u.role === "picker" && u.status === "active")).map((p) => (
                    <SelectItem key={p.id} value={p.email || p.name || p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirm Items to Pick <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPickerItems.length === order.itemsList.length) {
                      setSelectedPickerItems([]);
                    } else {
                      setSelectedPickerItems(order.itemsList.map((i) => i.id));
                    }
                  }}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {selectedPickerItems.length === order.itemsList.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-[180px] overflow-y-auto space-y-2">
                {order.itemsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No items found in order.</p>
                ) : (
                  order.itemsList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between space-x-3 py-1 border-b border-border/40 last:border-0">
                      <div className="flex items-center space-x-3 min-w-0">
                        <Checkbox
                          id={`picker-item-${item.id}`}
                          checked={selectedPickerItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPickerItems([...selectedPickerItems, item.id]);
                            } else {
                              setSelectedPickerItems(selectedPickerItems.filter((id) => id !== item.id));
                            }
                          }}
                        />
                        <div className="grid gap-0.5 truncate">
                          <Label
                            htmlFor={`picker-item-${item.id}`}
                            className="text-xs font-medium text-foreground cursor-pointer truncate"
                            title={item.name}
                          >
                            {item.name}
                          </Label>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            SKU: {item.sku}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">
                        Qty: {item.qty}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-[11px] text-muted-foreground text-right">
                {selectedPickerItems.length} of {order.itemsList.length} items selected
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setOverrideOpen(false)} className="rounded-lg font-medium">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedPicker) {
                  toast.error("Please select a picker");
                  return;
                }
                if (selectedPickerItems.length === 0) {
                  toast.error("Please select at least one item to assign");
                  return;
                }
                handleAction("Force to Picking", async () => {
                  const pickerObj = (pickersList.length > 0 ? pickersList : users).find(
                    (p) => p.id === selectedPicker || p.email === selectedPicker || p.name === selectedPicker
                  );
                  const pickerId = pickerObj
                    ? (!isNaN(Number(pickerObj.id)) ? Number(pickerObj.id) : null)
                    : (!isNaN(Number(selectedPicker)) ? Number(selectedPicker) : null);
                  const pickerName = pickerObj
                    ? (pickerObj.email || pickerObj.name)
                    : selectedPicker;

                  await ordersApi.assignPickerItems(
                    order.id,
                    pickerId !== null ? pickerId : selectedPicker,
                    selectedPickerItems,
                    pickerName
                  );
                  await ordersApi.updateOrderStatus(order.id, "Picking");
                  await ordersApi.assignPicker(order.id, selectedPicker);
                });
                setOverrideOpen(false);
              }}
              disabled={!selectedPicker || selectedPickerItems.length === 0 || actionsLoading}
              className="rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all shadow-md"
            >
              {actionsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Warehouse Override Dialog (Force to Packing) ── */}
      <Dialog open={packingOverrideOpen} onOpenChange={setPackingOverrideOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-xl border border-border bg-card shadow-lg p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Warehouse Override (Packing)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a packer and confirm items to assign for packing.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="packer-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Packer <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedPacker} onValueChange={setSelectedPacker}>
                <SelectTrigger id="packer-select" className="h-10 w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder={loadingPackers ? "Loading packers..." : "Select a packer"} />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-border shadow-md">
                  {loadingPackers ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">Loading packers...</div>
                  ) : (packersList.length > 0 ? packersList : users.filter((u) => u.role === "packer" && u.status === "active")).map((p) => (
                    <SelectItem key={p.id} value={p.email || p.name || p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirm Items to Pack <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPackerItems.length === order.itemsList.length) {
                      setSelectedPackerItems([]);
                    } else {
                      setSelectedPackerItems(order.itemsList.map((i) => i.id));
                    }
                  }}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {selectedPackerItems.length === order.itemsList.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-[180px] overflow-y-auto space-y-2">
                {order.itemsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No items found in order.</p>
                ) : (
                  order.itemsList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between space-x-3 py-1 border-b border-border/40 last:border-0">
                      <div className="flex items-center space-x-3 min-w-0">
                        <Checkbox
                          id={`packer-item-${item.id}`}
                          checked={selectedPackerItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPackerItems([...selectedPackerItems, item.id]);
                            } else {
                              setSelectedPackerItems(selectedPackerItems.filter((id) => id !== item.id));
                            }
                          }}
                        />
                        <div className="grid gap-0.5 truncate">
                          <Label
                            htmlFor={`packer-item-${item.id}`}
                            className="text-xs font-medium text-foreground cursor-pointer truncate"
                            title={item.name}
                          >
                            {item.name}
                          </Label>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            SKU: {item.sku}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">
                        Qty: {item.qty}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-[11px] text-muted-foreground text-right">
                {selectedPackerItems.length} of {order.itemsList.length} items selected
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setPackingOverrideOpen(false)} className="rounded-lg font-medium">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedPacker) {
                  toast.error("Please select a packer");
                  return;
                }
                if (selectedPackerItems.length === 0) {
                  toast.error("Please select at least one item to assign");
                  return;
                }
                handleAction("Force to Packing", async () => {
                  const packerObj = packersList.find((p) => p.id === selectedPacker || p.email === selectedPacker || p.name === selectedPacker);
                  const packerId = packerObj ? packerObj.id : selectedPacker;
                  const packerName = packerObj ? packerObj.name : selectedPacker;

                  await ordersApi.assignPackerItems(order.id, packerId, selectedPackerItems, packerName);
                  await ordersApi.updateOrderStatus(order.id, "Packing");
                  await ordersApi.assignPacker(order.id, selectedPacker);
                });
                setPackingOverrideOpen(false);
              }}
              disabled={!selectedPacker || selectedPackerItems.length === 0 || actionsLoading}
              className="rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all shadow-md"
            >
              {actionsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Adjust Driver Status Dialog ── */}
      <Dialog open={adjustDriverOpen} onOpenChange={setAdjustDriverOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-xl border border-border bg-card shadow-lg p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Adjust Driver Status
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manually override the driver's delivery status for this order.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="driver-name-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Driver Name
              </Label>
              <Select value={driverNameInput} onValueChange={setDriverNameInput}>
                <SelectTrigger id="driver-name-select" className="h-10 w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder={loadingDrivers ? "Loading drivers..." : "Select a driver"} />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-border shadow-md">
                  {loadingDrivers ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">Loading drivers...</div>
                  ) : (driversList.length > 0 ? driversList : users.filter((u) => u.role === "driver" && u.status === "active")).map((d) => (
                    <SelectItem key={d.id} value={d.email || d.name || d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver-status-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Driver Status
              </Label>
              <Select value={selectedDriverStatus} onValueChange={setSelectedDriverStatus}>
                <SelectTrigger id="driver-status-select" className="h-10 w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select driver status" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-border shadow-md">
                  <SelectItem value="Ready to Assign">Ready to Assign (Assigned)</SelectItem>
                  <SelectItem value="Driver Accepted">Driver Accepted</SelectItem>
                  <SelectItem value="Started">Started</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Delivery Failed">Delivery Failed</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setAdjustDriverOpen(false)} className="rounded-lg font-medium">
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleAction("Adjust Driver Status", async () => {
                  await ordersApi.assignDriver(order.id, driverNameInput);
                  await ordersApi.updateDriverStatus(order.id, selectedDriverStatus === "None" ? "" : selectedDriverStatus);
                  if (selectedDriverStatus !== "None" && selectedDriverStatus !== "Ready to Assign") {
                    await ordersApi.updateOrderStatus(order.id, selectedDriverStatus);
                  }
                });
                setAdjustDriverOpen(false);
              }}
              disabled={actionsLoading}
              className="rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all shadow-md"
            >
              {actionsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Update Payment Details Dialog ── */}
      <Dialog open={updatePaymentOpen} onOpenChange={setUpdatePaymentOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-xl border border-border bg-card shadow-lg p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Update Payment Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify payment method and outstanding transaction balance.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Method
              </Label>
              <Select value={paymentMethodInput} onValueChange={setPaymentMethodInput}>
                <SelectTrigger id="payment-method-select" className="h-10 w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-border shadow-md">
                  <SelectItem value="Cash">Cash (COD)</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Split">Split</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-balance-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Balance Due (QAR)
              </Label>
              <Input
                id="payment-balance-input"
                type="number"
                value={paymentBalanceInput}
                onChange={(e) => setPaymentBalanceInput(Number(e.target.value))}
                placeholder="0.00"
                className="h-10 w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setUpdatePaymentOpen(false)} className="rounded-lg font-medium">
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleAction("Update Payment Details", async () => {
                  await ordersApi.updatePaymentDetails(order.id, paymentMethodInput, paymentBalanceInput);
                });
                setUpdatePaymentOpen(false);
              }}
              disabled={actionsLoading}
              className="rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all shadow-md"
            >
              {actionsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bypass Warehouse Dialog ── */}
      <Dialog open={bypassOpen} onOpenChange={setBypassOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-xl border border-border bg-card shadow-lg p-6">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Bypass Warehouse
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              You are about to bypass the warehouse process for this order.
              Please provide a reason before continuing.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bypass-reason-type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reason Type <span className="text-destructive">*</span>
              </Label>
              <Select value={bypassReasonType} onValueChange={(v) => { setBypassReasonType(v); if (v !== "Other") setBypassReasonText(""); }}>
                <SelectTrigger id="bypass-reason-type" className="h-10 w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-border shadow-md">
                  <SelectItem value="Emergency Order">Emergency Order</SelectItem>
                  <SelectItem value="Direct Delivery">Direct Delivery</SelectItem>
                  <SelectItem value="Stock Already Available">Stock Already Available</SelectItem>
                  <SelectItem value="Manual Override">Manual Override</SelectItem>
                  <SelectItem value="Management Approval">Management Approval</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bypassReasonType === "Other" && (
              <div className="space-y-2">
                <Label htmlFor="bypass-reason-text" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Additional Comments <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="bypass-reason-text"
                  value={bypassReasonText}
                  onChange={(e) => setBypassReasonText(e.target.value)}
                  placeholder="Enter the reason for bypassing the warehouse process..."
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 resize-none text-sm"
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {bypassReasonText.length}/500 characters{bypassReasonText.length > 0 && bypassReasonText.length < 10 && (
                    <span className="text-destructive ml-1">(min 10)</span>
                  )}
                </p>
              </div>
            )}

            {bypassReasonType && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5 p-3">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  ⚠ This will skip the warehouse fulfillment workflow entirely and mark the order for direct shipping. This action is logged for auditing purposes.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setBypassOpen(false)} className="rounded-lg font-medium">
              Cancel
            </Button>
            <Button
              disabled={
                !bypassReasonType ||
                (bypassReasonType === "Other" && bypassReasonText.trim().length < 10) ||
                actionsLoading
              }
              onClick={() => {
                const reason = bypassReasonType === "Other" ? bypassReasonText.trim() : bypassReasonType;
                handleAction("Bypass Warehouse", async () => {
                  await ordersApi.updateOrderStatus(order.id, "Ready to Assign");
                  // Audit log entry
                  console.info(
                    `[AUDIT] Warehouse Bypassed | Order: ${order.id} | Reason Type: ${bypassReasonType} | Reason: ${reason} | Timestamp: ${new Date().toISOString()}`
                  );
                });
                setBypassOpen(false);
              }}
              className="rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-all shadow-md dark:bg-amber-600 dark:hover:bg-amber-700"
            >
              Confirm Bypass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send to Driver Dialog ── */}
      <Dialog open={sendToDriverOpen} onOpenChange={setSendToDriverOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-xl border border-border bg-card shadow-lg p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Send Order to Driver
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="send-driver-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Driver <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedSendDriver} onValueChange={setSelectedSendDriver}>
                <SelectTrigger id="send-driver-select" className="h-10 w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder={loadingDrivers ? "Loading drivers..." : "Select a driver"} />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-border shadow-md">
                  {loadingDrivers ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">Loading drivers...</div>
                  ) : (driversList.length > 0 ? driversList : users.filter((u) => u.role === "driver" && u.status === "active")).map((d) => (
                    <SelectItem key={d.id} value={d.email || d.name || d.id}>
                      {d.name} {d.email ? `(${d.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
                Assignment Summary
              </h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Order Number:</span>
                <span className="font-medium text-foreground text-right">{order.id}</span>
                
                <span className="text-muted-foreground">Customer Name:</span>
                <span className="font-medium text-foreground text-right truncate" title={order.customer.name}>{order.customer.name}</span>
                
                <span className="text-muted-foreground">Delivery Address:</span>
                <span className="font-medium text-foreground text-right truncate" title={order.zone || "No Zone"}>{order.zone || "No Zone"}</span>
                
                <span className="text-muted-foreground">Total Items:</span>
                <span className="font-medium text-foreground text-right">{order.itemsList.length}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setSendToDriverOpen(false)}
              className="rounded-lg font-medium"
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedSendDriver || actionsLoading}
              onClick={() => {
                handleAction("Send to Driver", async () => {
                  const timestamp = new Date().toISOString();
                  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

                  // Assign driver and update status
                  await ordersApi.assignDriver(order.id, selectedSendDriver);

                  // Capture audit info in logs
                  console.info(
                    `[AUDIT] Order Sent to Driver | Order: ${order.id} | Driver: ${selectedSendDriver} | Assigned By: Admin User | Timestamp: ${timestamp}`
                  );

                  // Append timeline event
                  const customEvents = JSON.parse(localStorage.getItem("hm_custom_timeline_events") || "[]");
                  customEvents.push({
                    orderId: order.id,
                    id: `custom-tl-${Date.now()}`,
                    title: "Order sent to driver.",
                    date: dateStr,
                    time: timeStr,
                    description: `Driver:\n${selectedSendDriver}\n\nAssigned By:\nAdmin User\n\nDate:\n${timestamp.replace("T", " ").substring(0, 19)}`,
                    actor: "Admin User",
                    actorRole: "admin",
                    type: "driver_assigned",
                  });
                  localStorage.setItem("hm_custom_timeline_events", JSON.stringify(customEvents));
                });
                setSendToDriverOpen(false);
              }}
              className="rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Send to Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Allocation Dialog ── */}
      <Dialog open={cancelAllocationOpen} onOpenChange={setCancelAllocationOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-xl border border-border bg-card shadow-lg p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Cancel Allocation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide a reason for the cancellation. Optionally select specific line items to cancel. If no line items are selected, the allocation will be cancelled for the entire order.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Section 1: Reason */}
            <div className="space-y-2">
              <Label htmlFor="cancel-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation"
                minLength={10}
                maxLength={500}
                rows={3}
                className="w-full bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 resize-none text-sm"
              />
              <p className="text-[11px] text-muted-foreground text-right flex justify-between items-center">
                <span>
                  {cancelReason.length > 0 && cancelReason.length < 10 ? (
                    <span className="text-destructive">Please provide a reason for cancellation.</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground">
                  {cancelReason.length}/500 characters
                </span>
              </p>
            </div>

            {/* Section 2: Line Items */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Line Items (optional)
              </Label>
              <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-[160px] overflow-y-auto space-y-2">
                {order.itemsList.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3 py-1">
                    <Checkbox
                      id={`cancel-item-${item.id}`}
                      checked={selectedCancelItems.includes(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCancelItems([...selectedCancelItems, item.id]);
                        } else {
                          setSelectedCancelItems(selectedCancelItems.filter((id) => id !== item.id));
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1">
                      <Label
                        htmlFor={`cancel-item-${item.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
                      >
                        {item.name} × {item.qty}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        SKU: {item.sku} • Status: {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                If no items are selected, the entire order allocation will be cancelled.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCancelAllocationOpen(false)}
              className="rounded-lg font-medium"
            >
              Close
            </Button>
            <Button
              disabled={
                cancelReason.trim().length < 10 ||
                cancelReason.trim().length > 500 ||
                actionsLoading
              }
              onClick={() => {
                const reason = cancelReason.trim();
                handleAction("Cancel Allocation", async () => {
                  const timestamp = new Date().toISOString();
                  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

                  if (selectedCancelItems.length === 0) {
                    // Cancel entire order
                    await ordersApi.updateOrderStatus(order.id, "Cancelled");
                  } else {
                    // Cancel allocation for selected items
                    const existingCancelled = JSON.parse(localStorage.getItem("hm_cancelled_items") || "[]");
                    const newCancelled = [...existingCancelled, ...selectedCancelItems];
                    localStorage.setItem("hm_cancelled_items", JSON.stringify(newCancelled));
                  }

                  // Capture audit info in logs
                  console.info(
                    `[AUDIT] Allocation Cancelled | Order: ${order.id} | User ID: admin_user_1 | User Name: Admin User | Reason: ${reason} | Items: ${selectedCancelItems.length > 0 ? selectedCancelItems.join(", ") : "Entire Order"} | Timestamp: ${timestamp}`
                  );

                  // Append timeline event
                  const selectedItemsList = order.itemsList.filter((item) =>
                    selectedCancelItems.includes(item.id)
                  );
                  const customEvents = JSON.parse(localStorage.getItem("hm_custom_timeline_events") || "[]");
                  customEvents.push({
                    orderId: order.id,
                    id: `custom-tl-${Date.now()}`,
                    title: "Allocation Cancelled",
                    date: dateStr,
                    time: timeStr,
                    description: `Reason: ${reason}\nCancelled By: Admin User\nDate: ${timestamp}\n${
                      selectedItemsList.length > 0
                        ? `Allocation cancelled for:\n${selectedItemsList.map((item) => `- ${item.name}`).join("\n")}`
                        : "Allocation cancelled for the entire order."
                    }`,
                    actor: "Admin User",
                    actorRole: "admin",
                    type: "cancelled",
                  });
                  localStorage.setItem("hm_custom_timeline_events", JSON.stringify(customEvents));
                });
                setCancelAllocationOpen(false);
              }}
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold transition-all shadow-md"
            >
              Cancel Allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog ── */}
      <AlertDialog open={confirm.open} onOpenChange={(open) => !open && setConfirm(INITIAL_CONFIRM)}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">{confirm.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              {confirm.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm.onConfirm}
              className={
                confirm.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                  : "font-semibold"
              }
            >
              {confirm.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SummaryItem({ label, value, Icon, tooltip }: { label: string; value: string; Icon: any; tooltip: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col justify-center h-full min-h-[72px] rounded-lg border border-border bg-card px-4 py-3 text-left cursor-default transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </div>
            <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{value}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
