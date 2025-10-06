// GeneralSection.jsx
/*
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/auth';

export function GeneralSection({ formData, setField }) {
  const [clients, setClients] = useState([]);

  const role = localStorage.getItem('role')
  console.log("role", role)
  const clientId = localStorage.getItem('client_id') ?? null;

  useEffect(() => {
    let ignore = false;
    if (role === 'client') {
      setClients([]);
      return;
    }
    (async () => {
      try {
        const res = await apiFetch('/clients');
        if (!res.ok) throw new Error('Failed to load clients');
        const data = await res.json();
        if (!ignore) setClients(Array.isArray(data) ? data : []);
      } catch {
        if (!ignore) setClients([]);
      }
    })();
    return () => { ignore = true; };
  }, [role]);

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium mb-1">Project Name</label>
        <input
          type="text"
          className="inputStyle"
          value={formData.name ?? ''}
          onChange={(e) => setField('name', e.target.value)}
        />
      </div>

      {role !== 'client' && (
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          <select
            className="inputStyle"
            value={formData.client_id ?? ''}
            onChange={(e) => setField('client_id', e.target.value)}
          >
            <option value="">Select client</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {role === 'client' && (
        // hidden input or display for client users
        <input type="hidden" value={clientId ?? ''} />
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Due Date</label>
        <input
          type="date"
          className="inputStyle"
          value={formData.due_date ?? ''}
          onChange={(e) => setField('due_date', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Info</label>
        <input
          type="text"
          className="inputStyle"
          value={formData.info ?? ''}
          onChange={(e) => setField('info', e.target.value)}
          placeholder="Notes or special instructions"
        />
      </div>
    </div>
  );
}

*/

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

  /*

  const {
    clientsEndpoint = '/clients',
    showClientForRoles, // if omitted: shown for all non-client roles
  } = config || {};

  const [clients, setClients] = useState([]);

  const role = localStorage.getItem('role')

  const shouldShowClient =
    role && role !== 'client' &&
    (Array.isArray(showClientForRoles) ? showClientForRoles.includes(role) : true);


  useEffect(() => {
    let ignore = false;
    if (!shouldShowClient) {
      setClients([]);
      return;
    }
    (async () => {
      try {
        const res = await apiFetch(clientsEndpoint);
        if (!res.ok) throw new Error('Failed to load clients');
        const data = await res.json();
        if (!ignore) setClients(Array.isArray(data) ? data : []);
      } catch {
        if (!ignore) setClients([]);
      }
    })();
    return () => { ignore = true; };
  }, [shouldShowClient, clientsEndpoint]);

  */

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
