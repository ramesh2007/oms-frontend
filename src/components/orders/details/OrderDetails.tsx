
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useOrderDetails, useUpdateOrderNotes } from "@/hooks/useOrders";
import { OrderHeader } from "./OrderHeader";
import { FulfillmentSection } from "./FulfillmentSection";
import { CustomerSidebar } from "./CustomerSidebar";
import { PaymentSummary } from "./PaymentSummary";
import { ReturnsSection } from "./ReturnsSection";
import { ActivityTimeline } from "./ActivityTimeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnpaidPayLaterOrder, getOrderPrimaryTab } from "@/lib/orders";
import { useMemo } from "react";

export function OrderDetails({
  orderId,
  initialTab,
  from,
}: {
  orderId: string;
  initialTab?: string;
  from?: string;
}) {
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useOrderDetails(orderId);
  const updateNotes = useUpdateOrderNotes();

  const backLabel = useMemo(() => {
    const rawFrom = from || (typeof window !== "undefined" ? sessionStorage.getItem("last_orders_from") : null);
    const rawTab = initialTab || (typeof window !== "undefined" ? sessionStorage.getItem("last_orders_tab") : null);

    if (rawFrom) {
      if (rawFrom.includes("/picking")) return "Picking";
      if (rawFrom.includes("/packing")) return "Packing";
      if (rawFrom.includes("/ready")) return "Ready to Assign";
      if (rawFrom.includes("/in-delivery")) return "In Delivery";
      if (rawFrom.includes("/delivered")) return "Delivered";
      if (rawFrom.includes("/returns")) return "Returns";
      if (rawFrom.includes("/flags")) return "Flags & Exceptions";
      if (rawFrom.includes("/scheduled")) return "Scheduled Installation";
      if (rawFrom.includes("/customer-care")) return "Customer Care";
      if (rawFrom.includes("/calendars")) return "Calendars";
      if (rawFrom.includes("tab=")) {
        try {
          const searchParams = new URLSearchParams(rawFrom.split("?")[1] || "");
          const t = searchParams.get("tab");
          if (t) return t;
        } catch {
          // ignore
        }
      }
    }

    if (rawTab) {
      return rawTab;
    }

    if (order) {
      const primary = getOrderPrimaryTab(order);
      if (primary && primary !== "All") {
        return primary;
      }
    }

    return "Orders";
  }, [from, initialTab, order]);

  const handleBack = () => {
    const targetFrom = from || (typeof window !== "undefined" ? sessionStorage.getItem("last_orders_from") : null);
    const targetTab = initialTab || (typeof window !== "undefined" ? sessionStorage.getItem("last_orders_tab") : null);

    // 1. If explicit `from` path was provided or stored in session
    if (targetFrom && targetFrom.startsWith("/")) {
      const [pathname, searchStr] = targetFrom.split("?");
      if (searchStr) {
        const params = new URLSearchParams(searchStr);
        const searchObj: Record<string, string> = {};
        params.forEach((v, k) => {
          searchObj[k] = v;
        });
        navigate({ to: pathname as any, search: searchObj as any });
        return;
      }
      navigate({ to: pathname as any });
      return;
    }

    // 2. If explicit `targetTab` was provided or stored in session
    if (targetTab) {
      navigate({ to: "/orders", search: { tab: targetTab } as any });
      return;
    }

    // 3. Fallback based on order's current stage
    if (order) {
      const primaryTab = getOrderPrimaryTab(order);
      if (primaryTab && primaryTab !== "All") {
        navigate({ to: "/orders", search: { tab: primaryTab } as any });
        return;
      }
    }

    // 4. If history exists and previous page is within this site
    if (typeof window !== "undefined" && window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      window.history.back();
      return;
    }

    // 5. Default fallback
    navigate({ to: "/orders" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-xl font-semibold text-foreground">Order not found</h2>
        <p className="mt-2 text-muted-foreground">The order {orderId} could not be found.</p>
        <Button onClick={handleBack} className="mt-6 cursor-pointer" variant="outline">
          Back to {backLabel}
        </Button>
      </div>
    );
  }

  const isUnpaidPayLater = isUnpaidPayLaterOrder(order);

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back Navigation */}
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <button
          type="button"
          onClick={handleBack}
          aria-label={`Back to ${backLabel} list`}
          title={`Back to ${backLabel} list`}
          className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-soft transition-all hover:-translate-x-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleBack}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:underline"
        >
          {backLabel}
        </button>
        <span className="text-muted-foreground/60">/</span>
        <span className="font-semibold text-foreground font-mono">#{String(order.orderNumber || order.id).replace(/^#+/, "")}</span>
      </div>

      {isUnpaidPayLater && (
        <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50/70 p-4 text-purple-900 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">PayLater Order - Payment Pending</h3>
            <p className="mt-1 text-xs text-purple-800/80 dark:text-purple-400/80 leading-normal">
              This order was placed using the <strong>Pay Later</strong> payment option. A payment link has been sent to the customer. 
              Fulfillment, delivery processing, and driver assignment are blocked until the customer completes the payment and Shopify marks the order as Paid.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left Column: Main Content */}
        <div className="flex min-w-0 flex-col gap-6">
          <OrderHeader order={order} />
          <FulfillmentSection order={order} from={from} initialTab={initialTab} />
          <PaymentSummary order={order} />
          <ReturnsSection order={order} />
        </div>

        {/* Right Column: Sidebar */}
        <div className="flex min-w-0 flex-col gap-6">
          <ActivityTimeline order={order} />
          <CustomerSidebar 
            order={order} 
            onNotesUpdate={(newNotes) => {
              updateNotes.mutate({ orderId, notes: newNotes });
            }}
          />
        </div>
      </div>
    </div>
  );
}

