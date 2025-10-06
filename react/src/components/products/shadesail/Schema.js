export const Schema = {
  "Materials": [
    {
      "type": "row",
      "description": "Fabric",
      "quantity": "1",
      "unitCost": "calculated.fabricPrice"
    },
    {
      "type": "row",
      "description": "Cable",
      "quantity": "calculated.edgeMeterCeilMeters",
      "unitCost": "10"
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