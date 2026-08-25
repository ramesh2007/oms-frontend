import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Phone, Calendar, CheckCircle2, Clock, Search, X, ChevronRight,
  CalendarClock, User, Package, MapPin, Users, Check, AlertCircle,
} from "lucide-react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { useOrders } from "@/hooks/useOrders";
import { getMockOrderItems } from "@/lib/orders";
import {
  getLocations, getTeams, addAppointment, getAppointments,
  hasAppointment, updateAppointment,
  type InstallLocation, type InstallTeam, type Appointment,
} from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const { data: allOrders = [] } = useOrders();
  const [activeTab, setActiveTab] = useState<CCTab>("Awaiting");
  const [search, setSearch] = useState("");
  const [scheduleOrder, setScheduleOrder] = useState<any>(null);
  const [callOrder, setCallOrder] = useState<any>(null);
  const [locations] = useState<InstallLocation[]>(() => getLocations());
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAppointments());

  // Refresh appointments from store
  const refreshAppts = () => setAppointments(getAppointments());

  // Orders that have MWH or VL_SUPPLIER items
  const schedulableOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const items = order.itemsList || [];
      return items.some((i) => i.itemType === "MWH" || i.itemType === "VL_SUPPLIER");
    });
  }, [allOrders]);

  const awaitingOrders = useMemo(
    () => schedulableOrders.filter((o) => !hasAppointment(o.id) && o.status !== "Delivered" && o.status !== "Cancelled"),
    [schedulableOrders, appointments],
  );
  const scheduledOrders = useMemo(
    () => schedulableOrders.filter((o) => hasAppointment(o.id) && o.status !== "Cancelled"),
    [schedulableOrders, appointments],
  );

  const displayed = (activeTab === "Awaiting" ? awaitingOrders : scheduledOrders).filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.customer.name.toLowerCase().includes(q) ||
      o.customer.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <CalendarClock className="h-6 w-6 text-primary" />
          Customer Care Queue
        </h1>
        <p className="text-sm text-muted-foreground">
          Call customers and schedule installation appointments for MWH and supplier items.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Awaiting Scheduling", value: awaitingOrders.length, color: "text-amber-600", bg: "bg-amber-500/10", Icon: Clock },
          { label: "Scheduled", value: scheduledOrders.length, color: "text-blue-600", bg: "bg-blue-500/10", Icon: Calendar },
          { label: "Total Schedulable", value: schedulableOrders.length, color: "text-primary", bg: "bg-primary/10", Icon: Package },
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
                {tab === "Awaiting" ? awaitingOrders.length : scheduledOrders.length}
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
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Order Cards */}
      {displayed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">
            {activeTab === "Awaiting" ? "No orders awaiting scheduling" : "No scheduled orders"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((order) => {
            const items = order.itemsList || getMockOrderItems(order.id, order.items);
            const schedulableItems = items.filter((i) => i.itemType === "MWH" || i.itemType === "VL_SUPPLIER");
            const appt = appointments.find((a) => a.orderId === order.id && a.status !== "Cancelled");
            return (
              <OrderCCCard
                key={order.id}
                order={order}
                schedulableItems={schedulableItems}
                appointment={appt}
                tab={activeTab}
                onCall={() => setCallOrder(order)}
                onSchedule={() => setScheduleOrder(order)}
                onViewCalendar={() => navigate({ to: "/calendars", search: { team: appt?.teamId } as any })}
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
      {callOrder && (
        <CallDialog order={callOrder} onClose={() => setCallOrder(null)} />
      )}

      {/* Schedule Dialog */}
      {scheduleOrder && (
        <ScheduleDialog
          order={scheduleOrder}
          locations={locations}
          onClose={() => setScheduleOrder(null)}
          onSaved={() => { refreshAppts(); setScheduleOrder(null); }}
        />
      )}
    </div>
  );
}

function OrderCCCard({ order, schedulableItems, appointment, tab, onCall, onSchedule, onViewCalendar, onMarkComplete }: any) {
  const typeColors: Record<string, string> = {
    MWH: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
    VL_SUPPLIER: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400",
    VL_HMA: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
    FC: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  };
  const typeLabels: Record<string, string> = {
    MWH: "Main Warehouse · Install",
    VL_SUPPLIER: "Supplier · Schedule",
    VL_HMA: "Vendor (HMa)",
    FC: "Fulfillment Center",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-bold text-primary">#{order.id.replace("HM", "")}</span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm font-medium">{order.customer.name}</span>
            <a href={`tel:${order.customer.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-3 w-3" />
              {order.customer.phone}
            </a>
          </div>

          {/* Schedulable items */}
          <div className="flex flex-wrap gap-2 mt-1">
            {schedulableItems.map((item: any) => (
              <span key={item.id} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold", typeColors[item.itemType ?? "FC"])}>
                {typeLabels[item.itemType ?? "FC"]} · {item.name.substring(0, 28)}{item.name.length > 28 ? "…" : ""}
              </span>
            ))}
          </div>

          {/* Appointment details if scheduled */}
          {appointment && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium text-foreground">
                {appointment.scheduledDate} at {appointment.scheduledTime}
              </span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                appointment.status === "Scheduled" ? "bg-amber-50 text-amber-700 border-amber-200" :
                appointment.status === "Confirmed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                appointment.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                "bg-red-50 text-red-700 border-red-200",
              )}>
                {appointment.status}
              </span>
              {appointment.notes && <span className="text-muted-foreground">· {appointment.notes.substring(0, 40)}</span>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={onCall}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
          >
            <Phone className="h-3.5 w-3.5 text-emerald-600" />
            Call Customer
          </button>
          {tab === "Awaiting" ? (
            <button
              onClick={onSchedule}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </button>
          ) : (
            <>
              <button
                onClick={onSchedule}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5" />
                Reschedule
              </button>
              <button
                onClick={onViewCalendar}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                View Calendar
              </button>
              {appointment?.status !== "Completed" && (
                <button
                  onClick={onMarkComplete}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark Complete
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CallDialog({ order, onClose }: { order: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const phone = order.customer.phone;
  const name = order.customer.name;
  const script = `Hello, may I speak with ${name}? This is Halamama Customer Care calling about your order #${order.id.replace("HM", "")}. We have some items in your order that require installation, and we'd like to schedule a convenient time for our team to visit. When would be a good time for you?`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-emerald-600" />
            Call Customer
          </DialogTitle>
          <DialogDescription>Contact the customer to discuss installation scheduling.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-muted/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{name}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                <Phone className="h-4 w-4" />
                {phone}
              </a>
              <span className="text-xs text-muted-foreground">Tap to call on mobile</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Script Template</Label>
            <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground leading-relaxed">
              {script}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              {copied ? <><Check className="h-3 w-3" /> Copied!</> : "Copy script"}
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

function ScheduleDialog({ order, locations, onClose, onSaved }: {
  order: any;
  locations: InstallLocation[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const items = (order.itemsList || getMockOrderItems(order.id, order.items)).filter(
    (i: any) => i.itemType === "MWH" || i.itemType === "VL_SUPPLIER",
  );
  const [locationId, setLocationId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const teams = useMemo(
    () => (locationId ? getTeams().filter((t) => t.locationId === locationId) : []),
    [locationId],
  );

  const handleSave = () => {
    if (!locationId || !teamId || !date || !time) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    const selectedTeam = teams.find((t: InstallTeam) => t.id === teamId);
    addAppointment({
      teamId,
      locationId,
      orderId: order.id,
      itemIds: items.map((i: any) => i.id),
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      scheduledDate: date,
      scheduledTime: time,
      status: "Scheduled",
      notes,
      createdBy: "cc@halamama.com",
    });
    toast.success(`Scheduled with ${selectedTeam?.name} on ${date} at ${time}`);
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Installation
          </DialogTitle>
          <DialogDescription>
            Book an installation slot for order #{order.id.replace("HM", "")} — {order.customer.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Items that need scheduling */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 space-y-1">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Items requiring installation
            </p>
            {items.map((item: any) => (
              <p key={item.id} className="text-xs text-amber-800 dark:text-amber-300 pl-5">
                · {item.name} ({item.itemType})
              </p>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Location *
              </Label>
              <Select value={locationId} onValueChange={(v) => { setLocationId(v); setTeamId(""); }}>
                <SelectTrigger className="h-10 rounded-xl cursor-pointer">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Team *
              </Label>
              <Select value={teamId} onValueChange={setTeamId} disabled={!locationId}>
                <SelectTrigger className="h-10 rounded-xl cursor-pointer">
                  <SelectValue placeholder={locationId ? "Select team" : "Pick location first"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {teams.map((t: InstallTeam) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Date *
              </Label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Time *
              </Label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Customer preference, access notes, etc."
              rows={2}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:border-primary/40 transition-colors resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl cursor-pointer bg-primary hover:bg-primary/90">
            <CalendarClock className="h-4 w-4 mr-1.5" />
            Confirm Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
