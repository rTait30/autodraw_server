// react/src/config/productRegistry.js
// Auto-discovers product definitions from each product folder's config.js
// so adding a new product only requires creating that folder + a config.js
// with a default export like: { id: 'MY_PRODUCT', name: 'My Product', dbId: 2 }

// Vite-specific: import all product config modules eagerly at build time
const modules = import.meta.glob("../components/products/*/config.js", { eager: true });

function titleCaseFromId(id) {
  try {
    return String(id)
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return String(id || "");
  }
}

function deriveIdFromPath(path) {
  // path like: '../components/products/SHADE_SAIL/config.js'
  const marker = "/products/";
  const idx = path.lastIndexOf(marker);
  if (idx === -1) return null;
  const after = path.slice(idx + marker.length);
  return after.split("/")[0] || null;
}

export const PRODUCTS = Object.entries(modules)
  .map(([path, mod]) => {
    const meta = (mod && (mod.default || mod.config || mod)) || {};
    const derivedId = deriveIdFromPath(path);
    const id = meta.id || derivedId;
    const name = meta.name || titleCaseFromId(id);
    const dbId = meta.dbId ?? null;
    return { id, name, dbId, ...meta };
  })
  // Filter out any malformed entries (missing id)
  .filter((p) => p && p.id)
  // Optional: stable sort by name
  .sort((a, b) => String(a.name).localeCompare(String(b.name)));

// Convenience map by id if needed elsewhere
export const PRODUCT_BY_ID = PRODUCTS.reduce((acc, p) => {
  acc[p.id] = p;
  return acc;
}, {});
