import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  MapPin, Plus, Pencil, Trash2, Users, X, Check, ChevronDown, ChevronUp,
  Wrench, Store, Clock,
} from "lucide-react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import {
  getLocations, addLocation, updateLocation, deleteLocation,
  getTeams, addTeam, updateTeam, deleteTeam,
  getAppointments,
  STANDARD_INSTALLATION_SLOTS,
  buildSlotFromTimes,
  validateTimeSlot,
  type InstallLocation, type InstallTeam, type InstallationSlot,
} from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/locations")({
  head: () => ({
    meta: [{ title: "Locations & Teams - Halamama LMD" }],
  }),
  component: LocationsPage,
});

function LocationsPage() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-6 p-4 md:p-6">
          <LocationsContent />
        </main>
      </div>
    </div>
  );
}

function LocationsContent() {
  const [locations, setLocations] = useState<InstallLocation[]>(() => getLocations());
  const [teams, setTeams] = useState<InstallTeam[]>(() => getTeams());
  const [appointments] = useState(() => getAppointments());
  const [expandedLoc, setExpandedLoc] = useState<string | null>(null);

  // Location dialog
  const [locDialog, setLocDialog] = useState<{ open: boolean; editing: InstallLocation | null }>({ open: false, editing: null });
  const [locForm, setLocForm] = useState({ name: "", city: "" });

  // Team dialog
  const [teamDialog, setTeamDialog] = useState<{ open: boolean; locationId: string; editing: InstallTeam | null }>({
    open: false, locationId: "", editing: null,
  });
  const [teamForm, setTeamForm] = useState({
    name: "",
    type: "MWH" as "MWH" | "VL_SUPPLIER",
    memberNames: "",
    allocatedSlots: [...STANDARD_INSTALLATION_SLOTS] as InstallationSlot[],
  });

  // Slot editor states within TeamDialog
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState("08:00");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00");

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editSlotStart, setEditSlotStart] = useState("");
  const [editSlotEnd, setEditSlotEnd] = useState("");

  const refresh = () => {
    setLocations(getLocations());
    setTeams(getTeams());
  };

  const openAddLoc = () => { setLocForm({ name: "", city: "" }); setLocDialog({ open: true, editing: null }); };
  const openEditLoc = (l: InstallLocation) => { setLocForm({ name: l.name, city: l.city }); setLocDialog({ open: true, editing: l }); };

  const saveLoc = () => {
    if (!locForm.name.trim()) { toast.error("Location name is required."); return; }
    if (locDialog.editing) {
      updateLocation(locDialog.editing.id, { name: locForm.name, city: locForm.city });
      toast.success("Location updated");
    } else {
      addLocation({ name: locForm.name, city: locForm.city });
      toast.success("Location created");
    }
    refresh();
    setLocDialog({ open: false, editing: null });
  };

  const deleteLoc = (l: InstallLocation) => {
    if (!window.confirm(`Delete location "${l.name}" and all its teams?`)) return;
    deleteLocation(l.id);
    refresh();
    toast.success("Location deleted");
  };

  const openAddTeam = (locationId: string) => {
    setTeamForm({
      name: "",
      type: "MWH",
      memberNames: "",
      allocatedSlots: [...STANDARD_INSTALLATION_SLOTS],
    });
    setIsAddingSlot(false);
    setEditingSlotIndex(null);
    setTeamDialog({ open: true, locationId, editing: null });
  };

  const openEditTeam = (t: InstallTeam) => {
    const slots = t.allocatedSlots && t.allocatedSlots.length > 0 ? [...t.allocatedSlots] : [...STANDARD_INSTALLATION_SLOTS];
    setTeamForm({
      name: t.name,
      type: t.type,
      memberNames: t.memberNames.join(", "),
      allocatedSlots: slots,
    });
    setIsAddingSlot(false);
    setEditingSlotIndex(null);
    setTeamDialog({ open: true, locationId: t.locationId, editing: t });
  };

  const getSlotEndTime = (slot: InstallationSlot): string => {
    if (slot.endTime) return slot.endTime;
    const [sh, sm] = slot.time.split(":").map(Number);
    const endH = (sh + 2) % 24;
    return `${endH.toString().padStart(2, "0")}:${(sm || 0).toString().padStart(2, "0")}`;
  };

  const handleAddSlot = () => {
    const err = validateTimeSlot(newSlotStart, newSlotEnd, teamForm.allocatedSlots);
    if (err) {
      toast.error(err);
      return;
    }
    const newSlot = buildSlotFromTimes(newSlotStart, newSlotEnd);
    const updated = [...teamForm.allocatedSlots, newSlot].sort((a, b) => a.time.localeCompare(b.time));
    setTeamForm({ ...teamForm, allocatedSlots: updated });
    setIsAddingSlot(false);
    setNewSlotStart("08:00");
    setNewSlotEnd("10:00");
    toast.success(`Added slot: ${newSlot.label}`);
  };

  const startEditSlot = (index: number) => {
    const slot = teamForm.allocatedSlots[index];
    setEditingSlotIndex(index);
    setEditSlotStart(slot.time);
    setEditSlotEnd(getSlotEndTime(slot));
    setIsAddingSlot(false);
  };

  const handleSaveEditSlot = () => {
    if (editingSlotIndex === null) return;
    const err = validateTimeSlot(editSlotStart, editSlotEnd, teamForm.allocatedSlots, editingSlotIndex);
    if (err) {
      toast.error(err);
      return;
    }
    const updatedSlot = buildSlotFromTimes(editSlotStart, editSlotEnd);
    const updated = [...teamForm.allocatedSlots];
    updated[editingSlotIndex] = updatedSlot;
    updated.sort((a, b) => a.time.localeCompare(b.time));
    setTeamForm({ ...teamForm, allocatedSlots: updated });
    setEditingSlotIndex(null);
    toast.success(`Updated slot to ${updatedSlot.label}`);
  };

  const handleCancelEditSlot = () => {
    setEditingSlotIndex(null);
  };

  const handleDeleteSlot = (index: number) => {
    if (teamForm.allocatedSlots.length <= 1) {
      toast.error("Each team must have at least one designated time slot.");
      return;
    }
    const removed = teamForm.allocatedSlots[index];
    const updated = teamForm.allocatedSlots.filter((_, i) => i !== index);
    setTeamForm({ ...teamForm, allocatedSlots: updated });
    if (editingSlotIndex === index) setEditingSlotIndex(null);
    toast.success(`Removed slot ${removed.label}`);
  };

  const handleResetStandardSlots = () => {
    setTeamForm({ ...teamForm, allocatedSlots: [...STANDARD_INSTALLATION_SLOTS] });
    setIsAddingSlot(false);
    setEditingSlotIndex(null);
    toast.success("Restored 5 standard installation slots");
  };

  const saveTeam = () => {
    if (!teamForm.name.trim()) { toast.error("Team name is required."); return; }
    if (teamForm.allocatedSlots.length === 0) {
      toast.error("Please allocate at least one designated time slot to this team.");
      return;
    }
    const members = teamForm.memberNames.split(",").map((m) => m.trim()).filter(Boolean);
    if (teamDialog.editing) {
      updateTeam(teamDialog.editing.id, {
        name: teamForm.name,
        type: teamForm.type,
        memberNames: members,
        allocatedSlots: teamForm.allocatedSlots,
      });
      toast.success("Team updated with designated slots");
    } else {
      addTeam({
        name: teamForm.name,
        locationId: teamDialog.locationId,
        type: teamForm.type,
        memberNames: members,
        allocatedSlots: teamForm.allocatedSlots,
      });
      toast.success("Team created with designated slots");
    }
    refresh();
    setTeamDialog({ open: false, locationId: "", editing: null });
  };

  const deleteTeamFn = (t: InstallTeam) => {
    if (!window.confirm(`Delete team "${t.name}"?`)) return;
    deleteTeam(t.id);
    refresh();
    toast.success("Team deleted");
  };

  const typeConfig = {
    MWH: { label: "Main Warehouse", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900", Icon: Wrench },
    VL_SUPPLIER: { label: "VL Supplier", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900", Icon: Store },
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <MapPin className="h-6 w-6 text-primary" />
            Locations & Teams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create service locations and assign installation teams to each one.
          </p>
        </div>
        <button
          onClick={openAddLoc}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Location
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Locations", value: locations.length, Icon: MapPin },
          { label: "Teams", value: teams.length, Icon: Users },
          { label: "Total Appointments", value: appointments.length, Icon: Wrench },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 grid place-items-center shrink-0">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <div className="text-xl font-bold">{value}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Locations List */}
      {locations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No locations yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => {
            const locTeams = teams.filter((t) => t.locationId === loc.id);
            const isExpanded = expandedLoc === loc.id;
            const locAppts = appointments.filter((a) => a.locationId === loc.id);
            return (
              <div key={loc.id} className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
                {/* Location Header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedLoc(isExpanded ? null : loc.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-base">{loc.name}</div>
                      <div className="text-xs text-muted-foreground">{loc.city} · {locTeams.length} team{locTeams.length !== 1 ? "s" : ""} · {locAppts.length} appointments</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEditLoc(loc); }} className="h-8 w-8 rounded-lg border border-border hover:bg-muted grid place-items-center transition-colors cursor-pointer" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteLoc(loc); }} className="h-8 w-8 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive grid place-items-center transition-colors cursor-pointer" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Teams Section */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/10">
                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Teams ({locTeams.length})
                      </span>
                      <button
                        onClick={() => openAddTeam(loc.id)}
                        className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Team
                      </button>
                    </div>

                    {locTeams.length === 0 ? (
                      <div className="px-5 pb-5 text-xs text-muted-foreground">No teams yet. Add a team to this location.</div>
                    ) : (
                      <div className="px-5 pb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {locTeams.map((team) => {
                          const cfg = typeConfig[team.type];
                          const TeamIcon = cfg.Icon;
                          const teamAppts = appointments.filter((a) => a.teamId === team.id && a.status !== "Cancelled");
                          return (
                            <div key={team.id} className="rounded-xl border border-border bg-card p-3.5 space-y-2 hover:shadow-sm transition-shadow">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={cn("h-7 w-7 rounded-lg grid place-items-center shrink-0 border", cfg.bg)}>
                                    <TeamIcon className={cn("h-3.5 w-3.5", cfg.color)} />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm">{team.name}</div>
                                    <span className={cn("text-[10px] font-bold", cfg.color)}>{cfg.label}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => openEditTeam(team)} className="h-6 w-6 rounded grid place-items-center hover:bg-muted transition-colors cursor-pointer">
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                  <button onClick={() => deleteTeamFn(team)} className="h-6 w-6 rounded grid place-items-center hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {team.memberNames.map((m) => (
                                  <span key={m} className="inline-flex items-center h-5 px-1.5 rounded bg-muted text-[10px] font-medium text-muted-foreground">{m}</span>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>{teamAppts.length} active appointment{teamAppts.length !== 1 ? "s" : ""}</span>
                              </div>
                              {(() => {
                                const slots = team.allocatedSlots && team.allocatedSlots.length > 0 ? team.allocatedSlots : STANDARD_INSTALLATION_SLOTS;
                                const periods = Array.from(new Set(slots.map((s) => s.period)));
                                return (
                                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                                      <Clock className="h-3 w-3 text-primary shrink-0" />
                                      <span>{slots.length} designated slot{slots.length !== 1 ? "s" : ""}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      {periods.map((p) => (
                                        <span key={p} className="px-1.5 py-0.5 rounded-md bg-muted font-medium">
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Location Dialog */}
      <Dialog open={locDialog.open} onOpenChange={(o) => !o && setLocDialog({ open: false, editing: null })}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{locDialog.editing ? "Edit Location" : "Add New Location"}</DialogTitle>
            <DialogDescription>Set a name for this service coverage area.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location Name *</Label>
              <input
                value={locForm.name}
                onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                placeholder="e.g. Doha Central"
                className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</Label>
              <input
                value={locForm.city}
                onChange={(e) => setLocForm({ ...locForm, city: e.target.value })}
                placeholder="e.g. Doha"
                className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLocDialog({ open: false, editing: null })} className="rounded-xl cursor-pointer">Cancel</Button>
            <Button onClick={saveLoc} className="rounded-xl cursor-pointer">{locDialog.editing ? "Save Changes" : "Create Location"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={teamDialog.open} onOpenChange={(o) => !o && setTeamDialog({ open: false, locationId: "", editing: null })}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{teamDialog.editing ? "Edit Team" : "Add New Team"}</DialogTitle>
            <DialogDescription>Configure a service team and allocate their designated installation slots.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Team Name *</Label>
                <input
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  placeholder="e.g. Team Alpha"
                  className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type *</Label>
                <Select value={teamForm.type} onValueChange={(v) => setTeamForm({ ...teamForm, type: v as any })}>
                  <SelectTrigger className="h-10 rounded-xl cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="MWH">MWH (Main Warehouse)</SelectItem>
                    <SelectItem value="VL_SUPPLIER">VL Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Member Names</Label>
              <input
                value={teamForm.memberNames}
                onChange={(e) => setTeamForm({ ...teamForm, memberNames: e.target.value })}
                placeholder="Comma-separated: Farshad, Naveed, Shambu"
                className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:border-primary/40 transition-colors"
              />
              <p className="text-[11px] text-muted-foreground">Separate member names with commas.</p>
            </div>

            {/* Designated Time Slots Allocation */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Designated Time Slots ({teamForm.allocatedSlots.length} allocated) *
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Create, edit, or remove time slots allocated to this service team.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSlot(!isAddingSlot);
                      setEditingSlotIndex(null);
                    }}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Time Slot
                  </button>
                  <button
                    type="button"
                    onClick={handleResetStandardSlots}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                    title="Restore 5 standard default slots"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>

              {/* Add New Slot Inline Form */}
              {isAddingSlot && (
                <div className="p-3.5 rounded-2xl border-2 border-primary/30 bg-primary/[0.03] space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Add New Designated Time Slot
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingSlot(false)}
                      className="h-6 w-6 rounded-md hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                      <input
                        type="time"
                        value={newSlotStart}
                        onChange={(e) => setNewSlotStart(e.target.value)}
                        className="w-full h-9 rounded-xl border border-border bg-card px-3 text-xs focus:outline-none focus:border-primary/40 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
                      <input
                        type="time"
                        value={newSlotEnd}
                        onChange={(e) => setNewSlotEnd(e.target.value)}
                        className="w-full h-9 rounded-xl border border-border bg-card px-3 text-xs focus:outline-none focus:border-primary/40 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <div className="text-[11px] text-muted-foreground font-medium">
                      Preview: <span className="font-bold text-foreground">{buildSlotFromTimes(newSlotStart, newSlotEnd).label}</span>
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-semibold">
                        {buildSlotFromTimes(newSlotStart, newSlotEnd).period} slot
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingSlot(false)}
                        className="h-8 text-xs rounded-xl cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddSlot}
                        className="h-8 text-xs rounded-xl cursor-pointer"
                      >
                        Add Time Slot
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Slots List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {teamForm.allocatedSlots.map((slot, index) => {
                  const isEditing = editingSlotIndex === index;

                  if (isEditing) {
                    return (
                      <div
                        key={index}
                        className="col-span-1 sm:col-span-2 p-3.5 rounded-2xl border-2 border-primary bg-primary/[0.04] space-y-3 animate-in fade-in duration-150"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <Pencil className="h-3.5 w-3.5" /> Edit Time Slot #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelEditSlot}
                            className="h-6 w-6 rounded-md hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                            <input
                              type="time"
                              value={editSlotStart}
                              onChange={(e) => setEditSlotStart(e.target.value)}
                              className="w-full h-9 rounded-xl border border-border bg-card px-3 text-xs focus:outline-none focus:border-primary/40 cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
                            <input
                              type="time"
                              value={editSlotEnd}
                              onChange={(e) => setEditSlotEnd(e.target.value)}
                              className="w-full h-9 rounded-xl border border-border bg-card px-3 text-xs focus:outline-none focus:border-primary/40 cursor-pointer"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                          <div className="text-[11px] text-muted-foreground font-medium">
                            Updated: <span className="font-bold text-foreground">{buildSlotFromTimes(editSlotStart, editSlotEnd).label}</span>
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-semibold">
                              {buildSlotFromTimes(editSlotStart, editSlotEnd).period} slot
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEditSlot}
                              className="h-8 text-xs rounded-xl cursor-pointer"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveEditSlot}
                              className="h-8 text-xs rounded-xl cursor-pointer"
                            >
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slot.time + "-" + index}
                      className="group flex items-center justify-between p-3 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>{slot.label}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <span>{slot.period} slot</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditSlot(index)}
                          className="h-7 px-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-semibold text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit start and end time"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(index)}
                          className="h-7 w-7 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 grid place-items-center transition-colors cursor-pointer text-muted-foreground"
                          title="Delete this time slot"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <div
                          className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 grid place-items-center text-emerald-700 dark:text-emerald-400"
                          title="Designated and active"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTeamDialog({ open: false, locationId: "", editing: null })} className="rounded-xl cursor-pointer">Cancel</Button>
            <Button onClick={saveTeam} className="rounded-xl cursor-pointer">{teamDialog.editing ? "Save Changes" : "Create Team"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
