function ProjectDetails({ projectId }) {
  const [project, setProject] = React.useState(null);
  const [role, setRole] = React.useState(null);
  const [error, setError] = React.useState(null);

  const token = localStorage.getItem('access_token');

  React.useEffect(() => {
    async function fetchData() {
      try {
        const roleRes = await fetch('/copelands/api/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const user = await roleRes.ok ? await roleRes.json() : { role: 'client' };
        setRole(user.role);

        const projectRes = await fetch(`/copelands/api/project/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!projectRes.ok) throw new Error('Failed to load project.');

        const proj = await projectRes.json();
        setProject(proj);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchData();
  }, [projectId]);

  if (error) return <div>{error}</div>;
  if (!project || !role) return <div>Loading...</div>;

  const calculated = project.calculated || project.attributes?.calculated || {};
  const attrs = project.attributes || {};

  const nestWidth = calculated.nestData.total_width / 1000 || 0;

  const zips = 2 * attrs.quantity;

  const seam = Number(calculated.totalSeamLength) / 1000 || 0;
  const heightM2 = Number(attrs.height) / 1000 || 0;
  const lengthM2 = Number(attrs.length) / 1000 || 0;
  const widthM2 = Number(attrs.width) / 1000 || 0;
  const threadQty = ((seam / 1000) + heightM2 * 2 + lengthM2 * 2 + widthM2 * 2) * 2.5 * attrs.quantity;

  const defaultMaterials = [
    { description: 'Fabric', quantity: nestWidth, unitCost: 13.33 },
    { description: 'Zip', quantity: zips, unitCost: 0.65 },
    { description: 'Thread', quantity: threadQty, unitCost: 3.0 },
  ];

  const design = 0.5;

  const finalAreaM2 = (calculated.finalArea / 1000000);
  const cuttingPer = finalAreaM2 < 80 ? 0.5 : Math.ceil(finalAreaM2 / 80 / 0.25) * 0.25;
  const cutting = cuttingPer * attrs.quantity;

  const sewing1 = ((calculated.flatMainWidth * 2 * F5) + (flatMainHeight * 2 * F5) + (G6 * 2 * F6) + (H6 * 2 * F6)) / 1000 * 2 / 60;
  //const sewing2 = Math.ceil(raw / 0.25) * 0.25;

  const defaultLabour = [

    { description: 'Design', quantity: design, unitCost: 55 },

    { description: 'Cutting/Plotting', quantity: cutting, unitCost: 55 },
    
    { description: 'Sewing', quantity: 1, unitCost: 55 },

    { description: 'Welding', quantity: 2, unitCost: 55 },
    
    { description: 'QA', quantity: 1, unitCost: 55 },

    { description: 'Packing Up', quantity: 2, unitCost: 55 },

  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '32px',
      marginTop: '24px',
    }}>
      {/* Fixed-width left panel */}
      <div style={{
        flex: '0 0 320px',  // Do not grow, don't shrink, base width 320px
        maxWidth: '100%'    // Prevent overflow on very small screens
      }}>
        <ProjectDataTable project={project} role={role} />
      </div>

      {/* Flexible right panel */}
      <div style={{
        flex: '1 1 0',           // Can grow, can shrink, base width 0
        minWidth: '300px',       // Ensure minimum usability
        maxWidth: '100%'         // Prevent overflow
      }}>
        <EstimateTable
          defaultMaterials={defaultMaterials}
          defaultLabour={defaultLabour}
        />
      </div>
    </div>
  );
}

// EstimateTable component (copy it in here fully if not already)
function EstimateTable({ defaultMaterials = [], defaultLabour = [] }) {
  const [materials, setMaterials] = React.useState(defaultMaterials);
  const [labour, setLabour] = React.useState(defaultLabour);
  const [contingencyPercent, setContingencyPercent] = React.useState(5);
  const [marginPercent, setMarginPercent] = React.useState(20);

  const updateItem = (section, index, field, value) => {
    const parsed = parseFloat(value) || 0;
    const updater = section === 'materials' ? setMaterials : setLabour;
    const list = section === 'materials' ? materials : labour;

    const updated = [...list];
    updated[index] = { ...updated[index], [field]: parsed };
    updater(updated);
  };

  const calculateTotal = (item) => item.quantity * item.unitCost;

  const totalMaterials = materials.reduce((sum, i) => sum + calculateTotal(i), 0);
  const totalLabour = labour.reduce((sum, i) => sum + calculateTotal(i), 0);
  const baseCost = totalMaterials + totalLabour;
  const contingencyAmount = baseCost * (contingencyPercent / 100);
  const subtotalWithContingency = baseCost + contingencyAmount;
  const marginAmount = subtotalWithContingency * (marginPercent / 100);
  const suggestedPrice = subtotalWithContingency + marginAmount;

  const renderSection = (title, items, section, total) => (
    <>
      <tr><th colSpan="4">{title}</th></tr>
      {items.map((item, idx) => (
        <tr key={`${section}-${idx}`}>
          <td>{item.description}</td>
          <td><input type="number" value={item.quantity} onChange={(e) => updateItem(section, idx, 'quantity', e.target.value)} /></td>
          <td><input type="number" value={item.unitCost} onChange={(e) => updateItem(section, idx, 'unitCost', e.target.value)} /></td>
          <td>{calculateTotal(item).toFixed(2)}</td>
        </tr>
      ))}
      <tr>
        <td colSpan="3" style={{ textAlign: 'right' }}><b>Total {title}</b></td>
        <td><b>{total.toFixed(2)}</b></td>
      </tr>
    </>
  );

  return (
    <table border="1" style={{ marginTop: '20px', borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr><th>Description</th><th>Quantity</th><th>Unit Cost</th><th>Total</th></tr>
      </thead>
      <tbody>
        {renderSection('Materials', materials, 'materials', totalMaterials)}
        {renderSection('Labour', labour, 'labour', totalLabour)}

        <tr>
          <td colSpan="3" style={{ textAlign: 'right' }}><b>Total Cost Fabrication</b></td>
          <td><b>{baseCost.toFixed(2)}</b></td>
        </tr>

        <tr>
          <td style={{ textAlign: 'right' }} colSpan="2">Contingencies %</td>
          <td>
            <input type="number" value={contingencyPercent} onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)} />
          </td>
          <td>{contingencyAmount.toFixed(2)}</td>
        </tr>

        <tr>
          <td style={{ textAlign: 'right' }} colSpan="2">Gross Margin %</td>
          <td>
            <input type="number" value={marginPercent} onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)} />
          </td>
          <td>{marginAmount.toFixed(2)}</td>
        </tr>

        <tr>
          <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Suggested Price</td>
          <td style={{ fontWeight: 'bold' }}>{suggestedPrice.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function ProjectDataTable({ project, role, onChange }) {
  if (!project) return null;

  const isEstimator = role === 'estimator';

  // Separate fields
  const projectData = {};
  const attributes = project.attributes || {};
  const calculated = project.calculated || {};

  for (const [key, value] of Object.entries(project)) {
    if (key !== 'attributes' && key !== 'calculated') {
      projectData[key] = value;
    }
  }

  // Handle change for editable fields
  const handleFieldChange = (section, key, value) => {
    const updated = { ...project };

    if (section === 'project') {
      updated[key] = value;
    } else if (section === 'attributes') {
      updated.attributes = { ...updated.attributes, [key]: value };
    }

    onChange?.(updated);
  };

  // Render section rows
  const renderRows = (data, section, editable = false) =>
    Object.entries(data).map(([key, value]) => (
      <tr key={`${section}-${key}`}>
        <td style={cellStyleBold}>{key}</td>
        <td style={cellStyle}>
          {editable ? (
            <input
              type="text"
              defaultValue={value}
              onBlur={(e) => handleFieldChange(section, key, e.target.value)}
              style={{ width: '100%' }}
            />
          ) : (
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          )}
        </td>
      </tr>
    ));

  // Styles
  const cellStyle = { padding: '4px 8px', borderBottom: '1px solid #ccc' };
  const cellStyleBold = { ...cellStyle, fontWeight: 'bold', width: '40%' };
  const headingRowStyle = {
    background: '#f0f0f0',
    fontWeight: 'bold',
    textAlign: 'left',
    padding: '6px 8px',
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td colSpan="2" style={headingRowStyle}>Project Data</td>
        </tr>
        {renderRows(projectData, 'project', true)}

        <tr>
          <td colSpan="2" style={headingRowStyle}>Attributes</td>
        </tr>
        {renderRows(attributes, 'attributes', true)}

        {isEstimator && (
          <>
            <tr>
              <td colSpan="2" style={headingRowStyle}>Calculations</td>
            </tr>
            {renderRows(calculated, 'calculations', false)}
          </>
        )}
      </tbody>
    </table>
  );
}


// Render to DOM
const root = document.getElementById('project-detail-root');
if (root && window.projectId) {
  ReactDOM.render(<ProjectDetails projectId={window.projectId} />, root);
}
