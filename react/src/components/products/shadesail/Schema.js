export const Schema = {

  "Materials": [
    {
      "type": "row",
      "description": "Fabric",
      "quantity": "1",
      "unitCost": "calculated.calculated.fabricPrice"
    },
    {
      "type": "row",
      "description": "4mm Cable",
      "quantity": "attributes.cableSize === 4 ? calculated.calculated.edgeMeterCeilMeters : 0",
      "unitCost": "3"
    },
    {
      "type": "row",
      "description": "5mm Cable",
      "quantity": "attributes.cableSize === 5 ? calculated.calculated.edgeMeterCeilMeters : 0",
      "unitCost": "4.5"
    },
    {
      "type": "row",
      "description": "6mm Cable",
      "quantity": "attributes.cableSize === 6 ? calculated.calculated.edgeMeterCeilMeters : 0",
      "unitCost": "5.5"
    },
    {
      "type": "sku",
      "sku": "PRO001",
      "quantity": "attributes.pointCount"
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