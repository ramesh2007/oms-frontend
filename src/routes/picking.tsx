import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { PickingTable } from "@/components/orders/tables/PickingTable";
import { type Order } from "@/lib/orders";
import { useOrdersByStatus } from "@/hooks/useOrders";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/picking")({
  head: () => ({
    meta: [
      { title: "Picking - Halamama LMD" },
    ],
  }),
  component: PickingPage,
});

function PickingPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading: loading } = useOrdersByStatus("picking");

  const goToOrder = (order: Order) => {
    navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 space-y-4 p-4 md:space-y-5 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Picker Assigned Orders</h1>
          </div>
          <PickingTable orders={orders} loading={loading} onViewOrder={goToOrder} />
        </main>
      </div>
    </div>
  );
}
