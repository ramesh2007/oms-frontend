import { MOCK_ORDERS } from "@/lib/orders";
import { isDemoMode } from "@/lib/api";
import { Package, Truck, CheckCircle2, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { DriverOrderFlow } from "./DriverOrderFlow";

export function DriverDashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // In live mode, active assigned driver orders are loaded dynamically.
  const allAssigned = isDemoMode()
    ? MOCK_ORDERS.filter((o) => o.status === "Started" || o.status === "Driver Accepted" || o.status === "Ready to Assign")
    : [];
  
  // For a real app, "Active" means assigned to driver but not yet completed.
  const activeOrders = allAssigned.filter((o) => ["Ready to Assign", "Driver Accepted", "Started"].includes(o.status));
  const deliveredOrders = allAssigned.filter((o) => o.status === "Delivered");
  const failedOrders = allAssigned.filter((o) => o.status === "Delivery Failed");

  const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Shift Summary */}
      <section className="bg-card rounded-xl p-4 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Current Shift</h2>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
            <Clock className="h-3 w-3" />
            08:00 AM - 05:00 PM
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shift Progress</span>
            <span className="font-medium">{deliveredOrders.length} / {allAssigned.length} Completed</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-foreground transition-all duration-500" 
              style={{ width: `${Math.max(5, (deliveredOrders.length / (allAssigned.length || 1)) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Delivery Statistics */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard title="Active" value={activeOrders.length} icon={Truck} color="text-blue-500" />
        <StatCard title="Delivered" value={deliveredOrders.length} icon={CheckCircle2} color="text-emerald-500" />
        <StatCard title="Total Assigned" value={allAssigned.length} icon={Package} />
        <StatCard title="Failed" value={failedOrders.length} icon={AlertCircle} color="text-red-500" />
      </section>

      {/* Active Orders List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg text-foreground tracking-tight">Active Orders</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {activeOrders.length} Pending
          </span>
        </div>
        
        <div className="space-y-3">
          {activeOrders.length > 0 ? (
            activeOrders.map((order) => (
              <div 
                key={order.id} 
                className="bg-card border border-border rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-foreground text-base tracking-tight">{order.id}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.date} • {order.time}</p>
                  </div>
                  <Badge status={order.status} />
                </div>
                
                <div className="py-2.5 border-y border-border/50 my-2">
                  <p className="text-sm font-medium text-foreground">{order.customer.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{(order as any).zone || order.city} Zone, Default Address</p>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <div className="font-semibold text-foreground text-sm">
                    QAR {order.total.toFixed(2)}
                  </div>
                  <button className="flex items-center gap-1 text-sm font-semibold text-foreground bg-foreground/5 hover:bg-foreground/10 px-3 py-1.5 rounded-lg transition-colors">
                    View
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-card border border-border border-dashed rounded-xl">
              <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">No active orders</p>
              <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
            </div>
          )}
        </div>
      </section>

      {/* Driver Flow Full Screen Dialog */}
      {selectedOrder && (
        <DriverOrderFlow 
          order={selectedOrder} 
          open={!!selectedOrder} 
          onClose={() => setSelectedOrderId(null)} 
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "text-foreground" }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm flex flex-col justify-between h-[88px]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <Icon className={cn("h-4 w-4 opacity-80", color)} />
      </div>
      <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  let color = "bg-muted text-muted-foreground";
  if (status === "Delivered") color = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  else if (status === "Started") color = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  else if (status === "Ready to Assign" || status === "Driver Accepted") color = "bg-amber-500/10 text-amber-600 dark:text-amber-400";

  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border border-current/10 uppercase tracking-wide", color)}>
      {status === "Ready to Assign" ? "Assigned" : status}
    </span>
  );
}
