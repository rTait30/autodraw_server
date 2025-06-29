import React, { useState, useMemo } from 'react';
import { useProcessStepper } from '../components/projects/useProcessStepper';
import { zeroDiscrepancy } from '../components/projects/shadesails/SailSteps.js'; // or define inline

const initialInputs = {
  AB: '', BC: '', CD: '', DA: '',
  HA: '', HB: '', HC: '', HD: '',
  AC: '', BD: '',
  fabricType: 'PVC',
};

export default function Discrepancy() {
  const [inputs, setInputs] = useState(initialInputs);
  const [result, setResult] = useState({ discrepancy: '', errorBD: '' });

  const steps = useMemo(() => [zeroDiscrepancy], []);
  const { runAll } = useProcessStepper({ steps });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleCalculate = async () => {
    // Convert all numeric fields to numbers
    const data = {
      ...inputs,
      AB: parseFloat(inputs.AB),
      BC: parseFloat(inputs.BC),
      CD: parseFloat(inputs.CD),
      DA: parseFloat(inputs.DA),
      HA: parseFloat(inputs.HA),
      HB: parseFloat(inputs.HB),
      HC: parseFloat(inputs.HC),
      HD: parseFloat(inputs.HD),
      AC: parseFloat(inputs.AC),
      BD: parseFloat(inputs.BD),
    };
    await runAll(data);
    setResult(data.result || { discrepancy: '', errorBD: '' });
  };

  return (
    <div className="discrepancy-container">
      <h1>Four points structure</h1>
      <label htmlFor="fabricType">Choose the type of fabric:</label>
      <select id="fabricType" value={inputs.fabricType} onChange={handleChange}>
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
}