import { MOCK_ORDERS } from "@/lib/orders";
import { isDemoMode } from "@/lib/api";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeliveryHistory() {
  const historyOrders = isDemoMode()
    ? MOCK_ORDERS.filter((o) => o.status === "Delivered" || o.status === "Delivery Failed")
    : [];

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg text-foreground tracking-tight">Delivery History</h2>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {historyOrders.length} Records
        </span>
      </div>
      
      <div className="space-y-3">
        {historyOrders.length > 0 ? (
          historyOrders.map((order) => (
            <div key={order.id} className="bg-card border border-border rounded-xl p-4 shadow-sm opacity-90">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-foreground text-base tracking-tight">{order.id}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.date} • {order.time}</p>
                </div>
                <Badge status={order.status} />
              </div>
              
              <div className="py-2.5 border-y border-border/50 my-2">
                <p className="text-sm font-medium text-foreground">{order.customer.name}</p>
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <div className="font-semibold text-foreground text-sm">
                  QAR {order.total.toFixed(2)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-card border border-border border-dashed rounded-xl">
            <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">No history found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  let color = "bg-muted text-muted-foreground";
  if (status === "Delivered") color = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  else if (status === "Delivery Failed") color = "bg-red-500/10 text-red-600 dark:text-red-400";

  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border border-current/10 uppercase tracking-wide", color)}>
      {status}
    </span>
  );
}
