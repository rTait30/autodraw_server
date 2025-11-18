export const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "",
  due_date: "",
  info: "",
});

export const DEFAULT_ATTRIBUTES = Object.freeze({
  fabricCategory: "ShadeCloth",
  fabricType: "Rainbow Z16",
  foldSide: "Underside",
  exitPoint: "A",
  logoPoint: "",
  cableSize: 4,
  pointCount: 4,
  dimensions: {
    AB: "",
    BC: "",
    CD: "",
    DA: "",
    AC: "",
    BD: "",
  },
  points: {
    A: { height: "", cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
    B: { height: "", cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
    C: { height: "", cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
    D: { height: "", cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
  },
  sailTracks: [],
  traceCables: [],
  ufcs: [],
});
