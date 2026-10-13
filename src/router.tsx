import { QueryClient } from "@tanstack/react-query";
import { createRouter, createBrowserHistory, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { initSync } from "@/lib/sync";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Initialize cross-app sync (only active in demo mode)
  initSync(queryClient);

  // Dynamically determine the basepath so it works whether deployed at root (/),
  // under /demo/order-management/, or on a dev server.
  const getBasepath = () => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      if (pathname.startsWith("/demo/order-management")) {
        return "/demo/order-management";
      }
    }
    const envBase = import.meta.env.BASE_URL;
    if (envBase && envBase !== "./" && envBase !== "") {
      return envBase.endsWith("/") ? envBase.slice(0, -1) : envBase;
    }
    return undefined;
  };

  // Support hash routing if configured via VITE_ROUTER_MODE=hash or url hash '#/'
  // (Ensures pages reload on servers where URL rewrite rules cannot be configured)
  const isHashMode =
    import.meta.env.VITE_ROUTER_MODE === "hash" ||
    (typeof window !== "undefined" &&
      (window.location.hash.startsWith("#/") || window.location.search.includes("router=hash")));

  const history = isHashMode ? createHashHistory() : createBrowserHistory();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    basepath: getBasepath(),
    history,
  });

  return router;
};
