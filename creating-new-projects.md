
# 🧩 Creating New Project Types

This system supports modular, self-contained project types for drawing and estimation. Each project type is defined in its own folder using a simple structure.

Each form passes its variables to a Steps.js file in its folder that allows calculations and visualisations in a canvas if provided.

---

## 📁 Folder Structure

Place your new project type inside:

```
/components/projects/<projectTypeId>/
├── Form.jsx       # Required: user input form
└── Steps.js       # Required: calculation and drawing steps
```

Example:

```
/components/projects/calculator/
├── Form.jsx
└── Steps.js
```

---

## 📄 Form.jsx

This react component allows you to define any arbitrary field in the formData useState variable and return a form to edit them, the rest is just boilerplate code you can copy paste and leave as is

### ✅ Example

```
import React, { useState, forwardRef, useImperativeHandle } from 'react';

const Form = forwardRef((props, ref) => {
  const [formData, setFormData] = useState({
    width: 100,
    height: 200,
  });

  useImperativeHandle(ref, () => ({
    getData: () => formData,
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: Number(value) }));
  };

  return (
    <div>
      <label>
        Width:
        <input name="width" type="number" className="inputStyle" value={formData.width} onChange={handleChange} />
      </label>
      <label>
        Height:
        <input name="height" type="number" className="inputStyle" value={formData.height} onChange={handleChange} />
      </label>
    </div>
  );
});

export default Form;
```

---

## 📄 Steps.js

Defines a list of calculation and drawing steps. Each step has:

- `title`: string
- `calcFunction(data)`: returns a new object with updated fields
- `drawFunction(ctx, data)`: draws to canvas (optional)

### ✅ Example

```
export const steps = [
  {
    title: 'Step 1: Compute Area',
    calcFunction: (data) => {
      return { ...data, area: data.width * data.height };
    },
    drawFunction: (ctx, data) => {
      ctx.fillStyle = '#007BFF';
      ctx.fillRect(50, yOffset, data.width / 10, data.height / 10);
    }
  },
  {
    title: 'Step 2: Add Padding',
    calcFunction: (data) => {
      return { ...data, paddedArea: data.area + 1000 };
    },
    drawFunction: (ctx, data) => {
      ctx.fillStyle = '#FF5733';
      ctx.fillText(`Padded: ${data.paddedArea}`, 50, yOffset + 20);
    }
  }
];
```

---

## ✅ Register the Project Type

In `NewProject.jsx`, add your type to `projectTypes`:

```
{ name: 'Calculator', id: 'calculator' }
{ name: 'Simple Box', id: 'simplebox' }
```

---

## 📤 Submission Payload Format

The system automatically sends:

```
{
  "type": "calculator",
  "name": "...",
  "due_date": "...",
  "client_id": "...",
  "attributes": { "width": 100, "height": 200 },
  "calculated": { "area": 20000, "paddedArea": 21000 }
}
```

Redundant fields already present in attributes or general data are stripped from `calculated`.

---

## 💡 Tips

- Chain step outputs: e.g., `step 2` can use values from `step 1`.
- `getData()` must return primitive-serializable values.
- In your forms use global tailwind classes from /styles/index.css like `.inputStyle` and `.buttonStyle` for consistent design.
