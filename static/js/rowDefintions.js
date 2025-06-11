export const rowDefinitions = {
  materials: [
    {
      description: "Fabric",
      quantityFormula: (v) => v.nestWidth,
      unitCost: 12.5,
    },
    {
      description: "Thread",
      quantityFormula: (v) =>
        (v.totalSeamLength + v.height * 2 + v.length * 2 + v.width * 2) * 2.5,
      unitCost: 3.0,
    }
  ],
  labour: [
    {
      description: "Cutting",
      quantityFormula: () => 1,
      unitCost: 20
    },
    {
      description: "Sewing",
      quantityFormula: () => 2,
      unitCost: 15
    }
  ]
};