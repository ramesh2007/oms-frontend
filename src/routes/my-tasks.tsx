import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { useOrders } from "@/hooks/useOrders";
import {
  useOperationTasks,
  type OperationTask,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Headphones,
  Phone,
  MapPin,
  User,
  Package,
  Calendar,
  Trash2,
  Check,
  Play,
  RotateCcw,
  Download,
  ExternalLink,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/my-tasks")({
  head: () => ({
    meta: [
      { title: "My Tasks & CC Tickets - Halamama Operations" },
      {
        name: "description",
        content: "Manage Customer Care tickets and operational action requests for orders.",
      },
    ],
  }),
  component: MyTasksPage,
});

const CATEGORIES: TaskCategory[] = [
  "Address Change",
  "Urgent Delivery",
  "Hold Order",
  "Item Modification",
  "Special Packaging",
  "Gate Pass / Access",
  "Customer Verification",
  "Other",
];

const PRIORITIES: TaskPriority[] = ["Urgent", "High", "Medium", "Low"];

const STATUSES: TaskStatus[] = ["Open", "In Progress", "Resolved", "Cancelled"];

function formatTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  } catch {
    return dateStr;
  }
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border",
        priority === "Urgent" &&
          "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 animate-pulse",
        priority === "High" &&
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        priority === "Medium" &&
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        priority === "Low" && "bg-muted text-muted-foreground border-border",
      )}
    >
      {priority === "Urgent" && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
      {priority === "High" && <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />}
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        status === "Open" && "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
        status === "In Progress" && "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
        status === "Resolved" &&
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
        status === "Cancelled" && "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "Open" && "bg-amber-500",
          status === "In Progress" && "bg-sky-500",
          status === "Resolved" && "bg-emerald-500",
          status === "Cancelled" && "bg-gray-400",
        )}
      />
      {status}
    </span>
  );
}

function CategoryTag({ category }: { category: TaskCategory }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60">
      <Headphones className="h-3 w-3 shrink-0" />
      {category}
    </span>
  );
}

function MyTasksPage() {
  const { data: orders = [] } = useOrders();
  const { tasks, createTask, updateTaskStatus, deleteTask } = useOperationTasks();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Create Ticket Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrderId, setNewOrderId] = useState("");
  const [newOrderNumber, setNewOrderNumber] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCity, setNewCity] = useState("Doha");
  const [newCategory, setNewCategory] = useState<TaskCategory>("Address Change");
  const [newPriority, setNewPriority] = useState<TaskPriority>("High");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCreatedBy, setNewCreatedBy] = useState("Customer Care Desk");
  const [newAssignedTo, setNewAssignedTo] = useState("Operations Team");

  // Resolve Ticket Dialog State
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [activeTaskToResolve, setActiveTaskToResolve] = useState<OperationTask | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolvedByName, setResolvedByName] = useState("Operations Lead");

  // Counts
  const stats = useMemo(() => {
    const total = tasks.length;
    const open = tasks.filter((t) => t.status === "Open").length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const resolved = tasks.filter((t) => t.status === "Resolved").length;
    const urgent = tasks.filter((t) => t.priority === "Urgent" && t.status !== "Resolved").length;
    return { total, open, inProgress, resolved, urgent };
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "All" && task.status !== statusFilter) return false;
      if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;
      if (categoryFilter !== "All" && task.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = task.id.toLowerCase().includes(q);
        const matchesOrder =
          task.orderNumber.toLowerCase().includes(q) || task.orderId.toLowerCase().includes(q);
        const matchesCustomer =
          task.customerName.toLowerCase().includes(q) || (task.customerPhone || "").includes(q);
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description.toLowerCase().includes(q);
        if (!matchesId && !matchesOrder && !matchesCustomer && !matchesTitle && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  // Handle Order Selection in Create Dialog
  const handleSelectOrder = (orderId: string) => {
    setNewOrderId(orderId);
    const selected = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (selected) {
      setNewOrderNumber(selected.orderNumber || selected.id.replace(/^HM-/, ""));
      setNewCustomerName(selected.customer?.name || "");
      setNewCustomerPhone(selected.customer?.phone || "");
      setNewCity(selected.city || "Doha");
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderNumber.trim() || !newTitle.trim() || !newDescription.trim()) {
      toast.error("Please fill in Order Number, Title, and Description");
      return;
    }

    createTask({
      orderId: newOrderId.trim() || `HM-${newOrderNumber.replace(/^#/, "")}`,
      orderNumber: newOrderNumber.replace(/^#/, ""),
      customerName: newCustomerName.trim() || "Customer",
      customerPhone: newCustomerPhone.trim(),
      city: newCity,
      category: newCategory,
      priority: newPriority,
      title: newTitle.trim(),
      description: newDescription.trim(),
      createdBy: newCreatedBy.trim() || "Customer Care",
      assignedTo: newAssignedTo.trim() || "Operations Team",
    });

    toast.success("Task ticket created successfully for Operations!");
    setCreateDialogOpen(false);
    // Reset form
    setNewOrderId("");
    setNewOrderNumber("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewTitle("");
    setNewDescription("");
  };

  const handleOpenResolveDialog = (task: OperationTask) => {
    setActiveTaskToResolve(task);
    setResolutionNote("");
    setResolveDialogOpen(true);
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskToResolve) return;

    updateTaskStatus(
      activeTaskToResolve.id,
      "Resolved",
      resolutionNote.trim() || "Action completed by Operations Team.",
      resolvedByName.trim() || "Operations Team",
    );

    toast.success(`Ticket ${activeTaskToResolve.id} marked as Resolved`);
    setResolveDialogOpen(false);
    setActiveTaskToResolve(null);
  };

  const handleExportCSV = () => {
    const headers = [
      "Ticket ID",
      "Order Number",
      "Customer Name",
      "Phone",
      "City",
      "Category",
      "Priority",
      "Status",
      "Title",
      "Description",
      "Created By",
      "Created At",
      "Assigned To",
      "Resolution Notes",
    ];

    const rows = filteredTasks.map((t) => [
      t.id,
      t.orderNumber,
      `"${t.customerName.replace(/"/g, '""')}"`,
      t.customerPhone || "",
      t.city || "",
      t.category,
      t.priority,
      t.status,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.createdBy,
      t.createdAt,
      t.assignedTo || "",
      `"${(t.resolutionNotes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `customer_care_tasks_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Tasks exported to CSV");
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    My Tasks & CC Tickets
                  </h1>
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {stats.open + stats.inProgress} Pending
                  </span>
                </div>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Customer Care tickets assigned to Operations — manage urgent requests, address
                  updates, customer holds, and order notes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/orders"
                search={{ tab: "My Tasks" }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-1 shadow-2xs"
              >
                <Package className="h-3.5 w-3.5 text-teal-600" />
                <span>View in Orders Tab</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 text-xs font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Create Ticket</span>
              </Button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Total Tickets</span>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
                {stats.total}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                All logged CC operations requests
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Open Tickets
                </span>
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl font-extrabold tracking-tight text-amber-950 dark:text-amber-100">
                  {stats.open}
                </p>
                {stats.urgent > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 animate-pulse">
                    ({stats.urgent} Urgent)
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                Awaiting operation team action
              </p>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-2xs dark:border-sky-900/50 dark:bg-sky-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-800 dark:text-sky-300">
                  In Progress
                </span>
                <Play className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-sky-950 dark:text-sky-100">
                {stats.inProgress}
              </p>
              <p className="mt-1 text-[11px] text-sky-700/80 dark:text-sky-400/80">
                Currently being handled by warehouse
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Resolved
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-950 dark:text-emerald-100">
                {stats.resolved}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                Completed and updated
              </p>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by Ticket ID, Order #, Customer, or Keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs sm:text-sm h-9"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs min-w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-9 text-xs min-w-[120px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Priorities</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 text-xs min-w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 self-end lg:self-auto border border-border rounded-lg p-0.5 bg-muted/30">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-md text-xs font-medium transition-colors",
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Grid Card View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded-md text-xs font-medium transition-colors",
                  viewMode === "table"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">No Tasks Found</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                {searchQuery ||
                statusFilter !== "All" ||
                priorityFilter !== "All" ||
                categoryFilter !== "All"
                  ? "No tasks match the selected filters. Try clearing your search or filters."
                  : "No operational tasks have been logged yet."}
              </p>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="mt-4 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Ticket</span>
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border bg-card p-4 transition-all shadow-2xs hover:shadow-md",
                    task.priority === "Urgent" && task.status !== "Resolved"
                      ? "border-red-300 dark:border-red-900/60 bg-red-50/10"
                      : task.status === "Resolved"
                        ? "border-border/70 opacity-80 bg-muted/10"
                        : "border-border hover:border-teal-400/60",
                  )}
                >
                  <div>
                    {/* Top Row: Ticket ID, Category, Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-extrabold text-foreground">
                          {task.id}
                        </span>
                        <CategoryTag category={task.category} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                      </div>
                    </div>

                    {/* Order Reference Pill */}
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 p-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Order:</span>
                        <Link
                          to="/orders"
                          search={{ tab: "My Tasks" }}
                          className="font-mono font-bold text-primary hover:underline truncate"
                        >
                          #{task.orderNumber}
                        </Link>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {task.city || "Doha"}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{task.customerName}</span>
                      </div>
                      {task.customerPhone && (
                        <div className="flex items-center gap-1 text-muted-foreground font-mono text-[11px]">
                          <Phone className="h-3 w-3" />
                          <span>{task.customerPhone}</span>
                        </div>
                      )}
                    </div>

                    {/* Ticket Title & Description */}
                    <div className="mt-3 space-y-1">
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {task.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {task.description}
                      </p>
                    </div>

                    {/* Resolution Note if resolved */}
                    {task.status === "Resolved" && task.resolutionNotes && (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
                        <div className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Resolution:</span>
                        </div>
                        <p className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80 mt-0.5">
                          {task.resolutionNotes}
                        </p>
                        {task.resolvedBy && (
                          <span className="text-[10px] text-muted-foreground mt-1 block">
                            By {task.resolvedBy} •{" "}
                            {task.resolvedAt ? formatTimeAgo(task.resolvedAt) : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Meta & Actions */}
                  <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-muted-foreground">
                      <span>{task.createdBy}</span>
                      <span className="mx-1">•</span>
                      <span>{formatTimeAgo(task.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {task.status === "Open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, "In Progress")}
                          className="h-7 text-xs font-semibold gap-1 text-sky-700 hover:text-sky-800 hover:bg-sky-50 dark:text-sky-300"
                        >
                          <Play className="h-3 w-3" />
                          <span>Handle</span>
                        </Button>
                      )}

                      {task.status === "In Progress" && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenResolveDialog(task)}
                          className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="h-3 w-3" />
                          <span>Resolve</span>
                        </Button>
                      )}

                      {task.status === "Resolved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateTaskStatus(task.id, "Open")}
                          className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                          title="Reopen Ticket"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reopen</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete ticket ${task.id}?`)) {
                            deleteTask(task.id);
                            toast.info(`Deleted ticket ${task.id}`);
                          }
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Delete ticket"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                    <tr>
                      <th className="py-3 px-3.5">Ticket</th>
                      <th className="py-3 px-3">Order</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Title & Request</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Created</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold">{task.id}</td>
                        <td className="py-3 px-3 font-mono">
                          <Link
                            to="/orders"
                            search={{ tab: "My Tasks" }}
                            className="font-bold text-primary hover:underline"
                          >
                            #{task.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold">{task.customerName}</div>
                          {task.customerPhone && (
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {task.customerPhone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <CategoryTag category={task.category} />
                        </td>
                        <td className="py-3 px-3">
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td className="py-3 px-3 max-w-[280px]">
                          <div className="font-bold text-foreground truncate">{task.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {task.description}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-muted-foreground">
                          <div>{task.createdBy}</div>
                          <div className="text-[10px]">{formatTimeAgo(task.createdAt)}</div>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {task.status === "Open" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTaskStatus(task.id, "In Progress")}
                                className="h-7 text-xs font-semibold gap-1 text-sky-700 hover:text-sky-800"
                              >
                                <Play className="h-3 w-3" />
                                <span>Handle</span>
                              </Button>
                            )}

                            {task.status === "In Progress" && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenResolveDialog(task)}
                                className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Check className="h-3 w-3" />
                                <span>Resolve</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Delete ticket ${task.id}?`)) {
                                  deleteTask(task.id);
                                  toast.info(`Deleted ticket ${task.id}`);
                                }
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── CREATE TICKET DIALOG ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                <Plus className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold">Create Customer Care Ticket</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Log an operational action request or customer update for the warehouse and dispatch
              teams.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 mt-2">
            {/* Quick Order Picker / Input */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Select Order (Optional)</Label>
                <Select value={newOrderId} onValueChange={handleSelectOrder}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pick recent order..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {orders.slice(0, 20).map((o) => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">
                        #{o.orderNumber || o.id} - {o.customer?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Order Number *</Label>
                <Input
                  required
                  placeholder="e.g. 10492"
                  value={newOrderNumber}
                  onChange={(e) => setNewOrderNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Customer Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer Name</Label>
                <Input
                  placeholder="e.g. Sarah Al-Kuwari"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer Phone</Label>
                <Input
                  placeholder="+974 5500 0000"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category *</Label>
                <Select value={newCategory} onValueChange={(v: TaskCategory) => setNewCategory(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priority *</Label>
                <Select value={newPriority} onValueChange={(v: TaskPriority) => setNewPriority(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title / Summary */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ticket Title / Summary *</Label>
              <Input
                required
                placeholder="e.g. Customer moved delivery address to Lusail"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Detailed Description */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Detailed Customer Request *</Label>
              <Textarea
                required
                rows={3}
                placeholder="Enter customer notes, new address details, access codes, delivery timings..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Assigned To & Created By */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assign To</Label>
                <Input
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  placeholder="e.g. Picking Lead, Dispatch Team"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Logged By</Label>
                <Input
                  value={newCreatedBy}
                  onChange={(e) => setNewCreatedBy(e.target.value)}
                  placeholder="e.g. Sarah (Customer Care)"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── RESOLVE TICKET DIALOG ── */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Check className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold">
                Resolve Ticket {activeTaskToResolve?.id}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Add operations resolution details for Order #{activeTaskToResolve?.orderNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResolveSubmit} className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Resolution Summary / Action Taken</Label>
              <Textarea
                rows={3}
                required
                placeholder="e.g. Address updated in dispatch portal. Driver notified of Tower 3 access code."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Resolved By</Label>
              <Input
                value={resolvedByName}
                onChange={(e) => setResolvedByName(e.target.value)}
                placeholder="e.g. Tariq (Operations Lead)"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResolveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Mark as Resolved
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
