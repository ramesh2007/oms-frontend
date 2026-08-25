/* 
  Mock & Real API Gateway for RouteMyOrder Order Data
*/

import { isDemoMode } from "./config";
import { erpNextClient } from "./client";
import { mapErpNextToRmoOrder } from "./mappers";
import {
  getSharedOrdersForRmo,
  updateSharedOrderFromRmo,
  broadcastChange,
  rmoToAdminStatus,
  onSyncChange,
} from "./sync";

let mockOrders = [
  {
    id: 'HM59238',
    customer: 'test test',
    address: 'Doha',
    phone: '77532802',
    total: 10,
    status: 'failed',
    items: [],
    bags: 0,
    assignedTo: 'driver1',
    date: '4/16/2026 • 06:34 PM',
    lat: 25.2854,
    lng: 51.5310
  },
  {
    id: 'HM59239',
    customer: 'Sara Alsooj',
    address: 'Zone 50',
    phone: '55339494',
    total: 178,
    status: 'delivered',
    items: [
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 2, picked: true }
    ],
    bags: 1,
    assignedTo: 'driver@rmo.qa',
    date: '4/16/2026 • 06:35 PM',
    lat: 25.2279,
    lng: 51.4941
  },
  {
    id: 'HM59245',
    customer: 'Fatima Al-Thani',
    address: 'West Bay',
    phone: '33442211',
    total: 1429,
    status: 'new',
    items: [
      { sku: 'NS-SPNC-1P-0200', name: 'Frida Baby Saline Spray', qty: 3, picked: false }
    ],
    bags: 0,
    assignedTo: null,
    date: '5/13/2026 • 11:00 AM',
    tags: ["PAYLATER", "PAYMENTLINKSENT"],
    lat: 25.3286,
    lng: 51.5310
  },
  {
    id: 'HM64110',
    customer: 'Dana Al-Thani',
    address: 'West Bay, Doha',
    phone: '55223344',
    total: 5198,
    status: 'new',
    items: [
      { id: "vl-item-1", sku: "MX-STR-CAM", name: "Mima Xari Stroller (Camel)", qty: 1, picked: false, itemType: "VL_HMA", locationId: "loc-1" },
      { id: "vl-item-2", sku: "ST-TTHC-OAK", name: "Stokke Tripp Trapp High Chair (Oak)", qty: 1, picked: false, itemType: "VL_HMA", locationId: "loc-1" }
    ],
    bags: 0,
    assignedTo: null,
    date: '5/27/2026 • 10:15 AM',
    lat: 25.3286,
    lng: 51.5310
  },
  {
    id: 'HM64112',
    customer: 'Zoe Henderson',
    address: 'The Pearl, Porto Arabia',
    phone: '33445566',
    total: 740,
    status: 'picking',
    items: [
      { sku: '5021933', name: 'SmarTrike STR3 6-in-1', qty: 1, picked: true },
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 2, picked: true },
      { sku: 'NS-SPNC-1P-0200', name: 'Frida Baby Saline Spray', qty: 1, picked: false }
    ],
    bags: 0,
    assignedTo: 'picker@rmo.qa',
    date: '5/27/2026 • 09:45 AM',
    lat: 25.3713,
    lng: 51.5476
  },
  {
    id: 'HM64116',
    customer: 'Liam Gallagher',
    address: 'Lusail, Marina Drive',
    phone: '55009988',
    total: 320,
    status: 'packed',
    items: [
      { sku: 'NS-SPNC-1P-0200', name: 'Frida Baby Saline Spray', qty: 3, picked: true }
    ],
    bags: 0,
    assignedTo: null,
    date: '5/27/2026 • 09:12 AM',
    lat: 25.4182,
    lng: 51.5218
  },
  {
    id: 'HM64118',
    customer: 'Amira Haddad',
    address: 'Doha Jadeed, St 45',
    phone: '66778899',
    total: 1250,
    status: 'packing',
    items: [
      { sku: '5021933', name: 'SmarTrike STR3 6-in-1', qty: 1, picked: true },
      { sku: 'NS-SPNC-1P-0200', name: 'Frida Baby Saline Spray', qty: 3, picked: true },
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 1, picked: true }
    ],
    bags: 1,
    assignedTo: 'packer@rmo.qa',
    date: '5/27/2026 • 08:40 AM',
    lat: 25.2764,
    lng: 51.5385
  },
  {
    id: 'HM60104',
    customer: 'Hessa Al-Jaber',
    address: 'Building 12, Street 45',
    zone: 'West Bay',
    phone: '55330012',
    total: 760,
    status: 'assigned',
    items: [
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 4, picked: true }
    ],
    bags: 2,
    assignedTo: 'driver@rmo.qa',
    date: '5/13/2026 • 12:41 PM',
    tags: ["TRU"],
    lat: 25.4182,
    lng: 51.5218
  },
  {
    id: 'HM60105',
    customer: 'Rashed Nasser',
    address: 'Al Luqta St',
    zone: 'Education City',
    phone: '55881234',
    total: 925,
    status: 'started',
    items: [
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 5, picked: true }
    ],
    bags: 3,
    assignedTo: 'driver@rmo.qa',
    date: '5/13/2026 • 01:12 PM',
    lat: 25.3183,
    lng: 51.4358
  },
  {
    id: 'HM60106',
    customer: 'Dana Ibrahim',
    address: 'Al Shafi St',
    zone: 'Al Rayyan',
    phone: '55773391',
    total: 145,
    status: 'failed',
    items: [
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 1, picked: true }
    ],
    bags: 1,
    assignedTo: 'driver@rmo.qa',
    date: '5/13/2026 • 01:48 PM',
    lat: 25.2917,
    lng: 51.4244
  },
  {
    id: 'HM60107',
    customer: 'Lina Qassim',
    address: 'Commercial St',
    zone: 'Muaither',
    phone: '55990031',
    total: 230,
    status: 'assigned',
    items: [
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 2, picked: true }
    ],
    bags: 1,
    assignedTo: 'driver@rmo.qa',
    date: '5/13/2026 • 02:26 PM',
    lat: 25.2682,
    lng: 51.4069
  },
  {
    id: 'HM60108',
    customer: 'Othman Kareem',
    address: 'Matar Qadeem St',
    zone: 'Old Airport',
    phone: '55447766',
    total: 388,
    status: 'assigned',
    items: [
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 3, picked: true }
    ],
    bags: 1,
    assignedTo: 'driver@rmo.qa',
    date: '5/13/2026 • 03:04 PM',
    lat: 25.2494,
    lng: 51.5492
  },
  {
    id: 'HM63850',
    customer: 'Noora Almannai',
    address: 'Doha',
    phone: '+97466111881',
    total: 1749,
    status: 'delivered',
    items: [
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 1, picked: true }
    ],
    bags: 1,
    assignedTo: 'driver@rmo.qa',
    date: '5/20/2026 • 02:53 AM',
    lat: 25.2854,
    lng: 51.5310
  },
  {
    id: 'HM68229',
    customer: 'Sara Al Sulaiti',
    address: 'Doha',
    phone: '55112233',
    total: 4696,
    status: 'new',
    items: [
      { sku: '9060', name: 'Happy Hop 6-in-1 Play Center', qty: 1, picked: false, fc: 'F01' },
      { sku: '561KC', name: 'Bestway Apx 365 Round Pool Set (12\' x 30")', qty: 1, picked: false, fc: 'MWO' },
      { sku: '820304', name: 'Smoby Green XL Slide', qty: 1, picked: false, fc: 'VS' },
      { sku: '9029', name: 'Happy Hop Double Water Slide – Deluxe', qty: 1, picked: false, fc: 'F01' }
    ],
    bags: 0,
    assignedTo: null,
    date: '5/25/2026 • 02:10 PM',
    lat: 25.2854,
    lng: 51.5310
  },
  {
    id: 'HM68258',
    customer: 'Mouza Al Derham',
    address: 'Doha',
    phone: '55667788',
    total: 1448,
    status: 'new',
    items: [
      { sku: '53427', name: 'Bestway H2Ogo! Leap & Play Mega Water Park', qty: 1, picked: false, fc: 'F01' },
      { sku: '58034', name: 'Bestway Flowclear Pool Cover (12ft)', qty: 1, picked: false, fc: 'VS' }
    ],
    bags: 0,
    assignedTo: null,
    date: '5/25/2026 • 04:20 PM',
    lat: 25.2854,
    lng: 51.5310
  },
  {
    id: 'HM68268',
    customer: 'aisha alnaemi',
    address: 'Doha',
    phone: '55990011',
    total: 899,
    status: 'new',
    items: [
      { sku: '26790', name: 'Intex Prism Frame Rectangular Pool Set', qty: 1, picked: false, fc: 'MWO' }
    ],
    bags: 0,
    assignedTo: null,
    date: '5/26/2026 • 09:30 AM',
    lat: 25.2854,
    lng: 51.5310
  },
  {
    id: 'HM64839',
    customer: 'test test',
    address: 'Doha',
    phone: '77532802',
    total: 25,
    status: 'assigned',
    items: [
      { sku: '412217', name: 'Nip Soother With Hook (Blue)', qty: 1, picked: true, fc: 'F01' }
    ],
    bags: 1,
    assignedTo: 'driver1',
    date: '5/15/2026 • 11:15 AM',
    lat: 25.2854,
    lng: 51.5310
  },
  {
    id: 'HM99001',
    customer: 'Salem Al-Marri',
    address: 'Doha',
    phone: '33224455',
    total: 2198,
    status: 'new',
    items: [
      { id: "vl-item-3", sku: "CC-N2M-CRIB", name: "Chicco Next2Me Side Sleeping Crib", qty: 1, picked: false, itemType: "VL_HMA", locationId: "loc-1" },
      { id: "vl-item-4", sku: "NL-GROW-LNG", name: "Nuna Leaf Grow Lounger", qty: 1, picked: false, itemType: "VL_HMA", locationId: "loc-1" }
    ],
    bags: 0,
    assignedTo: null,
    date: '6/16/2026 • 02:00 PM',
    lat: 25.2854,
    lng: 51.5310
  },
  {
    id: 'HM99003',
    customer: 'Mohammed Al-Sada',
    address: 'Lusail',
    phone: '66554433',
    total: 320,
    status: 'assigning',
    items: [
      { sku: 'NS-SPNC-1P-0200', name: 'Frida Baby Saline Spray', qty: 1, picked: true, fc: 'F01' },
      { sku: 'HM-1100', name: 'Wet Wipes 3-Pack', qty: 1, picked: true, fc: 'F01' }
    ],
    bags: 1,
    assignedTo: null,
    date: '6/16/2026 • 11:20 AM',
    lat: 25.4182,
    lng: 51.5218
  }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const cleanOrderId = (id) => String(id || "").replace(/^#/, "");

// ─── Operational API Gateway ─────────────────────────────────────────────
function isUnpaidPayLaterOrder(order) {
  const tags = order.tags || [];
  const hasTag = tags.some(t => t.toUpperCase() === "PAYLATER");
  if (!hasTag) return false;
  const balance = order.payment?.balance;
  if (balance !== undefined) {
    return balance > 0;
  }
  return true;
}

/**
 * Subscribe to cross-app sync events.
 * Call this in your React component/context to auto-refetch when admin makes changes.
 * Returns an unsubscribe function.
 */
export const subscribeToSync = (callback) => {
  if (!isDemoMode()) return () => { };
  return onSyncChange(callback);
};

export const fetchOrders = async (role, email) => {
  if (isDemoMode()) {
    await delay(300);

    // Try to read from shared admin store first
    const sharedOrders = getSharedOrdersForRmo();
    const ordersToUse = sharedOrders || mockOrders;

    // Merge: use shared orders for status/assignment info, but keep local item details
    const mergedOrders = ordersToUse.map(sharedOrder => {
      let localOrder = mockOrders.find(o => o.id === sharedOrder.id);
      if (!localOrder) {
        // Dynamically add to mockOrders so updates to items/status work in this session
        localOrder = { ...sharedOrder };
        mockOrders.push(localOrder);
      } else {
        // Update local order status from shared store
        localOrder.status = sharedOrder.status;
        localOrder.assignedTo = sharedOrder.assignedTo;
        localOrder.bags = sharedOrder.bags || localOrder.bags;
        localOrder.bagVerificationStatus = sharedOrder.bagVerificationStatus || localOrder.bagVerificationStatus;
        localOrder.pickedBy = sharedOrder.pickedBy;
        localOrder.pickerName = sharedOrder.pickerName;
        localOrder.packedBy = sharedOrder.packedBy;
        localOrder.packerName = sharedOrder.packerName;
        localOrder.driverEmail = sharedOrder.driverEmail;
        localOrder.tags = sharedOrder.tags || localOrder.tags;
        localOrder.payment = sharedOrder.payment || localOrder.payment;
      }
      return localOrder;
    });

    // Exclude unpaid PayLater orders from fulfillment queues
    const activeMergedOrders = mergedOrders.filter(o => !isUnpaidPayLaterOrder(o));

    if (role === 'picker') {
      return activeMergedOrders
        .map(o => {
          const hilalItems = o.items.filter(item => !item.fc || item.fc === 'F01');
          if (hilalItems.length === 0) return null;
          return { ...o, items: hilalItems };
        })
        .filter(Boolean);
    }
    if (role === 'packer') {
      return activeMergedOrders.filter(o => ['packed', 'packing', 'assigning', 'assigned', 'delivered', 'failed'].includes(o.status));
    }
    if (role === 'driver') {
      const driverOrders = activeMergedOrders.filter(o => o.assignedTo === email && ['packed', 'assigned', 'started', 'delivered', 'failed'].includes(o.status));
      const now = new Date();
      driverOrders.forEach((o, index) => {
        if (o.date && o.date.includes('2026')) {
          const hoursAgo = index === 0 ? 1.2 : index === 1 ? 2.5 : index === 2 ? 3.8 : index === 3 ? 4.5 : 1 + index;
          const targetTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
          o.date = targetTime.toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }).replace(',', ' •');
        }
      });
      return driverOrders;
    }
    return [];
  }

  // Real ERPNext API request
  const response = await erpNextClient.get("/api/resource/Sales Order", {
    fields: JSON.stringify([
      "name", "customer", "customer_name", "contact_phone", "transaction_date",
      "grand_total", "status", "custom_city", "custom_shipping_address_line1",
      "custom_shipping_city", "custom_picker", "custom_packer", "custom_driver",
      "custom_bags", "custom_picking_status", "custom_packing_status", "items",
      "custom_tags", "custom_bag_verification_status", "custom_zone"
    ]),
    limit_page_length: "500",
    order_by: "creation desc"
  });

  const orders = response.data.map(mapErpNextToRmoOrder);
  
  // Exclude unpaid PayLater orders from RMO (Delivery Management System)
  const activeOrders = orders.filter(o => !isUnpaidPayLaterOrder(o));

  if (role === 'picker') {
    return activeOrders
      .map(o => {
        const hilalItems = o.items.filter(item => !item.fc || item.fc === 'F01');
        if (hilalItems.length === 0) return null;
        return { ...o, items: hilalItems };
      })
      .filter(Boolean);
  }
  if (role === 'packer') {
    return activeOrders.filter(o => ['packed', 'packing', 'assigning', 'assigned', 'delivered', 'failed'].includes(o.status));
  }
  if (role === 'driver') {
    return activeOrders.filter(o => o.assignedTo === email && ['packed', 'assigned', 'started', 'delivered', 'failed'].includes(o.status));
  }
  return [];
};

export const assignOrder = async (orderId, email, role) => {
  if (isDemoMode()) {
    await delay(300);
    const o = mockOrders.find(o => o.id === orderId);
    if (o) {
      o.assignedTo = email;
      if (role === 'picker') {
        o.status = 'picking';
      }
      if (role === 'packer') {
        o.status = 'packing';
      }
    }

    // Sync back to admin dashboard
    updateSharedOrderFromRmo(orderId, (adminOrder) => {
      if (role === 'picker') {
        adminOrder.picker = email;
        adminOrder.status = 'Picking';
      }
      if (role === 'packer') {
        adminOrder.packer = email;
        adminOrder.status = 'Packing';
      }
    });
    broadcastChange();

    return o;
  }

  // Real ERPNext Assignment
  const body = {};
  if (role === 'picker') {
    body.custom_picker = email;
    body.custom_picking_status = "In Progress";
  }
  if (role === 'packer') {
    body.custom_packer = email;
    body.custom_packing_status = "In Progress";
  }

  const cleanId = cleanOrderId(orderId);
  const response = await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, body);
  return mapErpNextToRmoOrder(response.data);
};

export const updateItemPickStatus = async (orderId, sku, picked) => {
  if (isDemoMode()) {
    await delay(200);
    const o = mockOrders.find(o => o.id === orderId);
    if (o) {
      const item = o.items.find(i => i.sku === sku);
      if (item) item.picked = picked;
    }
    return o;
  }

  // Real ERPNext single item status update (updating custom_status on Sales Order Item DocType)
  // Your ERPNext dev might map this differently, this is fully configurable
  await erpNextClient.put(`/api/resource/Sales Order Item/${sku}`, {
    custom_status: picked ? "Picked" : "Pending"
  });
  return true;
};

export const completePicking = async (orderId, pickerEmail, pickerName) => {
  if (isDemoMode()) {
    await delay(400);
    const o = mockOrders.find(o => o.id === orderId);
    if (o) {
      o.status = 'packed';
      o.assignedTo = null;
      o.pickedBy = pickerEmail || 'picker@rmo.qa';
      o.pickerName = pickerName || 'Ahmed Khalil';
    }

    // Sync back to admin dashboard
    updateSharedOrderFromRmo(orderId, (adminOrder) => {
      adminOrder.status = 'Picked';
      adminOrder.picker = pickerName || pickerEmail;

      // Update local F01 item statuses to Prepared
      if (adminOrder.itemsList) {
        adminOrder.itemsList.forEach(item => {
          if (!item.fc || item.fc === 'F01') {
            item.status = 'Prepared';
          }
        });
        const pickedCount = adminOrder.itemsList.filter(item => item.status === 'Prepared').length;
        adminOrder.pickingStatus = `${pickedCount}/${adminOrder.itemsList.length} Picked`;
      } else {
        adminOrder.pickingStatus = `${adminOrder.items}/${adminOrder.items} Picked`;
      }
    });
    broadcastChange();

    return o;
  }

  const cleanId = cleanOrderId(orderId);
  const response = await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    status: "Packed",
    custom_picking_status: "Completed",
    custom_picker: pickerEmail
  });
  return mapErpNextToRmoOrder(response.data);
};

export const completePacking = async (orderId, bags, packerEmail, packerName) => {
  if (isDemoMode()) {
    await delay(400);
    const o = mockOrders.find(o => o.id === orderId);
    if (o) {
      o.bags = bags;
      o.status = 'assigning';
      o.assignedTo = null;
      o.packedBy = packerEmail || 'packer@rmo.qa';
      o.packerName = packerName || 'Packer';
    }

    // Sync back to admin dashboard
    updateSharedOrderFromRmo(orderId, (adminOrder) => {
      adminOrder.status = 'Ready to Assign';
      adminOrder.bags = bags;
      adminOrder.packer = packerName || packerEmail;

      if (adminOrder.itemsList) {
        const packedCount = adminOrder.itemsList.filter(item => item.status === 'Prepared' || !item.fc || item.fc === 'F01').length;
        adminOrder.packingStatus = `${packedCount}/${adminOrder.itemsList.length} Packed`;
      } else {
        adminOrder.packingStatus = `${adminOrder.items}/${adminOrder.items} Packed`;
      }
    });
    broadcastChange();

    return o;
  }

  const cleanId = cleanOrderId(orderId);
  const response = await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    custom_bags: bags,
    custom_packing_status: "Completed",
    status: "Ready to Assign",
    custom_packer: packerEmail
  });
  return mapErpNextToRmoOrder(response.data);
};

export const flagOrderIssue = async (orderId, note) => {
  if (isDemoMode()) {
    await delay(300);
    console.log(`[API] Order ${orderId} flagged: ${note}`);
    return true;
  }

  const cleanId = cleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    status: "Flagged",
    custom_failure_reason: note
  });
  return true;
};

export const startDelivery = async (orderId) => {
  if (isDemoMode()) {
    await delay(300);
    const o = mockOrders.find(o => o.id === orderId);
    if (o) o.status = 'started';

    // Sync back to admin dashboard
    updateSharedOrderFromRmo(orderId, (adminOrder) => {
      adminOrder.status = 'Started';
      adminOrder.driverStatus = 'Started';
    });
    broadcastChange();

    return true;
  }

  const cleanId = cleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    status: "Started",
    custom_driver_status: "Started"
  });
  return true;
};

export const markDelivered = async (orderId, paymentMethod) => {
  if (isDemoMode()) {
    await delay(600);
    const o = mockOrders.find(o => o.id === orderId);
    if (o) o.status = 'delivered';

    // Sync back to admin dashboard
    updateSharedOrderFromRmo(orderId, (adminOrder) => {
      adminOrder.status = 'Delivered';
      adminOrder.driverStatus = 'Completed';
    });
    broadcastChange();

    return true;
  }

  const cleanId = cleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    status: "Completed",
    delivery_status: "Delivered",
    payment_method: paymentMethod
  });
  return true;
};

export const markFailed = async (orderId, reason) => {
  if (isDemoMode()) {
    await delay(600);
    const o = mockOrders.find(o => o.id === orderId);
    if (o) o.status = 'failed';

    // Sync back to admin dashboard
    updateSharedOrderFromRmo(orderId, (adminOrder) => {
      adminOrder.status = 'Delivery Failed';
      adminOrder.driverStatus = 'Failed';
    });
    broadcastChange();

    return true;
  }

  const cleanId = cleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    status: "Delivery Failed",
    custom_failure_reason: reason
  });
  return true;
};

export const markReturnCollected = async (orderId, returnId, driverEmail, note = '') => {
  if (isDemoMode()) {
    await delay(400);

    // Sync back to admin dashboard
    updateSharedOrderFromRmo(orderId, (adminOrder) => {
      if (!adminOrder.returnItems) return;
      const ret = adminOrder.returnItems.find(r => r.id === returnId);
      if (ret) {
        ret.status = 'picked up';
        ret.collectedAt = new Date().toISOString();
        ret.collectedBy = driverEmail || '';
        if (note) ret.driverNote = note;
      }
    });
    broadcastChange();

    return true;
  }

  const cleanId = cleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    custom_return_id: returnId,
    custom_return_status: 'picked up',
    custom_return_driver_note: note,
  });
  return true;
};

export const verifyOrderBags = async (orderId) => {
  if (isDemoMode()) {
    await delay(300);
    const o = mockOrders.find(o => o.id === orderId);
    if (o) o.bagVerificationStatus = 'verified';

    // Sync back to admin dashboard
    updateSharedOrderFromRmo(orderId, (adminOrder) => {
      adminOrder.bagVerificationStatus = 'verified';
    });
    broadcastChange();

    return true;
  }

  const cleanId = cleanOrderId(orderId);
  await erpNextClient.put(`/api/resource/Sales Order/${cleanId}`, {
    custom_bag_verification_status: "verified"
  });
  return true;
};
