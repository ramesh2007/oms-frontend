import { Edit2, Check, X, Mail, Navigation, Phone, UserRound, Tag } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EnrichedOrder } from "@/lib/orders";
import { cn, copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

interface CustomerSidebarProps {
  order: EnrichedOrder;
  onNotesUpdate?: (notes: string) => void;
}

export function CustomerSidebar({ order, onNotesUpdate }: CustomerSidebarProps) {
  const { lat, lng } = order.shippingAddress;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(order.notes ?? "");
  const [copied, setCopied] = useState(false);

  const handleEdit = useCallback(() => {
    setEditedNotes(order.notes ?? "");
    setIsEditing(true);
  }, [order.notes]);

  const handleSave = useCallback(() => {
    onNotesUpdate?.(editedNotes.trim());
    setIsEditing(false);
    toast.success("Notes saved successfully.");
  }, [editedNotes, onNotesUpdate]);

  const handleCancel = useCallback(() => {
    setEditedNotes(order.notes ?? "");
    setIsEditing(false);
  }, [order.notes]);

  return (
    <aside className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notes</h3>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Button
                variant="default"
                size="sm"
                className="h-7 px-3 text-xs font-medium"
                onClick={handleSave}
              >
                <Check className="h-3 w-3" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs font-medium text-muted-foreground"
                onClick={handleCancel}
              >
                <X className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleEdit}
              aria-label="Edit notes"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="p-5">
          {isEditing ? (
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              className="resize-none text-sm text-foreground"
              rows={3}
              placeholder="Enter notes..."
              autoFocus
            />
          ) : order.notes ? (
            <p className="text-sm text-muted-foreground italic">{order.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic opacity-70">
              No notes from customer
            </p>
          )}

          {(() => {
            const isPayLater = order.tags?.some((t) => t.toUpperCase() === "PAYLATER") ?? false;
            if (!isPayLater) return null;

            const extractUrl = (text?: string) => {
              if (!text) return null;
              const match = text.match(/https?:\/\/[^\s]+/);
              return match ? match[0] : null;
            };

            const paymentLink = extractUrl(order.notes) || `https://halamama.myshopify.com/checkouts/pay-later/${order.id.toLowerCase()}`;

            return (
              <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50/50 p-3.5 dark:border-purple-900/30 dark:bg-purple-950/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                  PayLater Payment Link
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-normal">
                  Payment is pending. Link sent to customer:
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded border border-purple-200 bg-background px-2.5 py-1.5 dark:border-purple-900">
                  <a
                    href={paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-purple-700 hover:underline dark:text-purple-400 font-mono"
                  >
                    {paymentLink}
                  </a>
                  <button
                    onClick={() => {
                      copyToClipboard(paymentLink).then((success) => {
                        if (success) {
                          toast.success("Payment link copied successfully.");
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } else {
                          toast.error("Failed to copy payment link.");
                        }
                      });
                    }}
                    type="button"
                    className={cn(
                      "shrink-0 text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer",
                      copied
                        ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        : "text-purple-700 hover:text-purple-800 dark:text-purple-400"
                    )}
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="mt-5 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Additional details
            </p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              bct-{order.customerId}-{order.id.toLowerCase()}
            </p>
          </div>
        </div>
      </section>

      {/* Customer Section */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Customer</h3>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <div className="text-base font-semibold text-primary">
              {order.customer.name}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contact information
            </p>
            <div className="space-y-1.5">
              <a
                href={`mailto:${order.customer.email}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{order.customer.email}</span>
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {order.customer.phone}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Shipping address
            </p>
            <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm font-medium text-foreground">{order.customer.name}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.line1}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.line2}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.city}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-muted-foreground">
                <div>
                  <span className="block font-sans text-xs font-medium text-foreground">
                    Latitude
                  </span>
                  {order.shippingAddress.lat}
                </div>
                <div>
                  <span className="block font-sans text-xs font-medium text-foreground">
                    Longitude
                  </span>
                  {order.shippingAddress.lng}
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              className="mt-4 w-full gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
              asChild
            >
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" />
                Open in Maps
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Tags Section */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Tags</h3>
        </div>
        <div className="p-5 flex flex-wrap gap-2">
          {order.tags && order.tags.length > 0 ? (
            order.tags.map((tag) => {
              const isPayLaterTag = tag.toUpperCase() === "PAYLATER";
              const isSentTag = tag.toUpperCase() === "PAYMENTLINKSENT";
              return (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border",
                    isPayLaterTag
                      ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900"
                      : isSentTag
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  )}
                >
                  {tag}
                </span>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground italic opacity-70">
              No tags on this order
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}
