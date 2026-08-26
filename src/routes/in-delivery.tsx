import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { OrderTable } from "@/components/orders/OrderTable";
import { type Order } from "@/lib/orders";
import { useOrdersByStatus } from "@/hooks/useOrders";
import { PaginationControls } from "@/components/orders/PaginationControls";
import { useState } from "react";

export const Route = createFileRoute("/in-delivery")({
  head: () => ({
    meta: [
      { title: "In Delivery Orders - Halamama LMD" },
    ],
  }),
  component: InDeliveryPage,
});

function InDeliveryPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { data: statusResult, isLoading: loading } = useOrdersByStatus("in-delivery", currentPage, 15);
  const orders = statusResult?.orders || [];
  const pagination = statusResult?.pagination;

  const goToOrder = (order: Order) => {
    navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
  };

  const onSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const onSelectAllVisible = (select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) orders.forEach((o) => next.add(o.id));
      else orders.forEach((o) => next.delete(o.id));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-4 p-4 md:space-y-5 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">In Delivery Orders</h1>
          </div>
          <OrderTable
            orders={orders}
            loading={loading}
            onViewOrder={goToOrder}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAllVisible={onSelectAllVisible}
            allVisibleSelected={orders.length > 0 && orders.every((o) => selectedIds.has(o.id))}
            someVisibleSelected={orders.some((o) => selectedIds.has(o.id)) && !(orders.length > 0 && orders.every((o) => selectedIds.has(o.id)))}
            expandedId={expandedId}
            onExpandedChange={setExpandedId}
            activeTab="In Delivery"
          />
          {!loading && (
            <PaginationControls
              pagination={pagination}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              isLoading={loading}
            />
          )}
        </main>
      </div>
    </div>
  );
}
