export const Schema = {
  "Nesting Summary": [
    {
      "type": "calc",
      "key": "totalWidth",
      "label": "Total Width Used",
      "expr": "calculated.totalWidth || 0",
      "suffix": " mm"
    },
    {
      "type": "calc",
      "key": "requiredWidth",
      "label": "Required Bin Width",
      "expr": "calculated.requiredWidth || 0",
      "suffix": " mm"
    },
    {
      "type": "calc",
      "key": "binHeight",
      "label": "Fabric Height",
      "expr": "calculated.binHeight || 0",
      "suffix": " mm"
    },
    {
      "type": "calc",
      "key": "efficiency",
      "label": "Nesting Efficiency",
      "expr": "calculated.totalWidth && calculated.requiredWidth ? Math.round((calculated.totalWidth / calculated.requiredWidth) * 100) : 0",
      "suffix": " %"
    }
  ]
};
