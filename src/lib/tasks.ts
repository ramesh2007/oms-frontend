import { useState, useEffect } from "react";
import type { Order } from "@/lib/orders";

export type TaskPriority = "Urgent" | "High" | "Medium" | "Low";
export type TaskStatus = "Open" | "In Progress" | "Resolved" | "Cancelled";
export type TaskCategory =
  | "Address Change"
  | "Urgent Delivery"
  | "Hold Order"
  | "Item Modification"
  | "Special Packaging"
  | "Gate Pass / Access"
  | "Customer Verification"
  | "Other";

export interface OperationTask {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  city?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  assignedTo?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  isSeed?: boolean;
}

const STORAGE_KEY = "hm_operation_tasks";
const TASKS_EVENT = "hm_operation_tasks_updated";

export const INITIAL_SEED_TASKS: OperationTask[] = [
  {
    id: "TKT-8021",
    orderId: "HM-REF-1001",
    orderNumber: "1001",
    customerName: "Sarah Al-Kuwari",
    customerPhone: "+974 5512 3456",
    city: "Doha",
    category: "Address Change",
    priority: "High",
    status: "Open",
    title: "Customer moved to Lusail Marina Tower 3",
    description:
      "Customer called requesting delivery to Lusail Marina Tower 3, Apt 1402 instead of West Bay. Gate access code #5521.",
    createdBy: "Reem (Customer Care)",
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    assignedTo: "Dispatch Team",
    isSeed: true,
  },
  {
    id: "TKT-8022",
    orderId: "HM-10492",
    orderNumber: "10492",
    customerName: "Mohammed Al-Thani",
    customerPhone: "+974 6623 8899",
    city: "Al Rayyan",
    category: "Urgent Delivery",
    priority: "Urgent",
    status: "Open",
    title: "Need delivery before 2:00 PM today",
    description:
      "Baby shower event starts at 3:00 PM. Customer requested prioritizing picking & packing for express courier.",
    createdBy: "Hassan (Customer Care)",
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    assignedTo: "Picking Lead",
    isSeed: true,
  },
  {
    id: "TKT-8023",
    orderId: "HM-10488",
    orderNumber: "10488",
    customerName: "Fatima Al-Sulaiti",
    customerPhone: "+974 7734 5511",
    city: "Al Wakrah",
    category: "Hold Order",
    priority: "Medium",
    status: "In Progress",
    title: "Hold delivery until Saturday 5 PM",
    description:
      "Customer is traveling until Saturday afternoon. Do not dispatch before Saturday 17:00.",
    createdBy: "Aisha (Customer Care)",
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    assignedTo: "Warehouse Ops",
    isSeed: true,
  },
  {
    id: "TKT-8024",
    orderId: "HM-10485",
    orderNumber: "10485",
    customerName: "Khalid Al-Mansoor",
    customerPhone: "+974 3345 7788",
    city: "Doha",
    category: "Special Packaging",
    priority: "Medium",
    status: "In Progress",
    title: "Gift packaging with congratulatory note",
    description:
      "Customer requested gold ribbon gift packaging and card: 'Congratulations on your newborn princess!'",
    createdBy: "Reem (Customer Care)",
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    assignedTo: "Packing Lead",
    isSeed: true,
  },
  {
    id: "TKT-8020",
    orderId: "HM-10477",
    orderNumber: "10477",
    customerName: "Noura Al-Hajri",
    customerPhone: "+974 5599 1122",
    city: "Lusail",
    category: "Item Modification",
    priority: "Low",
    status: "Resolved",
    title: "Color swap: Pastel Pink instead of Cream",
    description: "Customer confirmed baby girl nursery theme, requested swap of stroller liner.",
    createdBy: "Hassan (Customer Care)",
    createdAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    assignedTo: "Picking Team",
    resolutionNotes: "Picker substituted SKU with Pastel Pink variant with customer consent.",
    resolvedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    resolvedBy: "Tariq (Warehouse Ops)",
    isSeed: true,
  },
];

let inMemoryTasksCache: OperationTask[] | null = null;

export function getStoredTasks(): OperationTask[] {
  if (typeof window === "undefined") {
    return INITIAL_SEED_TASKS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_TASKS));
      inMemoryTasksCache = INITIAL_SEED_TASKS;
      return INITIAL_SEED_TASKS;
    }
    const parsed = JSON.parse(raw) as OperationTask[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      inMemoryTasksCache = parsed;
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_TASKS));
    inMemoryTasksCache = INITIAL_SEED_TASKS;
    return INITIAL_SEED_TASKS;
  } catch {
    return inMemoryTasksCache || INITIAL_SEED_TASKS;
  }
}

export function saveStoredTasks(tasks: OperationTask[]): void {
  inMemoryTasksCache = tasks;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent(TASKS_EVENT, { detail: tasks }));
    } catch {
      // ignore storage quota error
    }
  }
}

export function getOpenTasksCount(): number {
  const tasks = getStoredTasks();
  return tasks.filter((t) => t.status === "Open" || t.status === "In Progress").length;
}

export function hasTaskForOrder(order: Order, tasks?: OperationTask[]): boolean {
  if (!order) return false;
  const allTasks = tasks || getStoredTasks();
  const rawId = (order.id || "").toLowerCase().trim().replace(/^#/, "");
  const orderNum = (order.orderNumber || "").toLowerCase().trim().replace(/^#/, "");
  const shopifyId = (order.shopifyOrderId || "").toLowerCase().trim();

  return allTasks.some((task) => {
    if (task.status !== "Open" && task.status !== "In Progress") return false;
    const taskOrderId = (task.orderId || "").toLowerCase().trim().replace(/^#/, "");
    const taskOrderNum = (task.orderNumber || "").toLowerCase().trim().replace(/^#/, "");

    if (
      taskOrderId &&
      (taskOrderId === rawId || taskOrderId === orderNum || taskOrderId === shopifyId)
    )
      return true;
    if (
      taskOrderNum &&
      (taskOrderNum === rawId || taskOrderNum === orderNum || taskOrderNum === shopifyId)
    )
      return true;

    if (rawId && taskOrderId && (rawId.includes(taskOrderId) || taskOrderId.includes(rawId)))
      return true;
    if (
      orderNum &&
      taskOrderNum &&
      (orderNum.includes(taskOrderNum) || taskOrderNum.includes(orderNum))
    )
      return true;

    return false;
  });
}

export function getTasksForOrder(order: Order, tasks?: OperationTask[]): OperationTask[] {
  if (!order) return [];
  const allTasks = tasks || getStoredTasks();
  const rawId = (order.id || "").toLowerCase().trim().replace(/^#/, "");
  const orderNum = (order.orderNumber || "").toLowerCase().trim().replace(/^#/, "");
  const shopifyId = (order.shopifyOrderId || "").toLowerCase().trim();

  return allTasks.filter((task) => {
    const taskOrderId = (task.orderId || "").toLowerCase().trim().replace(/^#/, "");
    const taskOrderNum = (task.orderNumber || "").toLowerCase().trim().replace(/^#/, "");

    if (
      taskOrderId &&
      (taskOrderId === rawId || taskOrderId === orderNum || taskOrderId === shopifyId)
    )
      return true;
    if (
      taskOrderNum &&
      (taskOrderNum === rawId || taskOrderNum === orderNum || taskOrderNum === shopifyId)
    )
      return true;

    if (rawId && taskOrderId && (rawId.includes(taskOrderId) || taskOrderId.includes(rawId)))
      return true;
    if (
      orderNum &&
      taskOrderNum &&
      (orderNum.includes(taskOrderNum) || taskOrderNum.includes(orderNum))
    )
      return true;

    return false;
  });
}

export function syncSeedTasksWithOrders(orders: Order[]): void {
  if (!orders || orders.length === 0 || typeof window === "undefined") return;

  const current = getStoredTasks();
  const hasUserTasks = current.some((t) => !t.isSeed);
  if (hasUserTasks) return;

  // Check if any seed task already matches an order in the list
  const anyMatches = orders.some((o) => hasTaskForOrder(o, current));
  if (anyMatches) return;

  // If no seed task matches the current orders from API, attach seed tasks to the first available orders
  const updated = current.map((task, idx) => {
    if (!task.isSeed) return task;
    const targetOrder = orders[idx % orders.length];
    if (!targetOrder) return task;

    return {
      ...task,
      orderId: targetOrder.id,
      orderNumber: targetOrder.orderNumber || targetOrder.id.replace(/^HM-/, ""),
      customerName: targetOrder.customer?.name || task.customerName,
      customerPhone: targetOrder.customer?.phone || task.customerPhone,
      city: targetOrder.city || task.city,
    };
  });

  saveStoredTasks(updated);
}

export function createTask(
  data: Omit<OperationTask, "id" | "createdAt" | "status">,
): OperationTask {
  const current = getStoredTasks();
  const id = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  const newTask: OperationTask = {
    ...data,
    id,
    status: "Open",
    createdAt: new Date().toISOString(),
  };

  const updated = [newTask, ...current];
  saveStoredTasks(updated);
  return newTask;
}

export function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  resolutionNotes?: string,
  resolvedBy?: string,
): void {
  const current = getStoredTasks();
  const updated = current.map((t) => {
    if (t.id === taskId) {
      return {
        ...t,
        status,
        ...(status === "Resolved"
          ? {
              resolutionNotes: resolutionNotes || t.resolutionNotes,
              resolvedAt: new Date().toISOString(),
              resolvedBy: resolvedBy || "Operations Team",
            }
          : {}),
      };
    }
    return t;
  });
  saveStoredTasks(updated);
}

export function updateTask(taskId: string, updates: Partial<OperationTask>): void {
  const current = getStoredTasks();
  const updated = current.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
  saveStoredTasks(updated);
}

export function deleteTask(taskId: string): void {
  const current = getStoredTasks();
  const updated = current.filter((t) => t.id !== taskId);
  saveStoredTasks(updated);
}

export function useOperationTasks() {
  const [tasks, setTasks] = useState<OperationTask[]>(() => getStoredTasks());

  useEffect(() => {
    const handler = () => {
      setTasks(getStoredTasks());
    };

    window.addEventListener(TASKS_EVENT, handler);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener(TASKS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const openTasksCount = tasks.filter(
    (t) => t.status === "Open" || t.status === "In Progress",
  ).length;

  return {
    tasks,
    openTasksCount,
    createTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    refresh: () => setTasks(getStoredTasks()),
  };
}
