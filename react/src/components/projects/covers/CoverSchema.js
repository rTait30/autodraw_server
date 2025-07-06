export const coverSchema = {
  "Materials": [
    {
      "type": "sku",
      "sku": "FAB002",
      "quantity": "data.calculated?.nestData?.total_width ? data.calculated.nestData.total_width / 1000 : 0"
    },
    {
      "type": "sku",
      "sku": "ZIP002",
      "quantity": "2 * (data.attributes?.quantity || 0)"
    },
    {
      "type": "sku",
      "sku": "THR001",
      "quantity": "data.attributes.quantity * (2 * (data.calculated?.flatMainWidth + data.calculated?.flatMainHeight + data.calculated?.flatSideHeight + data.calculated?.flatSideWidth) * (2.5/1000))"
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
      "quantity": "0.4",
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