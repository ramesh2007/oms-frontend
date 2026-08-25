import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { PackingTable } from "@/components/orders/tables/PackingTable";
import { type Order } from "@/lib/orders";
import { useOrdersByStatus } from "@/hooks/useOrders";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/packing")({
  head: () => ({
    meta: [
      { title: "Packing - Halamama LMD" },
    ],
  }),
  component: PackingPage,
});

function PackingPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading: loading } = useOrdersByStatus("packing");

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
            <h1 className="text-2xl font-bold tracking-tight">Packer Assigned Orders</h1>
          </div>
          <PackingTable orders={orders} loading={loading} onViewOrder={goToOrder} />
        </main>
      </div>
    </div>
  );
}
