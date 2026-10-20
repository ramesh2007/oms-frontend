import { createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { OrderDetails } from "@/components/orders/details/OrderDetails";
import { z } from "zod";

const searchSchema = z.object({
  tab: z.string().optional(),
  from: z.string().optional(),
});

export const Route = createFileRoute("/orders_/$orderId")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Order Details - Halamama LMD" },
    ],
  }),
  component: OrderDetailsPage,
});

function OrderDetailsPage() {
  const { orderId } = Route.useParams();
  const search = Route.useSearch();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 p-4 md:p-6 lg:p-8">
          <OrderDetails orderId={orderId} initialTab={search.tab} from={search.from} />
        </main>
      </div>
    </div>
  );
}

