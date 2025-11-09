import React, { useImperativeHandle, forwardRef, useEffect, useMemo, useState, useRef, setField } from 'react';

import { apiFetch } from '../services/auth.js';

const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: 0,
  due_date: "",
  info: "",
  // Add other default fields as needed
});


export function GeneralSection({ data, setData = () => {} }) {
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState(null);

  // Fetch clients on mount if user is estimator/admin
  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role === 'estimator' || role === 'admin' || role === 'designer') {
      apiFetch('/clients')
        .then(res => res.json())
        .then(data => setClients(data))
        .catch(err => {
          console.error('Failed to fetch clients:', err);
          setClientsError(err.message);
        });
    }
  }, []);

  // Always return all general fields, defaulting to empty string if not present
  const safe = useMemo(() => {
    const base = { ...GENERAL_DEFAULTS };
    if (data && typeof data === 'object') {
      Object.keys(base).forEach((key) => {
        // Use type from default if missing
        base[key] = data[key] !== undefined ? data[key] : GENERAL_DEFAULTS[key];
      });
    }
    return base;
  }, [data]);

  const handleChange = (e) => {
    const { name, type, value: val, checked } = e.target;
    const next = type === "checkbox" ? checked : val;
    setData((prev) => {
      const base = { ...GENERAL_DEFAULTS, ...(prev ?? {}) };
      return { ...base, [name]: next };
    });
  };

  const shouldShowClient = (localStorage.getItem('role') === "estimator" || 
                          localStorage.getItem('role') === "admin" || 
                          localStorage.getItem('role') === "designer");

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium mb-1">Project Name</label>
        <input
          name="name"
          type="text"
          className="inputStyle"
          value={safe.name}
          onChange={handleChange}
        />
      </div>

      {shouldShowClient && (
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          <select
            name="client_id"
            className="inputStyle"
            value={safe.client_id}
            onChange={handleChange}
          >
            <option value="">Select client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {clientsError && (
            <div className="text-red-500 text-sm mt-1">
              Error loading clients: {clientsError}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Due Date</label>
        <input
          name="due_date"
          type="date"
          className="inputStyle"
          value={safe.due_date}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Info</label>
        <input
          name="info"
          type="text"
          className="inputStyle"
          value={safe.info}
          onChange={handleChange}
          placeholder="Notes or special instructions"
        />
      </div>
    </div>
  );
}
