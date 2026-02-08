import React, { useState, useEffect, useRef, useImperativeHandle, useId } from "react";
// Shared styles imported via CSS classes (see src/styles/index.css)

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
        // Find next valid field in the order that exists in refs, handling wrap-around
        let nextEl = null;
        for (let i = 1; i < fieldOrder.length; i++) {
           const nextIdx = (idx + i) % fieldOrder.length;
           const nextName = fieldOrder[nextIdx];
           if (inputRefs.current[nextName]) {
             nextEl = inputRefs.current[nextName];
             break;
           }
        }
        
        if (nextEl) {
          nextEl.focus();
          // Ensure the field is visible (center on screen)
          nextEl.scrollIntoView({ behavior: "smooth", block: "center" });
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

// --- Number Input ---
export function NumberInput({
  label,
  value,
  onChange,
  name,
  nav, 
  className = "",
  wrapperClassName = "",
  placeholder,
  ref,
  ...props
}) {
  const uniqueId = useId();
  const inputId = props.id || uniqueId;
  
  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        type="number"
        step="any"
        inputMode="decimal"
        className={`input-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
        placeholder={placeholder || ""}
        value={value ?? ""}
        onFocus={(e) => e.target.select()}
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
}

// --- Text Input ---
export function TextInput({ 
  label, 
  value, 
  onChange,   
  name,
  nav, 
  className = "",
  wrapperClassName = "",
  placeholder,
  ref, 
  ...props 
}) {
  const uniqueId = useId();
  const inputId = props.id || uniqueId;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        type="text"
        name={name}
        className={`input-base ${className}`}
        placeholder={placeholder || ""}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        {...(nav ? nav.bind(name) : {})}
        {...props}
      />
    </div>
  );
}

export function SelectInput({ 
    label, 
    value, 
    onChange, 
    options = [], 
    name,
    nav,
    className = "",
    wrapperClassName = "",
    ref, 
    ...props 
}) {
  const uniqueId = useId();
  const inputId = props.id || uniqueId;

  return (
    <div className={`flex flex-col ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          id={inputId}
          ref={ref}
          // 'pr-10' makes room for the chevron so text doesn't overlap it
          className={`input-base appearance-none cursor-pointer pr-10 ${className}`}
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

        {/* Custom Chevron - pointer-events-none ensures clicks pass through to the select */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 dark:text-gray-400">
          <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function CheckboxInput({ label, checked, onChange, ...props }) {
  return (
    // h-12 (48px) matches the height of our TextInputs exactly.
    // rounded-lg matches the curvature of the inputs.
    // hover:bg-gray-50 gives a tactile feel when hovering.
    <label className="flex items-center h-12 px-3 -ml-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group select-none">
      <input
        type="checkbox"
        className="
          appearance-none
          w-6 h-6 border-2 border-gray-300 rounded 
          bg-white checked:bg-primary checked:border-primary
          dark:bg-gray-700 dark:border-gray-500 dark:checked:bg-primary dark:checked:border-primary
          focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none
          transition duration-75 ease-out
        "
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...props}
      />
      
      {/* Custom Checkmark Icon (Tailwind doesn't give you one by default for custom checkboxes) */}
      <svg
        className={`absolute w-6 h-6 pointer-events-none text-white transition-opacity duration-75 ${checked ? 'opacity-100' : 'opacity-0'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>

      <span className="ml-3 text-base font-bold text-gray-700 group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white">
        {label}
      </span>
    </label>
  );
}

export function ButtonGroup({ children }) {
    return <div className="flex items-center space-x-6 mt-2">{children}</div>
}

export function FormSection({ title, children, className = "" }) {
  return (
    <div className={`mb-8 ${className}`}>
      {title && (
        <h3 className="heading-section">
          {title}
        </h3>
      )}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

/**
 * Enforces the horizontal rhythm.
 * - 'columns' defaults to 1, but can be 2, 3, etc.
 * - 'gap-6' (24px) is the standard distance between inputs.
 */
export function FormGrid({ children, columns = 1, className = "" }) {
  // Map simple number prop to Tailwind grid class
  const colsMap = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2", // Mobile: 1 col, Desktop: 2 cols
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <div className={`grid gap-6 ${colsMap[columns]} ${className}`}>
      {children}
    </div>
  );
}

// --- Compact Inputs ---
export function CompactTextInput({ className = "", ...props }) {
  // Styles for a compact input used in dense tables/forms
  // p-2 border border-warm-grey rounded text-left h-10 md:h-8 px-2 
  // text-base md:text-xs 
  // transition-all duration-100 ease-in-out 
  // focus:bg-yellow-100 focus:scale-[1.01] focus:shadow-md focus:border-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none

  return (
    <input
      type="text"
      className={`
        input-compact
        ${className}
      `}
      {...props}
    />
  );
}

export function CompactNumberInput({ className = "", ...props }) {
    return (
      <input
        type="number"
        className={`
          input-compact
          ${className}
        `}
        step="any"
        {...props}
      />
    );
  }

  export function CompactSelectInput({ options = [], className = "", ...props }) {
    return (
        <select
            className={`
                input-compact
                ${className}
            `}
            {...props}
        >
            {options.map((opt) => (
                typeof opt === 'string'
                ? <option key={opt} value={opt}>{opt}</option>
                : <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
}

// --- Table Components ---
export function SimpleTable({ children, className = "", ...props }) {
    return (
        <table 
            className={`
                table-base
                ${className}
            `} 
            {...props}
        >
            {children}
        </table>
    );
}

export function SimpleTh({ children, className = "", align = "left", ...props }) {
    const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
    return (
        <th 
            className={`
                table-header
                ${alignClass}
                ${className}
            `}
            {...props}
        >
            {children}
        </th>
    );
}

export function SimpleTd({ children, className = "", align = "left", ...props }) {
    const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
    return (
        <td 
            className={`
                table-cell
                ${alignClass}
                ${className}
            `}
            {...props}
        >
            {children}
        </td>
    );
}
