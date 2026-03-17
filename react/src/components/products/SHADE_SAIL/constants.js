export const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "",
  due_date: "",
  info: "",
});

export const DEFAULT_ATTRIBUTES = Object.freeze({
  fabricCategory: "",
  fabricType: "",
  foldSides: "",
  exitPoint: "",
  logoPoint: null,
  cableSize: "",
  pointCount: 4,
  points: [
    { height: "", cornerFitting: "", tensionHardware: "", tensionAllowance: "", Structure: "" },
    { height: "", cornerFitting: "", tensionHardware: "", tensionAllowance: "", Structure: "" },
    { height: "", cornerFitting: "", tensionHardware: "", tensionAllowance: "", Structure: "" },
    { height: "", cornerFitting: "", tensionHardware: "", tensionAllowance: "", Structure: "" }
  ],
  connections: [],
  sailTracks: [],
  traceCables: [],
  ufcs: [],
  fabric_id: null,
  fabric_name: "",
  color_id: null,
  color_name: "",
  color_hex: "",
  colour: "",
});

