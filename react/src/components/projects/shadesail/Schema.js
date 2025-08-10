export const sailSchema = {
  "Materials": [
    {
      "type": "row",
      "description": "Fabric",
      "quantity": "1",
      "unitCost": "data.calculated.fabricPrice"
    },
    {
      "type": "sku",
      "sku": "CAB001",
      "quantity": "data.attributes.edgeMeterCeilMeters"
    },
    {
      "type": "sku",
      "sku": "PRO001",
      "quantity": "data.attributes.pointCount"
    }
  ],
  "Summary": [
    {
      "type": "calc",
      "key": "totalCostFabrication",
      "label": "Total Cost Fabrication",
      "expr": "data.materialsTotal"
    }
  ]
}
