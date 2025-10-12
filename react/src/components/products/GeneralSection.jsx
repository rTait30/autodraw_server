import React, { useImperativeHandle, forwardRef, useEffect, useMemo, useState, useRef, setField } from 'react';

const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "",
  due_date: "",
  info: "",
});

export function GeneralSection({ data, setData = () => {} }) {
  // Never read directly from possibly-null `data`
  const safe = data ?? GENERAL_DEFAULTS;

  //console.log("Pretty JSON:\n", JSON.stringify(safe, null, 2));

  const handleChange = (e) => {
    const { name, type, value: val, checked } = e.target;
    const next = type === "checkbox" ? checked : val;

    setData((prev) => ({
      ...(prev ?? GENERAL_DEFAULTS), // <-- null-safe base
      [name]: next,
    }));
  };

  const shouldShowClient = false; // TEMP DISABLE CLIENT SELECT

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium mb-1">Project Name</label>
        <input
          name="name"
          type="text"
          className="inputStyle"
          value={safe.name ?? ""}
          onChange={handleChange}
        />
      </div>

      {shouldShowClient && (
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          <select
            name="client_id"
            className="inputStyle"
            value={safe.client_id ?? ""}
            onChange={handleChange}
          >
            <option value="">Select client</option>
            {/* map clients here if/when you enable them */}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Due Date</label>
        <input
          name="due_date"
          type="date"
          className="inputStyle"
          value={safe.due_date ?? ""}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Info</label>
        <input
          name="info"
          type="text"
          className="inputStyle"
          value={safe.info ?? ""}
          onChange={handleChange}
          placeholder="Notes or special instructions"
        />
      </div>
    </div>
  );
}
