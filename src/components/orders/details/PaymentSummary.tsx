import { CreditCard, Wallet } from "lucide-react";
import type { EnrichedOrder } from "@/lib/orders";
import { cn } from "@/lib/utils";

export function PaymentSummary({ order }: { order: EnrichedOrder }) {
  const rawStatus =
    order.payment?.status ||
    (order.payment?.balance > 0 ? "pending" : "paid");

  const paymentStatus = rawStatus
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  const isPaid = paymentStatus.toLowerCase() === "paid";
  const isPending = paymentStatus.toLowerCase() === "pending" || paymentStatus.toLowerCase() === "unpaid";

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Financial Summary</h2>
          </div>
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
              isPaid &&
                "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
              isPending &&
                "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
              !isPaid &&
                !isPending &&
                "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-500/20 dark:bg-gray-500/10 dark:text-gray-400",
            )}
          >
            {paymentStatus}
          </span>
        </div>

        <div className="p-5">
          <div className="space-y-3">
            <MoneyRow
              label="Subtotal"
              hint={`${order.items} item${order.items === 1 ? "" : "s"}`}
              value={order.payment.subtotal}
            />
            <MoneyRow label="Discount" value={-order.payment.discount} danger />
            <MoneyRow
              label="Shipping"
              hint={order.payment.shippingMethod}
              value={order.payment.shipping}
            />
          </div>

          <div className="mt-5 space-y-3 border-t border-border pt-5">
            <MoneyRow label="Total" value={order.payment.total} strong />
            <MoneyRow label="Balance" value={order.payment.balance} strong />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-4">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Payment</h2>
        </div>
        <div className="space-y-3 p-5">
          <InfoRow label="Method" value={order.payment.method} />
          <InfoRow
            label="Total paid"
            value={`QAR ${order.payment.totalPaid.toFixed(2)}`}
            positive
          />
          <InfoRow label="Cash" value={`QAR ${order.payment.cash.toFixed(2)}`} />
          <InfoRow label="Card" value={`QAR ${order.payment.card.toFixed(2)}`} />
        </div>
      </div>
    </section>
  );
}

function MoneyRow({
  label,
  hint,
  value,
  strong,
  danger,
}: {
  label: string;
  hint?: string;
  value: number;
  strong?: boolean;
  danger?: boolean;
}) {
  const prefix = value < 0 ? "- " : "";

  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 text-sm sm:grid-cols-[1fr_160px_auto]">
      <span className={cn("font-medium text-muted-foreground", strong && "text-foreground")}>
        {label}
      </span>
      <span className="hidden text-muted-foreground sm:block">{hint}</span>
      <span
        className={cn(
          "text-right font-semibold tabular-nums text-foreground",
          strong && "text-base font-bold",
          danger && "text-destructive",
        )}
      >
        {prefix}QAR {Math.abs(value).toFixed(2)}
      </span>
      {hint ? (
        <span className="col-span-2 text-xs text-muted-foreground sm:hidden">{hint}</span>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold text-foreground",
          positive && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}
