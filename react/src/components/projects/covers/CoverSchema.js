export const coverSchema = {
  "Materials": [
    {
      "type": "sku",
      "sku": "FAB002",
      "quantity": "data.calculated?.nestData?.total_width ? Math.ceil((data.calculated.nestData.total_width / 1000) * 2) / 2 : 0"
    },
    {
      "type": "sku",
      "sku": "ZIP002",
      "quantity": "2 * Math.ceil((data.attributes?.height || 0) / 1000)"
    },
    {
      "type": "sku",
      "sku": "THR001",
      "quantity": "data.attributes.quantity * (2 * (data.calculated?.flatMainWidth + data.calculated?.flatMainHeight + 2 * (data.calculated?.flatSideHeight + data.calculated?.flatSideWidth)) * (2.5/1000))"
    },
    {
      "type": "subtotal",
      "label": "Total Materials",
      "key": "materialsTotal"
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
      "quantity": "(data.calculated?.finalArea ? (data.calculated.finalArea / 1000000 < 80 ? 0.5 : Math.ceil((data.calculated.finalArea / 1000000) / 80 / 0.25) * 0.25) : 0)",
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Sewing",
      "quantity": "(Math.ceil(((2 * data.attributes.quantity * (data.calculated.flatMainWidth + data.calculated.flatMainHeight) + 4 * data.attributes.quantity * (data.calculated.flatSideWidth + data.calculated.flatSideHeight)) / 1000 * 2 / 60) / 0.25) * 0.25)",
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Welding",
      "quantity": "(data.attributes?.width > data.attributes?.fabricWidth ? Math.ceil((data.calculated?.flatMainWidth * data.calculated?.flatMainHeight * 0.05 / 1000000) / 0.25) * 0.25 : 0)",
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "QA",
      "quantity": "0.5",
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Packing up",
      "quantity": "0.5",
      "unitCost": 55
    },

    
    {
      "type": "subtotal",
      "label": "Total Labour",
      "key": "labourTotal"
    }
  ],
  "Summary": [
    {
      "type": "calc",
      "key": "totalCostFabrication",
      "label": "Total Cost Fabrication",
      "expr": "data.materialsTotal + data.labourTotal"
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
      "expr": "data.baseCost * data.contingencyPercent / 100"
    },
    {
      "type": "input",
      "label": "Gross Margin %",
      "key": "marginPercent",
      "default": 45
    },
    {
      "type": "calc",
      "key": "marginAmount",
      "label": "Margin Amount",
      "expr": "(data.baseCost + data.contingencyAmount) * data.marginPercent / 100"
    },
    {
      "type": "calc",
      "key": "suggestedPrice",
      "label": "Suggested Price",
      "expr": "data.baseCost + data.contingencyAmount + data.marginAmount"
    }
  ]
};
