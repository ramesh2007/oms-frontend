import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  MapPin,
  Warehouse,
  ShieldAlert,
  ClipboardList,
  Users,
  Activity,
  X,
  Boxes,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/warehouses")({
  head: () => ({
    meta: [{ title: "Warehouses - Halamama LMD" }],
  }),
  component: WarehousesPage,
});

/* ------------------------------------------------------------------ */
/*  Types & Interfaces                                                */
/* ------------------------------------------------------------------ */
interface WarehouseBranch {
  id: string;
  code: string;
  location: string;
  status: "Active" | "Inactive";
  capacity?: string;
  staffCount?: number;
  activeOrders?: number;
}

const WAREHOUSE_INVENTORY: Record<
  string,
  Array<{ name: string; sku: string; qty: number; price: number; status: "In Stock" | "Low Stock" | "Out of Stock" }>
> = {
  F01: [
    { name: "Frida Baby NoseFrida Saline Snot Spray", sku: "NS-SPNC-1P-0200", qty: 150, price: 31.00, status: "In Stock" },
    { name: "SmarTrike STR3 6-in-1 Stroller-Trike (Black)", sku: "5021933", qty: 45, price: 599.00, status: "In Stock" },
    { name: "Happy Hop 6-in-1 Play Center", sku: "9060", qty: 12, price: 1999.00, status: "Low Stock" },
    { name: "Happy Hop Double Water Slide – Deluxe", sku: "9029", qty: 8, price: 1499.00, status: "Low Stock" },
  ],
  F02: [
    { name: "Frida Baby NoseFrida Saline Snot Spray", sku: "NS-SPNC-1P-0200", qty: 50, price: 31.00, status: "In Stock" },
    { name: "SmarTrike STR3 6-in-1 Stroller-Trike (Black)", sku: "5021933", qty: 15, price: 599.00, status: "In Stock" },
  ],
  MWO: [
    { name: "HalaMama Premium Wooden Playground Set", sku: "HMP-WPS", qty: 15, price: 3499.00, status: "In Stock" },
    { name: "Bestway Apx 365 Round Pool Set (12' x 30\")", sku: "561KC", qty: 28, price: 799.00, status: "In Stock" },
    { name: "Intex Prism Frame Rectangular Pool Set", sku: "26790", qty: 14, price: 899.00, status: "In Stock" },
    { name: "Step2 Woodland Climber & Slide", sku: "810200", qty: 6, price: 1249.00, status: "Low Stock" },
    { name: "Little Tikes Jump 'n Slide Bouncer", sku: "620072", qty: 0, price: 1599.00, status: "Out of Stock" },
  ],
  VS: [
    { name: "Smoby Green XL Slide", sku: "820304", qty: 120, price: 399.00, status: "In Stock" },
    { name: "Bestway Flowclear Pool Cover (12ft)", sku: "58034", qty: 200, price: 149.00, status: "In Stock" },
    { name: "Peg Perego John Deere Ground Force Tractor", sku: "OR0047", qty: 22, price: 2199.00, status: "In Stock" },
    { name: "Smoby Tefal Studio Kitchen XL", sku: "311045", qty: 5, price: 649.00, status: "Low Stock" },
  ],
};

const INITIAL_WAREHOUSES: WarehouseBranch[] = [
  {
    id: "1",
    code: "F01",
    location: "Fulfillment Center Hilal (Street - 230, Zone - 42, Building No - 151, الدوحة, Qatar)",
    status: "Active",
    capacity: "45,000 sq ft",
    staffCount: 24,
    activeOrders: 184,
  },
  {
    id: "2",
    code: "F02",
    location: "Main Warehouse - Safety Stock (Birkat Al Awamer, Birkat Al Awamer, Qatar)",
    status: "Active",
    capacity: "22,000 sq ft",
    staffCount: 12,
    activeOrders: 92,
  },
  {
    id: "3",
    code: "MWO",
    location: "Main Warehouse Outdoor (Birkat Al Awamer, Birkat Al Awamer, Qatar)",
    status: "Active",
    capacity: "18,500 sq ft",
    staffCount: 15,
    activeOrders: 35,
  },
  {
    id: "4",
    code: "VS",
    location: "Virtual Stock (Qatar)",
    status: "Active",
    capacity: "15,000 sq ft",
    staffCount: 8,
    activeOrders: 41,
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                    */
/* ------------------------------------------------------------------ */
function WarehousesPage() {
  // Page temporarily hidden
  return <Navigate to="/orders" replace />;
}

function WarehousesContent() {
  const [warehouses, setWarehouses] = useState<WarehouseBranch[]>(INITIAL_WAREHOUSES);
  const [search, setSearch] = useState("");

  // Dialog states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseBranch | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: "",
    location: "",
    status: "Active" as WarehouseBranch["status"],
    capacity: "",
    staffCount: 0,
    activeOrders: 0,
  });

  const filtered = useMemo(
    () =>
      warehouses.filter(
        (w) =>
          w.code.toLowerCase().includes(search.toLowerCase()) ||
          w.location.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, warehouses],
  );

  const handleOpenAdd = () => {
    setSelectedWarehouse(null);
    setFormData({
      code: "",
      location: "",
      status: "Active",
      capacity: "10,000 sq ft",
      staffCount: 0,
      activeOrders: 0,
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (w: WarehouseBranch) => {
    setSelectedWarehouse(w);
    setFormData({
      code: w.code,
      location: w.location,
      status: w.status,
      capacity: w.capacity || "10,000 sq ft",
      staffCount: w.staffCount || 0,
      activeOrders: w.activeOrders || 0,
    });
    setIsAddEditOpen(true);
  };

  const handleOpenView = (w: WarehouseBranch) => {
    setSelectedWarehouse(w);
    setIsViewOpen(true);
  };

  const handleDelete = (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to delete warehouse ${code}?`)) {
      setWarehouses(warehouses.filter((w) => w.id !== id));
    }
  };

  const handleSave = () => {
    if (!formData.code.trim() || !formData.location.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    if (selectedWarehouse) {
      // Edit mode
      setWarehouses(
        warehouses.map((w) =>
          w.id === selectedWarehouse.id
            ? {
              ...w,
              code: formData.code.toUpperCase(),
              location: formData.location,
              status: formData.status,
              capacity: formData.capacity,
              staffCount: formData.staffCount,
              activeOrders: formData.activeOrders,
            }
            : w,
        ),
      );
    } else {
      // Add mode
      const newWarehouse: WarehouseBranch = {
        id: Math.random().toString(),
        code: formData.code.toUpperCase(),
        location: formData.location,
        status: formData.status,
        capacity: formData.capacity || "10,000 sq ft",
        staffCount: formData.staffCount || 0,
        activeOrders: formData.activeOrders || 0,
      };
      setWarehouses([...warehouses, newWarehouse]);
    }

    setIsAddEditOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-6 p-4 md:p-6">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
                <Warehouse className="h-6 w-6 text-foreground" />
                Warehouse Branches
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage fulfillment centres, logistics hubs, and physical branches
              </p>
            </div>
            {/* Standard bg-primary or pure monochrome black button with cursor-pointer */}
            <button
              id="add-warehouse-btn"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add New Warehouse
            </button>
          </div>

          {/* ── Action & Filter Bar ── */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Search Warehouses
            </h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="warehouse-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, code, or location…"
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/60 border border-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:border-neutral-400 focus:bg-background transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full grid place-items-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Data Table ── */}
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold">
                Locations{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  ({filtered.length} total)
                </span>
              </h2>
              <span className="inline-flex sm:hidden items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground animate-pulse">
                Swipe left to view actions ➜
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Code
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Location / Branch Name
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-muted-foreground"
                      >
                        No warehouse locations found.
                      </td>
                    </tr>
                  )}
                  {filtered.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center justify-center h-7 min-w-[48px] px-2 rounded-lg bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 text-xs font-bold tracking-wide border border-border">
                          {w.code}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-foreground font-medium">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          {w.location}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {w.capacity || "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        {w.status === "Active" ? (
                          <span className="inline-flex items-center gap-1.5 h-6 px-3 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-900 border border-neutral-200/60 dark:bg-neutral-900/60 dark:text-neutral-100 dark:border-neutral-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-950 dark:bg-white animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 h-6 px-3 rounded-full text-xs font-medium bg-transparent text-neutral-400 border border-dashed border-neutral-300 dark:border-neutral-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenView(w)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
                            title="View Metrics"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => handleOpenEdit(w)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
                            title="Edit Location"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(w.id, w.code)}
                            className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 grid place-items-center transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ── Add / Edit Warehouse Dialog ── */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background border border-border shadow-lg">
          <div className="p-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground tracking-tight">
                {selectedWarehouse ? `Edit Branch ${selectedWarehouse.code}` : "Add New Warehouse"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                Configure full branch details, identifiers, and activity profiles.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1 space-y-2">
                <Label htmlFor="code" className="text-sm font-medium text-foreground">
                  Branch Code <span className="text-muted-foreground">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="F05"
                  className="h-10 rounded-lg border-border bg-background shadow-sm focus-visible:ring-neutral-400"
                  maxLength={5}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="capacity" className="text-sm font-medium text-foreground">
                  Capacity Size
                </Label>
                <Input
                  id="capacity"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="e.g. 20,000 sq ft"
                  className="h-10 rounded-lg border-border bg-background shadow-sm focus-visible:ring-neutral-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium text-foreground">
                Branch Location & Name <span className="text-muted-foreground">*</span>
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Al Khor Hub, Qatar"
                className="h-10 rounded-lg border-border bg-background shadow-sm focus-visible:ring-neutral-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff" className="text-sm font-medium text-foreground">
                  Staff Count
                </Label>
                <Input
                  id="staff"
                  type="number"
                  value={formData.staffCount}
                  onChange={(e) =>
                    setFormData({ ...formData, staffCount: parseInt(e.target.value, 10) || 0 })
                  }
                  className="h-10 rounded-lg border-border bg-background shadow-sm focus-visible:ring-neutral-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orders" className="text-sm font-medium text-foreground">
                  Active Orders
                </Label>
                <Input
                  id="orders"
                  type="number"
                  value={formData.activeOrders}
                  onChange={(e) =>
                    setFormData({ ...formData, activeOrders: parseInt(e.target.value, 10) || 0 })
                  }
                  className="h-10 rounded-lg border-border bg-background shadow-sm focus-visible:ring-neutral-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-foreground">
                Operational Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val: WarehouseBranch["status"]) =>
                  setFormData({ ...formData, status: val })
                }
              >
                <SelectTrigger
                  id="status"
                  className="h-10 rounded-lg border-border bg-background shadow-sm focus:ring-neutral-400 cursor-pointer"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border shadow-md">
                  <SelectItem value="Active" className="cursor-pointer">Active</SelectItem>
                  <SelectItem value="Inactive" className="cursor-pointer">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-6 pt-4 flex items-center justify-end gap-3 bg-muted/20 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setIsAddEditOpen(false)}
              className="h-10 px-5 rounded-lg text-sm font-medium border-border hover:bg-muted cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              className="h-10 px-5 rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-sm font-semibold border-transparent shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
              onClick={handleSave}
            >
              {selectedWarehouse ? "Save Changes" : "Add Warehouse"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Warehouse Metrics Dialog ── */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-background border border-border shadow-lg">
          {selectedWarehouse && (
            <>
              <div className="p-6 pb-4 border-b border-border bg-muted/20">
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center h-9 min-w-[56px] px-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-sm font-bold tracking-wide shadow-sm">
                      {selectedWarehouse.code}
                    </span>
                    <div>
                      <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                        {selectedWarehouse.location}
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Branch ID: {selectedWarehouse.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-6">
                {/* ── Highlight Metrics Cards ── */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-border p-3.5 bg-card flex flex-col gap-1.5 shadow-soft">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Active Orders
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      {selectedWarehouse.activeOrders || 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border p-3.5 bg-card flex flex-col gap-1.5 shadow-soft">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Total Staff
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      {selectedWarehouse.staffCount || 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border p-3.5 bg-card flex flex-col gap-1.5 shadow-soft">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                      <ClipboardList className="h-3 w-3" />
                      Capacity
                    </span>
                    <span className="text-[13px] font-bold text-foreground leading-tight truncate">
                      {selectedWarehouse.capacity || "10,000 sq ft"}
                    </span>
                  </div>
                </div>

                {/* ── Detailed Parameters list ── */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3.5">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Operational Integrity
                  </h3>

                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span>
                      {selectedWarehouse.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-900 border border-neutral-200/60 dark:bg-neutral-900/60 dark:text-neutral-100 dark:border-neutral-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-transparent text-neutral-400 border border-dashed border-neutral-300 dark:border-neutral-700">
                          Inactive
                        </span>
                      )}
                    </span>

                    <span className="text-muted-foreground">Picking SLA Target:</span>
                    <span className="font-medium text-foreground">98.5% (Within 1h)</span>

                    <span className="text-muted-foreground">Primary Delivery Zones:</span>
                    <span className="font-medium text-foreground">Zone 1, Zone 2, Zone 4</span>

                    <span className="text-muted-foreground">Dispatch Type:</span>
                    <span className="font-medium text-foreground">Same-Day / Next-Day Delivery</span>
                  </div>
                </div>

                {/* ── Inventory Stock Section ── */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-soft">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-muted-foreground" />
                    Inventory & Stock Items
                  </h3>

                  <div className="overflow-x-auto rounded-lg border border-border/60">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                          <th className="px-4 py-2.5">Product Name</th>
                          <th className="px-4 py-2.5">SKU</th>
                          <th className="px-4 py-2.5 text-right">Qty</th>
                          <th className="px-4 py-2.5 text-right">Price</th>
                          <th className="px-4 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 text-[11px]">
                        {(WAREHOUSE_INVENTORY[selectedWarehouse.code] || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                              No inventory items registered for this location.
                            </td>
                          </tr>
                        ) : (
                          (WAREHOUSE_INVENTORY[selectedWarehouse.code] || []).map((item) => (
                            <tr key={item.sku} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-foreground max-w-[150px] truncate" title={item.name}>
                                {item.name}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.sku}</td>
                              <td className="px-4 py-2.5 text-right font-semibold">{item.qty}</td>
                              <td className="px-4 py-2.5 text-right text-muted-foreground">QAR {item.price.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={cn(
                                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold border",
                                  item.status === "In Stock"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40"
                                    : item.status === "Low Stock"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40"
                                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40"
                                )}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Status Notice if inactive */}
                {selectedWarehouse.status === "Inactive" && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40 p-3.5 text-xs text-neutral-600 dark:text-neutral-400">
                    <ShieldAlert className="h-4.5 w-4.5 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white mb-0.5">
                        Location Currently Inactive
                      </p>
                      <p>
                        All incoming delivery routes and automated allocations for this branch are currently suspended. Go to Edit to activate.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 pt-4 flex items-center justify-end border-t border-border bg-muted/20">
                <Button
                  onClick={() => setIsViewOpen(false)}
                  className="h-10 px-6 rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-sm font-semibold border-transparent hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
