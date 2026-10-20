import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, ChevronDown, LogOut, Settings, User, X, Package, Truck, Loader2, Tag, RefreshCw, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/auth";
import { MobileSidebar } from "./AppSidebar";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { useOrders } from "@/hooks/useOrders";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const HALAMAMA_LOGO_URL = "https://halamama.com/cdn/shop/files/halamama_green.svg";



export function TopBar() {
  const { user, logout } = useAuth();
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapse();
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search states
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch orders for search scope
  const { data: orders, isLoading } = useOrders();

  // System connectivity status
  const { systemStatus, shopifyStatus, checkStatus } = useSystemStatus();

  // Consolidated overall status
  const overallStatus = useMemo(() => {
    if (systemStatus.status === "offline" || shopifyStatus.status === "offline") return "offline";
    if (systemStatus.status === "warning" || shopifyStatus.status === "warning") return "warning";
    if (systemStatus.status === "checking" || shopifyStatus.status === "checking") return "checking";
    return "healthy";
  }, [systemStatus.status, shopifyStatus.status]);

  // ── Keyboard shortcut: Ctrl/Cmd + K to focus search ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);



  // ── Close search panel on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  interface SearchResult {
    orderId: string;
    title: string;
    subtitle: string;
    type: "order" | "customer" | "driver" | "tag";
    matchField: string;
    matchValue: string;
    status: string;
    total: number;
  }

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const list: SearchResult[] = [];

    orders?.forEach((o) => {
      if (o.id.toLowerCase().includes(q)) {
        list.push({
          orderId: o.id,
          title: o.id,
          subtitle: `Customer: ${o.customer.name}`,
          type: "order",
          matchField: "Order ID",
          matchValue: o.id,
          status: o.status,
          total: o.total,
        });
      } else if (o.customer.name.toLowerCase().includes(q)) {
        list.push({
          orderId: o.id,
          title: o.customer.name,
          subtitle: `Order ${o.id} • Status: ${o.status}`,
          type: "customer",
          matchField: "Customer Name",
          matchValue: o.customer.name,
          status: o.status,
          total: o.total,
        });
      } else if (o.customer.email.toLowerCase().includes(q)) {
        list.push({
          orderId: o.id,
          title: o.customer.email,
          subtitle: `Order ${o.id} • Customer: ${o.customer.name}`,
          type: "customer",
          matchField: "Customer Email",
          matchValue: o.customer.email,
          status: o.status,
          total: o.total,
        });
      } else if (o.customer.phone.toLowerCase().includes(q)) {
        list.push({
          orderId: o.id,
          title: o.customer.phone,
          subtitle: `Order ${o.id} • Customer: ${o.customer.name}`,
          type: "customer",
          matchField: "Customer Phone",
          matchValue: o.customer.phone,
          status: o.status,
          total: o.total,
        });
      } else if (o.driver && o.driver.toLowerCase().includes(q)) {
        list.push({
          orderId: o.id,
          title: o.driver,
          subtitle: `Driver on Order ${o.id} • Customer: ${o.customer.name}`,
          type: "driver",
          matchField: "Driver Name",
          matchValue: o.driver,
          status: o.status,
          total: o.total,
        });
      } else if (o.tags && o.tags.some((t) => t.toLowerCase().includes(q))) {
        const matchingTag = o.tags.find((t) => t.toLowerCase().includes(q)) || "";
        list.push({
          orderId: o.id,
          title: `Tag: ${matchingTag}`,
          subtitle: `Order ${o.id} • Customer: ${o.customer.name}`,
          type: "tag",
          matchField: "Tag",
          matchValue: matchingTag,
          status: o.status,
          total: o.total,
        });
      }
    });

    return list;
  }, [query, orders]);

  const handleSelectResult = useCallback((orderId: string) => {
    const currentFrom = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/orders";
    navigate({
      to: "/orders/$orderId",
      params: { orderId },
      search: { from: currentFrom } as any,
    });
    setQuery("");
    setIsOpen(false);
    setIsMobileSearchOpen(false);
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectResult(results[selectedIndex].orderId);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      searchRef.current?.blur();
    }
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };



  return (
    <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 flex items-center justify-between border-b border-border glass gap-4">
      {/* Left: Sidebar trigger & Mobile logo */}
      <div className="flex items-center gap-2 shrink-0">
        <MobileSidebar />
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden lg:grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-soft transition-colors hover:bg-muted cursor-pointer select-none"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4.5 w-4.5 text-muted-foreground" />
          ) : (
            <PanelLeftClose className="h-4.5 w-4.5 text-muted-foreground" />
          )}
        </button>
        <div className="flex sm:hidden items-center">
          <img src={HALAMAMA_LOGO_URL} alt="Halamama" className="h-5.5 w-auto object-contain" />
        </div>
      </div>

      {/* Center/Left: Search Bar (Desktop Group) */}
      <div className="hidden sm:block flex-1 max-w-xl relative" ref={searchContainerRef}>
        {/* Search input container */}
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search orders, drivers, customers, AWB..."
            className="w-full h-10 pl-10 pr-16 rounded-xl bg-muted/60 border border-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-card transition-colors"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md grid place-items-center hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 h-6 px-1.5 items-center rounded-md border border-border bg-card text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        {/* Floating results panel */}
        {isOpen && query.trim() && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-[380px] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl z-50 flex flex-col divide-y divide-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Searching records...
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : (
              results.map((res, index) => {
                const Icon = res.type === "driver" ? Truck : res.type === "customer" ? User : res.type === "tag" ? Tag : Package;
                return (
                  <div
                    key={`${res.orderId}-${index}`}
                    onClick={() => handleSelectResult(res.orderId)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors",
                      index === selectedIndex ? "bg-muted/80" : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        res.type === "driver" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                        res.type === "customer" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                        res.type === "tag" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                        "bg-primary/10 text-primary"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 leading-snug">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{res.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground uppercase">
                            {res.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{res.subtitle}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <span className="text-xs font-bold text-foreground">QAR {res.total.toFixed(2)}</span>
                      <div className="text-[10px] text-muted-foreground/80">{res.matchField}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Right side items: mobile search, theme toggle, status tabs, user menu */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto shrink-0">
        <button
          onClick={() => {
            setIsMobileSearchOpen(true);
            setQuery("");
            setSelectedIndex(0);
          }}
          className="sm:hidden h-10 w-10 rounded-xl hover:bg-muted grid place-items-center transition-colors cursor-pointer"
          aria-label="Search"
        >
          <Search className="h-4.5 w-4.5 text-foreground" />
        </button>

        <ThemeToggle />

        {/* Status Tabs Group (Unified single button) */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-2 bg-muted/60 hover:bg-muted/80 h-9 px-3 sm:px-3.5 rounded-xl border border-border/50 shadow-soft shrink-0 transition-all duration-200 cursor-pointer select-none active:scale-[0.98] outline-none"
            >
              {overallStatus === "checking" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={cn(
                    "absolute inset-0 rounded-full opacity-75 animate-ping",
                    overallStatus === "healthy" && "bg-success",
                    overallStatus === "warning" && "bg-amber-500",
                    overallStatus === "offline" && "bg-destructive"
                  )} />
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    overallStatus === "healthy" && "bg-success",
                    overallStatus === "warning" && "bg-amber-500",
                    overallStatus === "offline" && "bg-destructive"
                  )} />
                </span>
              )}
              <span className="text-xs font-semibold text-foreground">
                {overallStatus === "checking" && "Checking Status..."}
                {overallStatus === "healthy" && "Systems Live"}
                {overallStatus === "warning" && "Systems Warning"}
                {overallStatus === "offline" && "Systems Offline"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-4 w-72 bg-popover text-popover-foreground rounded-xl border border-border shadow-lg z-50 mt-1" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">System Status</span>
                <span className="text-[10px] text-muted-foreground">Checked: {systemStatus.lastChecked}</span>
              </div>
              
              <div className="space-y-2">
                {/* Database Connection Button/Card */}
                <button
                  onClick={checkStatus}
                  className="w-full text-left p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors flex items-start gap-2.5 group cursor-pointer"
                >
                  <div className="mt-1 relative flex h-2 w-2 shrink-0">
                    {systemStatus.status === "checking" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground -ml-0.5 -mt-0.5" />
                    ) : (
                      <>
                        <span className={cn(
                          "absolute inset-0 rounded-full opacity-75 animate-ping",
                          systemStatus.status === "healthy" && "bg-success",
                          systemStatus.status === "warning" && "bg-amber-500",
                          systemStatus.status === "offline" && "bg-destructive"
                        )} />
                        <span className={cn(
                          "relative inline-flex rounded-full h-2 w-2",
                          systemStatus.status === "healthy" && "bg-success",
                          systemStatus.status === "warning" && "bg-amber-500",
                          systemStatus.status === "offline" && "bg-destructive"
                        )} />
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Operations Database</span>
                      {systemStatus.latency !== null && (
                        <span className="text-[10px] font-mono text-muted-foreground">{systemStatus.latency}ms</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      {systemStatus.details}
                    </p>
                  </div>
                </button>

                {/* Shopify Connection Button/Card */}
                <button
                  onClick={checkStatus}
                  className="w-full text-left p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors flex items-start gap-2.5 group cursor-pointer"
                >
                  <div className="mt-1 relative flex h-2 w-2 shrink-0">
                    {shopifyStatus.status === "checking" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground -ml-0.5 -mt-0.5" />
                    ) : (
                      <>
                        <span className={cn(
                          "absolute inset-0 rounded-full opacity-75 animate-ping",
                          shopifyStatus.status === "healthy" && "bg-[#95BF47]",
                          shopifyStatus.status === "warning" && "bg-amber-500",
                          shopifyStatus.status === "offline" && "bg-destructive"
                        )} />
                        <span className={cn(
                          "relative inline-flex rounded-full h-2 w-2",
                          shopifyStatus.status === "healthy" && "bg-[#95BF47]",
                          shopifyStatus.status === "warning" && "bg-amber-500",
                          shopifyStatus.status === "offline" && "bg-destructive"
                        )} />
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Shopify Integration</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      {shopifyStatus.details}
                    </p>
                  </div>
                </button>
              </div>

              {/* Refresh Action Button */}
              <button
                onClick={checkStatus}
                disabled={overallStatus === "checking"}
                className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {overallStatus === "checking" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking Connections...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh Connections
                  </>
                )}
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-8 w-px bg-border mx-1" />

        {/* ── User Menu Dropdown ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 h-10 pl-1 pr-3 rounded-xl hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer">
              <div className="h-8 w-8 rounded-lg bg-white ring-1 ring-border grid place-items-center">
                <img src={HALAMAMA_LOGO_URL} alt="" className="h-5 w-5 object-contain" />
              </div>
              <div className="hidden md:block text-left leading-tight">
                <div className="text-xs font-semibold">{user?.name ?? "Guest"}</div>
                <div className="text-[10px] text-muted-foreground">{user?.role ?? ""}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1 rounded-xl">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name ?? "Guest"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.role ?? "Guest Access"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg"
              onClick={() => setShowProfileDialog(true)}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-lg"
              onClick={() => navigate({ to: "/settings" })}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowLogoutDialog(true);
              }}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── Profile Dialog ── */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-[480px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 overflow-y-auto">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                  My Profile
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Your account details and role information.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border grid place-items-center shadow-sm">
                  <span className="text-2xl font-bold text-primary">{user?.initials ?? "G"}</span>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-foreground">{user?.name ?? "Guest"}</h3>
                  <p className="text-sm text-muted-foreground">{user?.role ?? "Guest Access"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</span>
                  <span className="text-sm font-medium text-foreground">{user?.name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
                  <span className="text-sm font-medium text-foreground">{user?.email ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {user?.role ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border/40 bg-muted/20 px-6 sm:px-8 py-4 shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowProfileDialog(false)}
                className="rounded-xl font-semibold h-10 text-sm shadow-sm text-slate-800 dark:text-slate-200"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowProfileDialog(false);
                  navigate({ to: "/settings" });
                }}
                className="rounded-xl font-semibold h-10 text-sm px-6 shadow-md transition-all"
              >
                <Settings className="mr-2 h-4 w-4" />
                Edit in Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Logout Confirmation Dialog ── */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white ring-1 ring-border">
                <img src={HALAMAMA_LOGO_URL} alt="Halamama" className="h-8 w-8 object-contain" />
              </div>
              <AlertDialogTitle>Logout from Admin Dashboard?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be signed out of the Halamama operations dashboard and returned to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Mobile Search Dialog ── */}
        <Dialog open={isMobileSearchOpen} onOpenChange={setIsMobileSearchOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[540px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 flex items-center gap-3 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder="Search orders, drivers, customers, AWB..."
                className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none text-foreground"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border max-h-[50vh]">
              {query.trim() === "" ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Type to search orders, drivers, customers, AWBs...
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Searching records...
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No results found for "{query}"
                </div>
              ) : (
                results.map((res, index) => {
                  const Icon = res.type === "driver" ? Truck : res.type === "customer" ? User : res.type === "tag" ? Tag : Package;
                  return (
                    <div
                      key={`mobile-${res.orderId}-${index}`}
                      onClick={() => handleSelectResult(res.orderId)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors active:bg-muted/80",
                        index === selectedIndex ? "bg-muted" : "hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                          res.type === "driver" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                          res.type === "customer" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                          res.type === "tag" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                          "bg-primary/10 text-primary"
                        )}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 leading-snug">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{res.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground uppercase">
                              {res.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{res.subtitle}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <span className="text-xs font-bold text-foreground">QAR {res.total.toFixed(2)}</span>
                        <div className="text-[10px] text-muted-foreground/80">{res.matchField}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
