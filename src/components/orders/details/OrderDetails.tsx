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
import { isUnpaidPayLaterOrder } from "@/lib/orders";

export function OrderDetails({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useOrderDetails(orderId);
  const updateNotes = useUpdateOrderNotes();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

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
        <Button asChild className="mt-6" variant="outline">
          <Link to="/orders">Back to Orders</Link>
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
          aria-label="Go back"
          className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-soft transition-all hover:-translate-x-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-muted-foreground/60">/</span>
        <span className="font-semibold text-foreground">{order.id}</span>
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
          <FulfillmentSection order={order} />
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

