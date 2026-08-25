
import type { LucideIcon } from "lucide-react";
import { Package, PackageCheck, Truck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrders } from "@/hooks/useOrders";
import { isUnpaidPayLaterOrder } from "@/lib/orders";

const toneIcon: Record<string, string> = {
  primary: "text-primary",
  info: "text-sky-600 dark:text-sky-400",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
  violet: "text-violet-600 dark:text-violet-400",
};

const toneBgClass: Record<string, string> = {
  primary: "bg-primary/10",
  info: "bg-sky-500/10",
  warning: "bg-amber-500/10",
  success: "bg-emerald-500/10",
  violet: "bg-violet-500/10",
};

export function OrdersHeader({
  stats: propsStats,
}: {
  stats?: { label: string; value: string; icon: LucideIcon; tone: keyof typeof toneIcon }[];
}) {
  const { data: apiOrders = [] } = useOrders();

  const dynamicStats = [
    {
      label: "Picking",
      value: apiOrders
        .filter((order) => order.status === "Picking" && !isUnpaidPayLaterOrder(order))
        .length.toLocaleString(),
      icon: Package,
      tone: "violet" as const,
    },
    {
      label: "Packing",
      value: apiOrders
        .filter((order) => order.status === "Packing" && !isUnpaidPayLaterOrder(order))
        .length.toLocaleString(),
      icon: PackageCheck,
      tone: "primary" as const,
    },
    {
      label: "Delivered",
      value: apiOrders
        .filter((order) => order.status === "Delivered" && !isUnpaidPayLaterOrder(order))
        .length.toLocaleString(),
      icon: Truck,
      tone: "primary" as const,
    },
    {
      label: "Revenue",
      value: (() => {
        const totalRevenue = apiOrders
          .filter((o) => !isUnpaidPayLaterOrder(o))
          .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        if (totalRevenue >= 1000) {
          return `QAR ${Math.round(totalRevenue / 1000)}K`;
        }
        return `QAR ${Math.round(totalRevenue)}`;
      })(),
      icon: Wallet,
      tone: "success" as const,
    },
  ];

  const stats = apiOrders.length > 0 ? dynamicStats : propsStats || dynamicStats;

  return (
    <div className="flex flex-col gap-3 sm:gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight md:text-3xl text-foreground">Orders</h1>
        <div className="mt-2.5 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          {stats.map((s) => (
            <div 
              key={s.label} 
              className="flex items-center gap-2 rounded-lg sm:rounded-xl border bg-card/50 px-2.5 py-1.5 sm:px-3 shadow-sm backdrop-blur-sm transition-colors hover:bg-accent/50"
            >
              <div className={cn("flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-[6px] sm:rounded-lg", toneBgClass[s.tone])}>
                <s.icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", toneIcon[s.tone])} aria-hidden />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm sm:text-base font-bold tabular-nums tracking-tight text-foreground">{s.value}</span>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

