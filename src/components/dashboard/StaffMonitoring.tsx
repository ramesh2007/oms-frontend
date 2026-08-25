import { Activity } from "lucide-react";
import type { Order } from "@/lib/orders";
import { getUsers, type ManagedUser } from "@/lib/sync";
import { useState, useEffect, useMemo } from "react";

interface StaffMonitoringProps {
  orders: Order[];
}

interface MemberInfo {
  name: string;
  score: number;
  tasks: number;
  status: "active" | "break" | "idle";
}

// export function StaffMonitoring({ orders }: StaffMonitoringProps) {
//   const staff = useMemo(() => {
//     const response = getUsers();
//     const users = Array.isArray(response) ? response : response?.users || [];
//     const pickers = users.filter((u) => u.role === "picker");
//     const packers = users.filter((u) => u.role === "packer");
//     const drivers = users.filter((u) => u.role === "driver");

//     function buildMembers(
//       userList: typeof users,
//       getAssigned: (order: Order) => string | null,
//     ): MemberInfo[] {
//       return userList.map((u) => {
//         const assignedOrders = orders.filter((o) => {
//           const assignee = getAssigned(o);
//           if (!assignee) return false;
//           return (
//             assignee === u.name ||
//             assignee === u.email.split("@")[0] ||
//             assignee.toLowerCase() === u.name.toLowerCase()
//           );
//         });
//         const tasks = assignedOrders.length;
//         const isActive = u.status === "active" && tasks > 0;
//         // Score: base 70 + up to 30 based on tasks relative to max 10
//         const score = tasks > 0 ? Math.min(100, 70 + Math.round((tasks / 10) * 30)) : 0;
//         return {
//           name: u.name,
//           score,
//           tasks,
//           status: u.status === "inactive" ? "idle" as const : isActive ? "active" as const : "idle" as const,
//         };
//       });
//     }

//     const pickerMembers = buildMembers(pickers, (o) => o.picker);
//     const packerMembers = buildMembers(packers, (o) => o.packer);
//     const driverMembers = buildMembers(drivers, (o) => o.driver);

//     return [
//       {
//         role: "Pickers",
//         online: pickerMembers.filter((m) => m.status === "active").length,
//         total: pickers.length,
//         avatarClass: "bg-info/15 text-info",
//         members: pickerMembers
//           .sort((a, b) => b.tasks - a.tasks)
//           .slice(0, 5),
//       },
//       {
//         role: "Packers",
//         online: packerMembers.filter((m) => m.status === "active").length,
//         total: packers.length,
//         avatarClass: "bg-warning/15 text-warning",
//         members: packerMembers
//           .sort((a, b) => b.tasks - a.tasks)
//           .slice(0, 5),
//       },
//       {
//         role: "Drivers",
//         online: driverMembers.filter((m) => m.status === "active").length,
//         total: drivers.length,
//         avatarClass: "bg-success/15 text-success",
//         members: driverMembers
//           .sort((a, b) => b.tasks - a.tasks)
//           .slice(0, 5),
//       },
//     ];
//   }, [orders]);

//   const totalOnline = staff.reduce((sum, g) => sum + g.online, 0);

//   return (
//     <section className="rounded-2xl premium-card overflow-hidden">
//       <div className="px-4 py-3 flex items-center justify-between border-b border-border">
//         <div className="flex items-center gap-2.5">
//           <div className="h-6 w-6 rounded-lg bg-primary/10 grid place-items-center">
//             <Activity className="h-3 w-3 text-primary" />
//           </div>
//           <div>
//             <h2 className="text-sm font-semibold tracking-tight">Live Staff Monitoring</h2>
//             <p className="text-[11px] text-muted-foreground">
//               Performance across all warehouse roles
//             </p>
//           </div>
//         </div>
//         <span className="flex items-center gap-1.5 text-[10px] font-semibold text-success">
//           <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> {totalOnline} ONLINE
//         </span>
//       </div>

//       <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
//         {staff.map((group) => (
//           <div key={group.role} className="p-3">
//             <div className="flex items-center justify-between mb-3">
//               <div>
//                 <div className="text-xs font-semibold">{group.role}</div>
//                 <div className="text-[11px] text-muted-foreground">
//                   <span className="text-foreground font-bold">{group.online}</span> / {group.total}{" "}
//                   online
//                 </div>
//               </div>
//               <div className="flex -space-x-1.5">
//                 {group.members.slice(0, 3).map((m) => (
//                   <div
//                     key={m.name}
//                     className={`h-6 w-6 rounded-full ring-2 ring-card grid place-items-center text-[9px] font-bold ${group.avatarClass}`}
//                   >
//                     {m.name
//                       .split(" ")
//                       .map((n) => n[0])
//                       .join("")
//                       .slice(0, 2)
//                       .toUpperCase()}
//                   </div>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               {group.members.length === 0 && (
//                 <div className="text-xs text-muted-foreground py-2">No staff in this role</div>
//               )}
//               {group.members.map((m) => (
//                 <div key={m.name} className="flex items-center gap-2">
//                   <div className="flex-1 min-w-0">
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-xs font-medium truncate">{m.name}</span>
//                       <span
//                         className={`h-1.5 w-1.5 rounded-full ${m.status === "active" ? "bg-success" : m.status === "break" ? "bg-warning" : "bg-muted-foreground/40"}`}
//                       />
//                     </div>
//                     <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
//                       <div
//                         className="h-full rounded-full bg-gradient-primary"
//                         style={{ width: `${m.score}%` }}
//                       />
//                     </div>
//                   </div>
//                   <div className="text-right shrink-0">
//                     <div className="text-xs font-bold tabular-nums">{m.score}</div>
//                     <div className="text-[10px] text-muted-foreground tabular-nums">
//                       {m.tasks} task{m.tasks !== 1 ? "s" : ""}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ))}
//       </div>
//     </section>
//   );
// }
export function StaffMonitoring({ orders }: StaffMonitoringProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch users when the component mounts
  useEffect(() => {
    let isMounted = true;
    getUsers()
      .then((data) => {
        if (isMounted) {
          setUsers(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const staff = useMemo(() => {
    const pickers = users.filter((u) => u.role === "picker");
    const packers = users.filter((u) => u.role === "packer");
    const drivers = users.filter((u) => u.role === "driver");

    function buildMembers(
      userList: typeof users,
      getAssigned: (order: Order) => string | null,
    ): MemberInfo[] {
      return userList.map((u) => {
        const assignedOrders = orders.filter((o) => {
          const assignee = getAssigned(o);
          if (!assignee) return false;
          return (
            assignee === u.name ||
            assignee === u.email.split("@")[0] ||
            assignee.toLowerCase() === u.name.toLowerCase()
          );
        });
        const tasks = assignedOrders.length;
        const isActive = u.status === "active" && tasks > 0;
        const score = tasks > 0 ? Math.min(100, 70 + Math.round((tasks / 10) * 30)) : 0;
        return {
          name: u.name,
          score,
          tasks,
          status: u.status === "inactive" ? ("idle" as const) : isActive ? ("active" as const) : ("idle" as const),
        };
      });
    }

    const pickerMembers = buildMembers(pickers, (o) => o.picker);
    const packerMembers = buildMembers(packers, (o) => o.packer);
    const driverMembers = buildMembers(drivers, (o) => o.driver);

    return [
      {
        role: "Pickers",
        online: pickerMembers.filter((m) => m.status === "active").length,
        total: pickers.length,
        avatarClass: "bg-info/15 text-info",
        members: pickerMembers.sort((a, b) => b.tasks - a.tasks).slice(0, 5),
      },
      {
        role: "Packers",
        online: packerMembers.filter((m) => m.status === "active").length,
        total: packers.length,
        avatarClass: "bg-warning/15 text-warning",
        members: packerMembers.sort((a, b) => b.tasks - a.tasks).slice(0, 5),
      },
      {
        role: "Drivers",
        online: driverMembers.filter((m) => m.status === "active").length,
        total: drivers.length,
        avatarClass: "bg-success/15 text-success",
        members: driverMembers.sort((a, b) => b.tasks - a.tasks).slice(0, 5),
      },
    ];
  }, [users, orders]);

  const totalOnline = staff.reduce((sum, g) => sum + g.online, 0);

  return (
    <section className="rounded-2xl premium-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-primary/10 grid place-items-center">
            <Activity className="h-3 w-3 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Live Staff Monitoring</h2>
            <p className="text-[11px] text-muted-foreground">
              Performance across all warehouse roles
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> {totalOnline} ONLINE
        </span>
      </div>

      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {staff.map((group) => (
          <div key={group.role} className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-semibold">{group.role}</div>
                <div className="text-[11px] text-muted-foreground">
                  <span className="text-foreground font-bold">{group.online}</span> / {group.total}{" "}
                  online
                </div>
              </div>
              <div className="flex -space-x-1.5">
                {group.members.slice(0, 3).map((m) => (
                  <div
                    key={m.name}
                    className={`h-6 w-6 rounded-full ring-2 ring-card grid place-items-center text-[9px] font-bold ${group.avatarClass}`}
                  >
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {loading && <div className="text-xs text-muted-foreground py-2">Loading staff...</div>}
              {!loading && group.members.length === 0 && (
                <div className="text-xs text-muted-foreground py-2">No staff in this role</div>
              )}
              {!loading &&
                group.members.map((m) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{m.name}</span>
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${m.status === "active" ? "bg-success" : m.status === "break" ? "bg-warning" : "bg-muted-foreground/40"}`}
                        />
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-primary"
                          style={{ width: `${m.score}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold tabular-nums">{m.score}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        {m.tasks} task{m.tasks !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}