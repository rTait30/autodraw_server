import React, { useImperativeHandle, useState, forwardRef, useEffect } from 'react';
import { getBaseUrl } from '../../utils/baseUrl';

const GeneralFields = forwardRef(({ role }, ref) => {
  const initialClient = role === 'client'
    ? localStorage.getItem('username') || ''
    : '';
  const initialClientId = role === 'client'
    ? localStorage.getItem('id') || ''
    : '';

  const [state, setState] = useState({
    name: '',
    due_date: '',
    client: initialClient,
    client_id: initialClientId,
    info: '',
  });

  const [clients, setClients] = useState([]);
  useEffect(() => {
    if (role !== 'client') {
      fetch(`${getBaseUrl('/api/clients')}`)
        .then(res => res.json())
        .then(setClients);
    }
  }, [role]);

  useImperativeHandle(ref, () => ({
    getData: () => {
      if (role === 'client') {
        return {
          ...state,
          client: localStorage.getItem('username') || '',
        };
      }
      return state;
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
            value={state.client_id}
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