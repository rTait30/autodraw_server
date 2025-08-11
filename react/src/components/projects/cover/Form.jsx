import React, { forwardRef } from 'react';
import FormBase from '../FormBase';

const numeric = ['width', 'height', 'length', 'quantity', 'hem', 'seam', 'fabricWidth'];

const DEFAULTS = {
  length: 1000,
  width: 1000,
  height: 1000,
  quantity: 2,
  hem: 20,
  seam: 20,
  fabricWidth: 1370,
};

// Field schema: only define what’s unique to “covers”
const fields = [
  { name: 'length', label: 'Length', type: 'number', min: 0 },
  { name: 'width', label: 'Width', type: 'number', min: 0 },
  { name: 'height', label: 'Height', type: 'number', min: 0 },
  { name: 'quantity', label: 'Quantity', type: 'number', min: 1, step: 1 },
  { name: 'hem', label: 'Hem', type: 'number', min: 0 },
  { name: 'seam', label: 'Seam', type: 'number', min: 0 },
  {
    name: 'fabricWidth',
    label: 'Fabric Width',
    type: 'number',
    min: 0,
    // Visibility rule—if you ever need to hide/show per project logic
    visible: () => true,
  },
];

const Form = forwardRef((props, ref) => {
  const { attributes = {}, calculated = {}, onReturn, onCheck, onSubmit } = props;

  return (
    <FormBase
      ref={ref}
      title="Cover Form"
      fields={fields}
      defaults={DEFAULTS}
      attributes={attributes}
      calculated={calculated}
      onReturn={onReturn}
      onCheck={onCheck}
      onSubmit={onSubmit}
      // You can toggle this if a project type shouldn’t show calculated block
      showCalculated
      // Turn on to mirror your existing console logging while integrating
      debug={false}
    />
  );
});

export default Form;