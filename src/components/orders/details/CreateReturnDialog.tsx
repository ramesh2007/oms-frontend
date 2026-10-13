import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EnrichedOrder, OrderReturn } from "@/lib/orders";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { updateSharedOrder, broadcastChange } from "@/lib/sync";
import { createReturnReplacement } from "@/lib/api/services";
import { toast } from "sonner";

export function CreateReturnDialog({
  order,
  open,
  onOpenChange,
}: {
  order: EnrichedOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [actionType, setActionType] = useState<"refund" | "replace">("refund");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const handleSubmit = () => {
    if (selectedItems.size === 0) return;

    const newReturnItems: OrderReturn[] = [];
    for (const itemId of selectedItems) {
      const item = order.itemsList.find((i) => i.id === itemId);
      if (!item) continue;
      newReturnItems.push({
        id: `ret-${order.id}-${Date.now()}-${item.sku}`,
        itemName: item.name,
        sku: item.sku,
        type: actionType === "refund" ? "return" : "replacement",
        qty: item.qty,
        status: "pending",
        source: order.channel === "shopify" ? "Shopify" : "Web",
        reason: reason || undefined,
        adminNote: notes || undefined,
        createdAt: new Date().toISOString(),
      });
    }

    updateSharedOrder(order.id, (o) => {
      const existing = o.returnItems ?? [];
      o.returnItems = [...existing, ...newReturnItems];
      const totalReturnCount = o.returnItems.length;
      o.returns = { type: "Return" as const, count: totalReturnCount };
    });
    broadcastChange();

    // Trigger API in backend
    createReturnReplacement({
      order_id: order.id,
      order_number: order.id,
      type: actionType === "refund" ? "return" : "replacement",
      items: newReturnItems,
      reason: reason || undefined,
      notes: notes || undefined,
    }).catch((err) => {
      console.warn("[CreateReturnDialog] Failed to persist return/replacement to backend:", err);
    });

    toast.success(
      `${newReturnItems.length} return item${newReturnItems.length > 1 ? "s" : ""} created successfully.`,
    );

    // Reset and close
    setSelectedItems(new Set());
    setReason("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 flex flex-col max-h-[90vh]">
        <div className="p-5 sm:p-6 overflow-y-auto">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl">Create Return / Replacement</DialogTitle>
            <DialogDescription>
              Select items from the order and choose whether they should be returned for a refund or replaced.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Select Items */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Items</Label>
              <div className="max-h-[240px] overflow-y-auto space-y-2 rounded-md border border-border bg-muted/10 p-2">
                {order.itemsList.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50",
                      selectedItems.has(item.id) ? "border-primary bg-primary/5" : "border-transparent bg-card"
                    )}
                  >
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1 leading-none">
                      <p className="text-sm font-medium leading-none text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      Qty: {item.qty}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Action Type Segmented Control */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Action Type</Label>
                <div className="flex rounded-md bg-muted/50 p-1 border border-border">
                  <button
                    className={cn(
                      "flex-1 rounded-sm py-2 text-sm font-medium transition-all",
                      actionType === "refund"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActionType("refund")}
                  >
                    Refund
                  </button>
                  <button
                    className={cn(
                      "flex-1 rounded-sm py-2 text-sm font-medium transition-all",
                      actionType === "replace"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActionType("replace")}
                  >
                    Replace
                  </button>
                </div>
              </div>

              {/* Reason Dropdown */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged">Damaged / Defective</SelectItem>
                    <SelectItem value="wrong">Wrong Item Sent</SelectItem>
                    <SelectItem value="expiry">Near Expiry / Expired</SelectItem>
                    <SelectItem value="mind">Customer Changed Mind</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Notes (optional)</Label>
              <Textarea
                placeholder="Additional details..."
                className="min-h-[100px] resize-none bg-muted/10"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-5 py-4 sm:px-6 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selectedItems.size === 0} onClick={handleSubmit}>
            {actionType === "refund" ? "Create Refund" : "Create Replacement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
