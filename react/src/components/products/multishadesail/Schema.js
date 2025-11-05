export const Schema = {
  "Materials": [
    {
      "type": "row",
      "description": "Membrane",
      "quantity": "1",
      "unitCost": "calculated.fabricPrice"
    },
    {
      "type": "row",
      "description": "4mm Cable",
      "quantity": "attributes.cableSize === 4 ? calculated.edgeMeterCeilMeters - calculated.totalSailLengthCeilMeters : 0",
      "unitCost": "3"
    },
    {
      "type": "row",
      "description": "5mm Cable",
      "quantity": "attributes.cableSize === 5 ? calculated.edgeMeterCeilMeters - calculated.totalSailLengthCeilMeters : 0",
      "unitCost": "4.5"
    },
    {
      "type": "row",
      "description": "6mm Cable",
      "quantity": "attributes.cableSize === 6 ? calculated.edgeMeterCeilMeters - calculated.totalSailLengthCeilMeters : 0",
      "unitCost": "5.5"
    },
    {
      "type": "row",
      "description": "8mm Cable",
      "quantity": "attributes.cableSize === 8 ? calculated.edgeMeterCeilMeters - calculated.totalSailLengthCeilMeters : 0",
      "unitCost": "9.5"
    },
    {
      "type": "row",
      "description": "Sailtrack Corner",
      "quantity": "calculated.fittingCounts['Sailtrack Corner'] || 0",
      "unitCost": "28"
    },
    {
      "type": "row",
      "description": "Pro-Rig or Ezy Slide",
      "quantity": "(calculated.fittingCounts['Pro-Rig'] || 0) + (calculated.fittingCounts['Ezy Slide'] || 0)",
      "unitCost": "36"
    },
    {
      "type": "row",
      "description": "Pro-Rig with Small Pipe",
      "quantity": "(calculated.fittingCounts['Pro-Rig with Small Pipe'] || 0)",
      "unitCost": "50"
    },
    {
      "type": "row",
      "description": "Keder/Rope Edge/Spline per lm",
      "quantity": "calculated.totalSailLengthCeilMeters || 0",
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
