import React, { useState, useEffect, useRef, useImperativeHandle, useId } from "react";

// --- Helpers ---

export function deepNumberify(obj) {
  if (Array.isArray(obj)) return obj.map(deepNumberify);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = deepNumberify(v);
    return out;
  }
  if (typeof obj === "string" && obj.trim() !== "" && !isNaN(obj)) return Number(obj);
  return obj;
}

// --- Hooks ---

/**
 * Manages the product attributes state, hydration, and exposes it via formRef.
 */
export function useProductAttribute({ formRef, hydrate, defaults }) {
  const [attributes, setAttributes] = useState(() => ({
    ...defaults,
    ...deepNumberify(hydrate ?? {}),
  }));

  // Re-hydrate if the prop changes (e.g. async load)
  useEffect(() => {
    if (hydrate && Object.keys(hydrate).length > 0) {
      setAttributes((prev) => ({
        ...prev,
        ...deepNumberify(hydrate),
      }));
    }
  }, [hydrate]);

  // Helper setter: setAttr("length")(123)
  const setAttr = (key) => (value) =>
    setAttributes((prev) => ({ ...prev, [key]: value }));

  // Expose state to parent
  useImperativeHandle(
    formRef,
    () => ({
      getValues: () => ({
        attributes: deepNumberify(attributes),
      }),
    }),
    [attributes]
  );

  return { attributes, setAttributes, setAttr };
}

/**
 * Manages Enter key navigation between fields.
 * Returns a `bind(name)` function to spread onto inputs.
 */
export function useFormNavigation(fieldOrder = []) {
  const inputRefs = useRef({});

  const handleKeyDown = (e, currentName) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const idx = fieldOrder.indexOf(currentName);
      if (idx > -1) {
        // Find next valid field in the order that exists in refs
        let nextEl = null;
        for (let i = idx + 1; i < fieldOrder.length; i++) {
           const nextName = fieldOrder[i];
           if (inputRefs.current[nextName]) {
             nextEl = inputRefs.current[nextName];
             break;
           }
        }
        
        if (nextEl) {
          nextEl.focus();
          try {
            nextEl.select();
          } catch (err) {
            // ignore
          }
        }
      }
    }
  };

  // Helper to easily bind ref and onKeyDown
  // Usage: <input {...nav.bind("fieldName")} />
  const bind = (name) => ({
    ref: (el) => (inputRefs.current[name] = el),
    onKeyDown: (e) => handleKeyDown(e, name),
  });

  return { inputRefs, handleKeyDown, bind };
}

// --- Components ---

export function FormContainer({ children, className = "" }) {
  return <div className={`p-3 space-y-3 ${className}`}>{children}</div>;
}

export function Section({ title, children, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {title && <h3 className="font-medium opacity-80 mb-2">{title}</h3>}
      {children}
    </div>
  );
}



export const NumberInput = React.forwardRef(({
  label,
  value,
  onChange,
  name,
  nav, // result from useFormNavigation
  className = "",
  wrapperClassName = "",
  placeholder,
  ...props
}, ref) => {
  const uniqueId = useId();
  const inputId = props.id || uniqueId;
  
  return (
    <div className={wrapperClassName}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-bold text-gray-700 mb-1 cursor-pointer select-none"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={`inputStyle w-full ${className}`}
        type="number"
        step="any"
        inputMode="decimal"
        placeholder="" /* Explicitly remove placeholder for clarity as requested */
        value={value ?? ""}
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber;
          onChange(Number.isNaN(v) ? null : v);
        }}
        autoComplete="off"
        {...(nav ? nav.bind(name) : {})}
        {...props}
      />
    </div>
  );
});

export const TextInput = React.forwardRef(({ 
  label, 
  value, 
  onChange,   
  name,
  nav, 
  className = "",
  wrapperClassName = "",
  placeholder,
  ...props 
}, ref) => {
  const uniqueId = useId();
  const inputId = props.id || uniqueId;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-bold text-gray-700 mb-1 cursor-pointer select-none"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={`inputStyle w-full ${className}`}
        type="text"
        placeholder="" /* Explicitly remove placeholder for clarity as requested */
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        {...(nav ? nav.bind(name) : {})}
        {...props}
      />
    </div>
  );
});

export const SelectInput = React.forwardRef(({ 
    label, 
    value, 
    onChange, 
    options = [], 
    name,
    nav,
    className = "",
    wrapperClassName = "",
    ...props 
}, ref) => {
  const uniqueId = useId();
  const inputId = props.id || uniqueId;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-bold text-gray-700 mb-1 cursor-pointer select-none"
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        ref={ref}
        className={`inputStyle w-full h-[46px] ${className}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        {...(nav ? nav.bind(name) : {})}
        {...props}
      >
        {options.map((opt) => (
          typeof opt === 'string' 
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
});



export function CheckboxInput({ label, checked, onChange, ...props }) {
  return (
    <label className="flex items-center space-x-2 cursor-pointer mt-2 group select-none">
      <input
        type="checkbox"
        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition duration-150 ease-in-out"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...props}
      />
      <span className="text-sm font-bold text-gray-700 md:text-base group-hover:text-blue-700 transition-colors">{label}</span>
    </label>
  );
}

export function ButtonGroup({ children }) {
    return <div className="flex items-center space-x-6 mt-2">{children}</div>
}
