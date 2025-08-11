export const Schema = {
  "Materials": [
    {
      "type": "row",
      "description": "Fabric",
      "quantity": "1",
      "unitCost": "calculated.fabricPrice"
    },
    {
      "type": "sku",
      "sku": "CAB001",
      "quantity": "attributes.edgeMeterCeilMeters"
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
      "expr": "inputs.materialsTotal"
    }
  ]
}
