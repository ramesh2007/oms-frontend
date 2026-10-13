/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  Scheduling Store — Locations, Teams, and Appointments                        ║
 * ║                                                                              ║
 * ║  Manages the Customer Care scheduling workflow for MWH and VL_SUPPLIER        ║
 * ║  items that require installation. Data is persisted to localStorage and       ║
 * ║  synchronised across tabs.                                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InstallLocation {
  id: string;
  name: string;
  city: string;
  location_id?: number | string;
  location_name?: string;
  createdAt?: string;
}

export interface InstallTeam {
  id: string;
  name: string;
  locationId: string;
  /** Which type of items this team handles */
  type: "MWH" | "VL_SUPPLIER";
  role?: string;
  technician_id?: number | string;
  technician_name?: string;
  memberNames: string[];
  /** Designated time slots allocated to this team. Defaults to STANDARD_INSTALLATION_SLOTS if empty */
  allocatedSlots?: InstallationSlot[];
  createdAt?: string;
}

export interface Appointment {
  id: string;
  teamId: string;
  locationId: string;
  orderId: string;
  /** The IDs of the specific order items this appointment covers */
  itemIds: string[];
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  /** YYYY-MM-DD */
  scheduledDate: string;
  /** HH:MM (24h) */
  scheduledTime: string;
  status: "Scheduled" | "Confirmed" | "Completed" | "Cancelled";
  notes: string;
  /** Email of Customer Care agent who created this appointment */
  createdBy: string;
  createdAt: string;
}

// ─── Slot Availability Types & Constants ─────────────────────────────────────

export interface InstallationSlot {
  time: string; // 24h start time, e.g. "09:00"
  endTime?: string; // 24h end time, e.g. "11:00"
  label: string; // "09:00 AM – 11:00 AM"
  period: "Morning" | "Afternoon" | "Evening";
}

export const STANDARD_INSTALLATION_SLOTS: InstallationSlot[] = [
  { time: "09:00", endTime: "11:00", label: "09:00 AM – 11:00 AM", period: "Morning" },
  { time: "11:30", endTime: "13:30", label: "11:30 AM – 01:30 PM", period: "Morning" },
  { time: "14:00", endTime: "16:00", label: "02:00 PM – 04:00 PM", period: "Afternoon" },
  { time: "16:30", endTime: "18:30", label: "04:30 PM – 06:30 PM", period: "Afternoon" },
  { time: "19:00", endTime: "21:00", label: "07:00 PM – 09:00 PM", period: "Evening" },
];

export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function formatTime12h(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ? mStr.padStart(2, "0") : "00";
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
}

export function derivePeriod(time24: string): "Morning" | "Afternoon" | "Evening" {
  const h = parseInt(time24.split(":")[0], 10);
  if (isNaN(h) || h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

export function buildSlotFromTimes(start24: string, end24: string): InstallationSlot {
  const formattedStart = formatTime12h(start24);
  const formattedEnd = formatTime12h(end24);
  const period = derivePeriod(start24);
  return {
    time: start24,
    endTime: end24,
    label: `${formattedStart} – ${formattedEnd}`,
    period,
  };
}

/**
 * Validates a start and end time range and checks for overlaps with existing slots.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateTimeSlot(
  start24: string,
  end24: string,
  existingSlots: InstallationSlot[],
  editingIndex?: number,
): string | null {
  if (!start24 || !end24) {
    return "Start time and End time are both required.";
  }
  const startMin = timeToMinutes(start24);
  const endMin = timeToMinutes(end24);

  if (endMin <= startMin) {
    return "End time must be later than Start time.";
  }

  // Check overlap against existing slots (excluding the one being edited, if any)
  for (let i = 0; i < existingSlots.length; i++) {
    if (editingIndex !== undefined && i === editingIndex) continue;
    const existing = existingSlots[i];
    const exStart = timeToMinutes(existing.time);
    const exEnd = existing.endTime ? timeToMinutes(existing.endTime) : exStart + 120;

    if (startMin < exEnd && endMin > exStart) {
      return `Time slot overlaps with existing slot "${existing.label}".`;
    }
  }

  return null;
}

export interface SlotAvailability {
  slot: InstallationSlot;
  isBooked: boolean;
  appointment?: Appointment;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const LOCATIONS_KEY = "hm_install_locations_v3";
const TEAMS_KEY = "hm_install_teams_v3";
const APPOINTMENTS_KEY = "hm_appointments_v3";
const SYNC_KEY = "hm_scheduling_sync";

// ─── Seed Data ────────────────────────────────────────────────────────────────

const DEFAULT_LOCATIONS: InstallLocation[] = [
  { id: "1", name: "Doha central", city: "Doha", location_id: 1, location_name: "Doha central", createdAt: "2026-01-10" },
  { id: "2", name: "Al Wakrah Hall", city: "Al Wakrah", location_id: 2, location_name: "Al Wakrah Hall", createdAt: "2026-01-12" },
  { id: "3", name: "Al Khor Zone", city: "Al Khor", location_id: 3, location_name: "Al Khor Zone", createdAt: "2026-02-01" },
];

const DEFAULT_TEAMS: InstallTeam[] = [
  {
    id: "1",
    name: "Farshad",
    technician_id: 1,
    technician_name: "Farshad",
    role: "Technician",
    locationId: "1",
    type: "MWH",
    memberNames: ["Farshad"],
    allocatedSlots: [...STANDARD_INSTALLATION_SLOTS],
    createdAt: "2026-01-10",
  },
  {
    id: "2",
    name: "Naveed",
    technician_id: 2,
    technician_name: "Naveed",
    role: "Technician",
    locationId: "1",
    type: "MWH",
    memberNames: ["Naveed"],
    allocatedSlots: [...STANDARD_INSTALLATION_SLOTS],
    createdAt: "2026-01-10",
  },
  {
    id: "3",
    name: "Shambu",
    technician_id: 3,
    technician_name: "Shambu",
    role: "Technician",
    locationId: "1",
    type: "MWH",
    memberNames: ["Shambu"],
    allocatedSlots: [...STANDARD_INSTALLATION_SLOTS],
    createdAt: "2026-01-10",
  },
  {
    id: "4",
    name: "Irshad",
    technician_id: 4,
    technician_name: "Irshad",
    role: "Technician",
    locationId: "2",
    type: "MWH",
    memberNames: ["Irshad"],
    allocatedSlots: [...STANDARD_INSTALLATION_SLOTS],
    createdAt: "2026-01-10",
  },
  {
    id: "5",
    name: "Waseem",
    technician_id: 5,
    technician_name: "Waseem",
    role: "Technician",
    locationId: "2",
    type: "MWH",
    memberNames: ["Waseem"],
    allocatedSlots: [...STANDARD_INSTALLATION_SLOTS],
    createdAt: "2026-01-10",
  },
  {
    id: "6",
    name: "Minhal",
    technician_id: 6,
    technician_name: "Minhal",
    role: "Technician",
    locationId: "3",
    type: "MWH",
    memberNames: ["Minhal"],
    allocatedSlots: [...STANDARD_INSTALLATION_SLOTS],
    createdAt: "2026-01-12",
  },
  {
    id: "7",
    name: "Rizwan",
    technician_id: 7,
    technician_name: "Rizwan",
    role: "Technician",
    locationId: "3",
    type: "MWH",
    memberNames: ["Rizwan"],
    allocatedSlots: [...STANDARD_INSTALLATION_SLOTS],
    createdAt: "2026-01-12",
  },
];

// Build some realistic demo appointments relative to today
function buildDefaultAppointments(): Appointment[] {
  const today = new Date();
  const fmt = (offset: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return formatLocalDate(d);
  };

  return [
    {
      id: "appt-2",
      teamId: "team-2",
      locationId: "loc-1",
      orderId: "HM68258",
      itemIds: [],
      customerName: "Mouza Al Derham",
      customerPhone: "55003344",
      customerAddress: "West Bay Lagoon, Villa 45, Doha",
      scheduledDate: fmt(2),
      scheduledTime: "14:00",
      status: "Confirmed",
      notes: "Supplier will deliver directly to customer.",
      createdBy: "cc@halamama.com",
      createdAt: new Date().toISOString(),
    },
    {
      id: "appt-3",
      teamId: "team-3",
      locationId: "loc-2",
      orderId: "HM68268",
      itemIds: [],
      customerName: "Aisha Al Naemi",
      customerPhone: "55005566",
      customerAddress: "Al Waab St, Zone 55, Villa 18, Al Waab",
      scheduledDate: fmt(3),
      scheduledTime: "11:30",
      status: "Scheduled",
      notes: "",
      createdBy: "cc@halamama.com",
      createdAt: new Date().toISOString(),
    },
    {
      id: "appt-4",
      teamId: "team-1",
      locationId: "loc-1",
      orderId: "HM64839",
      itemIds: [],
      customerName: "test test",
      customerPhone: "55007788",
      customerAddress: "Lusail Marina, Tower 12, Lusail",
      scheduledDate: fmt(-1),
      scheduledTime: "10:00",
      status: "Completed",
      notes: "Installed successfully.",
      createdBy: "cc@halamama.com",
      createdAt: new Date().toISOString(),
    },
    {
      id: "appt-5",
      teamId: "team-1",
      locationId: "loc-1",
      orderId: "HM60105",
      itemIds: [],
      customerName: "Rashed Nasser",
      customerPhone: "55881234",
      customerAddress: "Education City, Housing Compound 3, Villa 12, Education City",
      scheduledDate: fmt(0),
      scheduledTime: "11:30",
      status: "Scheduled",
      notes: "Customer available after 11am.",
      createdBy: "cc@halamama.com",
      createdAt: new Date().toISOString(),
    },
    {
      id: "appt-6",
      teamId: "team-1",
      locationId: "loc-1",
      orderId: "HM60107",
      itemIds: [],
      customerName: "Lina Qassim",
      customerPhone: "55990031",
      customerAddress: "Muaither North, Street 510, Villa 28, Muaither",
      scheduledDate: fmt(0),
      scheduledTime: "16:30",
      status: "Confirmed",
      notes: "Gate code #4492.",
      createdBy: "cc@halamama.com",
      createdAt: new Date().toISOString(),
    },
    {
      id: "appt-7",
      teamId: "team-2",
      locationId: "loc-1",
      orderId: "HM60108",
      itemIds: [],
      customerName: "Othman Kareem",
      customerPhone: "55447766",
      customerAddress: "Al Waab St, Zone 55, Street 230, Villa 8, Al Waab",
      scheduledDate: fmt(1),
      scheduledTime: "09:00",
      status: "Scheduled",
      notes: "Morning installation requested.",
      createdBy: "cc@halamama.com",
      createdAt: new Date().toISOString(),
    },
  ];
}

// ─── Seed Helpers ─────────────────────────────────────────────────────────────

function seedLocations(): InstallLocation[] {
  try {
    const raw = localStorage.getItem(LOCATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(DEFAULT_LOCATIONS));
  return DEFAULT_LOCATIONS;
}

function seedTeams(): InstallTeam[] {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  localStorage.setItem(TEAMS_KEY, JSON.stringify(DEFAULT_TEAMS));
  return DEFAULT_TEAMS;
}

function seedAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(APPOINTMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const defaults = buildDefaultAppointments();
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(defaults));
  return defaults;
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

function broadcast(): void {
  localStorage.setItem(SYNC_KEY, Date.now().toString());
}

// ─── Locations CRUD ──────────────────────────────────────────────────────────

export function getLocations(): InstallLocation[] {
  return seedLocations();
}

export function addLocation(loc: Omit<InstallLocation, "id" | "createdAt">): InstallLocation {
  const locations = getLocations();
  const newLoc: InstallLocation = {
    ...loc,
    id: `loc-${Date.now()}`,
    createdAt: formatLocalDate(),
  };
  locations.push(newLoc);
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  broadcast();
  return newLoc;
}

export function updateLocation(id: string, updates: Partial<Omit<InstallLocation, "id">>): void {
  const locations = getLocations().map((l) => (l.id === id ? { ...l, ...updates } : l));
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  broadcast();
}

export function deleteLocation(id: string): void {
  // Also delete all teams under this location
  const teams = getTeams().filter((t) => t.locationId !== id);
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  // Delete appointments for teams in this location
  const teamIds = new Set(DEFAULT_TEAMS.filter((t) => t.locationId === id).map((t) => t.id));
  const appts = getAppointments().filter((a) => !teamIds.has(a.teamId));
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appts));

  const locations = getLocations().filter((l) => l.id !== id);
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  broadcast();
}

// ─── Teams CRUD ───────────────────────────────────────────────────────────────

export function getTeams(): InstallTeam[] {
  return seedTeams();
}

export function getTeamsByLocation(locationId: string): InstallTeam[] {
  return getTeams().filter((t) => t.locationId === locationId);
}

export function addTeam(team: Omit<InstallTeam, "id" | "createdAt">): InstallTeam {
  const teams = getTeams();
  const newTeam: InstallTeam = {
    ...team,
    id: `team-${Date.now()}`,
    createdAt: formatLocalDate(),
  };
  teams.push(newTeam);
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  broadcast();
  return newTeam;
}

export function updateTeam(id: string, updates: Partial<Omit<InstallTeam, "id">>): void {
  const teams = getTeams().map((t) => (t.id === id ? { ...t, ...updates } : t));
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  broadcast();
}

export function deleteTeam(id: string): void {
  const teams = getTeams().filter((t) => t.id !== id);
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  broadcast();
}

// ─── Appointments CRUD ────────────────────────────────────────────────────────

export function getAppointments(): Appointment[] {
  return seedAppointments();
}

export function getAppointmentsByTeam(teamId: string): Appointment[] {
  return getAppointments().filter((a) => a.teamId === teamId);
}

export function getAppointmentsByOrder(orderId: string): Appointment {
  return getAppointments().find((a) => a.orderId === orderId) as Appointment;
}

export function addAppointment(appt: Omit<Appointment, "id" | "createdAt">): Appointment {
  const appts = getAppointments();
  const newAppt: Appointment = {
    ...appt,
    id: `appt-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  appts.push(newAppt);
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appts));
  broadcast();
  return newAppt;
}

export function updateAppointment(id: string, updates: Partial<Omit<Appointment, "id">>): void {
  const appts = getAppointments().map((a) => (a.id === id ? { ...a, ...updates } : a));
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appts));
  broadcast();
}

export function deleteAppointment(id: string): void {
  const appts = getAppointments().filter((a) => a.id !== id);
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appts));
  broadcast();
}

/** Get all appointments for a given week (Mon–Sun) */
export function getAppointmentsForWeek(teamId: string, weekStartDate: string): Appointment[] {
  const [y, m, d] = weekStartDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endStr = formatLocalDate(end);
  return getAppointments().filter(
    (a) => a.teamId === teamId && a.scheduledDate >= weekStartDate && a.scheduledDate <= endStr,
  );
}

/** Check if an order already has a scheduled appointment */
export function hasAppointment(orderId: string): boolean {
  return getAppointments().some(
    (a) => a.orderId === orderId && a.status !== "Cancelled",
  );
}

/**
 * Calculates available and booked slots for a given team on a specific date.
 * Uses the team's designated allocatedSlots, falling back to STANDARD_INSTALLATION_SLOTS.
 */
export function getTeamSlotAvailability(teamId: string, date: string): SlotAvailability[] {
  const team = getTeams().find((t) => t.id === teamId);
  const slots = team?.allocatedSlots && team.allocatedSlots.length > 0
    ? team.allocatedSlots
    : STANDARD_INSTALLATION_SLOTS;

  if (!teamId || !date) {
    return slots.map((slot) => ({ slot, isBooked: false }));
  }

  const activeAppts = getAppointments().filter(
    (a) => a.teamId === teamId && a.scheduledDate === date && a.status !== "Cancelled"
  );

  return slots.map((slot) => {
    const matchingAppt = activeAppts.find((a) => {
      if (!a.scheduledTime) return false;
      const apptTime = a.scheduledTime.trim();
      if (apptTime === slot.time) return true;
      const [sh, sm] = slot.time.split(":").map(Number);
      const [ah, am] = apptTime.split(":").map(Number);
      if (!isNaN(sh) && !isNaN(ah)) {
        const diff = Math.abs((sh * 60 + (sm || 0)) - (ah * 60 + (am || 0)));
        return diff < 60;
      }
      return false;
    });

    return {
      slot,
      isBooked: Boolean(matchingAppt),
      appointment: matchingAppt,
    };
  });
}
