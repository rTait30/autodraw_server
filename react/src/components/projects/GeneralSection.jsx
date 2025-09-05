// GeneralSection.jsx (or inline above your fields)
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/auth';

export function GeneralSection({ role, formData, setField }) {
  const [clients, setClients] = useState([]);

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
