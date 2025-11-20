export const Schema = 

{
  "_constants": {
    "contingencyPercent": 3,
    "marginPercent": 45
  },
  "Materials": [
    {
      "type": "sku",
      "sku": "2-DR-F-225",
      "quantity": "Math.ceil((flatMainWidth + flatSideWidth)/1000)"
    },
    {
      "type": "sku",
      "sku": "2-DR-H-113",
      "quantity": "2 * Math.ceil(height / 1000)"
    },
    {
      "type": "sku",
      "sku": "2-DR-H-001",
      "quantity": "2 * Math.ceil(height / 1000)"
    }
  ],
  "Labour": [
    {
      "type": "row",
      "description": "Design",
      "quantity": 0.5,
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Total cut length",
      "quantity": "Math.ceil((flatMainWidth + flatMainHeight + flatSideWidth + flatSideHeight)/1000)",
      "unitCost": 0
    },
    {
      "type": "row",
      "description": "Cutting/Plotting",
      "quantity": "(1/3) + Math.ceil((flatMainWidth + flatMainHeight + flatSideWidth + flatSideHeight)/1000) * (1/60)",
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Sewing",
      "quantity": "10",
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Welding",
      "quantity": "10",
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "QA",
      "quantity": 0.5,
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Packing up",
      "quantity": 0.5,
      "unitCost": 55
    }
  ]
}
