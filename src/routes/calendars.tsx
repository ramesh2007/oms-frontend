import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Calendar, MapPin, Users, Check, X, Clock, ExternalLink } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import {
  getLocations, getTeams, getAppointments, updateAppointment,
  type InstallLocation, type InstallTeam, type Appointment,
} from "@/lib/scheduling";
import { useOrders } from "@/hooks/useOrders";
import { formatOrderAddress } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/calendars")({
  head: () => ({
    meta: [{ title: "Team Calendars - Halamama LMD" }],
  }),
  component: CalendarsPage,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CalendarsPage() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-5 p-4 md:p-6">
          <CalendarsContent />
        </main>
      </div>
    </div>
  );
}

function CalendarsContent() {
  const navigate = useNavigate();
  const { data: allOrders = [] } = useOrders();
  const [locations] = useState<InstallLocation[]>(() => getLocations());
  const [teams] = useState<InstallTeam[]>(() => getTeams());
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAppointments());
  const [locationId, setLocationId] = useState<string>("all");
  const [teamId, setTeamId] = useState<string>("all");
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const getApptAddress = (appt: Appointment) => {
    if (appt.customerAddress) return appt.customerAddress;
    const order = allOrders.find((o) => o.id === appt.orderId || o.id === `#${appt.orderId.replace(/^#/, "")}`);
    return formatOrderAddress(order);
  };

  const filteredTeams = useMemo(
    () => locationId && locationId !== "all" ? teams.filter((t) => t.locationId === locationId) : teams,
    [teams, locationId],
  );

  const selectedTeam = teams.find((t) => t.id === teamId);

  // Build the 7 days of the current week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return { date: d, dateStr: formatDate(d), label: DAYS[i] };
    });
  }, [weekStart]);

  const weekAppts = useMemo(() => {
    const weekEnd = weekDays[6].dateStr;
    const weekStartStr = weekDays[0].dateStr;
    return appointments.filter((a) => {
      // Date range filter
      const inWeek = a.scheduledDate >= weekStartStr && a.scheduledDate <= weekEnd;
      if (!inWeek) return false;

      // Location filter: if selected and not "all", filter teams belonging to this location
      if (locationId && locationId !== "all") {
        const team = teams.find((t) => t.id === a.teamId);
        if (team?.locationId !== locationId) return false;
      }

      // Team filter
      if (teamId && teamId !== "all") {
        if (a.teamId !== teamId) return false;
      }

      return true;
    });
  }, [appointments, locationId, teamId, weekDays, teams]);

  const apptsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    weekDays.forEach((d) => { map[d.dateStr] = []; });
    weekAppts.forEach((a) => {
      if (map[a.scheduledDate]) map[a.scheduledDate].push(a);
    });
    return map;
  }, [weekAppts, weekDays]);

  const todayStr = formatDate(new Date());

  const statusConfig = {
    Scheduled: { color: "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
    Confirmed: { color: "bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
    Completed: { color: "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
    Cancelled: { color: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-700 dark:text-red-300 opacity-60", dot: "bg-red-400" },
  };

  const changeStatus = (apptId: string, status: Appointment["status"]) => {
    updateAppointment(apptId, { status });
    setAppointments(getAppointments());
    setSelectedAppt(null);
    toast.success(`Appointment marked as ${status}`);
  };

  const weekLabel = `${weekDays[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <CalendarDays className="h-6 w-6 text-primary" />
          Team Calendars
        </h1>
        <p className="text-sm text-muted-foreground">View and manage each team's installation schedule.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Select value={locationId} onValueChange={(v) => { setLocationId(v); setTeamId("all"); }}>
            <SelectTrigger className="h-9 w-44 rounded-xl text-sm cursor-pointer">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="h-9 w-40 rounded-xl text-sm cursor-pointer">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Teams</SelectItem>
              {filteredTeams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
            className="h-8 w-8 rounded-lg border border-border hover:bg-muted grid place-items-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm font-medium tabular-nums min-w-[200px] text-center">{weekLabel}</span>
          <button
            onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
            className="h-8 w-8 rounded-lg border border-border hover:bg-muted grid place-items-center transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="h-8 px-3 rounded-lg border border-border hover:bg-muted text-xs font-semibold transition-colors cursor-pointer ml-1"
          >
            Today
          </button>
        </div>
      </div>

      {/* Team info */}
      {selectedTeam && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft">
          <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-sm">{selectedTeam.name}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{selectedTeam.type}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">Members: {selectedTeam.memberNames.join(", ")}</span>
          </div>
          <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
            {(["Scheduled", "Confirmed", "Completed"] as Appointment["status"][]).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className={cn("h-2 w-2 rounded-full", statusConfig[s].dot)} />
                {s}: {appointments.filter((a) => a.teamId === teamId && a.status === s).length}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {weekDays.map(({ date, dateStr, label }) => {
            const isToday = dateStr === todayStr;
            return (
              <div key={dateStr} className={cn("p-3 text-center border-r border-border last:border-r-0", isToday && "bg-primary/5")}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className={cn(
                  "text-lg font-bold mt-0.5 mx-auto w-8 h-8 rounded-full grid place-items-center",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                )}>
                  {date.getDate()}
                </div>
                <div className="text-[10px] text-muted-foreground">{apptsByDay[dateStr]?.length || 0} appts</div>
              </div>
            );
          })}
        </div>

        {/* Appointment Cells */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map(({ dateStr }) => {
            const dayAppts = apptsByDay[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            return (
              <div key={dateStr} className={cn("border-r border-border last:border-r-0 p-2 space-y-1.5 min-h-[200px]", isToday && "bg-primary/3")}>
                {dayAppts.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="border border-dashed border-border/60 rounded-lg w-full h-12 flex items-center justify-center text-[10px] text-muted-foreground/40">
                      Available
                    </div>
                  </div>
                ) : (
                  dayAppts.map((appt) => {
                    const cfg = statusConfig[appt.status];
                    const team = teams.find((t) => t.id === appt.teamId);
                    const apptAddress = getApptAddress(appt);
                    return (
                      <button
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        className={cn(
                          "w-full text-left rounded-lg border p-2 text-[11px] leading-snug transition-all hover:shadow-sm cursor-pointer",
                          cfg.color,
                        )}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                          <span className="font-bold">{appt.scheduledTime}</span>
                        </div>
                        <div className="font-semibold truncate">{appt.customerName}</div>
                        <div className="flex items-center gap-1 text-[10px] opacity-80 truncate my-0.5" title={apptAddress}>
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{apptAddress}</span>
                        </div>
                        <div className="text-[10px] opacity-70 font-mono flex items-center justify-between">
                          <span>#{appt.orderId.replace(/^#/, "").replace("HM", "")}</span>
                          {(!teamId || teamId === "all") && (
                            <span className="font-sans font-medium text-[9px] text-muted-foreground/80 bg-muted/60 px-1 rounded truncate max-w-[65px] border border-border/40">
                              {team?.name ?? "—"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointment Detail Panel */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setSelectedAppt(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-card border border-border shadow-elevated animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-base">Appointment Details</h2>
              <button onClick={() => setSelectedAppt(null)} className="h-7 w-7 rounded-lg hover:bg-muted grid place-items-center cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Order</div>
                  <div className="font-mono font-semibold">#{selectedAppt.orderId.replace(/^#/, "").replace("HM", "")}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Status</div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold border", statusConfig[selectedAppt.status].color)}>
                    {selectedAppt.status}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Customer</div>
                  <div className="font-medium">{selectedAppt.customerName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Phone</div>
                  <a href={`tel:${selectedAppt.customerPhone}`} className="font-medium text-primary hover:underline">
                    {selectedAppt.customerPhone}
                  </a>
                </div>
                <div className="col-span-2 rounded-xl bg-muted/40 p-2.5 space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delivery Address</div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{getApptAddress(selectedAppt)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Date & Time</div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedAppt.scheduledDate} at {selectedAppt.scheduledTime}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Team</div>
                  <div>{teams.find((t) => t.id === selectedAppt.teamId)?.name ?? "—"}</div>
                </div>
              </div>
              {selectedAppt.notes && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                  <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-2">{selectedAppt.notes}</div>
                </div>
              )}
            </div>
            <div className="px-5 pb-4 pt-2 border-t border-border flex flex-wrap gap-2">
              <button onClick={() => navigate({ to: "/orders/$orderId", params: { orderId: selectedAppt.orderId.replace(/^#/, "") } } as any)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer">
                <ExternalLink className="h-3.5 w-3.5" /> View Order
              </button>
              {selectedAppt.status === "Scheduled" && (
                <button onClick={() => changeStatus(selectedAppt.id, "Confirmed")}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer">
                  <Check className="h-3.5 w-3.5" /> Confirm
                </button>
              )}
              {selectedAppt.status !== "Completed" && selectedAppt.status !== "Cancelled" && (
                <button
                  onClick={() => {
                    const cleanId = selectedAppt.orderId.replace(/^#/, "");
                    navigate({ to: "/customer-care", search: { search: cleanId } as any });
                  }}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                  title="Reschedule appointment in Customer Care"
                >
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Reschedule
                </button>
              )}
              {selectedAppt.status !== "Completed" && selectedAppt.status !== "Cancelled" && (
                <button onClick={() => changeStatus(selectedAppt.id, "Completed")}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer">
                  <Check className="h-3.5 w-3.5" /> Mark Complete
                </button>
              )}
              {selectedAppt.status !== "Cancelled" && (
                <button onClick={() => changeStatus(selectedAppt.id, "Cancelled")}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors cursor-pointer ml-auto">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
