/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  useOrders — React Hooks for Order Data                                      ║
 * ║                                                                              ║
 * ║  WHAT ARE THESE?                                                             ║
 * ║  React hooks that make it super easy to load data in your components.        ║
 * ║  They automatically handle:                                                  ║
 * ║    ✅ Loading states (show a spinner while data loads)                       ║
 * ║    ✅ Error states (show a message if something goes wrong)                  ║
 * ║    ✅ Caching (don't re-fetch data you already have)                        ║
 * ║    ✅ Auto-refetch (keep data fresh in the background)                      ║
 * ║                                                                              ║
 * ║  USAGE IN A COMPONENT:                                                       ║
 * ║                                                                              ║
 * ║    import { useOrders } from "@/hooks/useOrders";                            ║
 * ║                                                                              ║
 * ║    function MyComponent() {                                                  ║
 * ║      const { data: orders, isLoading, error } = useOrders();                ║
 * ║                                                                              ║
 * ║      if (isLoading) return <Spinner />;                                      ║
 * ║      if (error) return <ErrorMessage error={error} />;                       ║
 * ║      return <OrderTable orders={orders} />;                                  ║
 * ║    }                                                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import type { Order, EnrichedOrder } from "@/lib/orders";

// ─── Query Keys ──────────────────────────────────────────────────────────
// These are unique "labels" for each type of data.
// React Query uses them to cache and invalidate data.

export const orderKeys = {
  /** All order-related queries */
  all: ["orders"] as const,
  /** The main orders list */
  list: () => [...orderKeys.all, "list"] as const,
  /** Status specific query */
  status: (status: string, page = 1) => [...orderKeys.all, "status", status, page] as const,
  /** A single order's details */
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,
};

// ─── useOrders ───────────────────────────────────────────────────────────

/**
 * Hook to fetch all orders.
 */
export function useOrders() {
  return useQuery<Order[], Error>({
    queryKey: orderKeys.list(),
    queryFn: () => ordersApi.fetchOrders(),

    // Keep data fresh for 30 seconds before refetching in background
    staleTime: 30 * 1000,

    // Keep cached data for 5 minutes even if the component unmounts
    gcTime: 5 * 60 * 1000,

    // Don't refetch when the browser tab regains focus (avoids flickering)
    refetchOnWindowFocus: false,
  });
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from?: number;
  to?: number;
  has_more_pages?: boolean;
  next_page_url?: string | null;
  prev_page_url?: string | null;
}

export interface OrdersByStatusResult {
  orders: Order[];
  pagination: PaginationMeta;
  rawData?: any;
}

/**
 * Hook to fetch orders by dedicated status API (e.g. 'new', 'picking', 'picked', 'packing', 'ready-to-assign', 'in-delivery', 'delivered', 'all').
 */
export function useOrdersByStatus(statusName: string, page = 1, perPage = 15) {
  return useQuery<OrdersByStatusResult, Error>({
    queryKey: orderKeys.status(statusName, page),
    queryFn: async () => {
      const res: any = await ordersApi.fetchOrdersByStatus(statusName, page, perPage);
      const mappedOrders: Order[] = res?.mappedOrders || (Array.isArray(res?.data) ? res.data : []);
      const pagination: PaginationMeta = res?.pagination || {
        current_page: page,
        per_page: perPage,
        total: mappedOrders.length,
        last_page: Math.max(1, Math.ceil(mappedOrders.length / perPage)),
        from: mappedOrders.length > 0 ? (page - 1) * perPage + 1 : 0,
        to: Math.min(page * perPage, mappedOrders.length),
        has_more_pages: page < Math.ceil(mappedOrders.length / perPage),
        next_page_url: null,
        prev_page_url: null,
      };

      return {
        orders: mappedOrders,
        pagination,
        rawData: res,
      };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch flagged orders from /api/orders/status/flagged or /api/orders/flagged
 */
export function useFlaggedOrders(page = 1, perPage = 15) {
  return useQuery<OrdersByStatusResult, Error>({
    queryKey: [...orderKeys.all, "flagged", page] as const,
    queryFn: async () => {
      const res: any = await ordersApi.fetchFlaggedOrders(page, perPage);
      const mappedOrders: Order[] = res?.mappedOrders || (Array.isArray(res?.data) ? res.data : []);
      const pagination: PaginationMeta = res?.pagination || {
        current_page: page,
        per_page: perPage,
        total: mappedOrders.length,
        last_page: Math.max(1, Math.ceil(mappedOrders.length / perPage)),
        from: mappedOrders.length > 0 ? (page - 1) * perPage + 1 : 0,
        to: Math.min(page * perPage, mappedOrders.length),
        has_more_pages: page < Math.ceil(mappedOrders.length / perPage),
        next_page_url: null,
        prev_page_url: null,
      };

      return {
        orders: mappedOrders,
        pagination,
        rawData: res,
      };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch flagged items from GET /api/orders/flagged-items
 */
export function useFlaggedItems() {
  return useQuery<any, Error>({
    queryKey: [...orderKeys.all, "flagged-items"] as const,
    queryFn: () => ordersApi.fetchFlaggedItems(),
    staleTime: 30 * 1000,
  });
}


// ─── useOrderDetails ─────────────────────────────────────────────────────

/**
 * Hook to fetch a single order with full details.
 *
 * @example
 * function OrderDetailPage({ orderId }: { orderId: string }) {
 *   const { data: order, isLoading } = useOrderDetails(orderId);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!order) return <p>Order not found</p>;
 *
 *   return <OrderHeader order={order} />;
 * }
 */
export function useOrderDetails(orderId: string) {
  return useQuery<EnrichedOrder | undefined, Error>({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => ordersApi.fetchOrderDetails(orderId),

    // Only fetch when orderId is provided
    enabled: !!orderId,

    staleTime: 30 * 1000,
  });
}

// ─── useUpdateOrderStatus ────────────────────────────────────────────────

/**
 * Hook to update an order's status.
 * After updating, it automatically refreshes the orders list.
 *
 * @example
 * function StatusButton({ orderId }: { orderId: string }) {
 *   const updateStatus = useUpdateOrderStatus();
 *
 *   return (
 *     <button
 *       onClick={() => updateStatus.mutate({ orderId, newStatus: "Delivered" })}
 *       disabled={updateStatus.isPending}
 *     >
 *       {updateStatus.isPending ? "Updating..." : "Mark Delivered"}
 *     </button>
 *   );
 * }
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: string }) =>
      ordersApi.updateOrderStatus(orderId, newStatus),

    // After a successful update, refresh the orders list
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// ─── useAssignDriver ─────────────────────────────────────────────────────

/**
 * Hook to assign a driver to an order.
 *
 * @example
 * const assignDriver = useAssignDriver();
 * assignDriver.mutate({ orderId: "SO-001", driverName: "Karim" });
 */
export function useAssignDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, driverName }: { orderId: string; driverName: string }) =>
      ordersApi.assignDriver(orderId, driverName),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// ─── useAssignPicker ─────────────────────────────────────────────────────

/**
 * Hook to assign a picker to an order.
 */
export function useAssignPicker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, pickerName }: { orderId: string; pickerName: string }) =>
      ordersApi.assignPicker(orderId, pickerName),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// ─── useAssignPacker ─────────────────────────────────────────────────────

/**
 * Hook to assign a packer to an order.
 */
export function useAssignPacker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, packerName }: { orderId: string; packerName: string }) =>
      ordersApi.assignPacker(orderId, packerName),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// ─── useUpdateOrderNotes ──────────────────────────────────────────────────

/**
 * Hook to update an order's notes.
 */
export function useUpdateOrderNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes: string }) =>
      ordersApi.updateOrderNotes(orderId, notes),

    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// ─── useDeleteOrder ───────────────────────────────────────────────────────

/**
 * Hook to delete/cancel an order.
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => ordersApi.deleteOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// ─── useUpdateOrderDetails ────────────────────────────────────────────────

/**
 * Hook to update customer, bags, total or city on an order.
 */
export function useUpdateOrderDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      updates,
    }: {
      orderId: string;
      updates: {
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        city?: string;
        bags?: number;
        total?: number;
      };
    }) => ordersApi.updateOrderDetails(orderId, updates),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
