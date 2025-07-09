import React, { useImperativeHandle, useState, forwardRef } from 'react';

const GeneralFields = forwardRef(({ role, userId }, ref) => {
  const [state, setState] = useState({
    name: '',
    due_date: '',
    client_id: role === 'client' ? userId : '',
    info: '',
  });

  useImperativeHandle(ref, () => ({
    getData: () => state,
  }));

  const update = (key) => (e) => setState((s) => ({ ...s, [key]: e.target.value }));

  return (
    <div>
      {/*  className="space-y-1" */}
      <div>
        <label>Project Name</label>
        <input type="text" className="inputStyle" value={state.name} onChange={update('name')} />
      </div>

      <div>
        <label>Client</label>
        {role === 'client' ? (
          <div>{userId}</div>
        ) : (
          <input type="text" className="inputStyle" value={state.client_id} onChange={update('client_id')} />
        )}
      </div>

      <div>
        <label>Info</label>
        <input type="text" className="inputStyle" value={state.info} onChange={update('info')} />
      </div>
      
    </div>
  );
});

export default GeneralFields;
