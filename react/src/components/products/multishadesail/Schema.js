export const Schema = {
  "Sail 1": [
    {
      "type": "row",
      "description": "Membrane",
      "quantity": "1",
      "unitCost": "calculated.sailCalcs[0].fabricPrice || 0"
    },
    {
      "type": "row",
      "description": "4mm Cable",
      "quantity": "attributes.sails[0].cableSize === 4 ? calculated.sailCalcs[0].edgeMeterCeilMeters - (calculated.totalSailLengthCeilMeters || 0) : 0",
      "unitCost": "3"
    },
    {
      "type": "row",
      "description": "5mm Cable",
      "quantity": "attributes.sails[0].cableSize === 5 ? calculated.sailCalcs[0].edgeMeterCeilMeters - (calculated.totalSailLengthCeilMeters || 0) : 0",
      "unitCost": "4.5"
    },
    {
      "type": "row",
      "description": "6mm Cable",
      "quantity": "attributes.sails[0].cableSize === 6 ? calculated.sailCalcs[0].edgeMeterCeilMeters - (calculated.totalSailLengthCeilMeters || 0) : 0",
      "unitCost": "5.5"
    },
    {
      "type": "row",
      "description": "8mm Cable",
      "quantity": "attributes.sails[0].cableSize === 8 ? calculated.sailCalcs[0].edgeMeterCeilMeters - (calculated.totalSailLengthCeilMeters || 0) : 0",
      "unitCost": "9.5"
    },
    {
      "type": "row",
      "description": "Sailtrack Corner",
      "quantity": "calculated.sailCalcs[0].fittingCounts['Sailtrack Corner'] || 0",
      "unitCost": "28"
    },
    {
      "type": "row",
      "description": "Pro-Rig or Ezy Slide",
      "quantity": "(calculated.sailCalcs[0].fittingCounts['Pro-Rig'] || 0) + (calculated.sailCalcs[0].fittingCounts['Ezy Slide'] || 0)",
      "unitCost": "36"
    },
    {
      "type": "row",
      "description": "Pro-Rig with Small Pipe",
      "quantity": "(calculated.sailCalcs[0].fittingCounts['Pro-Rig with Small Pipe'] || 0)",
      "unitCost": "50"
    },
    {
      "type": "row",
      "description": "Keder/Rope Edge/Spline per lm",
      "quantity": "calculated.sailCalcs[0].totalSailLengthCeilMeters || 0",
      "unitCost": "10"
    }
  ],
   
  
  "Sail 2": [
    {
      "type": "row",
      "description": "Membrane",
      "quantity": "1",
      "unitCost": "calculated.sailCalcs[1].fabricPrice || 0"
    },
    {
      "type": "row",
      "description": "4mm Cable",
      "quantity": "attributes.sails[1].cableSize === 4 ? calculated.sailCalcs[1].edgeMeterCeilMeters - (calculated.totalSailLengthCeilMeters || 0) : 0",
      "unitCost": "3"
    }
  ],
  
  "Sail 3": [
    {
      "type": "row",
      "description": "Membrane",
      "quantity": "1",
      "unitCost": "calculated.sailCalcs[2].fabricPrice || 0"
    },
    {
      "type": "row",
      "description": "4mm Cable",
      "quantity": "attributes.sails[2].cableSize === 4 ? calculated.sailCalcs[2].edgeMeterCeilMeters - (calculated.totalSailLengthCeilMeters || 0) : 0",
      "unitCost": "3"
    }
  ],
  "Summary": [
    {
      "type": "calc",
      "key": "totalCostFabrication",
      "label": "Total Cost Fabrication",
      "expr": "context.baseCost"
    }
  ]
}
