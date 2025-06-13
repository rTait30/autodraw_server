// CoverEstimateTable.js

function CoverEstimateTable({ materials = [], labour = [] }) {
  const [matRows, setMatRows] = React.useState(materials);
  const [labRows, setLabRows] = React.useState(labour);
  const [contingencyPercent, setContingencyPercent] = React.useState(5);
  const [marginPercent, setMarginPercent] = React.useState(20);

  // Update a row in materials or labour
  const updateRow = (section, idx, field, value) => {
    const parsed = parseFloat(value) || 0;
    if (section === 'materials') {
      const updated = [...matRows];
      updated[idx] = { ...updated[idx], [field]: parsed };
      setMatRows(updated);
    } else {
      const updated = [...labRows];
      updated[idx] = { ...updated[idx], [field]: parsed };
      setLabRows(updated);
    }
  };

  // Totals
  const totalMaterials = matRows.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const totalLabour = labRows.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const baseCost = totalMaterials + totalLabour;
  const contingencyAmount = baseCost * (contingencyPercent / 100);
  const subtotalWithContingency = baseCost + contingencyAmount;
  const marginAmount = subtotalWithContingency * (marginPercent / 100);
  const suggestedPrice = subtotalWithContingency + marginAmount;

  // Render a section
  const renderSection = (title, rows, section) => (
    <>
      <tr><th colSpan="4" style={{ background: "#f0f0f0" }}>{title}</th></tr>
      {rows.map((item, idx) => (
        <tr key={section + idx}>
          <td>{item.description}</td>
          <td>
            <input
              type="number"
              value={item.quantity}
              min="0"
              style={{ width: 140 }}
              onChange={e => updateRow(section, idx, 'quantity', e.target.value)}
            />
          </td>
          <td>
            <input
              type="number"
              value={item.unitCost}
              min="0"
              step="0.01"
              style={{ width: 180 }}
              onChange={e => updateRow(section, idx, 'unitCost', e.target.value)}
            />
          </td>
          <td>
            <input
              type="number"
              value={(item.quantity * item.unitCost).toFixed(2)}
              readOnly
              style={{ width: 200, background: "#f9f9f9" }}
            />
          </td>
        </tr>
      ))}
      <tr>
        <td colSpan="3" style={{ textAlign: "right", fontWeight: "bold" }}>Total {title}</td>
        <td style={{ fontWeight: "bold" }}>{section === "materials" ? totalMaterials.toFixed(2) : totalLabour.toFixed(2)}</td>
      </tr>
    </>
  );

  return (
    <table border="1" style={{ marginTop: 20, borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Cost</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        {renderSection("Materials", matRows, "materials")}
        {renderSection("Labour", labRows, "labour")}
        <tr>
          <td colSpan="3" style={{ textAlign: "right" }}><b>Total Cost Fabrication</b></td>
          <td><b>{baseCost.toFixed(2)}</b></td>
        </tr>
        <tr>
          <td style={{ textAlign: "right" }} colSpan="2">Contingencies %</td>
          <td>
            <input
              type="number"
              value={contingencyPercent}
              onChange={e => setContingencyPercent(parseFloat(e.target.value) || 0)}
              style={{ width: 80 }}
            />
          </td>
          <td>{contingencyAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style={{ textAlign: "right" }} colSpan="2">Gross Margin %</td>
          <td>
            <input
              type="number"
              value={marginPercent}
              onChange={e => setMarginPercent(parseFloat(e.target.value) || 0)}
              style={{ width: 80 }}
            />
          </td>
          <td>{marginAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td colSpan="3" style={{ textAlign: "right", fontWeight: "bold" }}>Suggested Price</td>
          <td style={{ fontWeight: "bold" }}>{suggestedPrice.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default CoverEstimateTable;