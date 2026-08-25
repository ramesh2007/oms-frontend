import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getDrivers, assignDriverToOrder, type ManagedUser } from "@/lib/sync";

export function AssignDriverDialog({
  open,
  onOpenChange,
  selectedCount,
  selectedOrders = [],
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  selectedOrders?: any[];
  onAssign: (driver: string) => void;
}) {
  const [selectedDriverVal, setSelectedDriverVal] = useState<string>("");
  const [driversList, setDriversList] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch active drivers asynchronously when the dialog opens
  useEffect(() => {
    let isMounted = true;
    if (open) {
      setLoading(true);
      getDrivers()
        .then((drivers) => {
          if (isMounted && Array.isArray(drivers)) {
            setDriversList(drivers);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch drivers:", err);
          if (isMounted) setDriversList([]);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      // Reset selected driver state when dialog closes
      setSelectedDriverVal("");
    }
    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleAssign = async () => {
    if (!selectedDriverVal) return;
    const driverObj = driversList.find(
      (d) => String(d.id) === selectedDriverVal || d.name === selectedDriverVal || d.email === selectedDriverVal
    );
    const driverName = driverObj ? driverObj.name : selectedDriverVal;
    const driverId = driverObj ? driverObj.id : selectedDriverVal;

    setSubmitting(true);
    try {
      if (selectedOrders && selectedOrders.length > 0) {
        for (const order of selectedOrders) {
          const orderNum = order.order_number || order.id || order.number;
          const orderIdVal = order.order_id || (typeof order.id === "number" ? order.id : undefined);
          await assignDriverToOrder({
            order_number: String(orderNum),
            order_id: orderIdVal,
            assigned_driver_user_id: driverId,
            zone: order.zone || order.city || undefined,
          });
        }
      }
      onAssign(driverName);
      onOpenChange(false);
    } catch (err) {
      console.error("[AssignDriverDialog] Error assigning driver:", err);
      onAssign(driverName);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[440px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 sm:p-7 overflow-y-auto">
          <DialogHeader className="mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4 sm:mx-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight text-center sm:text-left">
              Assign Driver
            </DialogTitle>
            <DialogDescription className="text-center sm:text-left text-muted-foreground mt-1.5">
              Select a delivery partner for {selectedCount} selected order{selectedCount !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-foreground">Select Driver</Label>
              <Select value={selectedDriverVal} onValueChange={setSelectedDriverVal}>
                <SelectTrigger className="w-full h-12 rounded-xl bg-muted/40 border-transparent hover:bg-muted focus:bg-background focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all font-medium text-foreground">
                  <SelectValue placeholder={loading ? "Loading drivers..." : "Choose a driver"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 shadow-xl">
                  {loading ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">Loading drivers...</div>
                  ) : driversList.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">No active drivers found</div>
                  ) : (
                    driversList.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)} className="rounded-lg font-medium py-2.5">
                        {d.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-border/40 bg-muted/20 px-5 py-4 sm:px-7 sm:py-5 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto rounded-xl font-semibold h-11 px-6 shadow-sm border-border/60">
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedDriverVal || loading || submitting}
            className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-md font-semibold h-11 px-8 transition-all"
          >
            {submitting ? "Assigning..." : "Confirm Assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}