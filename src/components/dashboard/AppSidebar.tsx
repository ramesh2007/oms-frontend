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
  CalendarClock,
  MapPin,
  CalendarDays,
  TrendingUp,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useOrders, useFlaggedOrders } from "@/hooks/useOrders";
import { getSnapshot as getScheduledSnapshot } from "@/lib/scheduled-installations";
import { hasAppointment } from "@/lib/scheduling";

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

function SidebarContent({ closeOnNavigate = false }: { closeOnNavigate?: boolean }) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const search = routerState.location.search as any;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  const scheduledCount = getScheduledSnapshot().length;

  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Orders", url: "/orders", icon: Package, badge: orders.length.toString() },
    { title: "Picking", url: "/orders", search: { tab: "Picking" }, icon: PackageSearch, badge: pickingCount.toString() },
    { title: "Packing", url: "/orders", search: { tab: "Packing" }, icon: Boxes, badge: packingCount.toString() },
    { title: "Ready to Assign", url: "/orders", search: { tab: "Ready to Assign" }, icon: ClipboardCheck, badge: readyToAssignCount.toString() },
    { title: "In Delivery", url: "/orders", search: { tab: "In Delivery" }, icon: Truck, badge: inDeliveryCount.toString() },
    { title: "Delivered", url: "/orders", search: { tab: "Delivered" }, icon: CheckCircle2, badge: deliveredCount.toString() },
    { title: "Flags & Exceptions", url: "/orders", search: { tab: "Flags & Exceptions" }, icon: Flag, badge: flaggedOrderCount.toString(), danger: true },
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
    { title: "Scheduled Inst...", url: "/scheduled", icon: Wrench, badge: scheduledCount.toString() },
    { title: "Warehouses", url: "/warehouses", icon: Warehouse },
    {
      title: "Scheduling",
      icon: CalendarDays,
      subItems: [
        { title: "Customer Care Queue", url: "/customer-care", badge: orders.filter((o) => {
          const isSchedulable = o.itemsList?.some?.((i: any) => i.itemType === "MWH" || i.itemType === "VL_SUPPLIER") ?? false;
          return isSchedulable && !hasAppointment(o.id) && o.status !== "Delivered" && o.status !== "Cancelled";
        }).length.toString() },
        { title: "Locations & Teams", url: "/locations" },
        { title: "Team Calendars", url: "/calendars" },
      ],
    },
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "MIS Benchmarks", url: "/mis-benchmarks", icon: TrendingUp },
    { title: "Settings", url: "/settings", icon: Settings },
  ];


  const renderNavLink = (item: any) => {
    if (item.subItems) {
      const isOpen = openGroups[item.title];
      const Icon = item.icon;
      return (
        <div key={item.title} className="flex flex-col gap-1 my-1">
          <button
            onClick={() => setOpenGroups(prev => ({ ...prev, [item.title]: !isOpen }))}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2} />
            <span className="flex-1 text-left">{item.title}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
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
                      "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all",
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

    const active = pathname === item.url && !item.search;
    const Icon = item.icon;
    const link = (
      <Link
        key={item.title}
        to={item.url}
        search={item.search as any}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative sidebar-premium-item",
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
        {item.badge && (
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
      <SheetClose asChild key={item.url}>
        {link}
      </SheetClose>
    ) : (
      link
    );
  };

  return (
    <div className="flex flex-col h-full bg-sidebar/50">
      <div className="px-6 py-6 border-b border-sidebar-border/50">
        <Link to="/" className="group flex justify-center">
          <div className="relative w-full transition-transform duration-300 group-hover:scale-[1.02]">
            <img src={HALAMAMA_LOGO_URL} alt="Halamama" className="h-auto w-full max-w-[140px] mx-auto object-contain" />
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-none">
        <div className="px-3 pb-3 text-[10px] uppercase font-bold tracking-widest text-sidebar-foreground/50">
          Operations
        </div>
        {items.map(renderNavLink)}
      </nav>

    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-soft transition-colors hover:bg-muted lg:hidden"
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
        <SidebarContent closeOnNavigate />
      </SheetContent>
    </Sheet>
  );
}
