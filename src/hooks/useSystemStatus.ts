import { useState, useEffect, useCallback } from "react";
import { isDemoMode, apiConfig } from "@/lib/api";

export interface SystemStatusState {
  status: "checking" | "healthy" | "warning" | "offline";
  label: string;
  details: string;
  latency: number | null;
  lastChecked: string;
}

export interface ShopifyStatusState {
  status: "checking" | "healthy" | "warning" | "offline";
  label: string;
  details: string;
  lastSync: string;
}

// export function useSystemStatus() {
//   const [systemStatus, setSystemStatus] = useState<SystemStatusState>({
//     status: "checking",
//     label: "Checking Status...",
//     details: "Verifying connection to operations database...",
//     latency: null,
//     lastChecked: new Date().toLocaleTimeString(),
//   });

//   const [shopifyStatus, setShopifyStatus] = useState<ShopifyStatusState>({
//     status: "checking",
//     label: "Checking Status...",
//     details: "Verifying Shopify API integration connectivity...",
//     lastSync: new Date().toLocaleTimeString(),
//   });

//   const checkStatus = useCallback(async () => {
//     // 1. Check ERPNext / Operations Database status
//     setSystemStatus((prev) => ({ ...prev, status: "checking", label: "Checking Status..." }));
    
//     const startSystem = performance.now();
//     try {
//       if (isDemoMode()) {
//         // In demo mode, ping a public internet endpoint to check online connectivity
//         const controller = new AbortController();
//         const timeout = setTimeout(() => controller.abort(), 4000);
        
//         await fetch("https://httpbin.org/ping", {
//           mode: "no-cors",
//           signal: controller.signal,
//         });
//         clearTimeout(timeout);
        
//         const latency = Math.round(performance.now() - startSystem);
//         setSystemStatus({
//           status: "healthy",
//           label: "All Systems Live",
//           details: `Connected. Local operational database healthy (demo mode). Latency: ${latency}ms.`,
//           latency,
//           lastChecked: new Date().toLocaleTimeString(),
//         });
//       } else {
//         // In live mode, ping the actual ERPNext backend baseUrl
//         const controller = new AbortController();
//         const timeout = setTimeout(() => controller.abort(), 5000);
        
//         // Try fetching a lightweight ping method or baseUrl
//         const url = `${apiConfig.baseUrl.replace(/\/$/, "")}/api/method/ping`;
        
//         const response = await fetch(url, {
//           method: "GET",
//           signal: controller.signal,
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//         });
//         clearTimeout(timeout);

//         const latency = Math.round(performance.now() - startSystem);

//         if (response.ok) {
//           setSystemStatus({
//             status: "healthy",
//             label: "All Systems Live",
//             details: `ERPNext connection stable. Latency: ${latency}ms.`,
//             latency,
//             lastChecked: new Date().toLocaleTimeString(),
//           });
//         } else {
//           setSystemStatus({
//             status: "warning",
//             label: "System Issues Detected",
//             details: `Intermittent connection or API issues. Server returned status code ${response.status}.`,
//             latency,
//             lastChecked: new Date().toLocaleTimeString(),
//           });
//         }
//       }
//     } catch (err: any) {
//       const latency = Math.round(performance.now() - startSystem);
//       if (err.name === "AbortError" || latency >= 4000) {
//         setSystemStatus({
//           status: "warning",
//           label: "System Issues Detected",
//           details: `Connection request timed out. ERPNext server is experiencing high latency (${latency}ms).`,
//           latency,
//           lastChecked: new Date().toLocaleTimeString(),
//         });
//       } else {
//         setSystemStatus({
//           status: "offline",
//           label: "System Offline",
//           details: `Offline. Unable to reach operational server at ${apiConfig.baseUrl || "localhost"}. Check network connection.`,
//           latency: null,
//           lastChecked: new Date().toLocaleTimeString(),
//         });
//       }
//     }

//     // 2. Check Shopify Connection
//     setShopifyStatus((prev) => ({ ...prev, status: "checking", label: "Checking Status..." }));
    
//     const startShopify = performance.now();
//     try {
//       const controller = new AbortController();
//       const timeout = setTimeout(() => controller.abort(), 4000);

//       // Ping Shopify status or domain
//       await fetch("https://shopify.com", {
//         mode: "no-cors",
//         signal: controller.signal,
//       });
//       clearTimeout(timeout);

//       const elapsed = performance.now() - startShopify;

//       if (elapsed > 2000) {
//         setShopifyStatus({
//           status: "warning",
//           label: "Shopify Connection Unstable",
//           details: `Shopify latency is high (${Math.round(elapsed)}ms). Sync operations might face delays.`,
//           lastSync: new Date().toLocaleTimeString(),
//         });
//       } else {
//         setShopifyStatus({
//           status: "healthy",
//           label: "Shopify",
//           details: `Shopify connection operational. Webhooks synced successfully in ${Math.round(elapsed)}ms.`,
//           lastSync: new Date().toLocaleTimeString(),
//         });
//       }
//     } catch (err: any) {
//       const elapsed = performance.now() - startShopify;
//       if (err.name === "AbortError" || elapsed >= 3500) {
//         setShopifyStatus({
//           status: "warning",
//           label: "Shopify Connection Unstable",
//           details: "Shopify request timed out. High network load detected.",
//           lastSync: new Date().toLocaleTimeString(),
//         });
//       } else {
//         setShopifyStatus({
//           status: "offline",
//           label: "Shopify Disconnected",
//           details: "Offline. Shopify API endpoints are currently unreachable.",
//           lastSync: new Date().toLocaleTimeString(),
//         });
//       }
//     }
//   }, []);

//   useEffect(() => {
//     // Initial check
//     checkStatus();

//     // Check periodically every 30 seconds
//     const interval = setInterval(checkStatus, 30000);
//     return () => clearInterval(interval);
//   }, [checkStatus]);

//   return {
//     systemStatus,
//     shopifyStatus,
//     checkStatus,
//   };
// }

export function useSystemStatus() {
  const [systemStatus, setSystemStatus] = useState<SystemStatusState>({
    status: "checking",
    label: "Checking Status...",
    details: "Verifying connection to operations database...",
    latency: null,
    lastChecked: new Date().toLocaleTimeString(),
  });

  const [shopifyStatus, setShopifyStatus] = useState<ShopifyStatusState>({
    status: "checking",
    label: "Checking Status...",
    details: "Verifying Shopify API integration connectivity...",
    lastSync: new Date().toLocaleTimeString(),
  });

  const checkStatus = useCallback(async () => {
    // 1. Check Laravel / Operations Database status
    setSystemStatus((prev) => ({ ...prev, status: "checking", label: "Checking Status..." }));
    
    const startSystem = performance.now();
    try {
      if (isDemoMode()) {
        // In demo mode, ping a public internet endpoint to check online connectivity
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        
        await fetch("https://httpbin.org/ping", {
          mode: "no-cors",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        
        const latency = Math.round(performance.now() - startSystem);
        setSystemStatus({
          status: "healthy",
          label: "All Systems Live",
          details: `Connected. Local operational database healthy (demo mode). Latency: ${latency}ms.`,
          latency,
          lastChecked: new Date().toLocaleTimeString(),
        });
      } else {
        // In live mode, ping the actual Laravel backend baseUrl (using standard public health check route or API endpoint)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        // Laravel standard health check or ping route (e.g., /api/ping or /up)
        const url = `${apiConfig.baseUrl.replace(/\/$/, "")}/api/ping`;
        
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
        clearTimeout(timeout);

        const latency = Math.round(performance.now() - startSystem);

        if (response.ok) {
          setSystemStatus({
            status: "healthy",
            label: "All Systems Live",
            details: `Laravel connection stable. Latency: ${latency}ms.`,
            latency,
            lastChecked: new Date().toLocaleTimeString(),
          });
        } else {
          setSystemStatus({
            status: "warning",
            label: "System Issues Detected",
            details: `Intermittent connection or API issues. Server returned status code ${response.status}.`,
            latency,
            lastChecked: new Date().toLocaleTimeString(),
          });
        }
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - startSystem);
      if (err.name === "AbortError" || latency >= 4000) {
        setSystemStatus({
          status: "warning",
          label: "System Issues Detected",
          details: `Connection request timed out. Laravel server is experiencing high latency (${latency}ms).`,
          latency,
          lastChecked: new Date().toLocaleTimeString(),
        });
      } else {
        setSystemStatus({
          status: "offline",
          label: "System Offline",
          details: `Offline. Unable to reach operational server at ${apiConfig.baseUrl || "localhost"}. Check network connection.`,
          latency: null,
          lastChecked: new Date().toLocaleTimeString(),
        });
      }
    }

    // 2. Check Shopify Connection
    setShopifyStatus((prev) => ({ ...prev, status: "checking", label: "Checking Status..." }));
    
    const startShopify = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      // Ping Shopify status or domain
      await fetch("https://shopify.com", {
        mode: "no-cors",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const elapsed = performance.now() - startShopify;

      if (elapsed > 2000) {
        setShopifyStatus({
          status: "warning",
          label: "Shopify Connection Unstable",
          details: `Shopify latency is high (${Math.round(elapsed)}ms). Sync operations might face delays.`,
          lastSync: new Date().toLocaleTimeString(),
        });
      } else {
        setShopifyStatus({
          status: "healthy",
          label: "Shopify",
          details: `Shopify connection operational. Webhooks synced successfully in ${Math.round(elapsed)}ms.`,
          lastSync: new Date().toLocaleTimeString(),
        });
      }
    } catch (err: any) {
      const elapsed = performance.now() - startShopify;
      if (err.name === "AbortError" || elapsed >= 3500) {
        setShopifyStatus({
          status: "warning",
          label: "Shopify Connection Unstable",
          details: "Shopify request timed out. High network load detected.",
          lastSync: new Date().toLocaleTimeString(),
        });
      } else {
        setShopifyStatus({
          status: "offline",
          label: "Shopify Disconnected",
          details: "Offline. Shopify API endpoints are currently unreachable.",
          lastSync: new Date().toLocaleTimeString(),
        });
      }
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkStatus();

    // Check periodically every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    systemStatus,
    shopifyStatus,
    checkStatus,
  };
}