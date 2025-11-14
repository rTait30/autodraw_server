export const Schema = {
  "Materials": [
    {
      "type": "row",
      "description": "Membrane",
      "quantity": "1",
      "unitCost": "fabricPrice"
    },
    {
      "type": "row",
      "description": "4mm Cable",
      "quantity": "cableSize === 4 ? (edgeMeter || 0) : 0",
      "unitCost": "3"
    },
    {
      "type": "row",
      "description": "5mm Cable",
      "quantity": "cableSize === 5 ? (edgeMeter || 0) : 0",
      "unitCost": "4.5"
    },
    {
      "type": "row",
      "description": "6mm Cable",
      "quantity": "cableSize === 6 ? Math.max((edgeMeter || 0) - (totalSailLengthCeilMeters || 0), 0) : 0",
      "unitCost": "5.5"
    },
    {
      "type": "row",
      "description": "8mm Cable",
      "quantity": "cableSize === 8 ? Math.max((edgeMeter || 0) - (totalSailLengthCeilMeters || 0), 0) : 0",
      "unitCost": "9.5"
    },
    {
      "type": "row",
      "description": "Sailtrack Corner",
      "quantity": "fittingCounts['Sailtrack Corner'] || 0",
      "unitCost": "28"
    },
    {
      "type": "row",
      "description": "Pro-Rig or Ezy Slide",
      "quantity": "(fittingCounts['Pro-Rig'] || 0) + (fittingCounts['Ezy Slide'] || 0)",
      "unitCost": "36"
    },
    {
      "type": "row",
      "description": "Pro-Rig with Small Pipe",
      "quantity": "(fittingCounts['Pro-Rig with Small Pipe'] || 0)",
      "unitCost": "50"
    },
    {
      "type": "row",
      "description": "Keder/Rope Edge/Spline per lm",
      "quantity": "totalSailLengthCeilMeters || 0",
      "unitCost": "10"
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
