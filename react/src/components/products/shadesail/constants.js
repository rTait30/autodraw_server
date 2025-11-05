export const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "winlloyd",
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
    AB: 1000,
    BC: 1000,
    CD: 1000,
    DA: 1000,
    AC: 1414,
    BD: 1414,
  },
  points: {
    A: { height: 5, cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
    B: { height: 5, cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
    C: { height: 5, cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
    D: { height: 5, cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
  },
  sailTracks: [],
  traceCables: [],
  ufcs: [],
});
