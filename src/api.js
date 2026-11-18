/* Talks to the Bolika server (Bolika_server repo) — the same API the mobile app and the website use.
   .env.local:  VITE_API_URL=http://localhost:3340   (the live server's address on Vercel) */

export const API = (import.meta.env.VITE_API_URL || "http://localhost:3340").replace(/\/$/, "");
export const configured = !!API;

const KEY = "bolika-admin-token";
const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch { /* private mode */ } },
};
let onSignedOut = () => {};
export const whenSignedOut = (fn) => (onSignedOut = fn);
export const signedIn = () => !!store.get();

/** Call the server: api("/admin/orders"), api("/admin/products", { method: "POST", body }). Throws with the server's message. */
export async function api(path, { method = "GET", body, form } = {}) {
  const token = store.get();
  let res;
  try {
    res = await fetch(`${API}/api${path}`, {
      method,
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form ?? (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new Error("Can't reach the Bolika server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    store.set(null);
    onSignedOut();
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function login(email, password) {
  const r = await api("/auth/staff", { method: "POST", body: { email, password } });
  store.set(r.token);
  return r.user;
}
export function logout() {
  store.set(null);
  onSignedOut();
}

/** Product photos: paths on the server ("/media/…") or full URLs. */
export const img = (src) => (!src ? "" : /^https?:/.test(src) ? src : `${API}${src}`);

export async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  return (await api("/admin/uploads", { method: "POST", form })).url;
}

/** The catalogue for the Products, Gift sets and Discounts pages, in the field names those pages use. */
export async function loadCatalog() {
  const c = await api("/admin/catalog");
  const prods = c.products.map((p) => ({
    id: p.id, category_id: p.categoryId, name: p.name, name_ar: p.nameAr, subtitle: p.subtitle, subtitle_ar: p.subtitleAr,
    size: p.size, brand: p.brand, sku: p.sku, image: p.image, price: p.price, stock: p.stock, low_stock: p.lowStock,
    description: p.description, description_ar: p.descriptionAr, bestseller: p.bestseller, active: p.active, discount_percent: p.discountPercent,
  }));
  const vars = c.products.flatMap((p) => p.variants.map((v) => ({
    id: v.id, product_id: p.id, kind: v.kind, label: v.label, label_ar: v.labelAr, color: v.color, price: v.price, stock: v.stock, sku: v.sku,
  })));
  const bundles = c.bundles.map((b) => ({
    id: b.id, name: b.name, name_ar: b.nameAr, description: b.description, description_ar: b.descriptionAr, image: b.image,
    price: b.price, stock: b.stock, active: b.active, discount_percent: b.discountPercent,
  }));
  const items = c.bundles.flatMap((b) => b.items.map((i) => ({ bundle_id: b.id, product_id: i.productId, variant_id: i.variantId, qty: i.qty })));
  const cats = c.categories.map((x) => ({ id: x.id, label: x.label, label_ar: x.labelAr }));
  return { cats, prods, vars, bundles, items };
}
