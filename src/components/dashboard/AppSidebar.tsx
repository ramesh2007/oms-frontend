import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  PackageSearch,
  Boxes,
  Flag,
  RotateCcw,
  BarChart3,
  Settings,
  CheckCircle2,
  Menu,
  Wrench,
  Warehouse,
  ChevronDown,
  CalendarDays,
  TrendingUp,
  Truck,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useOrders, useFlaggedOrders, useScheduledItems } from "@/hooks/useOrders";
import { matchesLegacyTab } from "@/lib/orders";
import { getSnapshot as getScheduledSnapshot } from "@/lib/scheduled-installations";
import { hasAppointment } from "@/lib/scheduling";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const HALAMAMA_LOGO_URL = "https://halamama.com/cdn/shop/files/halamama_green.svg";

interface SidebarContentProps {
  closeOnNavigate?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

function SidebarContent({
  closeOnNavigate = false,
  collapsed = false,
  onToggle,
}: SidebarContentProps) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const search = routerState.location.search as any;
  const { data: orders = [] } = useOrders();
  const { data: flaggedResult } = useFlaggedOrders(1, 1);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const isSchedulingPage = ["/customer-care", "/locations", "/calendars"].includes(pathname);
    return {
      "After-Sales Operations": false,
      "Scheduling": isSchedulingPage,
    };
  });

  /* ── Dynamic sidebar counts ───────────────────────────── */
  const expressCount = orders.filter(
    (order) => matchesLegacyTab(order, "Express"),
  ).length;
  const pickingCount = orders.filter(
    (order) => order.status === "Picking",
  ).length;
  const packingCount = orders.filter(
    (order) => order.status === "Packing",
  ).length;
  const inDeliveryCount = orders.filter(
    (order) => order.status === "Driver Accepted" || order.status === "Started" || Boolean(order.driver),
  ).length;
  const readyToAssignCount = orders.filter(
    (order) => order.status === "Ready to Assign" && !order.driver,
  ).length;
  const deliveredCount = orders.filter(
    (order) => order.status === "Delivered",
  ).length;
  const flaggedOrderCount = flaggedResult?.pagination?.total ?? orders.filter(
    (order) => order.status === "Flagged" || order.status === "Delivery Failed",
  ).length;
  const returnsCount = orders.filter(
    (o) => Boolean(o.returns) || o.status === "Replacement" || o.status === "Exchange",
  ).length;

  const { data: awaitingScheduledData } = useScheduledItems({ is_scheduled_assigned: 1, per_page: 100 });
  const ccQueueCount = awaitingScheduledData?.data
    ? awaitingScheduledData.data.filter((item) => {
        const isScheduled = Boolean(
          item.is_scheduled_assigned === true ||
          item.installation?.is_scheduled_assigned === true ||
          (item as any).is_scheduled === true ||
          String(item.is_scheduled_assigned) === "1" ||
          String(item.installation?.is_scheduled_assigned) === "1"
        );
        if (!isScheduled) return false;
        const orderIdStr = String(item.order_id || item.order_number || "").replace(/^#/, "");
        const orderItemId = String(item.order_item_id ?? item.id ?? item.item_id);
        const hasAppt =
          hasAppointment(String(item.order_id)) ||
          hasAppointment(orderIdStr) ||
          hasAppointment(item.order_number || "") ||
          hasAppointment(orderItemId);
        return !hasAppt;
      }).length
    : (awaitingScheduledData?.pagination?.total ?? 0);

  const scheduledCount = getScheduledSnapshot().length;

  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Orders", url: "/orders", icon: Package, badge: orders.length.toString() },
    { title: "Express", url: "/orders", search: { tab: "Express" }, icon: Zap, badge: expressCount.toString() },
    { title: "Picking", url: "/orders", search: { tab: "Picking" }, icon: PackageSearch, badge: pickingCount.toString() },
    { title: "Packing", url: "/orders", search: { tab: "Packing" }, icon: Boxes, badge: packingCount.toString() },
    { title: "Ready to Assign", url: "/orders", search: { tab: "Ready to Assign" }, icon: ClipboardCheck, badge: readyToAssignCount.toString() },
    { title: "In Delivery", url: "/orders", search: { tab: "In Delivery" }, icon: Truck, badge: inDeliveryCount.toString() },
    { title: "Delivered", url: "/orders", search: { tab: "Delivered" }, icon: CheckCircle2, badge: deliveredCount.toString() },
    { title: "Flags & Exceptions", url: "/orders", search: { tab: "Flags & Exceptions" }, icon: Flag, badge: flaggedOrderCount.toString(), danger: true },
    { title: "Scheduled Installation", url: "/scheduled", icon: Wrench, badge: scheduledCount.toString() },
    {
      title: "Scheduling",
      icon: CalendarDays,
      subItems: [
        { title: "Customer Care Queue", url: "/customer-care", badge: ccQueueCount.toString() },
        { title: "Locations & Teams", url: "/locations" },
        { title: "Team Calendars", url: "/calendars" },
      ],
    },
    {
      title: "After-Sales Operations",
      icon: RotateCcw,
      subItems: [
        { title: "Delivery Failed", url: "/orders", search: { tab: "Delivery Failed" }, badge: orders.filter(o => o.status === "Delivery Failed").length.toString() },
        { title: "Returns & Replacements", url: "/orders", search: { tab: "Returns & Replacements" }, badge: returnsCount.toString() },
        { title: "Replacement", url: "/orders", search: { tab: "Replacement" }, badge: orders.filter(o => o.status === "Replacement").length.toString() },
        { title: "Exchange", url: "/orders", search: { tab: "Exchange" }, badge: orders.filter(o => o.status === "Exchange").length.toString() },
      ],
    },
    { title: "Warehouses", url: "/warehouses", icon: Warehouse },
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "MIS Benchmarks", url: "/mis-benchmarks", icon: TrendingUp },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const renderNavLink = (item: any) => {
    // ── COLLAPSED MODE RENDERING ──
    if (collapsed) {
      if (item.subItems) {
        const isAnySubActive = item.subItems.some(
          (sub: any) =>
            pathname === sub.url &&
            (!sub.search || sub.search.tab === search?.tab)
        );
        const Icon = item.icon;
        const totalSubBadge = item.subItems.reduce((acc: number, sub: any) => {
          const val = parseInt(sub.badge) || 0;
          return acc + val;
        }, 0);

        return (
          <div key={item.title} className="flex justify-center py-1">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer outline-none select-none",
                        isAnySubActive
                          ? "bg-sidebar-accent text-primary shadow-soft ring-1 ring-primary/25 border-l-2 border-primary"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}
                      aria-label={item.title}
                    >
                      <Icon className="h-5 w-5" strokeWidth={isAnySubActive ? 2.4 : 2} />
                      {totalSubBadge > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-bold bg-primary text-primary-foreground grid place-items-center shadow-xs border border-sidebar">
                          {totalSubBadge > 99 ? "99+" : totalSubBadge}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="font-medium text-xs">
                  {item.title}
                </TooltipContent>
              </Tooltip>

              <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-56 p-1.5 shadow-xl border-border bg-popover text-popover-foreground rounded-xl z-50">
                <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {item.title}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                {item.subItems.map((sub: any) => {
                  const isSubActive =
                    pathname === sub.url &&
                    (!sub.search || sub.search.tab === search?.tab);
                  return (
                    <DropdownMenuItem asChild key={sub.title}>
                      <Link
                        to={sub.url}
                        search={sub.search}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg cursor-pointer",
                          isSubActive
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <span>{sub.title}</span>
                        {sub.badge && sub.badge !== "0" && (
                          <span className="min-w-[18px] h-4 px-1.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary grid place-items-center">
                            {sub.badge}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }

      const active = item.search
        ? pathname === item.url && search?.tab === item.search.tab
        : item.url === "/orders"
          ? pathname === "/orders" && !search?.tab
          : pathname === item.url;
      const Icon = item.icon;

      return (
        <div key={item.title} className="flex justify-center py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={item.url}
                search={item.search as any}
                className={cn(
                  "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer select-none",
                  active
                    ? "bg-sidebar-accent text-primary shadow-soft ring-1 ring-primary/25 border-l-2 border-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
                aria-label={item.title}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {item.badge && item.badge !== "0" && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-bold grid place-items-center shadow-xs border border-sidebar",
                      item.danger
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {parseInt(item.badge) > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="flex items-center gap-2 font-medium text-xs">
              <span>{item.title}</span>
              {item.badge && item.badge !== "0" && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary-foreground font-bold">
                  {item.badge}
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    // ── EXPANDED MODE RENDERING ──
    if (item.subItems) {
      const isOpen = openGroups[item.title];
      const Icon = item.icon;
      return (
        <div key={item.title} className="flex flex-col gap-1 my-1">
          <button
            onClick={() => setOpenGroups(prev => ({ ...prev, [item.title]: !isOpen }))}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground cursor-pointer"
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2} />
            <span className="flex-1 text-left">{item.title}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "rotate-0")} />
          </button>
          {isOpen && (
            <div className="pl-9 space-y-1 mt-1">
              {item.subItems.map((sub: any) => {
                const isSubActive =
                  pathname === sub.url &&
                  (!sub.search || sub.search.tab === search?.tab);
                const link = (
                  <Link
                    key={sub.title}
                    to={sub.url}
                    search={sub.search}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                      isSubActive
                        ? "bg-sidebar-accent text-primary font-semibold"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <span>{sub.title}</span>
                    {sub.badge && sub.badge !== "0" && (
                      <span className="min-w-[20px] h-4 px-1.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary grid place-items-center">
                        {sub.badge}
                      </span>
                    )}
                  </Link>
                );
                return closeOnNavigate ? <SheetClose asChild key={sub.title}>{link}</SheetClose> : link;
              })}
            </div>
          )}
        </div>
      );
    }

    const active = item.search
      ? pathname === item.url && search?.tab === item.search.tab
      : item.url === "/orders"
        ? pathname === "/orders" && !search?.tab
        : pathname === item.url;
    const Icon = item.icon;
    const link = (
      <Link
        key={item.title}
        to={item.url}
        search={item.search as any}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative sidebar-premium-item cursor-pointer",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft border-l-2 border-primary"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-gradient-primary" />
        )}
        <Icon
          className={cn("h-4.5 w-4.5", active && "text-primary")}
          strokeWidth={active ? 2.4 : 2}
        />
        <span className="flex-1">{item.title}</span>
        {item.badge && item.badge !== "0" && (
          <span
            className={cn(
              "min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-semibold grid place-items-center",
              item.danger
                ? "bg-destructive/12 text-destructive"
                : "bg-primary/12 text-primary",
            )}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );

    return closeOnNavigate ? (
      <SheetClose asChild key={item.title}>
        {link}
      </SheetClose>
    ) : (
      link
    );
  };

  return (
    <div className="flex flex-col h-full bg-sidebar/50">
      {/* ── Top Header / Logo + Toggle ──────────────────────── */}
      {collapsed ? (
        <div className="flex flex-col items-center justify-center gap-2.5 px-2 py-4 border-b border-sidebar-border/50">
          <Link to="/" className="group flex items-center justify-center" title="Halamama Home">
            <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-base shadow-sm ring-1 ring-primary/20 transition-transform group-hover:scale-105">
              H
            </div>
          </Link>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="grid h-8 w-8 place-items-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer select-none"
              title="Expand sidebar (⌘B)"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border/50">
          <Link to="/" className="group flex items-center">
            <div className="relative transition-transform duration-300 group-hover:scale-[1.02]">
              <img src={HALAMAMA_LOGO_URL} alt="Halamama" className="h-auto w-full max-w-[125px] object-contain" />
            </div>
          </Link>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="hidden lg:grid h-8 w-8 place-items-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer select-none"
              title="Collapse sidebar (⌘B)"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      )}

      {/* ── Navigation Links ─────────────────────────────────── */}
      <TooltipProvider delayDuration={100}>
        <nav className={cn("flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none", collapsed ? "px-2 py-4" : "px-3 py-6")}>
          {!collapsed && (
            <div className="px-3 pb-3 text-[10px] uppercase font-bold tracking-widest text-sidebar-foreground/50">
              Operations
            </div>
          )}
          {items.map(renderNavLink)}
        </nav>
      </TooltipProvider>

      {/* ── Bottom Collapse Toggle Button ───────────────────── */}
      {onToggle && (
        <div className="hidden lg:block px-2.5 py-2.5 border-t border-sidebar-border/50">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "flex w-full items-center rounded-xl p-2 text-xs font-medium text-sidebar-foreground/65 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer select-none",
              collapsed ? "justify-center" : "justify-between px-3"
            )}
            title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className="flex items-center gap-2">
              {collapsed ? (
                <PanelLeftOpen className="h-4.5 w-4.5" />
              ) : (
                <>
                  <PanelLeftClose className="h-4.5 w-4.5" />
                  <span>Collapse Menu</span>
                </>
              )}
            </div>
            {!collapsed && (
              <kbd className="rounded border border-sidebar-border/80 bg-sidebar-accent/50 px-1.5 py-0.5 text-[10px] font-mono text-sidebar-foreground/50">
                ⌘B
              </kbd>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { collapsed, toggle } = useSidebarCollapse();

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0 transition-[width] duration-300 ease-in-out z-20 overflow-x-hidden",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} onToggle={toggle} />
    </aside>
  );
}

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-soft transition-colors hover:bg-muted lg:hidden cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[min(22rem,86vw)] flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Dashboard navigation</SheetTitle>
          <SheetDescription>Access dashboard sections and logout controls.</SheetDescription>
        </SheetHeader>
        <SidebarContent closeOnNavigate collapsed={false} />
      </SheetContent>
    </Sheet>
  );
}
