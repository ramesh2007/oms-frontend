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

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import { mapErpNextToOrderItem } from "@/lib/api/mappers";
import type { Order, EnrichedOrder } from "@/lib/orders";
import { matchesLegacyTab } from "@/lib/orders";
import { getSharedOrders } from "@/lib/sync";
import type {
  ScheduledOrderItem,
  ScheduledItemsResponse,
  ApiInstallationLocation,
  ApiInstallationTeam,
  TechnicianScheduleRecord,
  TechnicianSchedulesResponse,
} from "@/lib/api/services";

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

    // Keep cached data for 10 minutes even if the component unmounts
    gcTime: 10 * 60 * 1000,

    // Auto-refetch every 15 seconds for live real-time dashboard dynamic updates
    refetchInterval: 15 * 1000,

    // Refetch when the browser tab regains focus
    refetchOnWindowFocus: true,
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
  statusFilter?: string;
  rawData?: any;
}

/**
 * Hook to fetch orders by dedicated status API (e.g. 'new', 'picking', 'picked', 'packing', 'ready-to-assign', 'in-delivery', 'delivered', 'all').
 */
export function useOrdersByStatus(statusName: string, page = 1, perPage = 15) {
  const queryClient = useQueryClient();

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
        statusFilter: statusName,
        rawData: res,
      };
    },
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData, previousQuery) => {
      // 1. If we are paginating within the EXACT same status, keep previous data
      if (previousQuery?.queryKey?.[2] === statusName) {
        return previousData;
      }

      // 2. If this specific status & page is already in the query client cache, use it immediately
      const cached = queryClient.getQueryData<OrdersByStatusResult>(orderKeys.status(statusName, page));
      if (cached && cached.orders && cached.orders.length > 0) {
        return cached;
      }

      // 3. Fallback: derive instant placeholder data from cached list or local shared orders
      const listOrders = queryClient.getQueryData<Order[]>(orderKeys.list());
      const source = (listOrders && listOrders.length > 0) ? listOrders : getSharedOrders();
      if (source && source.length > 0) {
        const lower = statusName.toLowerCase();
        const filtered = lower === "all"
          ? source
          : source.filter((o) => {
              if (lower === "new") return o.status === "New" || o.status === "Unfulfilled";
              return matchesLegacyTab(o, statusName as any);
            });
        const total = filtered.length;
        if (total > 0) {
          const from = (page - 1) * perPage + 1;
          const to = Math.min(page * perPage, total);
          return {
            orders: filtered.slice(from - 1, to),
            pagination: {
              current_page: page,
              per_page: perPage,
              total,
              last_page: Math.max(1, Math.ceil(total / perPage)),
              from,
              to,
              has_more_pages: page < Math.ceil(total / perPage),
              next_page_url: null,
              prev_page_url: null,
            },
            statusFilter: statusName,
          };
        }
      }

      return undefined;
    },
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
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
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
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

/**
 * Hook to fetch installation orders from /api/orders/status/installation or /api/orders/installation
 */
export function useInstallationOrders(page = 1, perPage = 15) {
  return useOrdersByStatus("installation", page, perPage);
}

/**
 * Hook to fetch installation items from /api/orders/status/installation-items or /api/orders/installation-items
 */
export function useInstallationItems() {
  return useQuery<any, Error>({
    queryKey: [...orderKeys.all, "installation-items"] as const,
    queryFn: () => ordersApi.fetchInstallationItems(),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch cancelled delivery orders from /api/orders/status/cancelled-delivery or /api/orders/cancelled-delivery
 */
export function useCancelledDeliveryOrders(page = 1, perPage = 15) {
  return useOrdersByStatus("cancelled-delivery", page, perPage);
}

/**
 * Hook to fetch scheduled order items from /api/admin/orders/scheduled-items
 */
export function useScheduledItems(params?: {
  is_scheduled_assigned?: boolean | string | number;
  page?: number;
  per_page?: number;
}) {
  return useQuery<ScheduledItemsResponse, Error>({
    queryKey: [...orderKeys.all, "scheduled-items", params] as const,
    queryFn: () => ordersApi.fetchScheduledItems(params),
    staleTime: 10 * 1000,
  });
}

// ─── useInstallationLocations ───────────────────────────────────────────

/**
 * Hook to fetch installation locations from /api/admin/installation/locations
 */
export function useInstallationLocations() {
  return useQuery<ApiInstallationLocation[], Error>({
    queryKey: [...orderKeys.all, "installation", "locations"] as const,
    queryFn: () => ordersApi.fetchInstallationLocations(),
    staleTime: 60 * 1000,
  });
}

// ─── useInstallationTeams ───────────────────────────────────────────────

/**
 * Hook to fetch installation teams/technicians from /api/admin/installation/teams/{locationId?}
 */
export function useInstallationTeams(locationId?: string | number | null) {
  return useQuery<ApiInstallationTeam[], Error>({
    queryKey: [...orderKeys.all, "installation", "teams", locationId ? String(locationId) : "all"] as const,
    queryFn: () => ordersApi.fetchInstallationTeams(locationId),
    staleTime: 60 * 1000,
  });
}

// ─── useTechnicianSchedules ─────────────────────────────────────────────

/**
 * Hook to fetch technician schedules from /api/admin/technician-schedule/list
 */
export function useTechnicianSchedules(params?: {
  technician_id?: number | string;
  scheduled_date?: string;
  status?: string;
  order_id?: number | string;
  per_page?: number;
  page?: number;
}) {
  return useQuery<TechnicianSchedulesResponse, Error>({
    queryKey: [...orderKeys.all, "technician-schedules", params] as const,
    queryFn: () => ordersApi.fetchTechnicianSchedules(params),
    staleTime: 10 * 1000,
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
  const queryClient = useQueryClient();
  const cleanId = String(orderId || "").replace(/^#/, "");

  return useQuery<EnrichedOrder | undefined, Error>({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => ordersApi.fetchOrderDetails(orderId),

    // Only fetch when orderId is provided
    enabled: !!orderId,

    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,

    // Provide instant placeholder data so the user never sees a delay or blank loading skeleton
    placeholderData: () => {
      // 1. Check if this exact order detail was fetched previously under an alternate ID key
      const exactCached =
        queryClient.getQueryData<EnrichedOrder>(orderKeys.detail(cleanId)) ||
        queryClient.getQueryData<EnrichedOrder>(orderKeys.detail(`#${cleanId}`));
      if (exactCached) return exactCached;

      // 2. Look up in the general orders list cache
      let found: Order | undefined;
      const cachedOrders = queryClient.getQueryData<Order[]>(orderKeys.list());
      if (cachedOrders && Array.isArray(cachedOrders)) {
        found = cachedOrders.find(
          (o) =>
            o.id === orderId ||
            o.id === cleanId ||
            o.orderNumber === orderId ||
            o.orderNumber === cleanId ||
            o.orderNumber === `#${cleanId}`,
        );
      }

      // 3. Look up in any status query cache (e.g. /picking, /packing, /delivered, etc.)
      if (!found) {
        const statusQueries = queryClient.getQueriesData<OrdersByStatusResult>({
          queryKey: [...orderKeys.all, "status"],
        });
        for (const [, queryData] of statusQueries) {
          if (queryData?.orders && Array.isArray(queryData.orders)) {
            found = queryData.orders.find(
              (o) =>
                o.id === orderId ||
                o.id === cleanId ||
                o.orderNumber === orderId ||
                o.orderNumber === cleanId ||
                o.orderNumber === `#${cleanId}`,
            );
            if (found) break;
          }
        }
      }

      if (found) {
        const rawItems = (found as any).line_items || (found as any).items || [];
        const itemsList = Array.isArray(rawItems) ? rawItems.map(mapErpNextToOrderItem) : [];

        return {
          ...found,
          zone: (found as any).zone || (found as any).custom_zone || found.city || "No Zone",
          itemsList,
          returnsList: [],
          timeline: [],
          payment: (found as any).payment
            ? {
                method: (found as any).payment.payment_method || "Cash on Delivery (COD)",
                status: (found as any).payment.payment_status || "pending",
                totalPaid: (found as any).payment.paid_amount || 0,
                cash: 0,
                card: 0,
                subtotal: Math.max(0, (found.total || 0) - 10),
                discount: 0,
                shipping: 10,
                total: found.total || 0,
                balance: (found as any).payment.total_outstanding || 0,
                shippingMethod: "Standard Delivery",
                id: (found as any).payment.id,
                shopifyOrderId: (found as any).payment.shopify_order_id,
                processedAt: (found as any).payment.processed_at,
              }
            : {
                method: "Cash on Delivery (COD)",
                status: "pending",
                totalPaid: 0,
                cash: 0,
                card: 0,
                subtotal: Math.max(0, (found.total || 0) - 10),
                discount: 0,
                shipping: 10,
                total: found.total || 0,
                balance: found.total || 0,
                shippingMethod: "Standard Delivery",
              },
          notes: (found as any).notes || found.notes || (found as any).custom_notes || (found as any).customer_notes || "",
          shippingAddress: {
            line1: (found as any).delivery_address || (found as any).custom_shipping_address_line1 || "",
            line2: (found as any).custom_shipping_address_line2 || "",
            city: found.city || "Doha",
            country: "Qatar",
            lat: 25.276987,
            lng: 51.520008,
          },
          matrix: [],
        };
      }

      return undefined;
    },
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
