// react/src/config/productRegistry.js
// Auto-discovers product definitions from each product folder's config.js
// so adding a new product only requires creating that folder + a config.js
// with a default export like: { id: 'MY_PRODUCT', name: 'My Product', dbId: 2 }

// Centralized product registry using productsConfig.js
import productsConfig from "./productsConfig";

// Convert productsConfig object to array for PRODUCTS
export const PRODUCTS = Object.values(productsConfig).sort((a, b) => String(a.name).localeCompare(String(b.name)));

// Convenience map by id if needed elsewhere
export const PRODUCT_BY_ID = { ...productsConfig };
