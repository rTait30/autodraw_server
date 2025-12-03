// Centralized product config for all products
// Add new products here as objects in the exported array or object

const productsConfig = {
  COVER: {
    id: "COVER",
    name: "Cover",
    dbId: 1,
    staffOnly: false, // visible to all users
  },
  SHADE_SAIL: {
    id: "SHADE_SAIL",
    name: "Shade Sail",
    dbId: 2,
    staffOnly: false, // visible to all users
  },
  RECTANGLES: {
    id: "RECTANGLES",
    name: "Rectangles",
    dbId: 3,
    staffOnly: true, // only visible to staff
  },
};

export default productsConfig;
