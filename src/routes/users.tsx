import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  UserPlus,
  Search,
  Edit3,
  Trash2,
  Shield,
  PackageSearch,
  Boxes,
  Truck,
  MoreHorizontal,
  X,
  Check,
  Users,
  Phone,
  Mail,
  Key,
  Headphones,
  Store,
} from "lucide-react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
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
import { getLocations } from "@/lib/scheduling";
import { getVendorLocations } from "@/lib/vendor-locations";

export const Route = createFileRoute("/users")(
  {
    head: () => ({
      meta: [
        { title: "Halamama · User Management" },
        {
          name: "description",
          content: "Manage Picker, Packer, Driver, Customer Care, and VL Staff accounts.",
        },
      ],
    }),
    component: UsersPage,
  },
);

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
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
  return ROLE_CONFIG[normRole] || {
    label: role || "User",
    icon: Users,
    color: "text-muted-foreground",
    bg: "bg-muted/10",
    border: "border-muted/30",
  };
};

function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts: Record<string, number> = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    picker: users.filter((u) => u.role === "picker").length,
    packer: users.filter((u) => u.role === "packer").length,
    driver: users.filter((u) => u.role === "driver").length,
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      await refreshUsers();
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirm(null);
  };

  const handleToggleStatus = async (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      try {
        await updateUser(id, { status: user.status === "active" ? "inactive" : "active" });
        await refreshUsers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground aurora-container">
      <div className="aurora-glow-1" />
      <div className="aurora-glow-2" />
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <TopBar />
        <main className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto w-full">
          {/* Page header */}
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                <span className="h-6 px-2 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider grid place-items-center">
                  {users.length} Users
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage Admin, Picker, Packer, and Driver accounts for RouteMyOrder
              </p>
            </div>
            <button
              onClick={() => { setEditingUser(null); setShowAddDialog(true); }}
              className="h-10 px-4 rounded-xl bg-gradient-primary text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" /> Add User
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {(["all", "admin", "picker", "packer", "driver"] as const).map((role) => {
              const isAll = role === "all";
              const config = isAll
                ? { label: "All Users", icon: Users, color: "text-primary", bg: "bg-primary/10" }
                : ROLE_CONFIG[role];
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
                      <div className="text-xl font-bold tabular-nums">{roleCounts[role]}</div>
                      <div className="text-[11px] text-muted-foreground font-medium">{config.label}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search + Table */}
          <section className="rounded-2xl premium-card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-border">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-card transition-colors"
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
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                          <span>Loading users...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        No users found. {search && "Try adjusting your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const config = getRoleConfig(u.role);
                      const Icon = config.icon;
                      const initials = u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <tr
                          key={u.id}
                          className="border-t border-border hover:bg-muted/30 transition-colors group"
                        >
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
                                <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                                  {u.id}
                                </div>
                              </div>
                            </div>
                          </td>
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
                          <td className="py-3 text-xs text-muted-foreground">{u.email}</td>
                          <td className="py-3 text-xs tabular-nums">{u.phone}</td>
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
                          <td className="py-3 text-xs text-muted-foreground">{u.createdAt}</td>
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
                    })
                  )}
                </tbody>
              </table>
            </div>

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

          <footer className="text-center text-[11px] text-muted-foreground py-4">
            Halamama · RouteMyOrder · User Management · v2.4.1
          </footer>
        </main>
      </div>

      {/* Add/Edit User Dialog */}
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

// ─── User Dialog ─────────────────────────────────────────────────────────

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
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || (!isEdit && !form.password)) {
      setError("Name, email, and password (for new users) are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && user) {
        await updateUser(user.id, {
          name: form.name,
          email: form.email,
          role: form.role as ManagedUser["role"],
          phone: form.phone,
          password: form.password || undefined,
          status: form.status as ManagedUser["status"],
        });
      } else {
        await addUser({
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
    } catch (err: any) {
      console.error("[UserDialog] Failed to save user:", err);
      setError(err.message || "Failed to save user. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
                  "h-5 w-9 rounded-full transition-colors relative",
                  form.status === "active" ? "bg-success" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    form.status === "active" ? "translate-x-4" : "translate-x-0.5",
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
                disabled={submitting}
                className={cn(
                  "h-9 px-4 rounded-lg bg-gradient-primary text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-opacity flex items-center gap-1.5",
                  submitting && "opacity-70 cursor-not-allowed"
                )}
              >
                {submitting && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />}
                {isEdit ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
