export const Schema = {
  "Materials": [
    {
      "type": "row",
      "description": "height test",
      "unitCost": 0.01,
      "quantity": "attributes.height"
    },
    {
      "type": "sku",
      "sku": "FAB005",
      "quantity": "calculated?.nestData?.total_width ? Math.ceil((calculated.nestData.total_width / 1000) * 2) / 2 : 0"
    },
    {
      "type": "sku",
      "sku": "ZIP002",
      "quantity": "2 * Math.ceil((attributes?.height || 0) / 1000)"
    },
    {
      "type": "sku",
      "sku": "THR001",
      "quantity": "attributes.quantity * (2 * (calculated?.flatMainWidth + calculated?.flatMainHeight + 2 * (calculated?.flatSideHeight + calculated?.flatSideWidth)) * (2.5/1000))"
    },
    {
      "type": "subtotal",
      "label": "Total Materials",
      "key": "materialsTotal" // optional; totals available as context.materialsTotal
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
      "description": "Cutting/Plotting",
      "quantity": "calculated?.finalArea ? ((calculated.finalArea / 1_000_000) < 80 ? 0.5 : Math.ceil(((calculated.finalArea / 1_000_000) / 80) / 0.25) * 0.25) : 0",
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Sewing",
      "quantity": "Math.ceil(((2 * attributes.quantity * (calculated.flatMainWidth + calculated.flatMainHeight) + 4 * attributes.quantity * (calculated.flatSideWidth + calculated.flatSideHeight)) / 1000 * 2 / 60) / 0.25) * 0.25",
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Welding",
      "quantity": "(attributes?.width > attributes?.fabricWidth ? Math.ceil(((calculated?.flatMainWidth * calculated?.flatMainHeight * 0.05) / 1_000_000) / 0.25) * 0.25 : 0)",
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
    },
    {
      "type": "subtotal",
      "label": "Total Labour",
      "key": "labourTotal" // optional; totals available as context.labourTotal
    }
  ],
  "Summary": [
    {
      "type": "calc",
      "key": "totalCostFabrication",
      "label": "Total Cost Fabrication",
      "expr": "context.materialsTotal + context.labourTotal"
    },
    {
      "type": "input",
      "label": "Contingencies %",
      "key": "contingencyPercent",
      "default": 3
    },
    {
      "type": "calc",
      "key": "contingencyAmount",
      "label": "Contingency Amount",
      "expr": "context.baseCost * inputs.contingencyPercent / 100"
    },
    {
      "type": "input",
      "label": "Gross Margin %",
      "key": "marginPercent",
      "default": 45
    },
    {
      "type": "calc",
      "key": "suggestedPrice",
      "label": "Suggested Price",
      "expr": "(context.baseCost + (inputs.contingencyPercent ? (context.baseCost * inputs.contingencyPercent / 100) : 0)) / (1 - (inputs.marginPercent * 0.01))"
    }
  ]
};