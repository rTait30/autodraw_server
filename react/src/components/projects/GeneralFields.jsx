import React, { useImperativeHandle, useState, forwardRef, useEffect } from 'react';

import { apiFetch } from '../../services/auth';

const GeneralFields = forwardRef(({ role }, ref) => {

  const [state, setState] = useState({
    name: '',
    due_date: '',
    info: '',
  });

  const [clients, setClients] = useState([]);

  useEffect(() => {
    let ignore = false;

    if (role === 'client') {
      setClients([]);
      return;
    }

    (async () => {
      try {
        const res = await apiFetch('/clients'); // staff-only endpoint
        if (!res.ok) throw new Error('Failed to load clients');
        const data = await res.json();
        if (!ignore) setClients(data);
      } catch (e) {
        console.error(e);
        if (!ignore) setClients([]);
      }
    })();

    return () => { ignore = true; };
  }, [role]);

  useImperativeHandle(ref, () => ({
    getData: () => {
      // For clients, do not send client or client_id
      return {
        name: state.name,
        due_date: state.due_date,
        info: state.info,
        // Only staff will send client_id, but you can remove it for clients
        ...(role !== 'client' && { client_id: state.client_id }),
      };
    },
  }));

  const update = (key) => (e) =>
    setState((s) => ({ ...s, [key]: e.target.value }));

  return (
    <div>
      <div>
        <label>Project Name</label>
        <input
          type="text"
          className="inputStyle"
          value={state.name}
          onChange={update('name')}
        />
      </div>

      {role !== 'client' && (
        <div>
          <label>Client</label>
          <select
            className="inputStyle"
            value={state.client_id || ''}
            onChange={e => setState(s => ({ ...s, client_id: e.target.value }))}
          >
            <option value="">Select client</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label>Info</label>
        <input
          type="text"
          className="inputStyle"
          value={state.info}
          onChange={update('info')}
        />
      </div>
    </div>
  );
});

export default GeneralFields;