import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useOrdersByStatus, orderKeys } from "@/hooks/useOrders";
import { invalidateStatusQueryCache } from "@/lib/api/services";
import { playNewOrderSound } from "@/lib/sound";
import { toast } from "sonner";
import { Package } from "lucide-react";
import type { Order } from "@/lib/orders";

const SESSION_NOTIFIED_KEY = "hm_notified_order_ids";

// Module-level set of known order identifiers to persist across component re-renders
const globalKnownOrderIds = new Set<string>();
let isGlobalInitialized = false;

function getStoredNotifiedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_NOTIFIED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {}
  return new Set();
}

function markOrdersAsNotified(identifiers: string[]) {
  if (typeof window === "undefined") return;
  try {
    const stored = getStoredNotifiedIds();
    for (const id of identifiers) {
      stored.add(id);
      globalKnownOrderIds.add(id);
    }
    const arr = Array.from(stored).slice(-300);
    sessionStorage.setItem(SESSION_NOTIFIED_KEY, JSON.stringify(arr));
  } catch {}
}

/**
 * Extracts all possible aliases/variants of an order identifier (#1116, 1116, numeric id, shopify id)
 * so that formatting discrepancies between different endpoints never cause duplicate notifications.
 */
function getOrderIdentifiers(o: Order | any): string[] {
  const ids: string[] = [];
  if (o?.id !== undefined && o?.id !== null) {
    const raw = String(o.id).trim();
    ids.push(raw);
    ids.push(raw.replace(/^#+/, ""));
  }
  if (o?.orderNumber !== undefined && o?.orderNumber !== null) {
    const raw = String(o.orderNumber).trim();
    ids.push(raw);
    ids.push(raw.replace(/^#+/, ""));
  }
  if (o?.order_number !== undefined && o?.order_number !== null) {
    const raw = String(o.order_number).trim();
    ids.push(raw);
    ids.push(raw.replace(/^#+/, ""));
  }
  if (o?.order_id !== undefined && o?.order_id !== null) {
    ids.push(String(o.order_id).trim());
  }
  if (o?.shopifyOrderId) {
    ids.push(String(o.shopifyOrderId).trim());
  }
  return ids;
}

/**
 * Global background listener that detects incoming new orders (including Shopify)
 * and displays an alert message on the top-right along with a sound chime.
 * Strictly triggers ONCE per new order with multi-layer deduplication.
 */
export function NewOrderNotifier() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Listen strictly to the 'New' orders endpoint where fresh Shopify orders enter
  const { data: newStatusResult } = useOrdersByStatus("new", 1, 15);

  useEffect(() => {
    const orders = newStatusResult?.orders;
    if (!orders || !Array.isArray(orders) || orders.length === 0) return;

    const storedNotified = getStoredNotifiedIds();

    // 1. Initial mount / first fetch: record all currently existing orders so they never alert
    if (!isGlobalInitialized) {
      for (const o of orders) {
        for (const id of getOrderIdentifiers(o)) {
          globalKnownOrderIds.add(id);
        }
      }
      isGlobalInitialized = true;
      return;
    }

    // 2. Identify only genuinely new orders that have NEVER been seen or notified
    const newOrders = orders.filter((o) => {
      const ids = getOrderIdentifiers(o);
      return !ids.some((id) => globalKnownOrderIds.has(id) || storedNotified.has(id));
    });

    if (newOrders.length === 0) return;

    // 3. Mark all identifiers for these new orders as known and notified IMMEDIATELY
    const allNewIds: string[] = [];
    for (const o of newOrders) {
      for (const id of getOrderIdentifiers(o)) {
        allNewIds.push(id);
      }
    }
    markOrdersAsNotified(allNewIds);

    // 4. Invalidate order caches so active tables refresh
    invalidateStatusQueryCache();
    queryClient.invalidateQueries({ queryKey: orderKeys.all });

    // 5. Play chime sound ONCE
    playNewOrderSound();

    // 6. Display top-right toast alert ONCE
    if (newOrders.length === 1) {
      const order = newOrders[0];
      const cleanNum = String(order.orderNumber || order.id).replace(/^#+/, "");
      toast.info(`New Order #${cleanNum} Received`, {
        description: `${order.customer?.name ? `${order.customer.name} · ` : ""}QAR ${Number(order.total || 0).toLocaleString()} · Placed in "New"`,
        duration: 7000,
        icon: <Package className="h-4 w-4 text-sky-500" />,
        action: {
          label: "View Order",
          onClick: () => {
            navigate({
              to: "/orders/$orderId",
              params: { orderId: order.id },
            });
          },
        },
      });
    } else {
      const latest = newOrders[0];
      const cleanNum = String(latest.orderNumber || latest.id).replace(/^#+/, "");
      toast.info(`${newOrders.length} New Orders Received`, {
        description: `Latest: #${cleanNum} (${latest.customer?.name || "Customer"}) · Placed in "New"`,
        duration: 7000,
        icon: <Package className="h-4 w-4 text-sky-500" />,
        action: {
          label: "View in New",
          onClick: () => {
            navigate({
              to: "/orders",
              search: { tab: "New" } as any,
            });
          },
        },
      });
    }
  }, [newStatusResult?.orders, navigate, queryClient]);

  return null;
}
