function ProjectDetails({ projectId }) {
  // ...existing state...
  const [project, setProject] = React.useState(null);
  const [role, setRole] = React.useState('estimator');
  const [stepperData, setStepperData] = React.useState({});
  const canvasRef = React.useRef(null);
  const processStepperRef = React.useRef(null);
  

  const handleProjectChange = (updated) => {
    setProject(updated);
    if (updated && updated.attributes) {
      setStepperData(updated.attributes);
    }
  };
  

  // Fetch project data
  React.useEffect(() => {
    const token = localStorage.getItem('access_token');
    fetch(`/copelands/api/project/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized or not found');
        return res.json();
      })
      .then(data => {
        setProject(data);
        setRole(data.role || 'estimator');
      })
      .catch(err => {
        console.error(err);
      });
  }, [projectId]);

  // Update stepperData when project attributes change
  React.useEffect(() => {
    if (project && project.attributes) {
      setStepperData(project.attributes);
    }
  }, [project]);

  // Redraw ProcessStepper when stepperData changes
  React.useEffect(() => {
    if (!canvasRef.current) return;

    if (!processStepperRef.current) {
      const stepper = new ProcessStepper(canvasRef.current, {

      scaleFactor: 0.5,
      virtualWidth: 1000,
      virtualHeight: 1000,
    });
      stepper.addStep(zeroVisualise);
      stepper.addStep(oneFlatten);
      stepper.addStep(twoExtra);
      stepper.addStep(threeNest);
      processStepperRef.current = stepper;
    }
    processStepperRef.current.runAll({ ...stepperData });

    async function runStepper() {
      const result = await processStepperRef.current.runAll({ ...stepperData });
      setProject((prev) => (prev ? { ...prev, calculated: result } : prev));
    }

    runStepper();
  }, [stepperData]);

  // --- DYNAMIC MATERIALS & LABOUR CALCULATION ---
  let defaultMaterials = [];
  let defaultLabour = [];

  if (project) {
    const calculated = project.calculated || project.attributes?.calculated || {};
    const attrs = project.attributes || {};

    // Defensive: fallback to 0 if missing
    const nestWidth = (calculated.nestData && calculated.nestData.total_width ? calculated.nestData.total_width / 1000 : 0);

    const zips = 2 * (attrs.quantity || 0);

    const seam = Number(calculated.totalSeamLength) / 1000 || 0;
    const heightM2 = Number(attrs.height) / 1000 || 0;
    const lengthM2 = Number(attrs.length) / 1000 || 0;
    const widthM2 = Number(attrs.width) / 1000 || 0;
    const threadQty = ((seam / 1000) + heightM2 * 2 + lengthM2 * 2 + widthM2 * 2) * 2.5 * (attrs.quantity || 0);

    defaultMaterials = [
      { description: 'Fabric', quantity: nestWidth, unitCost: 13.33 },
      { description: 'Zip', quantity: zips, unitCost: 0.65 },
      { description: 'Thread', quantity: threadQty, unitCost: 0.03 },
    ];

    const design = 0.5;

    const finalAreaM2 = (calculated.finalArea / 1000000) || 0;
    const cuttingPer = finalAreaM2 < 80 ? 0.5 : Math.ceil(finalAreaM2 / 80 / 0.25) * 0.25;
    const cutting = cuttingPer * (attrs.quantity || 0);

    // You may want to define F5, F6, G6, H6 or remove these lines if not used
    // const sewing1 = ((calculated.flatMainWidth * 2 * F5) + (flatMainHeight * 2 * F5) + (G6 * 2 * F6) + (H6 * 2 * F6)) / 1000 * 2 / 60;

    defaultLabour = [
      { description: 'Design', quantity: design, unitCost: 55 },
      { description: 'Cutting/Plotting', quantity: cutting, unitCost: 55 },
      { description: 'Sewing', quantity: 1, unitCost: 55 },
      { description: 'Welding', quantity: 2, unitCost: 55 },
      { description: 'QA', quantity: 0.5, unitCost: 55 },
      { description: 'Packing Up', quantity: 0.5, unitCost: 55 },
    ];
  }

  console.log('Default Materials:', defaultMaterials);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '32px',
      marginTop: '24px',
    }}>
      {/* Fixed-width left panel */}
      <div style={{
        flex: '0 0 320px',
        maxWidth: '100%'
      }}>
         <ProjectDataTable project={project} role={role} onChange={handleProjectChange} />
      </div>

      {/* Flexible right panel */}
      <div style={{
        flex: '1 1 0',
        minWidth: '300px',
        maxWidth: '100%'
      }}>
        <EstimateTable
          defaultMaterials={defaultMaterials}
          defaultLabour={defaultLabour}
        />
        {/* Canvas for ProcessStepper visualization */}
        <div style={{ marginTop: 32 }}>
          <canvas
            ref={canvasRef}
            width={900}
            height={1800}
            style={{ border: '1px solid #ccc', background: '#fff' }}
          />
        </div>
      </div>
    </div>
  );
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "15px",
};

const thStyle = {
  background: "#f7f7f7",
  fontWeight: "bold",
  padding: "8px",
  borderBottom: "1px solid #ccc",
  textAlign: "left",
};

const tdStyle = {
  padding: "8px",
  borderBottom: "1px solid #eee",
  textAlign: "left",
};

const headingStyle = {
  padding: "8px",
  borderBottom: "1px solid #eee",
  textAlign: "left",
  fontWeight: "bold",
  fontSize: "18px",
};

// EstimateTable component (copy it in here fully if not already)
function EstimateTable({ defaultMaterials = [], defaultLabour = [] }) {
  const [materials, setMaterials] = React.useState(defaultMaterials);
  const [labour, setLabour] = React.useState(defaultLabour);
  const [contingencyPercent, setContingencyPercent] = React.useState(3);
  const [marginPercent, setMarginPercent] = React.useState(45);

  // Sync state with props when they change
  React.useEffect(() => {
    setMaterials(defaultMaterials);
  }, [defaultMaterials]);
  React.useEffect(() => {
    setLabour(defaultLabour);
  }, [defaultLabour]);

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
        <td style={tdStyle}><b>Total {title}</b></td>
        <td><b>{total.toFixed(2)}</b></td>
      </tr>
    </>
  );

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          
          <th style={thStyle}>Description</th>
          <th style={thStyle}>Quantity</th>
          <th style={thStyle}>Unit Cost</th>
          <th style={thStyle}>Total</th>

        </tr>
      </thead>
      <tbody>
        {renderSection('Materials', materials, 'materials', totalMaterials)}
        {renderSection('Labour', labour, 'labour', totalLabour)}

        <tr>
          <td style={tdStyle}><b>Total Cost Fabrication</b></td>
          <td><b>{baseCost.toFixed(2)}</b></td>
        </tr>

        <tr>
          <td style={tdStyle}>Contingencies %</td>
          <td>
            <input type="number" value={contingencyPercent} onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)} />
          </td>
          <td>{contingencyAmount.toFixed(2)}</td>
        </tr>

        <tr>
          <td style={tdStyle}>Gross Margin %</td>
          <td>
            <input type="number" value={marginPercent} onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)} />
          </td>
          <td>{marginAmount.toFixed(2)}</td>
        </tr>

        <tr>
          <td style={tdStyle}>Suggested Price</td>
          <td style={tdStyle}>{suggestedPrice.toFixed(2)}</td>
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
        <td style={tdStyle}>{key}</td>
        <td style={tdStyle}>
          {editable ? (
            <input
              type="text"
              defaultValue={value}
              onBlur={(e) => handleFieldChange(section, key, e.target.value)}
            />
          ) : (
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          )}
        </td>
      </tr>
    ));

  return (
    <table style={tableStyle}>

      <tbody>
        
        <tr>
          <td style={headingStyle}>Project Data</td>
        </tr>
        {renderRows(projectData, 'project', true)}

        <tr>
          <td style={headingStyle}>Project Attributes</td>
        </tr>
        {renderRows(attributes, 'attributes', true)}

        {isEstimator && (
          <>
            <tr>
              <td style={headingStyle}>Calculations</td>
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












class ProcessStepper {
    constructor(canvasOrId = null, options = {}) {
        if (canvasOrId) {
            this.canvas = typeof canvasOrId === 'string' ? document.getElementById(canvasOrId) : canvasOrId;
            if (!this.canvas) {
                throw new Error(`Canvas not found: ${canvasOrId}`);
            }
            this.ctx = this.canvas.getContext('2d');
            this.hasCanvas = true;
            this.draw = options.draw !== false;
        } else {
            this.canvas = null;
            this.ctx = null;
            this.hasCanvas = false;
            this.draw = false;
        }

        this.showData = options.showData || false;
        this.steps = [];
        this.scaleFactor = options.scaleFactor || 1;
        this.stepOffsetY = options.stepOffsetY || 500;
        this.virtualWidth = options.virtualWidth || 1000;
        this.virtualHeight = options.virtualHeight || 1000;
        this.data = {};
    }

    addStep(config) {
        const step = {
            id: config.id || config.title,
            title: config.title,
            calcFunction: config.calcFunction,
            drawFunction: config.drawFunction,
            isAsync: config.isAsync || false,
            provides: config.provides || []
        };
        this.steps.push(step);
        return step;
    }

    async runAll(initialData = {}) {
        this.data = initialData;

        if (this.hasCanvas) {
            this.ctx.setLineDash([]);
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        for (const step of this.steps) {
            await this.executeStep(step);
        }

        return this.data;
    }

    async executeStep(step) {


        if (this.hasCanvas) {
            const index = this.steps.indexOf(step);
            const offsetX = 0;
            const offsetY = index * this.stepOffsetY;
            this.ctx.setTransform(this.scaleFactor, 0, 0, this.scaleFactor, offsetX, offsetY);
            if (step.isAsync) {
                await step.calcFunction(this.data);
                step.drawFunction(this.ctx, this.virtualWidth, this.virtualHeight, this.data);
            } else {
                step.calcFunction(this.data);
                step.drawFunction(this.ctx, this.virtualWidth, this.virtualHeight, this.data);
            }

            if (this.showData) {
                this.ctx.fillStyle = 'black';
                this.ctx.font = '20px Arial';
                const dataText = JSON.stringify(this.data, null, 2);
                const lines = dataText.split('\n');
                lines.forEach((line, i) => {
                    this.ctx.fillText(line, 10, 100 + i * 20);
                });
            }
        }

        else {
            if (step.isAsync) {
                await step.calcFunction(this.data);
            } else {
                step.calcFunction(this.data);
            }
        }


    }

    getData() {
        return this.data;
    }
}















//-----------------------------------------------------------------------------------------------------------

//                                STEP 0: VISUALISE COVERS

//-----------------------------------------------------------------------------------------------------------



const zeroVisualise = {
    title: 'Step 0: Visualise covers',
    initialData: { length: 1, width: 1, height: 1 },
    dependencies: [],
    isLive: false,
    isAsync: false,



    // ----------------------------------- CALC -------------------------------------------



    // Calculation step: does nothing for this step
    calcFunction: (data) => {
        // No calculation, just return data as-is
        return data;
    },



    // ----------------------------------- DRAW -------------------------------------------



    drawFunction: (ctx, virtualWidth, virtualHeight, data) => {

        const quantity = Math.max(1, data.quantity || 1);
        const width = data.width || 1;
        const height = data.height || 1;
        const length = data.length || 1;
        const hem = data.hem || 0;

        const padding = 100;
        const spacing = width / 4;

        // Total visual space required includes hem and projection
        const totalWidthUnits = quantity * width + (quantity - 1) * spacing + length;
        const totalHeightUnits = height + hem + length;
    
        const maxDrawWidth = 1000 - 2 * padding;
        const maxDrawHeight = 1000 - 2 * padding;
    
        const scale = Math.min(
            maxDrawWidth / totalWidthUnits,
            maxDrawHeight / totalHeightUnits
        );
    
        const boxW = width * scale;
        const boxH = height * scale;
        const boxD = length * scale;
        const boxHem = hem * scale;
        const unitSpacing = spacing * scale;
    
        // Include hem height in vertical offset
        const contentWidth = boxW;
        const contentHeight = boxH + boxHem + boxD;
    
        const startX = 100;
        const startY = (1000 - contentHeight) / 2 + boxD;

        ctx.font = "18px sans-serif";
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
    
        for (let i = 0; i < 1; i++) {
            const x = startX + i * (boxW + unitSpacing);
            const y = startY;
    
            // Draw front face
            ctx.strokeRect(x, y, boxW, boxH);
    
            // Draw hem
            if (hem > 0) {
                ctx.fillStyle = '#ccc';
                ctx.fillRect(x, y + boxH, boxW, boxHem);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(x, y + boxH, boxW, boxHem);
    
                ctx.fillStyle = '#000';
                ctx.font = "14px sans-serif";
                ctx.fillText(`${hem} mm hem`, x + boxW / 2 - 30, y + boxH + boxHem / 2 + 5);
            }
    
            // 3D box projection
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + boxD, y - boxD);
            ctx.moveTo(x + boxW, y);
            ctx.lineTo(x + boxW + boxD, y - boxD);
            ctx.moveTo(x + boxW, y + boxH);
            ctx.lineTo(x + boxW + boxD, y + boxH - boxD);
            ctx.moveTo(x, y + boxH);
            ctx.lineTo(x + boxD, y + boxH - boxD);
            ctx.stroke();
    
            // Back panel
            ctx.beginPath();
            ctx.moveTo(x + boxD, y - boxD);
            ctx.lineTo(x + boxW + boxD, y - boxD);
            ctx.lineTo(x + boxW + boxD, y + boxH - boxD);
            ctx.lineTo(x + boxD, y + boxH - boxD);
            ctx.closePath();
            ctx.stroke();
    
            // Projected hem (if any)
            if (hem > 0) {
                ctx.beginPath();
                ctx.moveTo(x, y + boxH + boxHem);
                ctx.lineTo(x + boxD, y + boxH + boxHem - boxD);
                ctx.moveTo(x + boxW, y + boxH + boxHem);
                ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
    
                ctx.moveTo(x + boxD, y + boxH - boxD);
                ctx.lineTo(x + boxD, y + boxH + boxHem - boxD);
                ctx.moveTo(x + boxW + boxD, y + boxH - boxD);
                ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
    
                ctx.moveTo(x + boxD, y + boxH + boxHem - boxD);
                ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
                ctx.stroke();
            }
    
            // Dimension labels
            ctx.fillStyle = '#000';
            ctx.font = "18px sans-serif";
    
            // Width
            ctx.fillText(`${width} mm`, x + boxW / 2 - 30, y + boxH + boxHem + 20);
    
            // Height (excluding hem)
            ctx.save();
            ctx.translate(x - 20, y + boxH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${height} mm`, -30, 0);
            ctx.restore();
    
            // Total height (including hem)
            ctx.save();
            ctx.translate(x - 50, y + (boxH + boxHem) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${height + hem} mm total`, -40, 0);
            ctx.restore();
    
            // Depth
            ctx.save();
            ctx.translate(x + boxW + boxD + 10, y - boxD - 10);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(`${length} mm`, 0, 0);
            ctx.restore();
        }

        const text = `x ${quantity}`;

        
        ctx.font = 'bold 48px Arial'; // You can adjust size and font
        ctx.fillStyle = 'black'; // Or any color you want
        ctx.textAlign = 'right'; // Right align so the text ends at the x-position
        ctx.textBaseline = 'middle';

        ctx.fillText(text, 800, 800);
        
        return data;

    }        
        
    
    
    //------------------------------------- END DRAW ----------------------------------------


};





//-----------------------------------------------------------------------------------------------------------

//                                      STEP 1: FLAT PATTERN

//-----------------------------------------------------------------------------------------------------------



const oneFlatten = {
    title: 'Step 1: Flatten Panels',
    initialData: { length: 1, width: 1, height: 1 },
    dependencies: [],
    isLive: false,
    isAsync: false,



    // ----------------------------------- CALC -------------------------------------------
    


    calcFunction: (data) => {

        if (data.flatMainHeight) {
            // If flatMainHeight already exists calculations are already done, return data as-is
            return data;
        }
        // ...all your calculation logic here...
        let flatMainHeight = data.width + 2 * data.seam;
        let flatMainWidth = 2 * data.hem + data.height * 2 + data.length;
        let flatSideWidth = data.width + data.seam * 2;
        let flatSideHeight = data.height + data.hem + data.seam;
        let totalSeamLength =
            2 * flatMainWidth +
            2 * flatSideWidth +
            4 * flatSideHeight;

        
        data.flatMainHeight = flatMainHeight;
        data.flatMainWidth = flatMainWidth;
        data.flatSideHeight = flatSideHeight;
        data.flatSideWidth = flatSideWidth;
        data.totalSeamLength = totalSeamLength;

        const areaMainMM = flatMainWidth * flatMainHeight;
        const areaSideMM = flatSideWidth * flatSideHeight;
        const areaMainM2 = areaMainMM / 1e6;
        const areaSideM2 = areaSideMM / 1e6;
        const totalFabricArea = areaMainM2 + 2 * areaSideM2;

        data.areaMainM2 = areaMainM2;
        data.areaSideM2 = areaSideM2;
        data.totalFabricArea = totalFabricArea;

        return data;
    },



    // ----------------------------------- DRAW -------------------------------------------



    drawFunction: (ctx, virtualWidth, virtualHeight, data) => {


        let flatMainHeight = data.width + 2 * data.seam;
        let flatMainWidth = 2 * data.hem + data.height * 2 + data.length;

        let flatSideWidth = data.width + data.seam * 2;
        let flatSideHeight = data.height + data.hem + data.seam;

        // Calculate total seam length
        let totalSeamLength =
            2 * flatMainWidth +        // Top and bottom of main panel
            2 * flatSideWidth +       // Top of both side panels
            4 * flatSideHeight;       // Left and right of both side panels

        let i = 0;

        data.totalSeamLength = totalSeamLength;

        data.flatMainHeight = flatMainHeight;
        data.flatMainWidth = flatMainWidth;

        data.flatSideHeight = flatSideHeight;
        data.flatSideWidth = flatSideWidth;

        // Scaling
        const padding = 100;
        const availableWidth = 1000 - 2 * padding;
        const availableHeight = 1000 - 2 * padding;
        const layoutWidth = Math.max(flatMainWidth, flatSideWidth * 2 + 50);
        const layoutHeight = flatMainHeight + flatSideHeight + 50;
        const scale = Math.min(availableWidth / layoutWidth, availableHeight / layoutHeight);
    
        const mainW = flatMainWidth * scale;
        const mainH = flatMainHeight * scale;
        const sideW = flatSideWidth * scale;
        const sideH = flatSideHeight * scale;
    
        const originX = (1000 - layoutWidth * scale) / 2;
        const originY = (1000 - layoutHeight * scale) / 2;
    
        const mainX = originX + (layoutWidth * scale - mainW) / 2;
        const mainY = originY;
        const sideY = mainY + mainH + 50;
        const side1X = originX;
        const side2X = originX + sideW + 50;
    
        const seamOffset = data.seam * scale;
    
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
    
        // Main Panel
        ctx.strokeRect(mainX, mainY, mainW, mainH);
    
        // Hem lines (dotted) on left and right
        ctx.setLineDash([3, 5]);
        let hemW = data.hem * scale;
        ctx.beginPath();
        ctx.moveTo(mainX + hemW, mainY);
        ctx.lineTo(mainX + hemW, mainY + mainH);
        ctx.moveTo(mainX + mainW - hemW, mainY);
        ctx.lineTo(mainX + mainW - hemW, mainY + mainH);
        ctx.stroke();
    
        // Side lines (seam) in dashed style
        ctx.setLineDash([8, 6]);
        let seamLeft = hemW + data.height * scale;
        let seamRight = hemW + (data.height + data.length) * scale;
        ctx.beginPath();
        ctx.moveTo(mainX + seamLeft, mainY);
        ctx.lineTo(mainX + seamLeft, mainY + mainH);
        ctx.moveTo(mainX + seamRight, mainY);
        ctx.lineTo(mainX + seamRight, mainY + mainH);
        ctx.stroke();
        ctx.setLineDash([]);
    
        // Side panels
        ctx.strokeRect(side1X, sideY, sideW, sideH);
        ctx.strokeRect(side2X, sideY, sideW, sideH);
    
        // Dotted seam lines (accurate seam position)
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = '#00f';
    
        // Main panel: seam lines inside top and bottom edges
        ctx.beginPath();
        ctx.moveTo(mainX, mainY + seamOffset);
        ctx.lineTo(mainX + mainW, mainY + seamOffset);
        ctx.moveTo(mainX, mainY + mainH - seamOffset);
        ctx.lineTo(mainX + mainW, mainY + mainH - seamOffset);
        ctx.stroke();
    
        // Side panels: all seam lines
        ctx.beginPath();
        const seamXOffset = data.seam * scale;
    
        // First side panel
        ctx.moveTo(side1X, sideY + seamOffset);
        ctx.lineTo(side1X + sideW, sideY + seamOffset);
        ctx.moveTo(side1X + seamXOffset, sideY);
        ctx.lineTo(side1X + seamXOffset, sideY + sideH);
        ctx.moveTo(side1X + sideW - seamXOffset, sideY);
        ctx.lineTo(side1X + sideW - seamXOffset, sideY + sideH);
    
        // Second side panel
        ctx.moveTo(side2X, sideY + seamOffset);
        ctx.lineTo(side2X + sideW, sideY + seamOffset);
        ctx.moveTo(side2X + seamXOffset, sideY);
        ctx.lineTo(side2X + seamXOffset, sideY + sideH);
        ctx.moveTo(side2X + sideW - seamXOffset, sideY);
        ctx.lineTo(side2X + sideW - seamXOffset, sideY + sideH);
        ctx.stroke();
    
        ctx.setLineDash([]);
    
        // Hem bottom on side panels (dotted)
        ctx.setLineDash([3, 5]);
        let hemH = data.hem * scale;
        ctx.beginPath();
        ctx.moveTo(side1X, sideY + sideH - hemH);
        ctx.lineTo(side1X + sideW, sideY + sideH - hemH);
        ctx.moveTo(side2X, sideY + sideH - hemH);
        ctx.lineTo(side2X + sideW, sideY + sideH - hemH);
        ctx.stroke();
    
        // Dimension labels
        ctx.font = "16px sans-serif";
        ctx.fillStyle = '#000';
    
        ctx.fillText(`${flatMainWidth} mm`, mainX + mainW / 2 - 40, mainY - 10);
        ctx.save();
        ctx.translate(mainX - 10, mainY + mainH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${flatMainHeight} mm`, -40, 0);
        ctx.restore();
    
        ctx.fillText(`${flatSideWidth} mm`, side1X + sideW / 2 - 30, sideY - 10);
        ctx.save();
        ctx.translate(side1X - 10, sideY + sideH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${flatSideHeight} mm`, -35, 0);
        ctx.restore();
    
        ctx.save();
        ctx.translate(side2X - 10, sideY + sideH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${flatSideHeight} mm`, -35, 0);
        ctx.restore();
    
        const areaMainMM = flatMainWidth * flatMainHeight;
        const areaSideMM = flatSideWidth * flatSideHeight;
        const areaMainM2 = areaMainMM / 1e6;
        const areaSideM2 = areaSideMM / 1e6;
        const totalFabricArea = areaMainM2 + 2 * areaSideM2;
    
        ctx.font = "16px sans-serif";
        ctx.fillText(`Main Area: ${areaMainM2.toFixed(3)} m²`, mainX + mainW / 2 - 80, mainY + mainH / 2);
        ctx.fillText(`Side Area: ${areaSideM2.toFixed(3)} m²`, side1X + sideW / 2 - 80, sideY + sideH / 2);
        ctx.fillText(`Side Area: ${areaSideM2.toFixed(3)} m²`, side2X + sideW / 2 - 80, sideY + sideH / 2);
    
        ctx.fillText(`totalFabricArea: ${totalFabricArea} m²`, 800, 900);






        // ----------------------------------- END DRAW --------------------------------------

        return data;

    }
};





//-----------------------------------------------------------------------------------------------------------

//                                      STEP 2: TWO EXTRA PANELS

//-----------------------------------------------------------------------------------------------------------



function splitPanelIfNeeded(width, height, fabricWidth, minAllowance, seam) {
    let rotated = false;

    // Normalize orientation: always treat shorter side as height
    if (width < height) {
        [width, height] = [height, width];
        rotated = true;
    }

    // Case 1: Panel fits in fabric without splitting
    if (height <= fabricWidth) {
        return [{
            width: rotated ? height : width,
            height: rotated ? width : height,
            hasSeam: "no"
        }];
    }

    // Small panel gets exactly: minAllowance + seam
    const smallPanelHeight = minAllowance + seam;

    // Main panel gets the rest of the original height
    const mainPanelHeight = height - minAllowance;

    return [
        {
            width: rotated ? height : width,
            height: rotated ? mainPanelHeight : mainPanelHeight,
            hasSeam: "main"
        },
        {
            width: rotated ? height : width,
            height: rotated ? smallPanelHeight : smallPanelHeight,
            hasSeam: "small"
        }
    ];
}

const twoExtra = {
    title: 'Step 2: Create extra seams if wider than fabric',
    initialData: { },
    dependencies: [],
    isLive: false,
    isAsync: false,



    // ----------------------------------- CALC -------------------------------------------



    calcFunction: (data) => {

        if (data.finalPanels)
            
        {
            console.warn('Final panels already calculated, skipping seam calculation.');
            return;
        }

        const mainPanels = splitPanelIfNeeded(data.flatMainWidth, data.flatMainHeight, data.fabricWidth, 1, data.seam);
        const sidePanels = splitPanelIfNeeded(data.flatSideWidth, data.flatSideHeight, data.fabricWidth, 1, data.seam);

        const result = {};
        mainPanels.forEach((panel, i) => result[`main${i + 1}`] = panel);
        sidePanels.forEach((panel, i) => result[`Rside${i + 1}`] = panel);
        sidePanels.forEach((panel, i) => result[`Lside${i + 1}`] = panel);

        let totalWidth = 0;
        let maxHeight = 0;
        for (const [, panel] of Object.entries(result)) {
            totalWidth += panel.width + 50;
            maxHeight = Math.max(maxHeight, panel.height);
        }
        totalWidth -= 50;

        let finalArea = 0;

        const finalPanels = {
            quantity: data.quantity,
            panels: {}
        };

        for (const [key, panel] of Object.entries(result)) {
            const { hasSeam, ...panelWithoutSeam } = panel;
            finalPanels.panels[key] = panelWithoutSeam;
            finalArea += (panel.width * panel.height);
        }

        data.finalArea = finalArea;

        data.finalPanels = finalPanels;

        console.log('Final panels:', finalPanels);

        data.rawPanels = result;
    },



    // ----------------------------------- DRAW -------------------------------------------



  drawFunction: (ctx, virtualWidth, virtualHeight, data) => {
      const padding = 100;

      // Calculate total width and max height of all panels
      let totalWidth = 0;
      let maxHeight = 0;
      for (const [, panel] of Object.entries(data.rawPanels)) {
          totalWidth += panel.width;
          maxHeight = Math.max(maxHeight, panel.height);
      }

      const availableWidth = virtualWidth - 2 * padding;
      const availableHeight = virtualHeight - 2 * padding;
      const scale = Math.min(
          availableWidth / totalWidth,
          availableHeight / maxHeight
      );

      let cursorX = (virtualWidth - totalWidth * scale) / 2;
      const originY = (virtualHeight - maxHeight * scale) / 2;

      const drawData = [];
      let totalArea = 0;

      for (const [name, panel] of Object.entries(data.rawPanels)) {
          const w = panel.width * scale;
          const h = panel.height * scale;
          const x = cursorX;
          const y = originY;

          const area = (panel.width * panel.height) / 1e6;
          totalArea += area;

          drawData.push({
              name,
              x,
              y,
              w,
              h,
              panel,
              area,
              seamY: panel.hasSeam === "top"
                  ? y + (data.seam || 0) * scale
                  : panel.hasSeam === "bottom"
                  ? y + h - (data.seam || 0) * scale
                  : null
          });

          cursorX += w + 50; // 50px gap between panels
      }

      ctx.save();
      ctx.lineWidth = 2;
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const item of drawData) {
          const { name, x, y, w, h, panel, area, seamY } = item;

          ctx.strokeStyle = "#000";
          ctx.setLineDash([]);
          ctx.strokeRect(x, y, w, h);

          if (seamY !== null) {
              ctx.strokeStyle = "#00f";
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(x, seamY);
              ctx.lineTo(x + w, seamY);
              ctx.stroke();
          }

          ctx.setLineDash([]);
          ctx.strokeStyle = "#000";

          ctx.fillText(name, x + w / 2, y + h / 2 - 18);
          ctx.fillText(`${area.toFixed(3)} m²`, x + w / 2, y + h / 2 + 2);
          ctx.fillText(`${panel.width} mm`, x + w / 2, y - 12);

          ctx.save();
          ctx.translate(x - 12, y + h / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(`${panel.height} mm`, 0, 0);
          ctx.restore();
      }

      ctx.restore();
  }

    // ----------------------------------- END DRAW --------------------------------------

};





//-----------------------------------------------------------------------------------------------------------

//                                STEP 3: NEST PANELS

//-----------------------------------------------------------------------------------------------------------


async function sendPanelData(panelData, fabricWidth) {
  try {
    const response = await fetch('/copelands/nest_panels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...panelData,
        fabricWidth // 🔁 Include fabricWidth in the payload
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Received nest:', result);
    return result;

  } catch (error) {
    console.error('Error sending panel data:', error);
  }
}

function drawNest(ctx, nestData, panels, fabricHeight) {
  const startX = 0;

  const nestWidth = nestData.total_width;
  const scale = Math.min(2000 / nestWidth, 0.1); // Scale X to fit 1000px
  const centerY = 200 + (fabricHeight / 2) * scale;

  ctx.save();

  ctx.setLineDash([]);

  // 📦 Draw each panel
  for (const [label, placement] of Object.entries(nestData.panels)) {
    const panelKey = label.split('_')[1];
    const panel = panels[panelKey];

    //console.log("Panels:", panels);

    if (!panel) {
      console.warn(`Panel not found for label: ${label} (key: ${panelKey})`);
      continue;
    }

    const { width, height } = panel;
    const rotated = placement.rotated;
    const w = rotated ? height : width;
    const h = rotated ? width : height;

    // Apply scale to all spatial values
    const scaledX = startX + placement.x * scale;
    const scaledY = centerY - (placement.y + h) * scale;
    const scaledW = w * scale;
    const scaledH = h * scale;

    ctx.fillStyle = '#88ccee';
    ctx.strokeStyle = '#004466';
    ctx.lineWidth = 2;
    ctx.fillRect(scaledX, scaledY, scaledW, scaledH);
    ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);

    // 🏷 Draw label centered in the scaled rectangle
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, scaledX + scaledW / 2, scaledY + scaledH / 2);
  }

  // 🖼 Draw fabric height box
  const fabricBoxX = startX;
  const fabricBoxY = centerY - fabricHeight * scale;
  const fabricBoxWidth = nestWidth * scale;
  const fabricBoxHeight = fabricHeight * scale;

  ctx.setLineDash([]);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(fabricBoxX, fabricBoxY, fabricBoxWidth, fabricBoxHeight);

  // 📏 Draw dimension line under the whole thing
  const dimensionLineY = centerY + 20; // Slightly below the fabric box
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(fabricBoxX, dimensionLineY);
  ctx.lineTo(fabricBoxX + fabricBoxWidth, dimensionLineY);
  ctx.stroke();

  // Vertical ticks
  ctx.beginPath();
  ctx.moveTo(fabricBoxX, dimensionLineY - 5);
  ctx.lineTo(fabricBoxX, dimensionLineY + 5);
  ctx.moveTo(fabricBoxX + fabricBoxWidth, dimensionLineY - 5);
  ctx.lineTo(fabricBoxX + fabricBoxWidth, dimensionLineY + 5);
  ctx.stroke();

  // Dimension text
  ctx.fillStyle = 'black';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${nestWidth.toFixed(2)} mm`, fabricBoxX + fabricBoxWidth / 2, dimensionLineY + 5);

  ctx.restore();
}

const threeNest = {
  title: 'Step 3: Nesting',
  initialData: {},
  dependencies: [],
  isLive: false,
  isAsync: true,



  // --------------------------- CALC FUNCTION ---------------------------



  calcFunction: async (data) => {
    if (!data || !data.finalPanels || !data.fabricWidth) {
      console.warn('Missing data for nesting calcFunction');
      return;
    }

    const nestData = await sendPanelData(data.finalPanels, data.fabricWidth);

    if (!nestData) {
      console.error('No nest data returned from server');
      return;
    }


    data.nestData = nestData;
  },



  // --------------------------- DRAW FUNCTION ---------------------------



  drawFunction: (ctx, virtualWidth, virtualHeight, data) => {
    if (
      !data ||
      !data.finalPanels ||
      !data.nestData
    ) {
      ctx.fillText('Nesting data not available', 800, 800);
      return;
    }

    //const { nestData } = nestData;
    drawNest(ctx, data.nestData, data.finalPanels.panels, data.fabricWidth);
  }
};