import { useState, useMemo,useEffect } from "react";
import {
  UserPlus,
  Search,
  Edit3,
  Trash2,
  Shield,
  PackageSearch,
  Boxes,
  Truck,
  X,
  Check,
  Users,
  Phone,
  Mail,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  type ManagedUser,
} from "@/lib/sync";
import { Store, Headphones } from "lucide-react";
import { getVendorLocations } from "@/lib/vendor-locations";

/* ── Role visual config ──────────────────────────────────────────────── */

const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    icon: Shield,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  manager: {
    label: "Manager",
    icon: Shield,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  picker: {
    label: "Picker",
    icon: PackageSearch,
    color: "text-info",
    bg: "bg-info/10",
    border: "border-info/30",
  },
  packer: {
    label: "Packer",
    icon: Boxes,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  driver: {
    label: "Driver",
    icon: Truck,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  customer_care: {
    label: "Customer Care",
    icon: Headphones,
    color: "text-info",
    bg: "bg-info/10",
    border: "border-info/30",
  },
  vl_staff: {
    label: "VL Staff",
    icon: Store,
    color: "text-muted-foreground",
    bg: "bg-muted/10",
    border: "border-muted/30",
  },
  user: {
    label: "User",
    icon: Users,
    color: "text-muted-foreground",
    bg: "bg-muted/10",
    border: "border-muted/30",
  },
};

const getRoleConfig = (role: string) => {
  const normRole = (role || "").toLowerCase();
  return ROLE_CONFIG[normRole as keyof typeof ROLE_CONFIG] || {
    label: role || "User",
    icon: Users,
    color: "text-muted-foreground",
    bg: "bg-muted/10",
    border: "border-muted/30",
  };
};

/* ══════════════════════════════════════════════════════════════════════ */

export function UserManagement() {
const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const refreshUsers = () => {
    getUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : [];
    return safeUsers.filter((u) => {
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);
  const safeUsers = Array.isArray(users) ? users : [];
  const roleCounts = {
    all: safeUsers.length,
    admin: safeUsers.filter((u) => u.role === "admin").length,
    picker: safeUsers.filter((u) => u.role === "picker").length,
    packer: safeUsers.filter((u) => u.role === "packer").length,
    driver: safeUsers.filter((u) => u.role === "driver").length,
  };

  const handleDelete = (id: string) => {
    deleteUser(id);
    refreshUsers();
    setDeleteConfirm(null);
  };

  const handleToggleStatus = (id: string) => {
    const user = safeUsers.find((u) => u.id === id);
    if (user) {
      updateUser(id, { status: user.status === "active" ? "inactive" : "active" });
      refreshUsers();
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">User Management</h2>
            <span className="h-6 px-2 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider grid place-items-center">
              {users.length} Users
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage Admin, Picker, Packer, and Driver accounts for RouteMyOrder
          </p>
        </div>
        <button
          id="add-user-btn"
          onClick={() => { setEditingUser(null); setShowAddDialog(true); }}
          className="h-10 px-4 rounded-xl bg-gradient-primary text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          onClick={() => setRoleFilter("all")}
          className={cn(
            "rounded-2xl p-4 premium-card text-left transition-all",
            roleFilter === "all" && "ring-2 ring-primary/40",
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn("h-9 w-9 rounded-xl grid place-items-center bg-primary/10")}>
              <Users className={cn("h-4.5 w-4.5 text-primary")} />
            </div>
            <div>
              <div className="text-xl font-bold tabular-nums">{users.length}</div>
              <div className="text-[11px] text-muted-foreground font-medium">All Users</div>
            </div>
          </div>
        </button>
        {Object.entries(ROLE_CONFIG).map(([role, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "rounded-2xl p-4 premium-card text-left transition-all",
                roleFilter === role && "ring-2 ring-primary/40",
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("h-9 w-9 rounded-xl grid place-items-center", config.bg)}>
                  <Icon className={cn("h-4.5 w-4.5", config.color)} />
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums">{roleCounts[role as keyof typeof roleCounts]}</div>
                  <div className="text-[11px] text-muted-foreground font-medium">{config.label}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search + Table ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              id="user-search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-background transition-colors"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredUsers.length} of {users.length} users
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-semibold px-5 py-3">User</th>
                <th className="text-left font-semibold py-3">Role</th>
                <th className="text-left font-semibold py-3">Email</th>
                <th className="text-left font-semibold py-3">Phone</th>
                <th className="text-center font-semibold py-3">Status</th>
                <th className="text-left font-semibold py-3">Created</th>
                <th className="text-right font-semibold px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const config = getRoleConfig(u.role);
                const Icon = config.icon;
                const initials = u.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <tr
                    key={u.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors group"
                  >
                    {/* Avatar + Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-full grid place-items-center text-xs font-bold shrink-0",
                            config.bg,
                            config.color,
                          )}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{u.id}</div>
                        </div>
                      </div>
                    </td>
                    {/* Role badge */}
                    <td className="py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-semibold",
                          config.bg,
                          config.color,
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </td>
                    {/* Email */}
                    <td className="py-3 text-xs text-muted-foreground">{u.email}</td>
                    {/* Phone */}
                    <td className="py-3 text-xs tabular-nums">{u.phone}</td>
                    {/* Status toggle */}
                    <td className="py-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={cn(
                          "inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-semibold transition-colors",
                          u.status === "active"
                            ? "bg-success/10 text-success hover:bg-success/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            u.status === "active" ? "bg-success" : "bg-muted-foreground",
                          )}
                        />
                        {u.status === "active" ? "Active" : "Inactive"}
                      </button>
                    </td>
                    {/* Created */}
                    <td className="py-3 text-xs text-muted-foreground">{u.createdAt}</td>
                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingUser(u); setShowAddDialog(true); }}
                          className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {deleteConfirm === u.id ? (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="h-7 w-7 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 grid place-items-center"
                              title="Confirm delete"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(u.id)}
                            className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive grid place-items-center transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No users found. {search && "Try adjusting your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Showing {filteredUsers.length} of {users.length} users
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Credentials sync with RouteMyOrder login</span>
          </div>
        </div>
      </section>

      {/* ── Add / Edit User Dialog ────────────────────────────────── */}
      {showAddDialog && (
        <UserDialog
          user={editingUser}
          onClose={() => { setShowAddDialog(false); setEditingUser(null); }}
          onSave={() => { refreshUsers(); setShowAddDialog(false); setEditingUser(null); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* ── User Dialog                                                       */
/* ══════════════════════════════════════════════════════════════════════ */

function UserDialog({
  user,
  onClose,
  onSave,
}: {
  user: ManagedUser | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "picker",
    phone: user?.phone || "",
    password: user?.password || "",
    status: user?.status || "active",
    assignedLocationId: user?.assignedLocationId || user?.locationId || "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required.");
      return;
    }

    if (isEdit && user) {
      updateUser(user.id, {
        name: form.name,
        email: form.email,
        role: form.role as ManagedUser["role"],
        phone: form.phone,
        password: form.password,
        status: form.status as ManagedUser["status"],
      });
    } else {
      addUser({
        id: `u${Date.now()}`,
        name: form.name,
        email: form.email,
        role: form.role as ManagedUser["role"],
        phone: form.phone,
        password: form.password,
        status: form.status as ManagedUser["status"],
        createdAt: new Date().toISOString().split("T")[0],
      });
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl bg-card border border-border shadow-elevated animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit User" : "Create New User"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted grid place-items-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ahmed Khalil"
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:border-primary/40 focus:bg-card transition-colors"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="55001122"
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:border-primary/40 focus:bg-card transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email (Login ID)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@rmo.qa"
                className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:border-primary/40 focus:bg-card transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="password123"
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-muted/30 text-sm font-mono focus:outline-none focus:border-primary/40 focus:bg-card transition-colors"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Role
              </label>
              <Select
                value={form.role}
                onValueChange={(val) => setForm({ ...form, role: val as ManagedUser["role"] })}
              >
                <SelectTrigger className="w-full h-10 rounded-xl border border-border bg-muted/30 hover:border-primary/30 hover:bg-card transition-all text-sm font-medium">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border shadow-elevated bg-popover">
                  <SelectItem value="admin" className="rounded-lg">Admin</SelectItem>
                  <SelectItem value="picker" className="rounded-lg">Picker</SelectItem>
                  <SelectItem value="packer" className="rounded-lg">Packer</SelectItem>
                  <SelectItem value="driver" className="rounded-lg">Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: form.status === "active" ? "inactive" : "active" })}
                className={cn(
                  "h-5 w-9 shrink-0 rounded-full transition-colors relative",
                  form.status === "active" ? "bg-success" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    form.status === "active" ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </button>
              <span className="text-xs font-medium text-muted-foreground">
                {form.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-gradient-primary text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-opacity"
              >
                {isEdit ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
