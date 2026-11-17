import { createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShiftSlaSettings } from "@/components/settings/ShiftSlaSettings";
import { MisBenchmarksSettings } from "@/components/settings/MisBenchmarksSettings";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { RejectionReasons } from "@/components/settings/RejectionReasons";
import { ZoneManagement } from "@/components/settings/ZoneManagement";
import { VendorLocations } from "@/components/settings/VendorLocations";
import { Clock, BarChart3, Settings2, Users, CircleSlash, MapPin, Store } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings - Halamama LMD" }],
  }),
  component: SettingsPage,
});

const TABS = [
  { value: "shift-sla", label: "MIS Shift & SLA Windows", icon: Clock },
  { value: "mis-benchmarks", label: "MIS Benchmarks", icon: BarChart3 },
  { value: "system", label: "System Settings", icon: Settings2 },
  { value: "users", label: "User Management", icon: Users },
  { value: "vendor-locations", label: "Vendor Locations", icon: Store },
  { value: "rejection", label: "Rejection Reasons", icon: CircleSlash },
  { value: "zones", label: "Zones", icon: MapPin },
];

function SettingsPage() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] flex-1 p-4 md:p-6">
          <Tabs defaultValue="shift-sla" className="space-y-5">
            {/* Tab navigation bar */}
            <TabsList className="h-auto w-full justify-start gap-0 rounded-2xl bg-card border border-border p-1.5 shadow-soft flex-wrap">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs sm:text-sm font-medium">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* ── MIS Shift & SLA Windows ── */}
            <TabsContent value="shift-sla">
              <ShiftSlaSettings />
            </TabsContent>

            {/* ── MIS Benchmarks ── */}
            <TabsContent value="mis-benchmarks">
              <MisBenchmarksSettings />
            </TabsContent>

            {/* ── System Settings ── */}
            <TabsContent value="system">
              <SystemSettings />
            </TabsContent>

            {/* ── User Management ── */}
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            {/* ── Vendor Locations ── */}
            <TabsContent value="vendor-locations">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <VendorLocations />
              </div>
            </TabsContent>

            {/* ── Rejection Reasons ── */}
            <TabsContent value="rejection">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <RejectionReasons />
              </div>
            </TabsContent>

            {/* ── Zones ── */}
            <TabsContent value="zones">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <ZoneManagement />
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
