import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Package,
  Check,
  X,
  Boxes,
  DollarSign,
  Tag,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  type Product,
} from "@/lib/products";
import { getVendorLocations } from "@/lib/vendor-locations";

const WAREHOUSES = [
  { id: "F01", name: "Fulfillment Center Hilal (F01)" },
  { id: "F02", name: "Main Warehouse - Safety Stock (F02)" },
  { id: "MWO", name: "Main Warehouse Outdoor (MWO)" },
];

export function ProductAssignment() {
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const refreshProducts = () => setProducts(getProducts());
  const vendorLocations = useMemo(() => getVendorLocations(), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || p.fulfillmentType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [products, search, typeFilter]);

  const handleDelete = (id: string) => {
    deleteProduct(id);
    refreshProducts();
    setDeleteConfirm(null);
  };

  const getFulfillmentLabel = (p: Product) => {
    if (p.fulfillmentType === "VS") {
      const vl = vendorLocations.find((v) => v.locationId === p.locationId);
      return vl ? `Virtual Stock (${vl.vendorName})` : `Virtual Stock (${p.locationId})`;
    }
    const wh = WAREHOUSES.find((w) => w.id === p.locationId);
    return wh ? wh.name : `Warehouse (${p.locationId})`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Product Fulfillment Mappings</h2>
            <span className="h-6 px-2 rounded-md bg-info/10 text-info text-[10px] font-bold uppercase tracking-wider grid place-items-center">
              {products.length} Products
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Map product SKUs to Warehouses or Virtual Stock Boutiques to control routing of incoming orders automatically.
          </p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setShowAddDialog(true); }}
          className="h-10 px-4 rounded-xl bg-gradient-primary text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Product SKU
        </button>
      </div>

      {/* Table & Search Filters */}
      <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-border">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search by product name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-background transition-colors"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium focus:outline-none focus:border-primary/40"
            >
              <option value="all">All Channels</option>
              <option value="Warehouse">Warehouse Only</option>
              <option value="VS">Virtual Stock Only</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredProducts.length} of {products.length} catalog items
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-semibold px-5 py-3">Product Name</th>
                <th className="text-left font-semibold py-3">SKU</th>
                <th className="text-left font-semibold py-3">Price</th>
                <th className="text-left font-semibold py-3">Fulfillment Channel</th>
                <th className="text-left font-semibold py-3">Assigned Location</th>
                <th className="text-center font-semibold py-3">Stock Level</th>
                <th className="text-right font-semibold px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const isVS = p.fulfillmentType === "VS";
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-info/10 text-info grid place-items-center shrink-0">
                          <Package className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">ID: {p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-xs font-semibold">{p.sku}</td>
                    <td className="py-3 font-mono text-xs text-foreground">QAR {p.price.toFixed(2)}</td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "inline-flex items-center h-5 px-2 rounded text-[10px] font-bold uppercase tracking-wider border",
                          isVS
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        )}
                      >
                        {isVS ? "Virtual Stock (VS)" : "Warehouse"}
                      </span>
                    </td>
                    <td className="py-3 text-xs font-semibold">
                      <div className="flex items-center gap-1.5 text-foreground">
                        {isVS ? <Warehouse className="h-3.5 w-3.5 text-rose-500" /> : <Warehouse className="h-3.5 w-3.5 text-blue-500" />}
                        {getFulfillmentLabel(p)}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center h-6 px-2 rounded-full text-[10px] font-semibold",
                          p.status === "In Stock"
                            ? "bg-success/10 text-success"
                            : p.status === "Low Stock"
                              ? "bg-warning/10 text-warning"
                              : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {p.status} ({p.qty})
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingProduct(p); setShowAddDialog(true); }}
                          className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center text-foreground"
                          title="Edit Mapping"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="h-7 w-7 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 grid place-items-center"
                              title="Confirm delete"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive grid place-items-center transition-colors"
                            title="Delete SKU"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No products matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Dialog */}
      {showAddDialog && (
        <ProductDialog
          product={editingProduct}
          onClose={() => { setShowAddDialog(false); setEditingProduct(null); }}
          onSave={() => { refreshProducts(); setShowAddDialog(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
}

interface ProductDialogProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

function ProductDialog({ product, onClose, onSave }: ProductDialogProps) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    sku: product?.sku || "",
    name: product?.name || "",
    price: product?.price?.toString() || "0",
    qty: product?.qty?.toString() || "0",
    fulfillmentType: product?.fulfillmentType || "Warehouse",
    locationId: product?.locationId || "F01",
    status: product?.status || "In Stock",
  });
  const [error, setError] = useState("");

  const vendorLocations = useMemo(() => getVendorLocations().filter(v => v.status === "Active"), []);

  // Update default location if type toggles
  const handleTypeChange = (type: "Warehouse" | "VS") => {
    const defaultLoc = type === "Warehouse" ? "F01" : (vendorLocations[0]?.locationId || "");
    setForm({
      ...form,
      fulfillmentType: type,
      locationId: defaultLoc,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.sku || !form.name || !form.price || !form.locationId) {
      setError("Please fill in SKU, Name, Price, and Fulfillment Location.");
      return;
    }

    const priceNum = parseFloat(form.price);
    const qtyNum = parseInt(form.qty, 10);
    if (isNaN(priceNum) || priceNum < 0 || isNaN(qtyNum) || qtyNum < 0) {
      setError("Price and Qty must be positive numbers.");
      return;
    }

    if (isEdit && product) {
      updateProduct(product.id, {
        sku: form.sku,
        name: form.name,
        price: priceNum,
        qty: qtyNum,
        fulfillmentType: form.fulfillmentType as "Warehouse" | "VS",
        locationId: form.locationId,
        status: form.status as Product["status"],
      });
    } else {
      addProduct({
        sku: form.sku,
        name: form.name,
        price: priceNum,
        qty: qtyNum,
        fulfillmentType: form.fulfillmentType as "Warehouse" | "VS",
        locationId: form.locationId,
        status: form.status as Product["status"],
      });
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl bg-card border border-border shadow-elevated animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Product Mapping" : "Map New Product SKU"}
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted grid place-items-center">
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                SKU / Identifier *
              </label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="MX-STR-CAM"
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 focus:outline-none focus:border-primary/40 focus:bg-card font-mono text-xs text-foreground"
                required
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Product Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Chicco Next2Me Sleeping Crib"
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 focus:outline-none focus:border-primary/40 focus:bg-card text-foreground"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Price (QAR) *
              </label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 focus:outline-none text-foreground font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Boxes className="h-3 w-3" /> Initial Stock Qty
              </label>
              <input
                type="number"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 focus:outline-none text-foreground font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fulfillment Channel
              </label>
              <select
                value={form.fulfillmentType}
                onChange={(e) => handleTypeChange(e.target.value as "Warehouse" | "VS")}
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 focus:outline-none font-medium text-foreground"
              >
                <option value="Warehouse">Warehouse (In-house)</option>
                <option value="VS">Virtual Stock (Partner boutique)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned Branch / Location *
              </label>
              <select
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 focus:outline-none font-medium text-foreground"
                required
              >
                {form.fulfillmentType === "Warehouse" ? (
                  WAREHOUSES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))
                ) : (
                  vendorLocations.map((v) => (
                    <option key={v.locationId} value={v.locationId}>
                      {v.vendorName} ({v.locationId})
                    </option>
                  ))
                )}
                {form.fulfillmentType === "VS" && vendorLocations.length === 0 && (
                  <option value="">No Active Boutiques</option>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status Flag
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Product["status"] })}
              className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 focus:outline-none font-medium text-foreground"
            >
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-gradient-primary text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-opacity"
            >
              {isEdit ? "Save Product" : "Map Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
