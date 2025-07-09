import React, { useImperativeHandle, forwardRef, useState } from 'react';

const CalculatorForm = forwardRef((props, ref) => {
  const [formData, setFormData] = useState({
    a: 1,
    b: 2,
    c: 3,
    operation: 'add',
  });

  useImperativeHandle(ref, () => ({
    getData: () => formData,
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'operation' ? value : Number(value),
    }));
  };

  return (
    <div>
      <label>
        A:
        <input type="number" className="inputStyle" name="a" value={formData.a} onChange={handleChange} />
      </label>
      <label>
        B:
        <input type="number" className="inputStyle" name="b" value={formData.b} onChange={handleChange} />
      </label>
      <label>
        Operation:
        <select name="operation" className="inputStyle" value={formData.operation} onChange={handleChange}>
          <option value="add">Add</option>
          <option value="multiply">Multiply</option>
        </select>
      </label>
      <label>
        C (multiplier for second step):
        <input type="number" className="inputStyle" name="c" value={formData.c} onChange={handleChange} />
      </label>
    </div>
  );
});

export default CalculatorForm;
