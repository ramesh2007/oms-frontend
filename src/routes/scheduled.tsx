import { useState, useEffect, useMemo, useSyncExternalStore, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import {
  getSnapshot,
  subscribe,
  removeItem,
  assignDriver,
  completeInstallation,
  addInstallationImages,
  syncTechnicianSchedules,
  AVAILABLE_DRIVERS,
  getTodayDateStr,
  getTomorrowDateStr,
  formatDisplayDate,
  syncCompletedInstallations,
  type ScheduledItem,
  type ScheduledTabType,
} from "@/lib/scheduled-installations";
import { useTechnicianSchedules, useCompletedInstallations } from "@/hooks/useOrders";
import { ordersApi } from "@/lib/api";
import { getUsers } from "@/lib/sync";
import { ScheduledList } from "@/components/scheduled/ScheduledList";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  ImageIcon,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  Upload,
  User,
  UserPlus,
  Wrench,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/scheduled")({
  head: () => ({
    meta: [
      { title: "Scheduled Installations - Halamama LMD" },
      {
        name: "description",
        content:
          "View and manage products scheduled for manual installation across customer appointments, assigned drivers, and completed jobs.",
      },
    ],
  }),
  component: ScheduledInstallationsPage,
});

function ScheduledInstallationsPage() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground animate-fade-in">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-5 p-4 md:p-6 lg:p-8">
          <ScheduledInstallationsContent />
        </main>
      </div>
    </div>
  );
}

function ScheduledInstallationsContent() {
  const navigate = useNavigate();
  const items = useSyncExternalStore(subscribe, getSnapshot);

  // 1. Fetch live technician schedules from backend (/api/admin/technician-scheduled-list)
  const {
    data: liveSchedulesData,
    isLoading: isLoadingSchedules,
    isRefetching: isRefetchingSchedules,
    refetch: refetchSchedules,
  } = useTechnicianSchedules({ per_page: 100 });

  // 2. Fetch live completed installations from backend (/api/admin/installation-completed)
  const {
    data: liveCompletedData,
    isLoading: isLoadingCompleted,
    isRefetching: isRefetchingCompleted,
    refetch: refetchCompleted,
  } = useCompletedInstallations({ per_page: 100 });

  // Sync live backend technician schedule records into the store
  useEffect(() => {
    if (liveSchedulesData?.data && Array.isArray(liveSchedulesData.data)) {
      syncTechnicianSchedules(liveSchedulesData.data);
    }
  }, [liveSchedulesData]);

  // Sync live backend completed installation records into the store
  useEffect(() => {
    if (liveCompletedData?.data && Array.isArray(liveCompletedData.data)) {
      syncCompletedInstallations(liveCompletedData.data);
    }
  }, [liveCompletedData]);

  // Drivers list from users sync
  const [driversList, setDriversList] = useState<string[]>(AVAILABLE_DRIVERS);

  useEffect(() => {
    getUsers()
      .then((users) => {
        if (Array.isArray(users)) {
          const activeDrivers = users
            .filter((u) => u.role === "driver" && u.status === "active")
            .map((u) => u.name);
          if (activeDrivers.length > 0) {
            setDriversList(Array.from(new Set([...activeDrivers, ...AVAILABLE_DRIVERS])));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch drivers:", err);
      });
  }, []);

  // Tabs: "Scheduled", "Driver Assigned", "Completed"
  const [activeTab, setActiveTab] = useState<ScheduledTabType>("Scheduled");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [driverFilterOpen, setDriverFilterOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  // Scheduled appointment date filter: default to today's date
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const tomorrowStr = useMemo(() => getTomorrowDateStr(), []);
  const [selectedScheduledDate, setSelectedScheduledDate] = useState<string | null>(todayStr);

  // Assign Driver State
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [targetAssignItems, setTargetAssignItems] = useState<string[]>([]);
  const [selectedAssignDriver, setSelectedAssignDriver] = useState<string | null>(null);

  // Complete Installation State
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [itemToComplete, setItemToComplete] = useState<ScheduledItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionPhotoUrl, setCompletionPhotoUrl] = useState("");
  const [completionUploadedImages, setCompletionUploadedImages] = useState<string[]>([]);

  // Upload Additional Photos State
  const [uploadPhotosDialogOpen, setUploadPhotosDialogOpen] = useState(false);
  const [itemForPhotoUpload, setItemForPhotoUpload] = useState<ScheduledItem | null>(null);
  const [extraPhotoUrl, setExtraPhotoUrl] = useState("");
  const [pendingExtraImages, setPendingExtraImages] = useState<string[]>([]);

  // Image Preview Lightbox State
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Cancel Schedule Dialog State
  const [pendingCancelItem, setPendingCancelItem] = useState<ScheduledItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const extraFileInputRef = useRef<HTMLInputElement>(null);

  // Handle local file uploads (converts file to data URL for preview and persistence)
  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>, isExtra: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const resultUrl = uploadEvent.target?.result as string;
        if (resultUrl) {
          if (isExtra) {
            setPendingExtraImages((prev) => [...prev, resultUrl]);
          } else {
            setCompletionUploadedImages((prev) => [...prev, resultUrl]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset file input
    e.target.value = "";
  };

  // Filter items based on activeTab, selectedScheduledDate, search, and driver
  const filtered = useMemo(() => {
    let result = items.filter((i) => i.status === activeTab);

    // Scheduled date filter (defaults to today for Scheduled tab)
    if (selectedScheduledDate) {
      result = result.filter((i) => {
        const itemDate = i.scheduledDate || (i.scheduledAt ? i.scheduledAt.slice(0, 10) : "");
        const completedDate = i.completedAt ? i.completedAt.slice(0, 10) : "";
        if (activeTab === "Completed") {
          return itemDate === selectedScheduledDate || completedDate === selectedScheduledDate;
        }
        return itemDate === selectedScheduledDate;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace("#", "").trim();
      result = result.filter(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.orderId.toLowerCase().replace("#", "").includes(q) ||
          (i.orderNumber && i.orderNumber.toLowerCase().includes(q)) ||
          i.customerName.toLowerCase().includes(q) ||
          (i.technicianName && i.technicianName.toLowerCase().includes(q)) ||
          (i.assignedDriver && i.assignedDriver.toLowerCase().includes(q)),
      );
    }

    // Driver filter applies to all tabs if a driver is chosen
    if (selectedDriver) {
      result = result.filter((i) => i.assignedDriver === selectedDriver);
    }

    return result;
  }, [items, activeTab, selectedScheduledDate, searchQuery, selectedDriver]);

  // Tab stats & date counts
  const scheduledAll = useMemo(() => items.filter((i) => i.status === "Scheduled"), [items]);
  const driverAssignedAll = useMemo(() => items.filter((i) => i.status === "Driver Assigned"), [items]);
  const completedAll = useMemo(() => items.filter((i) => i.status === "Completed"), [items]);

  const todayCount = useMemo(() => {
    return items.filter((i) => {
      if (i.status !== activeTab) return false;
      const itemDate = i.scheduledDate || (i.scheduledAt ? i.scheduledAt.slice(0, 10) : "");
      const completedDate = i.completedAt ? i.completedAt.slice(0, 10) : "";
      if (activeTab === "Completed") {
        return itemDate === todayStr || completedDate === todayStr;
      }
      return itemDate === todayStr;
    }).length;
  }, [items, todayStr, activeTab]);

  const tomorrowCount = useMemo(() => {
    return items.filter((i) => {
      if (i.status !== activeTab) return false;
      const itemDate = i.scheduledDate || (i.scheduledAt ? i.scheduledAt.slice(0, 10) : "");
      const completedDate = i.completedAt ? i.completedAt.slice(0, 10) : "";
      if (activeTab === "Completed") {
        return itemDate === tomorrowStr || completedDate === tomorrowStr;
      }
      return itemDate === tomorrowStr;
    }).length;
  }, [items, tomorrowStr, activeTab]);

  const allActiveTabCount = useMemo(() => {
    return items.filter((i) => i.status === activeTab).length;
  }, [items, activeTab]);

  const scheduledCount = selectedScheduledDate
    ? scheduledAll.filter((i) => (i.scheduledDate || i.scheduledAt?.slice(0, 10)) === selectedScheduledDate).length
    : scheduledAll.length;
  const driverAssignedCount = selectedScheduledDate
    ? driverAssignedAll.filter((i) => (i.scheduledDate || i.scheduledAt?.slice(0, 10)) === selectedScheduledDate).length
    : driverAssignedAll.length;
  const completedCount = selectedScheduledDate
    ? completedAll.filter((i) => {
        const itemDate = i.scheduledDate || (i.scheduledAt ? i.scheduledAt.slice(0, 10) : "");
        const completedDate = i.completedAt ? i.completedAt.slice(0, 10) : "";
        return itemDate === selectedScheduledDate || completedDate === selectedScheduledDate;
      }).length
    : completedAll.length;

  const currentTabItems = filtered;
  const uniqueOrders = new Set(currentTabItems.map((i) => i.orderId)).size;

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));
  const someVisibleSelected =
    filtered.some((i) => selectedIds.has(i.id)) && !allVisibleSelected;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.add(i.id));
        return next;
      });
    }
  };

  // Open Assign Driver Dialog
  const handleOpenAssignDriver = (singleItem?: ScheduledItem) => {
    if (singleItem) {
      setTargetAssignItems([singleItem.id]);
      setSelectedAssignDriver(singleItem.assignedDriver || null);
    } else {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) {
        toast.error("Please select at least one item to assign a driver.");
        return;
      }
      setTargetAssignItems(ids);
      setSelectedAssignDriver(null);
    }
    setAssignDialogOpen(true);
  };

  // Execute Driver Assignment
  const handleConfirmAssignDriver = async () => {
    if (!selectedAssignDriver) {
      toast.error("Please select a driver.");
      return;
    }
    const ids = targetAssignItems;
    if (ids.length === 0) return;

    assignDriver(ids, selectedAssignDriver);

    // Also attempt backend order assignment for orders represented in these items
    const targetOrders = Array.from(
      new Set(
        items
          .filter((i) => ids.includes(i.id))
          .map((i) => i.orderNumber || i.orderId)
          .filter(Boolean),
      ),
    );

    targetOrders.forEach(async (ord) => {
      try {
        await ordersApi.assignDriver(ord, selectedAssignDriver);
      } catch (err) {
        console.warn(`[Scheduled] Backend assignDriver for ${ord} fallback:`, err);
      }
    });

    toast.success(`Assigned ${selectedAssignDriver} to ${ids.length} installation(s)`);
    setSelectedIds(new Set());
    setAssignDialogOpen(false);
    setSelectedAssignDriver(null);
    setTargetAssignItems([]);
  };

  // Open Complete Dialog
  const handleOpenCompleteDialog = (item: ScheduledItem) => {
    setItemToComplete(item);
    setCompletionNotes(item.installationNotes || "");
    setCompletionPhotoUrl("");
    setCompletionUploadedImages([]);
    setCompleteDialogOpen(true);
  };

  // Confirm Complete Installation
  const handleConfirmCompleteInstallation = () => {
    if (!itemToComplete) return;

    const allImages = [...completionUploadedImages];
    if (completionPhotoUrl.trim()) {
      allImages.push(completionPhotoUrl.trim());
    }

    completeInstallation(itemToComplete.id, {
      notes: completionNotes.trim() || "Installation completed successfully.",
      images: allImages,
      completedAt: new Date().toISOString(),
    });

    toast.success(`Installation for "${itemToComplete.productName}" marked as completed!`);
    setCompleteDialogOpen(false);
    setItemToComplete(null);
    setCompletionNotes("");
    setCompletionPhotoUrl("");
    setCompletionUploadedImages([]);
  };

  // Open Upload Photos Dialog
  const handleOpenUploadPhotos = (item: ScheduledItem) => {
    setItemForPhotoUpload(item);
    setExtraPhotoUrl("");
    setPendingExtraImages([]);
    setUploadPhotosDialogOpen(true);
  };

  // Save Extra Photos
  const handleConfirmUploadPhotos = () => {
    if (!itemForPhotoUpload) return;

    const imagesToAdd = [...pendingExtraImages];
    if (extraPhotoUrl.trim()) {
      imagesToAdd.push(extraPhotoUrl.trim());
    }

    if (imagesToAdd.length === 0) {
      toast.error("Please select or enter at least one photo to attach.");
      return;
    }

    addInstallationImages(itemForPhotoUpload.id, imagesToAdd);
    toast.success(`Added ${imagesToAdd.length} photo(s) to "${itemForPhotoUpload.productName}"`);
    setUploadPhotosDialogOpen(false);
    setItemForPhotoUpload(null);
    setExtraPhotoUrl("");
    setPendingExtraImages([]);
  };

  // Confirm Cancel Schedule
  const handleConfirmCancel = () => {
    if (!pendingCancelItem) return;
    const id = pendingCancelItem.id;
    removeItem(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.info("Installation schedule removed");
    setPendingCancelItem(null);
  };

  const formatAbsoluteTime = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Scheduled Installations
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              Live Operations
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View customer appointments scheduled from Customer Care, manage driver dispatch, and verify completed installations with proof photos.
          </p>
        </div>

        {/* Sync / Refresh Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSchedules();
              refetchCompleted();
            }}
            disabled={isRefetchingSchedules || isLoadingSchedules || isRefetchingCompleted || isLoadingCompleted}
            className="h-9 gap-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-slate-500",
                (isRefetchingSchedules || isLoadingSchedules || isRefetchingCompleted || isLoadingCompleted) && "animate-spin text-primary",
              )}
            />
            <span>{isRefetchingSchedules || isRefetchingCompleted ? "Syncing..." : "Sync Schedules"}</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Scheduled Card */}
        <div
          onClick={() => {
            setActiveTab("Scheduled");
            setSelectedIds(new Set());
          }}
          className={cn(
            "flex items-center gap-4 rounded-2xl border p-4.5 shadow-2xs transition-all cursor-pointer",
            activeTab === "Scheduled"
              ? "border-amber-400 bg-amber-50/50 dark:border-amber-700/80 dark:bg-amber-950/20 ring-2 ring-amber-400/20"
              : "border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-800",
          )}
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {scheduledCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
              Scheduled Items
            </div>
          </div>
        </div>

        {/* Driver Assigned Card */}
        <div
          onClick={() => {
            setActiveTab("Driver Assigned");
            setSelectedIds(new Set());
          }}
          className={cn(
            "flex items-center gap-4 rounded-2xl border p-4.5 shadow-2xs transition-all cursor-pointer",
            activeTab === "Driver Assigned"
              ? "border-blue-400 bg-blue-50/50 dark:border-blue-700/80 dark:bg-blue-950/20 ring-2 ring-blue-400/20"
              : "border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800",
          )}
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Truck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {driverAssignedCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
              Driver Assigned
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div
          onClick={() => {
            setActiveTab("Completed");
            setSelectedIds(new Set());
          }}
          className={cn(
            "flex items-center gap-4 rounded-2xl border p-4.5 shadow-2xs transition-all cursor-pointer",
            activeTab === "Completed"
              ? "border-emerald-400 bg-emerald-50/50 dark:border-emerald-700/80 dark:bg-emerald-950/20 ring-2 ring-emerald-400/20"
              : "border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-800",
          )}
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {completedCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
              Completed Installations
            </div>
          </div>
        </div>

        {/* Unique Orders Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 shadow-2xs">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {uniqueOrders}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
              Orders in {activeTab}
            </div>
          </div>
        </div>
      </div>

      {/* Date-wise Scheduled Filter Bar (Placed below cards as requested) */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Scheduled Appointment Date
                </span>
                {selectedScheduledDate === todayStr ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Today (Default)
                  </span>
                ) : selectedScheduledDate ? (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    Selected Date
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    All Dates
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedScheduledDate
                  ? `Showing scheduled installations for ${formatDisplayDate(selectedScheduledDate)} • ${filtered.length} item(s) in ${activeTab}`
                  : `Showing scheduled installations across all dates • ${filtered.length} item(s) in ${activeTab}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Filter: Today */}
            <button
              type="button"
              onClick={() => setSelectedScheduledDate(todayStr)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs",
                selectedScheduledDate === todayStr
                  ? "bg-amber-500 text-white shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Today</span>
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  selectedScheduledDate === todayStr
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                )}
              >
                {todayCount}
              </span>
            </button>

            {/* Quick Filter: Tomorrow */}
            <button
              type="button"
              onClick={() => setSelectedScheduledDate(tomorrowStr)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs",
                selectedScheduledDate === tomorrowStr
                  ? "bg-amber-500 text-white shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
              )}
            >
              <span>Tomorrow</span>
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  selectedScheduledDate === tomorrowStr
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                )}
              >
                {tomorrowCount}
              </span>
            </button>

            {/* Quick Filter: All Dates */}
            <button
              type="button"
              onClick={() => setSelectedScheduledDate(null)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs",
                selectedScheduledDate === null
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
              )}
            >
              <span>All Dates</span>
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  selectedScheduledDate === null
                    ? "bg-white/20 text-white dark:text-slate-900"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                )}
              >
                {allActiveTabCount}
              </span>
            </button>

            {/* Date Picker input */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedScheduledDate || ""}
                onChange={(e) => setSelectedScheduledDate(e.target.value || null)}
                className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              />
              {selectedScheduledDate && (
                <button
                  type="button"
                  onClick={() => setSelectedScheduledDate(null)}
                  title="Clear date filter (show all dates)"
                  className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* 3 Main Tabs: Scheduled, Driver Assigned, Completed */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/60 dark:border-slate-700/60">
          {(["Scheduled", "Driver Assigned", "Completed"] as const).map((tab) => {
            const count =
              tab === "Scheduled"
                ? scheduledCount
                : tab === "Driver Assigned"
                  ? driverAssignedCount
                  : completedCount;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedIds(new Set());
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer select-none",
                  activeTab === tab
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                )}
              >
                <span>{tab}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    activeTab === tab
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      : "bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls & Bulk Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Driver Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDriverFilterOpen(!driverFilterOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Truck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span>{selectedDriver ?? "All Drivers"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {driverFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDriverFilterOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl animate-in fade-in slide-in-from-top-2">
                  <div className="max-h-64 overflow-y-auto py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDriver(null);
                        setDriverFilterOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer",
                        selectedDriver === null
                          ? "bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 font-bold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                      )}
                    >
                      <span>All Drivers</span>
                      {selectedDriver === null && <Check className="h-4 w-4 text-primary" />}
                    </button>
                    {driversList.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setSelectedDriver(d);
                          setDriverFilterOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between px-4 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer",
                          selectedDriver === d
                            ? "bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 font-bold"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                        )}
                      >
                        <span>{d}</span>
                        {selectedDriver === d && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bulk Driver Assign Button (active when items selected in Scheduled tab) */}
          {selectedIds.size > 0 && activeTab === "Scheduled" && (
            <Button
              onClick={() => handleOpenAssignDriver()}
              className="gap-2 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-2xs font-bold h-9 px-4 text-xs sm:text-sm cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Assign Driver ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search by product, SKU, order number, customer, technician, or driver..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
        />
      </div>

      {/* Installations Table Component */}
      <ScheduledList
        items={filtered}
        selectedIds={selectedIds}
        activeTab={activeTab}
        selectedDate={selectedScheduledDate}
        todayStr={todayStr}
        onResetToToday={() => setSelectedScheduledDate(todayStr)}
        onShowAllDates={() => setSelectedScheduledDate(null)}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onRemoveItem={(item) => setPendingCancelItem(item)}
        onViewOrder={(orderId) => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("last_orders_tab", "Scheduled Installation");
            sessionStorage.setItem("last_orders_from", "/scheduled");
          }
          navigate({
            to: "/orders/$orderId",
            params: { orderId: orderId.replace(/^HM/i, "") },
            search: { tab: "Scheduled Installation", from: "/scheduled" } as any,
          });
        }}
        onAssignDriver={(item) => handleOpenAssignDriver(item)}
        onCompleteInstallation={(item) => handleOpenCompleteDialog(item)}
        onUploadPhotos={(item) => handleOpenUploadPhotos(item)}
        onPreviewImage={(url) => setPreviewImageUrl(url)}
        formatTime={formatAbsoluteTime}
      />

      {/* Footer Info */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 shadow-2xs">
          <span>
            Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span>{" "}
            {activeTab.toLowerCase()} installation(s)
          </span>
          {selectedIds.size > 0 && (
            <span className="font-semibold text-primary">
              {selectedIds.size} item(s) selected
            </span>
          )}
        </div>
      )}

      {/* ─── MODAL 1: Assign Driver Dialog ───────────────────────────────── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Assign Driver
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Select a driver for the {targetAssignItems.length} selected installation(s). The items will move to the{" "}
              <strong className="text-slate-700 dark:text-slate-300">Driver Assigned</strong> tab.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid gap-2">
              <Label className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Select Driver
              </Label>
              <Select
                value={selectedAssignDriver || ""}
                onValueChange={setSelectedAssignDriver}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue placeholder="Choose a driver..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {driversList.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              className="rounded-xl h-11 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAssignDriver}
              disabled={!selectedAssignDriver}
              className="rounded-xl h-11 cursor-pointer bg-primary hover:bg-primary/95 font-bold"
            >
              Assign to Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: Complete Installation Dialog ──────────────────────── */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Complete Installation
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Mark this installation as complete. You can attach completion notes and upload proof photos.
            </DialogDescription>
          </DialogHeader>

          {itemToComplete && (
            <div className="space-y-4 py-2">
              {/* Product preview */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                <img
                  src={itemToComplete.image}
                  alt={itemToComplete.productName}
                  className="h-12 w-12 rounded-lg object-cover border"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {itemToComplete.productName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Order: {itemToComplete.orderNumber || itemToComplete.orderId} • Customer: {itemToComplete.customerName}
                  </p>
                </div>
              </div>

              {/* Completion Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Installation Notes / Sign-off Details
                </Label>
                <Textarea
                  placeholder="e.g. Assembled correctly, tested with customer, no issues."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="min-h-[70px] rounded-xl text-sm"
                />
              </div>

              {/* Upload Proof Photos */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Proof of Installation Photos
                </Label>

                {/* Uploaded Thumbnails */}
                {completionUploadedImages.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {completionUploadedImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative h-14 w-14 rounded-lg overflow-hidden border border-emerald-300 dark:border-emerald-700 shadow-2xs group"
                      >
                        <img src={img} alt="Proof preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setCompletionUploadedImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFilesChosen(e, false)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 rounded-xl gap-2 text-xs font-semibold"
                  >
                    <Upload className="h-4 w-4" />
                    Upload from Device
                  </Button>
                  <span className="text-xs text-muted-foreground">or paste image URL below</span>
                </div>

                <Input
                  type="url"
                  placeholder="https://... photo link (optional)"
                  value={completionPhotoUrl}
                  onChange={(e) => setCompletionPhotoUrl(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
              className="rounded-xl h-11 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCompleteInstallation}
              className="rounded-xl h-11 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Mark Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: Upload Photos Dialog ──────────────────────────────── */}
      <Dialog open={uploadPhotosDialogOpen} onOpenChange={setUploadPhotosDialogOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-emerald-600" />
              Attach Installation Photos
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Upload before/after photos or proof of delivery/installation for this item.
            </DialogDescription>
          </DialogHeader>

          {itemForPhotoUpload && (
            <div className="space-y-4 py-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                {itemForPhotoUpload.productName} ({itemForPhotoUpload.orderNumber || itemForPhotoUpload.orderId})
              </p>

              {/* Pending preview photos */}
              {pendingExtraImages.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {pendingExtraImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative h-16 w-16 rounded-xl overflow-hidden border border-emerald-400 dark:border-emerald-600 shadow-2xs group"
                    >
                      <img src={img} alt="Uploaded extra" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setPendingExtraImages((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={extraFileInputRef}
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFilesChosen(e, true)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => extraFileInputRef.current?.click()}
                  className="h-10 rounded-xl gap-2 text-xs font-semibold"
                >
                  <Upload className="h-4 w-4" />
                  Select Image Files
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Or add Image URL</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={extraPhotoUrl}
                  onChange={(e) => setExtraPhotoUrl(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUploadPhotosDialogOpen(false)}
              className="rounded-xl h-11 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUploadPhotos}
              disabled={pendingExtraImages.length === 0 && !extraPhotoUrl.trim()}
              className="rounded-xl h-11 cursor-pointer bg-primary hover:bg-primary/95 text-white font-bold"
            >
              Save Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: Image Lightbox / Full Preview ──────────────────────── */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] p-2 bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden shadow-2xl">
          <div className="relative flex flex-col items-center">
            <div className="w-full flex items-center justify-between p-2 pb-3">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                Proof of Installation Photo
              </span>
              {previewImageUrl && (
                <a
                  href={previewImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>Open Full Size</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {previewImageUrl && (
              <div className="max-h-[75vh] w-full overflow-hidden rounded-xl bg-black/5 dark:bg-black/40 flex items-center justify-center p-1">
                <img
                  src={previewImageUrl}
                  alt="Installation Proof Full"
                  className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-md"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: Cancel Installation Schedule Dialog ────────────────── */}
      <Dialog
        open={!!pendingCancelItem}
        onOpenChange={(open) => !open && setPendingCancelItem(null)}
      >
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl">
          <div className="p-5 sm:p-7">
            <DialogHeader className="mb-5 text-left">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                Cancel Installation Schedule
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                Are you sure you want to cancel the scheduled installation for this item?
              </DialogDescription>
            </DialogHeader>

            {pendingCancelItem && (
              <div className="flex items-center gap-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-100 dark:border-slate-700 bg-background overflow-hidden">
                  <img
                    src={pendingCancelItem.image}
                    alt={pendingCancelItem.productName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {pendingCancelItem.productName}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Order ID: {pendingCancelItem.orderNumber || pendingCancelItem.orderId}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-800/10 px-5 sm:px-7 py-4 sm:py-5">
            <Button
              variant="outline"
              onClick={() => setPendingCancelItem(null)}
              className="w-full sm:w-auto rounded-xl font-bold h-11 text-sm shadow-2xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              No, Keep It
            </Button>
            <Button
              onClick={handleConfirmCancel}
              className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md font-bold h-11 text-sm px-6 transition-all cursor-pointer"
            >
              Yes, Cancel Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
