import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Phone, Calendar, CheckCircle2, Clock, Search, X, ChevronRight,
  CalendarClock, CalendarPlus, User, Package, MapPin, Users, Check, AlertCircle,
  ExternalLink, Loader2, RefreshCw, Wrench, ArrowRight, RotateCcw,
  AlertTriangle, CalendarX, Building, Home, Edit3, ChevronDown, ChevronUp,
} from "lucide-react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { useAuth } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useScheduledItems,
  useInstallationLocations,
  useInstallationTeams,
  orderKeys,
} from "@/hooks/useOrders";
import {
  getLocations, getTeams, addAppointment, getAppointments,
  updateAppointment, deleteAppointment, getTeamSlotAvailability,
  type InstallLocation, type InstallTeam, type Appointment, type SlotAvailability,
} from "@/lib/scheduling";
import {
  assignItemSchedule,
  checkTechnicianAvailability,
  createTechnicianSchedule,
  rescheduleTechnicianSchedule,
  normalizeTimeTo24h,
  calculateEndTime,
  parseAddressComponents,
  type CreateTechnicianSchedulePayload,
  type RescheduleTechnicianPayload,
  type ScheduledOrderItem,
  type ApiInstallationLocation,
  type ApiInstallationTeam,
  type TechnicianAvailabilityResponse,
  DEFAULT_INSTALLATION_TEAMS,
} from "@/lib/api/services";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO, startOfToday } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/customer-care")({
  head: () => ({
    meta: [
      { title: "Customer Care Queue - Halamama LMD" },
      { name: "description", content: "Schedule installation appointments for MWH and supplier items." },
    ],
  }),
  component: CustomerCarePage,
});

type CCTab = "Awaiting" | "Scheduled";

function CustomerCarePage() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-5 p-4 md:p-6">
          <CustomerCareContent />
        </main>
      </div>
    </div>
  );
}

function CustomerCareContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CCTab>("Awaiting");
  const [search, setSearch] = useState("");
  const [scheduleItem, setScheduleItem] = useState<ScheduledOrderItem | null>(null);
  const [scheduleMode, setScheduleMode] = useState<"schedule" | "reschedule">("schedule");
  const [callItem, setCallItem] = useState<ScheduledOrderItem | null>(null);

  // Dynamic locations and teams fetched from API, with localStorage/default fallback
  const { data: apiLocations = [] } = useInstallationLocations();
  const { data: apiTeams = [] } = useInstallationTeams();

  const locations = useMemo(() => {
    if (apiLocations && apiLocations.length > 0) return apiLocations;
    return getLocations();
  }, [apiLocations]);

  const teams = useMemo(() => {
    if (apiTeams && apiTeams.length > 0) return apiTeams;
    return getTeams();
  }, [apiTeams]);

  const [appointments, setAppointments] = useState<Appointment[]>(() => getAppointments());
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  // Refresh appointments from store
  const refreshAppts = () => setAppointments(getAppointments());

  // Fetch items where schedule assignment is active: is_scheduled_assigned = 1
  const {
    data: scheduledAssignedData,
    isLoading,
    isRefetching,
    refetch,
  } = useScheduledItems({ is_scheduled_assigned: 1, per_page: 100 });

  const rawItems = scheduledAssignedData?.data || [];

  // Helper to check if an item key is_scheduled_assigned = true
  const isItemScheduledAssigned = (item: ScheduledOrderItem) => {
    return Boolean(
      item.is_scheduled_assigned === true ||
      item.installation?.is_scheduled_assigned === true ||
      (item as any).is_scheduled === true ||
      String(item.is_scheduled_assigned) === "1" ||
      String(item.installation?.is_scheduled_assigned) === "1"
    );
  };

  // Helper to determine if an installation technician/team has been assigned to this item
  const hasTechnicianAssigned = (item: ScheduledOrderItem) => {
    const orderIdStr = String(item.order_id || item.order_number || "").replace(/^#/, "");
    const orderItemId = String(item.order_item_id ?? item.id ?? item.item_id);
    const appt = appointments.find(
      (a) =>
        (a.itemIds && a.itemIds.includes(orderItemId)) ||
        (a.orderId === String(item.order_id) && (!a.itemIds || a.itemIds.length === 0)) ||
        (a.orderId === orderIdStr && (!a.itemIds || a.itemIds.length === 0)) ||
        (a.orderId === item.order_number && (!a.itemIds || a.itemIds.length === 0))
    );
    return Boolean(
      (appt && (appt.teamId || (appt as any).assignedTechnicianId)) ||
      (item as any).technician_id ||
      (item as any).technician_name ||
      (item.installation as any)?.technician_id ||
      (item.installation as any)?.team_id ||
      item.status === "scheduled" ||
      item.status === "installation" ||
      (item.installation as any)?.status === "scheduled"
    );
  };

  // 1. Awaiting Scheduling tab: item key is_scheduled_assigned = true AND no technician assigned yet
  const awaitingItems = useMemo(
    () => rawItems.filter((item) => isItemScheduledAssigned(item) && !hasTechnicianAssigned(item)),
    [rawItems, appointments]
  );

  // 2. Scheduled tab: items with is_scheduled_assigned = true AND technician assigned
  const scheduledItems = useMemo(
    () => rawItems.filter((item) => isItemScheduledAssigned(item) && hasTechnicianAssigned(item)),
    [rawItems, appointments]
  );

  const awaitingCount = awaitingItems.length;
  const scheduledCount = scheduledItems.length;
  const totalCount = awaitingCount + scheduledCount;

  const currentItems = activeTab === "Awaiting" ? awaitingItems : scheduledItems;

  const handleRefresh = async () => {
    await refetch();
    refreshAppts();
    toast.info("Customer care queue refreshed");
  };

  // Filter items by search query
  const displayed = useMemo(() => {
    if (!search.trim()) return currentItems;
    const q = search.toLowerCase().trim().replace(/^#/, "");
    return currentItems.filter((item) => {
      const orderNum = String(item.order_number || item.order?.order_number || item.order_id || "").toLowerCase();
      const custName = String(item.customer_name || item.customer?.name || "").toLowerCase();
      const custPhone = String(item.customer_phone || item.customer?.phone || "").toLowerCase();
      const prodName = String(item.product_name || "").toLowerCase();
      const sku = String(item.product_code || item.barcode || "").toLowerCase();
      const addr = String(item.delivery_address || item.customer?.delivery_address || "").toLowerCase();
      return (
        orderNum.includes(q) ||
        custName.includes(q) ||
        custPhone.includes(q) ||
        prodName.includes(q) ||
        sku.includes(q) ||
        addr.includes(q)
      );
    });
  }, [currentItems, search]);

  const handleUnschedule = async (item: ScheduledOrderItem) => {
    const orderItemId = item.order_item_id ?? item.id ?? item.item_id;
    setActionLoadingId(orderItemId);
    try {
      await assignItemSchedule(orderItemId, false);
      // Remove any matching local appointment
      const orderIdStr = String(item.order_id || item.order_number || "").replace(/^#/, "");
      const appt = appointments.find(
        (a) => a.orderId === String(item.order_id) || a.orderId === orderIdStr || a.orderId === item.order_number
      );
      if (appt) {
        deleteAppointment(appt.id);
        refreshAppts();
      }
      toast.success(`Removed schedule for ${item.product_name}`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    } catch (err: any) {
      console.error("[CustomerCare] Unschedule error:", err);
      toast.error(err?.message || "Failed to remove schedule");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <CalendarClock className="h-6 w-6 text-primary" />
            Customer Care Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Call customers and schedule installation appointments for MWH, supplier, and installable items.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefetching}
          className="rounded-xl flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          <span>Refresh Queue</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Awaiting Scheduling", value: awaitingCount, color: "text-amber-600", bg: "bg-amber-500/10", Icon: Clock },
          { label: "Scheduled", value: scheduledCount, color: "text-blue-600", bg: "bg-blue-500/10", Icon: Calendar },
          { label: "Total Ready to Schedule", value: totalCount, color: "text-primary", bg: "bg-primary/10", Icon: Package },
          { label: "Completed Today", value: appointments.filter((a) => a.status === "Completed").length, color: "text-emerald-600", bg: "bg-emerald-500/10", Icon: CheckCircle2 },
        ].map(({ label, value, color, bg, Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", bg)}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{value}</div>
              <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-muted p-1">
          {(["Awaiting", "Scheduled"] as CCTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-semibold transition-all cursor-pointer",
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "Awaiting" ? "Awaiting Scheduling" : "Scheduled"}
              <span className={cn(
                "ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                activeTab === tab ? "bg-primary/15 text-primary" : "bg-muted-foreground/15 text-muted-foreground",
              )}>
                {tab === "Awaiting" ? awaitingCount : scheduledCount}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order, customer, phone…"
            className="h-10 pl-9 pr-4 w-72 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Item Cards List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
              <div className="flex gap-4 items-center">
                <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold text-foreground text-base">
            {activeTab === "Awaiting" ? "No order items awaiting scheduling" : "No scheduled order items found"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search
              ? "No items match your search filter. Try clearing your search term."
              : activeTab === "Awaiting"
              ? "All installable items have had technicians assigned, or no new items are awaiting scheduling."
              : "Items will appear here once a technician is assigned to them."}
          </p>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-4 rounded-xl">
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((item) => {
            const orderIdStr = String(item.order_id || item.order_number || "").replace(/^#/, "");
            const appt = appointments.find(
              (a) => a.orderId === String(item.order_id) || a.orderId === orderIdStr || a.orderId === item.order_number
            );
            const isActionBusy = actionLoadingId === (item.order_item_id ?? item.id ?? item.item_id);

            return (
              <ScheduledItemCard
                key={item.order_item_id ?? item.id ?? item.item_id}
                item={item}
                appointment={appt}
                teams={teams}
                tab={activeTab}
                isBusy={isActionBusy}
                onCall={() => setCallItem(item)}
                onSchedule={() => {
                  setScheduleMode("schedule");
                  setScheduleItem(item);
                }}
                onReschedule={() => {
                  setScheduleMode("reschedule");
                  setScheduleItem(item);
                }}
                onUnschedule={() => handleUnschedule(item)}
                onViewCalendar={() => navigate({ to: "/calendars", search: { team: appt?.teamId } as any })}
                onViewOrder={() => {
                  const targetId = String(item.order_id || item.order_number || "").replace(/^#/, "");
                  navigate({ to: "/orders/$orderId", params: { orderId: targetId } });
                }}
                onMarkComplete={() => {
                  if (appt) {
                    updateAppointment(appt.id, { status: "Completed" });
                    refreshAppts();
                    toast.success("Appointment marked complete");
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* Call Dialog */}
      {callItem && (
        <CallDialog item={callItem} onClose={() => setCallItem(null)} />
      )}

      {/* Schedule Dialog */}
      {scheduleItem && (
        <ScheduleDialog
          item={scheduleItem}
          initialMode={scheduleMode}
          locations={locations}
          teams={teams}
          onClose={() => setScheduleItem(null)}
          onSaved={() => {
            refreshAppts();
            setScheduleItem(null);
            refetch();
            queryClient.invalidateQueries({ queryKey: orderKeys.all });
          }}
        />
      )}
    </div>
  );
}

function ScheduledItemCard({
  item,
  appointment,
  teams,
  tab,
  isBusy,
  onCall,
  onSchedule,
  onReschedule,
  onUnschedule,
  onViewCalendar,
  onViewOrder,
  onMarkComplete,
}: {
  item: ScheduledOrderItem;
  appointment?: Appointment;
  teams?: (InstallTeam | ApiInstallationTeam)[];
  tab: CCTab;
  isBusy: boolean;
  onCall: () => void;
  onSchedule: () => void;
  onReschedule?: () => void;
  onUnschedule: () => void;
  onViewCalendar: () => void;
  onViewOrder: () => void;
  onMarkComplete: () => void;
}) {
  const orderNum = item.order_number || (item.order?.order_number ? `#${item.order.order_number.replace(/^#/, "")}` : `#${item.order_id}`);
  const customerName = item.customer_name || item.customer?.name || "Customer";
  const customerPhone = item.customer_phone || item.customer?.phone || "";
  const deliveryAddress = item.delivery_address || item.customer?.delivery_address || item.order?.delivery_address || "";
  const orderStatus = item.order_status || item.order?.status || item.status || "pending";
  const installType = item.installation_type || item.installation_level || "Standard Installation";
  const productImage = item.image || item.image_url || item.product_image || item.product_image_url || "";
  const hasTechnician = Boolean(
    (appointment && (appointment.teamId || (appointment as any).assignedTechnicianId)) ||
    (item as any).technician_id ||
    (item as any).technician_name ||
    (item.installation as any)?.technician_id ||
    (item.installation as any)?.team_id ||
    item.status === "scheduled" ||
    (item.installation as any)?.status === "scheduled"
  );
  const matchedTeam = teams?.find(
    (t: any) => String(t.id) === String(appointment?.teamId) || String(t.technician_id) === String(appointment?.teamId)
  );
  const techName = (item as any).technician_name || matchedTeam?.name || (appointment?.teamId ? `Technician #${appointment.teamId}` : null);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Left Side: Order info + Product details */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Header Row: Order Number, Customer, Phone, Address */}
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <button
              onClick={onViewOrder}
              className="inline-flex items-center gap-1 font-mono font-bold text-primary hover:underline cursor-pointer"
            >
              <span>{orderNum}</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </button>

            <span className="text-muted-foreground">·</span>

            <span className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
              orderStatus === "delivered" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
              orderStatus === "picking" || orderStatus === "packing" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
              "bg-blue-500/15 text-blue-600 dark:text-blue-400"
            )}>
              {orderStatus}
            </span>

            <span className="text-muted-foreground">·</span>

            <span className="font-semibold text-foreground">{customerName}</span>

            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-600 font-medium transition-colors"
              >
                <Phone className="h-3 w-3 text-emerald-600" />
                {customerPhone}
              </a>
            )}

            {deliveryAddress && deliveryAddress !== "N/A" && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate max-w-xs" title={deliveryAddress}>
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{deliveryAddress}</span>
              </span>
            )}
          </div>

          {/* Product Block */}
          <div className="flex items-start gap-3.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-background flex items-center justify-center">
              {productImage ? (
                <img
                  src={productImage}
                  alt={item.product_name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <Package className="h-6 w-6 text-muted-foreground/50" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap justify-between">
                <p className="text-sm font-semibold text-foreground truncate max-w-md">
                  {item.product_name}
                </p>
                <span className="text-xs font-bold text-foreground">
                  QAR {Number(item.total_price || item.unit_price || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {item.product_code && <span>SKU: {item.product_code}</span>}
                {item.barcode && <span>· Barcode: {item.barcode}</span>}
                <span>· Qty: {item.quantity || 1}</span>
                {item.unit_price > 0 && <span>· Price: QAR {Number(item.unit_price).toFixed(2)}</span>}
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <Wrench className="h-3 w-3" />
                  {installType}
                </span>

                {hasTechnician ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Technician: {techName || "Assigned"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    <Clock className="h-3 w-3" />
                    Awaiting Technician
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Appointment details if scheduled in appointment store */}
          {appointment && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40 flex-wrap">
              <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="font-semibold text-foreground">
                {appointment.scheduledDate} at {appointment.scheduledTime}
              </span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                appointment.status === "Scheduled" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" :
                appointment.status === "Confirmed" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300" :
                appointment.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" :
                "bg-red-50 text-red-700 border-red-200"
              )}>
                {appointment.status}
              </span>
              {appointment.notes && <span className="text-muted-foreground">· {appointment.notes}</span>}
            </div>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 lg:pt-1">
          <button
            onClick={onCall}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
          >
            <Phone className="h-3.5 w-3.5 text-emerald-600" />
            <span>Call Customer</span>
          </button>

          {tab === "Awaiting" ? (
            <>
              <button
                onClick={onSchedule}
                disabled={isBusy}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                <span>Assign Technician</span>
              </button>
              <button
                onClick={onUnschedule}
                disabled={isBusy}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                title="Cancel schedule assignment"
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                <span>Unschedule</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onReschedule || onSchedule}
                disabled={isBusy}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Reschedule</span>
              </button>
              <button
                onClick={onUnschedule}
                disabled={isBusy}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                title="Remove schedule and return to Awaiting Queue"
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                <span>Unschedule</span>
              </button>
              <button
                onClick={onViewCalendar}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                <span>Calendar</span>
              </button>
              {appointment?.status !== "Completed" && (
                <button
                  onClick={onMarkComplete}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Done</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CallDialog({ item, onClose }: { item: ScheduledOrderItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const phone = item.customer_phone || item.customer?.phone || "";
  const name = item.customer_name || item.customer?.name || "Customer";
  const orderNum = item.order_number || (item.order?.order_number ? `#${item.order.order_number.replace(/^#/, "")}` : `#${item.order_id}`);
  const address = item.delivery_address || item.customer?.delivery_address || item.order?.delivery_address || "";
  const script = `Hello, may I speak with ${name}? This is Halamama Customer Care calling regarding your order ${orderNum}. We have your "${item.product_name}" which includes installation${address ? ` at ${address}` : ""}, and we would like to schedule a convenient time for our specialist team to visit. When would be a good time for you?`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-emerald-600" />
            Call Customer
          </DialogTitle>
          <DialogDescription>Contact the customer to arrange installation scheduling.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-muted/40 p-4 space-y-2 border border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground">{name}</span>
              <span className="text-xs text-muted-foreground">({orderNum})</span>
            </div>
            {address && address !== "N/A" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-foreground">{address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {phone}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground italic">No phone number on file</span>
              )}
              <span className="text-xs text-muted-foreground">Tap to call on mobile</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Script Template</Label>
            <div className="rounded-xl border border-border bg-card p-3.5 text-sm text-muted-foreground leading-relaxed">
              {script}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              {copied ? <><Check className="h-3 w-3 text-emerald-600" /> Copied!</> : "Copy script"}
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ScheduleDialog({
  item,
  initialMode = "schedule",
  locations: initialLocations,
  teams: initialTeams,
  onClose,
  onSaved,
}: {
  item: ScheduledOrderItem;
  initialMode?: "schedule" | "reschedule";
  locations?: (InstallLocation | ApiInstallationLocation)[];
  teams?: (InstallTeam | ApiInstallationTeam)[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user: currentUser } = useAuth();
  const orderNum = item.order_number || (item.order?.order_number ? `#${item.order.order_number.replace(/^#/, "")}` : `#${item.order_id}`);
  const customerName = item.customer_name || item.customer?.name || item.order?.customer_name || "Customer";
  const customerPhone = item.customer_phone || item.customer?.phone || item.order?.customer_phone || "";
  const customerAddress = item.delivery_address || item.customer?.delivery_address || item.order?.delivery_address || item.address || "";

  const parsedAddress = useMemo(() => parseAddressComponents(customerAddress), [customerAddress]);

  const initialZone =
    item.zone ||
    (item.customer as any)?.zone ||
    (item.order as any)?.zone ||
    (item.order as any)?.shippingAddress?.zone ||
    parsedAddress.zone ||
    "";

  const initialBuilding =
    item.building ||
    (item.customer as any)?.building ||
    (item.order as any)?.building ||
    (item.order as any)?.shippingAddress?.building ||
    parsedAddress.building ||
    "";

  const initialUnit =
    item.unit ||
    (item.customer as any)?.unit ||
    (item.order as any)?.unit ||
    (item.order as any)?.shippingAddress?.unit ||
    parsedAddress.unit ||
    "";

  const initialStreet =
    item.street ||
    (item.customer as any)?.street ||
    (item.order as any)?.street ||
    (item.order as any)?.shippingAddress?.street ||
    parsedAddress.street ||
    "";

  const [address, setAddress] = useState(customerAddress);
  const [zone, setZone] = useState(initialZone);
  const [building, setBuilding] = useState(initialBuilding);
  const [unit, setUnit] = useState(initialUnit);
  const [street, setStreet] = useState(initialStreet);
  const [takenTimeInMins, setTakenTimeInMins] = useState<number>(60);
  const [showAddressFields, setShowAddressFields] = useState(false);

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return format(d, "yyyy-MM-dd");
  }, []);
  const dayAfterStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return format(d, "yyyy-MM-dd");
  }, []);

  const { data: apiLocations = [] } = useInstallationLocations();

  const locations = useMemo(() => {
    if (apiLocations && apiLocations.length > 0) return apiLocations;
    if (initialLocations && initialLocations.length > 0) return initialLocations;
    return getLocations();
  }, [apiLocations, initialLocations]);

  // Check if item or order was already scheduled in local store
  const existingAppt = useMemo(() => {
    const orderIdStr = String(item.order_id || item.order_number || "").replace(/^#/, "");
    const orderItemId = String(item.order_item_id ?? item.id ?? item.item_id);
    return getAppointments().find(
      (a) =>
        (a.itemIds && a.itemIds.includes(orderItemId)) ||
        a.orderId === String(item.order_id) ||
        a.orderId === orderIdStr ||
        a.orderId === item.order_number
    );
  }, [item]);

  // Reschedule mode only applies if explicitly opened to reschedule (not when assigning technician initially)
  const isReschedule = initialMode === "reschedule";

  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [forceOverride, setForceOverride] = useState<boolean>(false);

  const RESCHEDULE_REASON_PRESETS = [
    "Customer requested afternoon slot",
    "Customer requested morning slot",
    "Customer requested change due to travel",
    "Customer unavailable / not at home",
    "Technician reassignment requested",
    "Customer requested weekend slot",
    "Site / building access restriction",
  ];

  // Dynamically fetch all technicians
  const { data: apiTeams = [], isLoading: isLoadingTeams } = useInstallationTeams();

  const teams = useMemo(() => {
    if (apiTeams && apiTeams.length > 0) return apiTeams;
    if (initialTeams && initialTeams.length > 0) return initialTeams;
    return getTeams();
  }, [apiTeams, initialTeams]);

  const [teamId, setTeamId] = useState<string>(() => {
    if (existingAppt?.teamId) return String(existingAppt.teamId);
    return "";
  });

  const [date, setDate] = useState(existingAppt?.scheduledDate || todayStr);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [time, setTime] = useState(existingAppt?.scheduledTime || "09:00");
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [notes, setNotes] = useState(existingAppt?.notes || "");
  const [saving, setSaving] = useState(false);

  // Live technician availability checking state
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<TechnicianAvailabilityResponse | null>(null);

  const selectedDateObj = useMemo(() => {
    try {
      return date ? parseISO(date) : new Date();
    } catch {
      return new Date();
    }
  }, [date]);

  // Available teams / technicians for the chosen location
  const availableTeams = useMemo(() => {
    return teams;
  }, [teams]);

  const selectedTeamObj = useMemo(() => {
    return teams.find((t: any) => String(t.id) === String(teamId));
  }, [teams, teamId]);

  // Base slot availability from local store
  const baseSlotAvailabilities = useMemo(() => {
    if (!teamId || !date) return [];
    return getTeamSlotAvailability(teamId, date);
  }, [teamId, date]);

  // Augment standard slots with backend booked_slots & conflicts
  const slotAvailabilities = useMemo(() => {
    if (baseSlotAvailabilities.length === 0) return [];
    if (!availabilityResult) return baseSlotAvailabilities;

    const bookedTimes = new Set<string>();
    const bookedDetailsMap = new Map<string, any>();

    if (Array.isArray(availabilityResult.booked_slots)) {
      availabilityResult.booked_slots.forEach((item: any) => {
        if (typeof item === "string") {
          bookedTimes.add(item.slice(0, 5));
        } else if (item && typeof item === "object") {
          const t = (item.time || item.start_time || "").slice(0, 5);
          if (t) {
            bookedTimes.add(t);
            bookedDetailsMap.set(t, item);
          }
        }
      });
    }

    if (Array.isArray(availabilityResult.conflicts)) {
      availabilityResult.conflicts.forEach((c) => {
        const t = (c.start_time || "").slice(0, 5);
        if (t) {
          bookedTimes.add(t);
          bookedDetailsMap.set(t, {
            orderId: String(c.order_id || c.order_number || ""),
            customerName: c.customer_name || "Customer",
            building: c.building,
            unit: c.unit,
            status: c.status,
          });
        }
      });
    }

    return baseSlotAvailabilities.map((slotItem) => {
      const slotTimeKey = slotItem.slot.time.slice(0, 5);
      const isServerBooked = bookedTimes.has(slotTimeKey);

      if (isServerBooked) {
        const extra = bookedDetailsMap.get(slotTimeKey);
        return {
          ...slotItem,
          isBooked: true,
          appointment: slotItem.appointment || (extra ? {
            orderId: extra.orderId || extra.order_number || extra.order_id || "Booked",
            customerName: extra.customerName || extra.customer_name || "Customer",
          } : undefined),
        };
      }
      return slotItem;
    });
  }, [baseSlotAvailabilities, availabilityResult]);

  const availableCount = slotAvailabilities.filter((s) => !s.isBooked).length;
  const bookedCount = slotAvailabilities.filter((s) => s.isBooked).length;

  // Auto-select first available slot if currently selected slot is booked and not in custom time mode
  useEffect(() => {
    if (slotAvailabilities.length > 0 && !showCustomTime) {
      const isCurrentBooked = slotAvailabilities.some((s) => s.slot.time === time && s.isBooked);
      if (isCurrentBooked) {
        const firstAvail = slotAvailabilities.find((s) => !s.isBooked);
        if (firstAvail) {
          setTime(firstAvail.slot.time);
        }
      }
    }
  }, [slotAvailabilities, showCustomTime]);

  // Reactive verification of technician availability from backend API (/api/admin/check-technician-avaliablity)
  useEffect(() => {
    if (!teamId || !date || !time) {
      setAvailabilityResult(null);
      setIsCheckingAvailability(false);
      return;
    }

    let isMounted = true;
    setIsCheckingAvailability(true);

    const techId = (selectedTeamObj as any)?.technician_id ?? teamId;
    const techName = selectedTeamObj?.name || (selectedTeamObj as any)?.technician_name || "Technician";
    const formattedStartTime = normalizeTimeTo24h(time);

    const checkTimer = setTimeout(async () => {
      try {
        const res = await checkTechnicianAvailability({
          technician_id: techId,
          installer_id: techId,
          user_id: techId,
          scheduled_date: date,
          start_time: formattedStartTime,
          technician_name: techName,
          taken_time_in_mins: takenTimeInMins || 60,
        });

        if (isMounted) {
          setAvailabilityResult(res);
        }
      } catch (err) {
        console.warn("[ScheduleDialog] Availability check error:", err);
      } finally {
        if (isMounted) {
          setIsCheckingAvailability(false);
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(checkTimer);
    };
  }, [teamId, date, time, selectedTeamObj, takenTimeInMins]);

  const handleSave = async () => {
    // 1. Resolve required IDs
    const resolvedOrderId =
      item.order_id ??
      item.order?.id ??
      (item.order_number ? String(item.order_number).replace(/^#/, "") : undefined);

    const resolvedOrderItemId =
      item.order_item_id ??
      item.id ??
      item.item_id;

    const resolvedOrderInstallationId =
      item.order_installation_id ??
      item.installation?.id ??
      (item as any).installation_id ??
      (item as any).order_installation?.id ??
      (item.installation as any)?.order_installation_id ??
      resolvedOrderItemId;

    const selectedTeam = teams.find((t: any) => String(t.id) === String(teamId));
    const techId =
      (selectedTeam as any)?.technician_id ??
      (selectedTeam as any)?.technicianId ??
      (selectedTeam as any)?.id ??
      teamId;
    const techName =
      selectedTeam?.name ??
      (selectedTeam as any)?.technician_name ??
      "Technician";

    // 2. Client-side validation of REQUIRED fields per Laravel Validator
    if (!resolvedOrderId) {
      toast.error("Order ID is required to schedule technician.");
      return;
    }
    if (!resolvedOrderItemId) {
      toast.error("Order Item ID is required to schedule technician.");
      return;
    }
    if (!resolvedOrderInstallationId) {
      toast.error("Order Installation ID is required to schedule technician.");
      return;
    }
    if (!techId) {
      toast.error("Please select a technician.");
      return;
    }
    if (!date) {
      toast.error("Please select a scheduled date.");
      return;
    }
    if (!time) {
      toast.error("Please select a start time slot.");
      return;
    }

    if (!forceOverride && availabilityResult && (!availabilityResult.available || availabilityResult.status === "engaged")) {
      toast.error(
        availabilityResult.message || "Selected technician is not available at this time. Please choose another time slot or check 'Force Reschedule'."
      );
      return;
    }

    if (!forceOverride && !showCustomTime && slotAvailabilities.some((s) => s.slot.time === time && s.isBooked)) {
      toast.error("This slot is already booked for this team. Please choose an available slot or enable Force Reschedule.");
      return;
    }

    if (isReschedule && !rescheduleReason.trim()) {
      toast.error("Please provide or select a reason for rescheduling.");
      return;
    }

    setSaving(true);

    try {
      const resolvedLocationId =
        (selectedTeam as any)?.location_id ??
        (selectedTeam as any)?.locationId ??
        existingAppt?.locationId ??
        (locations[0]?.id ? String(locations[0].id) : "1");
      const selectedLoc = locations.find((l: any) => String(l.id) === String(resolvedLocationId));

      const formattedStartTime = normalizeTimeTo24h(time);
      const minsDuration = takenTimeInMins ? parseInt(String(takenTimeInMins), 10) : 60;
      const formattedEndTime =
        availabilityResult?.end_time
          ? normalizeTimeTo24h(availabilityResult.end_time)
          : calculateEndTime(formattedStartTime, minsDuration);

      const resolvedImages =
        item.images ??
        item.image ??
        item.image_url ??
        item.product_image ??
        item.product_image_url ??
        null;

      const currentUserName = currentUser?.name || "Admin User";
      const currentUserId = (currentUser as any)?.id || 1;

      const resolvedScheduleId =
        (item as any).schedule_id ??
        (item as any).technician_scheduled_id ??
        (item as any).technician_schedule?.id ??
        (item as any).installation?.schedule_id ??
        (existingAppt?.id && !isNaN(Number(existingAppt.id)) ? Number(existingAppt.id) : undefined);

      if (isReschedule) {
        // Construct full / standard payload for POST /api/technician-schedule/reschedule
        const reschedulePayload: RescheduleTechnicianPayload = {
          order_id: resolvedOrderId,
          order_item_id: resolvedOrderItemId,
          order_installation_id: resolvedOrderInstallationId,
          technician_id: techId,
          technician_name: techName,
          scheduled_date: date,
          start_time: formattedStartTime,
          end_time: formattedEndTime || null,
          taken_time_in_mins: minsDuration,
          reschedule_reason: rescheduleReason.trim(),
          notes: notes ? String(notes).trim() : (item.product_name ? `Customer requested reschedule for ${item.product_name}` : null),
          status: "rescheduled",
          force: forceOverride,
          zone: zone ? String(zone).trim() : null,
          building: building ? String(building).trim() : null,
          unit: unit ? String(unit).trim() : null,
          street: street ? String(street).trim() : null,
          address: (address || customerAddress) ? String(address || customerAddress).trim() : null,
          customer_name: customerName ? String(customerName).trim() : null,
          customer_phone: customerPhone ? String(customerPhone).trim() : null,
          user_id: currentUserId,
          user_name: currentUserName,
          ...(resolvedScheduleId ? { schedule_id: resolvedScheduleId } : {}),
          order_number: item.order_number,
        };

        // 1. Persist to technician scheduled table via POST /api/technician-schedule/reschedule (or /api/admin/technician-schedule/reschedule)
        await rescheduleTechnicianSchedule(reschedulePayload);

        // 2. Call backend sync assignItemSchedule
        try {
          await assignItemSchedule(resolvedOrderItemId, true, {
            order_id: resolvedOrderId,
            order_number: item.order_number,
            location_id: resolvedLocationId,
            location_name: selectedLoc?.name,
            team_id: teamId,
            team_name: selectedTeam?.name,
            technician_id: techId,
            technician_name: techName,
            scheduled_date: date,
            notes: notes || `Rescheduled: ${rescheduleReason}`,
          });
        } catch (assignErr) {
          console.warn("[ScheduleDialog] assignItemSchedule warning:", assignErr);
        }

        // 3. Register or update in local appointment store
        if (existingAppt) {
          updateAppointment(existingAppt.id, {
            teamId: String(teamId || "1"),
            locationId: String(resolvedLocationId || "1"),
            scheduledDate: date,
            scheduledTime: time,
            status: "Scheduled",
            notes: notes ? `${notes} (Reason: ${rescheduleReason})` : `Reason: ${rescheduleReason}`,
          });
        } else {
          addAppointment({
            teamId: String(teamId || "1"),
            locationId: String(resolvedLocationId || "1"),
            orderId: String(resolvedOrderId || item.order_number),
            itemIds: [String(resolvedOrderItemId)],
            customerName: customerName || "Customer",
            customerPhone: customerPhone || "",
            customerAddress: address || customerAddress || "",
            scheduledDate: date,
            scheduledTime: time,
            status: "Scheduled",
            notes: notes ? `${notes} (Reason: ${rescheduleReason})` : `Reason: ${rescheduleReason}`,
            createdBy: currentUser?.email || "cc@halamama.com",
          });
        }

        toast.success(`Installation successfully rescheduled with ${techName} on ${date} at ${time}`);
        onSaved();
      } else {
        // Construct payload with all required & optional data according to backend Validator
        const schedulePayload: CreateTechnicianSchedulePayload = {
          order_id: resolvedOrderId,
          order_item_id: resolvedOrderItemId,
          order_installation_id: resolvedOrderInstallationId,
          technician_id: techId,
          scheduled_date: date,
          start_time: formattedStartTime,
          end_time: formattedEndTime || null,
          taken_time_in_mins: minsDuration,
          zone: zone ? String(zone).trim() : null,
          building: building ? String(building).trim() : null,
          unit: unit ? String(unit).trim() : null,
          street: street ? String(street).trim() : null,
          address: (address || customerAddress) ? String(address || customerAddress).trim() : null,
          customer_name: customerName ? String(customerName).trim() : null,
          customer_phone: customerPhone ? String(customerPhone).trim() : null,
          technician_name: techName ? String(techName).trim() : null,
          status: "scheduled",
          notes: notes ? String(notes).trim() : (item.product_name ? `Installation for ${item.product_name}` : null),
          images: resolvedImages,
          order_number: item.order_number,
          customer_address: (address || customerAddress) ? String(address || customerAddress).trim() : undefined,
          location_id: resolvedLocationId,
          installer_id: techId,
          user_id: currentUserId,
        };

        // 1. Persist to technician scheduled table via POST /api/admin/technician-schedule/create
        await createTechnicianSchedule(schedulePayload);

        // 2. Call backend route POST /api/admin/schedule/assign/{order_item_id?}
        try {
          await assignItemSchedule(resolvedOrderItemId, true, {
            order_id: resolvedOrderId,
            order_number: item.order_number,
            location_id: resolvedLocationId,
            location_name: selectedLoc?.name,
            team_id: teamId,
            team_name: selectedTeam?.name,
            technician_id: techId,
            technician_name: techName,
            scheduled_date: date,
            notes: notes || `Installation for ${item.product_name}`,
          });
        } catch (assignErr) {
          console.warn("[ScheduleDialog] assignItemSchedule warning:", assignErr);
        }

        // 3. Register in local appointment store
        addAppointment({
          teamId: String(teamId || "1"),
          locationId: String(resolvedLocationId || "1"),
          orderId: String(resolvedOrderId || item.order_number),
          itemIds: [String(resolvedOrderItemId)],
          customerName: customerName || "Customer",
          customerPhone: customerPhone || "",
          customerAddress: address || customerAddress || "",
          scheduledDate: date,
          scheduledTime: time,
          status: "Scheduled",
          notes: notes || `Installation for ${item.product_name}`,
          createdBy: currentUser?.email || "cc@halamama.com",
        });

        toast.success(`Installation successfully scheduled with ${techName} on ${date} at ${time}`);
        onSaved();
      }
    } catch (err: any) {
      console.error("[ScheduleDialog] Error saving technician schedule:", err);
      if (err?.status === 409) {
        toast.error("Technician has a scheduling conflict! You can enable 'Force Reschedule' below to override this conflict.");
        setForceOverride(true);
      } else {
        toast.error(err?.message || "Failed to schedule installation");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReschedule ? (
              <>
                <CalendarClock className="h-5 w-5 text-amber-500" />
                <span>Reschedule Installation</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 ml-auto sm:ml-2">
                  Reschedule Mode
                </span>
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5 text-primary" />
                <span>Assign Technician</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isReschedule
              ? `Update installation date, time, and record reschedule reason for ${orderNum} — ${customerName}`
              : `Assign a technician and book an installation slot for ${orderNum} — ${customerName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current Schedule Info Banner (for Reschedule mode) */}
          {isReschedule && existingAppt && (
            <div className="rounded-xl border border-amber-300/80 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-amber-950 dark:text-amber-200">Current Schedule: </span>
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    {existingAppt.scheduledDate} at {existingAppt.scheduledTime}
                  </span>
                  {existingAppt.teamId && (
                    <span className="text-amber-700 dark:text-amber-400 ml-1">
                      · {teams.find((t: any) => String(t.id) === String(existingAppt.teamId))?.name || `Team #${existingAppt.teamId}`}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 dark:bg-amber-900 dark:text-amber-200 w-fit shrink-0">
                Updating Slot
              </span>
            </div>
          )}

          {/* Customer & Address Overview with Location Badges */}
          <div className="rounded-2xl border border-border bg-muted/40 p-3.5 space-y-2.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{customerName}</span>
                  {customerPhone && <span className="text-muted-foreground font-normal text-xs">({customerPhone})</span>}
                </div>
                {(address || customerAddress) && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-medium text-foreground">{address || customerAddress}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary w-fit shrink-0">
                  Order: {orderNum}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddressFields(!showAddressFields)}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Edit3 className="h-3 w-3 text-primary" />
                  <span>{showAddressFields ? "Hide Location" : "Edit Location"}</span>
                  {showAddressFields ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Quick Location Chips */}
            {(building || unit || street || zone) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 text-[11px]">
                {building && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 border border-border text-foreground font-medium">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    <span>Bldg: {building}</span>
                  </span>
                )}
                {unit && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 border border-border text-foreground font-medium">
                    <Home className="h-3 w-3 text-muted-foreground" />
                    <span>Unit: {unit}</span>
                  </span>
                )}
                {street && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 border border-border text-foreground font-medium">
                    <span>Street: {street}</span>
                  </span>
                )}
                {zone && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 border border-border text-foreground font-medium">
                    <span>Zone: {zone}</span>
                  </span>
                )}
              </div>
            )}

            {/* Expandable Location Details Editor */}
            {showAddressFields && (
              <div className="space-y-2.5 pt-2 border-t border-border/60 animate-in fade-in duration-200">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Location & Address Details for Technician
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Building</Label>
                    <input
                      type="text"
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                      placeholder="e.g. 151"
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Unit / Flat</Label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. 4"
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Street</Label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="e.g. 230"
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Zone</Label>
                    <input
                      type="text"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      placeholder="e.g. 42"
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Full Address</Label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full street address..."
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Item being scheduled */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 p-3.5 flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg border border-border bg-background overflow-hidden shrink-0 flex items-center justify-center">
              {item.image || item.image_url ? (
                <img src={item.image || item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
              ) : (
                <Wrench className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                {item.product_name}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                SKU: {item.product_code || "—"} · Qty: {item.quantity || 1} · {item.installation_type || "Standard Installation"}
              </p>
            </div>
          </div>

          {/* Reschedule Reason Selector & Custom Field (when in Reschedule mode) */}
          {isReschedule && (
            <div className="space-y-2 rounded-2xl border border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                  Reschedule Reason *
                </Label>
                <span className="text-[10px] text-muted-foreground font-medium">Recorded in schedule history</span>
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-1.5">
                {RESCHEDULE_REASON_PRESETS.map((preset) => {
                  const isSelected = rescheduleReason === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRescheduleReason(preset)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer text-left",
                        isSelected
                          ? "bg-amber-600 text-white font-semibold shadow-xs"
                          : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>

              {/* Editable reason input */}
              <input
                type="text"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g. Customer requested afternoon slot after 2 PM..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          )}

          {/* Team / Technician Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Team / Technician *
            </Label>
            <Select value={teamId} onValueChange={setTeamId} disabled={isLoadingTeams}>
              <SelectTrigger className="h-10 rounded-xl cursor-pointer">
                <SelectValue
                  placeholder={
                    isLoadingTeams
                      ? "Loading technicians..."
                      : "Select technician"
                  }
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableTeams.length === 0 && !isLoadingTeams ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No technicians available
                  </div>
                ) : (
                  availableTeams.map((t: any) => {
                    const displayName = t.name || t.technician_name || `Technician #${t.id}`;
                    const roleLabel = t.role || t.type;
                    return (
                      <SelectItem key={String(t.id)} value={String(t.id)}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-medium">{displayName}</span>
                          {roleLabel && (
                            <span className="text-[11px] text-muted-foreground">({roleLabel})</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Modern Installation Date Selector & Quick Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Installation Date *
              </Label>
              {/* Quick date chips */}
              <div className="flex items-center gap-1.5">
                {[
                  { label: "Today", value: todayStr },
                  { label: "Tomorrow", value: tomorrowStr },
                  { label: "+2 Days", value: dayAfterStr },
                ].map((chip) => {
                  const isSelected = date === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setDate(chip.value)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer shadow-xs",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm scale-105"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Interactive Popover Date Picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between w-full h-12 px-3.5 rounded-2xl border border-border bg-card hover:bg-muted/30 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 grid place-items-center text-primary group-hover:scale-105 transition-transform shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left truncate">
                      <span className="text-sm font-medium text-foreground truncate">
                        {format(selectedDateObj, "EEEE, dd MMMM yyyy")}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                        <span>Format: {format(selectedDateObj, "dd/MM/yyyy")}</span>
                        {date === todayStr && (
                          <span className="text-primary font-semibold">· Today</span>
                        )}
                        {date === tomorrowStr && (
                          <span className="text-primary font-semibold">· Tomorrow</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground shrink-0 pl-2">
                    <span className="text-xs font-medium hidden sm:inline text-primary">Change Date</span>
                    <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl border border-border shadow-2xl bg-popover overflow-hidden" align="start">
                <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Select Installation Date</span>
                  </div>
                  <span className="text-[11px] font-semibold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                    {format(selectedDateObj, "MMMM yyyy")}
                  </span>
                </div>
                <div className="p-3">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDateObj}
                    onSelect={(selected) => {
                      if (selected) {
                        setDate(format(selected, "yyyy-MM-dd"));
                        setCalendarOpen(false);
                      }
                    }}
                    disabled={{ before: startOfToday() }}
                    initialFocus
                    className="rounded-xl border-0 p-0"
                  />
                </div>
                <div className="p-2.5 bg-muted/20 border-t border-border flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setDate(todayStr);
                      setCalendarOpen(false);
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer px-2 py-1"
                  >
                    Select Today
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCalendarOpen(false)}
                    className="h-7 text-xs rounded-lg cursor-pointer"
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Available and Booked Slots Section */}
          {!teamId ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center space-y-1.5">
              <Users className="h-6 w-6 text-muted-foreground/50 mx-auto" />
              <p className="text-xs font-semibold text-muted-foreground">
                Select a Location and Team above to check designated available & booked slots
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    TIME SLOTS ({date})
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {availableCount} Available
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {bookedCount} Booked
                  </span>
                </div>
              </div>

              {/* Live Backend Technician Availability Status Banner */}
              {isCheckingAvailability ? (
                <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 p-3 flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300 transition-all animate-pulse">
                  <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold">Checking technician availability...</span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 ml-1.5">
                      ({selectedTeamObj?.name || "Technician"} · {date} at {time})
                    </span>
                  </div>
                </div>
              ) : availabilityResult ? (
                availabilityResult.available ? (
                  <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/30 p-3 space-y-1.5 shadow-2xs transition-all">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                            Technician Available
                          </span>
                          <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {availabilityResult.status || "available"}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-100/70 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
                        <Clock className="h-3 w-3" />
                        <span>
                          {availabilityResult.start_time?.slice(0, 5)} - {availabilityResult.end_time?.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium pl-8">
                      {availabilityResult.message ||
                        `Technician ${availabilityResult.technician?.name || selectedTeamObj?.name} is available on ${date} at ${time}.`}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-rose-300/80 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/30 p-3 space-y-2 shadow-2xs transition-all">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                            Technician Engaged (Not Available)
                          </span>
                          <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {availabilityResult.status || "engaged"}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 bg-rose-100/70 dark:bg-rose-900/40 px-2 py-0.5 rounded-md">
                        <Clock className="h-3 w-3" />
                        <span>Slot Occupied</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-rose-800 dark:text-rose-300 font-medium pl-8">
                      {availabilityResult.message ||
                        `Technician is engaged (not available) on ${date} during selected time.`}
                    </p>

                    {/* Conflicting schedule details from backend response */}
                    {availabilityResult.conflicts && availabilityResult.conflicts.length > 0 && (
                      <div className="ml-8 mt-1 space-y-1.5 rounded-lg border border-rose-200/90 dark:border-rose-900/50 bg-white/80 dark:bg-slate-900/70 p-2.5">
                        <div className="text-[11px] font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                          <CalendarX className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          <span>Conflicting Schedule:</span>
                        </div>
                        {availabilityResult.conflicts.map((conflict, idx) => (
                          <div
                            key={conflict.schedule_id || idx}
                            className="text-xs rounded-md border border-border/50 bg-muted/20 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">
                                  {conflict.order_number || `#${conflict.order_id}`}
                                </span>
                                <span className="text-muted-foreground font-medium truncate">
                                  · {conflict.customer_name}
                                </span>
                              </div>
                              {(conflict.building || conflict.unit) && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {[conflict.building, conflict.unit ? `Unit ${conflict.unit}` : null]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                                {conflict.start_time?.slice(0, 5)} - {conflict.end_time?.slice(0, 5)}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                {conflict.status || "scheduled"}
                              </span>
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold pt-0.5">
                          Please choose another time slot or assign a different technician.
                        </p>

                        {/* Force override option for authorized reschedule */}
                        <div className="pt-2 border-t border-rose-200/70 dark:border-rose-900/60 flex items-center justify-between gap-2 flex-wrap">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <Checkbox
                              checked={forceOverride}
                              onCheckedChange={(checked) => setForceOverride(Boolean(checked))}
                              className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                            />
                            <span className="text-xs font-semibold text-rose-950 dark:text-rose-200">
                              Force Reschedule (Override technician availability conflict)
                            </span>
                          </label>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Sends force: true
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : null}

              {/* Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {slotAvailabilities.map(({ slot, isBooked, appointment: appt }) => {
                  const isSelected = !isBooked && time === slot.time && !showCustomTime;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={isBooked}
                      onClick={() => {
                        setShowCustomTime(false);
                        setTime(slot.time);
                      }}
                      className={cn(
                        "group relative flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all",
                        isBooked
                          ? "border-border/60 bg-muted/30 cursor-not-allowed opacity-75"
                          : isSelected
                            ? "border-primary bg-primary/[0.04] ring-2 ring-primary/25 shadow-sm cursor-pointer"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/20 cursor-pointer shadow-2xs"
                      )}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <span>{slot.label}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                        {isBooked && appt ? (
                          <div
                            className="text-[11px] text-amber-700 dark:text-amber-400 font-medium truncate mt-0.5"
                            title={`Booked for Order #${appt.orderId.replace("HM", "")} · ${appt.customerName}`}
                          >
                            Booked · #{appt.orderId.replace("HM", "")} ({appt.customerName.split(" ")[0]})
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {slot.period} slot · Ready to book
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isBooked ? (
                          <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-3 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            Booked
                          </span>
                        ) : isSelected ? (
                          <span className="rounded-full bg-primary/90 text-primary-foreground px-3 py-1 text-[10px] font-bold shadow-xs">
                            Selected
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 group-hover:bg-emerald-100/80 transition-colors">
                            Available
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {availableCount === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>All designated slots are booked on {date}. Select another date or team, or enter a custom time.</span>
                </div>
              )}

              {/* Duration selector & Custom Time Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-border/60 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground font-semibold">Est. Duration:</span>
                  {[30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTakenTimeInMins(mins)}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer",
                        takenTimeInMins === mins
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomTime(!showCustomTime)}
                    className="text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {showCustomTime ? "Standard slots" : "Custom time?"}
                  </button>
                  {showCustomTime && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1 shadow-2xs">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="text-xs font-medium bg-transparent focus:outline-none cursor-pointer"
                      />
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes / Instructions</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Customer preference, gate code, access notes, etc."
              rows={2}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:border-primary/40 transition-colors resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              isCheckingAvailability ||
              (availabilityResult !== null && !availabilityResult.available && !forceOverride)
            }
            className={cn(
              "rounded-xl cursor-pointer font-semibold transition-all",
              availabilityResult && !availabilityResult.available
                ? forceOverride
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  : "bg-rose-600 hover:bg-rose-700 text-white cursor-not-allowed opacity-80"
                : isReschedule
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : isCheckingAvailability ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : availabilityResult && !availabilityResult.available ? (
              forceOverride ? (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              ) : (
                <CalendarX className="h-4 w-4 mr-1.5" />
              )
            ) : isReschedule ? (
              <CalendarClock className="h-4 w-4 mr-1.5" />
            ) : (
              <CalendarPlus className="h-4 w-4 mr-1.5" />
            )}
            {availabilityResult && !availabilityResult.available
              ? forceOverride
                ? isReschedule
                  ? "Force & Reschedule"
                  : "Force & Assign Technician"
                : "Technician Engaged"
              : isReschedule
                ? "Confirm & Reschedule"
                : "Assign Technician"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
