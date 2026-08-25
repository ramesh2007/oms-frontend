/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  ERPNext ↔ RouteMyOrder Data Mappers                                          ║
 * ║                                                                              ║
 * ║  Translates raw ERPNext Sales Orders and Items into the exact shape          ║
 * ║  expected by the RouteMyOrder pages (Picker, Packer, and Driver).            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Maps standard ERPNext status to RouteMyOrder statuses:
 * 'new' -> 'picking' -> 'packed' -> 'packing' -> 'assigning' -> 'assigned' -> 'delivered' / 'failed'
 */
function mapStatus(erpStatus, pickingStatus, packingStatus) {
  if (erpStatus === "Cancelled") return "failed";
  if (erpStatus === "Completed" || erpStatus === "To Bill") return "delivered";

  // Map based on warehouse pipeline
  if (packingStatus === "Completed" || erpStatus === "To Deliver") return "assigning";
  if (pickingStatus === "Completed" && packingStatus === "In Progress") return "packing";
  if (pickingStatus === "Completed") return "packed"; // Ready for packer
  if (pickingStatus === "In Progress") return "picking";

  return "new";
}

/**
 * Translates an ERPNext Item -> RouteMyOrder Item
 */
export function mapErpNextItemToRmoItem(item) {
  return {
    sku: item.item_code,
    name: item.item_name,
    qty: item.qty || 1,
    picked: item.custom_status === "Prepared" || item.custom_status === "Picked" || !!item.picked,
  };
}

/**
 * Translates one raw ERPNext Sales Order -> RouteMyOrder Order Object
 */
// export function mapErpNextToRmoOrder(raw) {
//   const transactionDate = raw.transaction_date
//     ? new Date(raw.transaction_date).toLocaleString("en-US", {
//         month: "numeric",
//         day: "numeric",
//         year: "numeric",
//         hour: "numeric",
//         minute: "2-digit",
//         hour12: true,
//       })
//     : "5/20/2026 • 08:11 AM";

//   const tags = raw.custom_tags ? raw.custom_tags.split(",").map((t) => t.trim()) : [];
//   return {
//     id: raw.name,
//     customer: raw.customer_name || raw.customer || "Unknown Customer",
//     address:
//       [raw.custom_shipping_address_line1, raw.custom_shipping_city].filter(Boolean).join(", ") ||
//       raw.custom_city ||
//       "Doha, Qatar",
//     phone: raw.contact_phone || "",
//     total: raw.grand_total || 0,
//     status: mapStatus(raw.status, raw.custom_picking_status, raw.custom_packing_status),

//     line_items: raw.line_items || [],
//     items: raw.line_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
//     bags: raw.custom_bags || 0,
//     assignedTo: raw.custom_picker || raw.custom_packer || raw.custom_driver || null,
//     pickedBy: raw.custom_picker || null,
//     pickerName: raw.custom_picker ? raw.custom_picker.split("@")[0] : null,
//     packedBy: raw.custom_packer || null,
//     packerName: raw.custom_packer ? raw.custom_packer.split("@")[0] : null,
//     date: transactionDate.replace(",", " •"),
//     tags,
//     bagVerificationStatus: raw.custom_bag_verification_status || null,
//     zone: raw.custom_zone || "",
//   };
//   // return {
//   //   id: raw.name,
//   //   customer: raw.customer_name || raw.customer || "Unknown Customer",
//   //   address:
//   //     [raw.custom_shipping_address_line1, raw.custom_shipping_city].filter(Boolean).join(", ") ||
//   //     raw.custom_city ||
//   //     "Doha, Qatar",
//   //   phone: raw.contact_phone || "",
//   //   total: raw.grand_total || 0,
//   //   status: mapStatus(raw.status, raw.custom_picking_status, raw.custom_packing_status),
//   //   // items: (raw.items || []).map(mapErpNextItemToRmoItem),
//   //   line_items: raw.line_items || [],
//   //   items: raw.line_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,

//   //   bags: raw.custom_bags || 0,
//   //   assignedTo: raw.custom_picker || raw.custom_packer || raw.custom_driver || null,
//   //   pickedBy: raw.custom_picker || null,
//   //   pickerName: raw.custom_picker ? raw.custom_picker.split("@")[0] : null,
//   //   packedBy: raw.custom_packer || null,
//   //   packerName: raw.custom_packer ? raw.custom_packer.split("@")[0] : null,
//   //   date: transactionDate.replace(",", " •"),
//   //   tags,
//   //   bagVerificationStatus: raw.custom_bag_verification_status || null,
//   //   zone: raw.custom_zone || "",
//   // };
// }
/**
 * Translates one raw ERPNext Sales Order -> RouteMyOrder Order Object
 */
export function mapErpNextToRmoOrder(raw: any) {
  console.log("========================================");
  console.log("RAW ERPNext ORDER");
  console.log(raw);

  console.log("Order ID:", raw.name);
  console.log("raw.line_items:", raw.line_items);
  console.log("raw.items:", raw.items);

  const transactionDate = raw.transaction_date
    ? new Date(raw.transaction_date).toLocaleString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "5/20/2026 • 08:11 AM";

  const tags = raw.custom_tags
    ? raw.custom_tags.split(",").map((t: string) => t.trim())
    : [];

  // Calculate total quantity from Shopify line_items
  const itemCount = Array.isArray(raw.line_items)
    ? raw.line_items.reduce(
        (sum: number, item: any) => sum + (item.quantity ?? item.qty ?? 0),
        0
      )
    : 0;

  const mappedOrder = {
    id: raw.name,

    customer: raw.customer_name || raw.customer || "Unknown Customer",

    address:
      [raw.custom_shipping_address_line1, raw.custom_shipping_city]
        .filter(Boolean)
        .join(", ") ||
      raw.custom_city ||
      "Doha, Qatar",

    phone: raw.contact_phone || "",

    total: raw.grand_total || 0,

    status: mapStatus(
      raw.status,
      raw.custom_picking_status,
      raw.custom_packing_status
    ),

    // Save original Shopify line items
    line_items: raw.line_items || [],

    // Total quantity
    items: itemCount,

    bags: raw.custom_bags || 0,

    assignedTo:
      raw.custom_picker ||
      raw.custom_packer ||
      raw.custom_driver ||
      null,

    pickedBy: raw.custom_picker || null,

    pickerName: raw.custom_picker
      ? raw.custom_picker.split("@")[0]
      : null,

    packedBy: raw.custom_packer || null,

    packerName: raw.custom_packer
      ? raw.custom_packer.split("@")[0]
      : null,

    date: transactionDate.replace(",", " •"),

    tags,

    bagVerificationStatus:
      raw.custom_bag_verification_status || null,

    zone: raw.custom_zone || "",
  };

  console.log("========================================");
  console.log("MAPPED ORDER");
  console.log(mappedOrder);
  console.log("Mapped line_items:", mappedOrder.line_items);
  console.log("Mapped items:", mappedOrder.items);
  console.log("========================================");

  return mappedOrder;
}