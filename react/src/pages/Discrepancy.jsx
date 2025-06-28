// src/pages/DiscrepancyCalculator.jsx
import React, { useState } from 'react';

const Discrepancy = () => {
  const [fabricType, setFabricType] = useState('PVC');
  const [inputs, setInputs] = useState({
    AB: '', BC: '', CD: '', DA: '',
    HA: '', HB: '', HC: '', HD: '',
    AC: '', BD: ''
  });
  const [result, setResult] = useState({ discrepancy: '', errorBD: '' });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleCalculate = () => {
    const values = Object.values(inputs).map(parseFloat);
    if (values.some(isNaN)) {
      alert('Please enter a value in each input.');
      setResult({ discrepancy: '', errorBD: '' });
      return;
    }

    const { AB, BC, CD, DA, HA, HB, HC, HD, AC, BD } = Object.fromEntries(
      Object.entries(inputs).map(([k, v]) => [k, parseFloat(v)])
    );

    const ABxy = Math.sqrt(AB ** 2 - (HB - HA) ** 2);
    const BCxy = Math.sqrt(BC ** 2 - (HC - HB) ** 2);
    const CDxy = Math.sqrt(CD ** 2 - (HD - HC) ** 2);
    const DAxy = Math.sqrt(DA ** 2 - (HA - HD) ** 2);
    const BDxy = Math.sqrt(BD ** 2 - (HD - HB) ** 2);
    const ACxy = Math.sqrt(AC ** 2 - (HA - HC) ** 2);

    const angleABC = Math.acos((ACxy ** 2 + ABxy ** 2 - BCxy ** 2) / (2 * ACxy * ABxy));
    const angleACD = Math.acos((ACxy ** 2 + DAxy ** 2 - CDxy ** 2) / (2 * ACxy * DAxy));

    const Bx = ABxy * Math.cos(angleABC);
    const By = ABxy * Math.sin(angleABC);
    const Dx = DAxy * Math.cos(angleACD);
    const Dy = -DAxy * Math.sin(angleACD);

    const BDTeoricXYZ = Math.sqrt((Bx - Dx) ** 2 + (By - Dy) ** 2 + (HB - HD) ** 2);
    const discrepancy = BDTeoricXYZ - BD;
    const errorBD = (discrepancy / BDTeoricXYZ) * 100;

    const threshold = fabricType === 'PVC' ? 40 : 80;
    const message = Math.abs(discrepancy) <= threshold
      ? 'Your dimensions are suitable for Four points'
      : 'Your dimensions are NOT suitable for Four points. Please recheck dimensions';

    setResult({
      discrepancy: `${message}\nDiscrepancy: ${discrepancy.toFixed(2)} mm`,
      errorBD: `Error: ${errorBD.toFixed(2)}%`
    });
  };

  return (
    <div className="discrepancy-container">
      <h1>Four points structure</h1>
      <label htmlFor="fabricType">Choose the type of fabric:</label>
      <select id="fabricType" value={fabricType} onChange={(e) => setFabricType(e.target.value)}>
        <option value="PVC">PVC</option>
        <option value="ShadeCloth">Shade Cloth</option>
      </select>

      <b>Edge Dimensions (millimeters)</b>
      {['AB', 'BC', 'CD', 'DA'].map((id) => (
        <div key={id}>
          {id}: <input type="number" id={id} value={inputs[id]} onChange={handleChange} />
        </div>
      ))}

      <b>Point Height (millimeters)</b>
      {['HA', 'HB', 'HC', 'HD'].map((id) => (
        <div key={id}>
          {id}: <input type="number" id={id} value={inputs[id]} onChange={handleChange} />
        </div>
      ))}

      <b>Diagonal point to point</b>
      {['AC', 'BD'].map((id) => (
        <div key={id}>
          {id}: <input type="number" id={id} value={inputs[id]} onChange={handleChange} />
        </div>
      ))}

      <button id="CalculateButton" onClick={handleCalculate}>Calculate</button>
      <div>
        <p id="discrepancy">{result.discrepancy}</p>
        <p id="errorBD">{result.errorBD}</p>
      </div>
    </div>
  );
};

export default Discrepancy;
