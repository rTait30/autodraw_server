export const TOOLS = [
  {
    id: 'discrepancy',
    title: 'Discrepancy Calculator',
    path: '/copelands/discrepancy',
    access: 'public', // List allowed roles. Admin always has access.
  },
  {
    id: 'nesting',
    title: 'Rectangle Nesting Tool',
    path: '/copelands/rectangles',
    access: ['estimator', 'designer'], 
  }
];
