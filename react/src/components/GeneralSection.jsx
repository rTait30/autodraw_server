import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../services/auth.js';
import { SelectInput, TextInput } from './FormUI';

const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: 0,
  due_date: "",
  info: "",
  status: "awaiting_deposit",
});

const STATUS_OPTIONS = [
  { value: "awaiting_deposit", label: "1.1 Awaiting Deposit" },
  { value: "on_hold", label: "1.2 On Hold" },
  { value: "request_deposit", label: "1.3 Request Deposit" },
  { value: "in_design", label: "2.1 In Design" },
  { value: "sent_for_approval", label: "2.2 Sent for approval" },
  { value: "customer_approved", label: "2.3 Customer Approved" },
  { value: "awaiting_materials", label: "3.1 Awaiting Materials" },
  { value: "waiting_to_start", label: "3.2 Waiting to Start" },
  { value: "in_progress", label: "4.1 In Progress" },
  { value: "completion_invoice", label: "4.2 Completion Invoice" },
  { value: "awaiting_final_payment", label: "5.1 Awaiting Final Payment" },
  { value: "ready_for_despatch", label: "5.2 Ready For Despatch" },
  { value: "cancelled", label: "5.3 Cancelled" },
  { value: "completed", label: "5.4 Completed" },
];

export function GeneralSection({ data, setData = () => {} }) {
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState(null);
  
  const role = localStorage.getItem('role');
  const staffFields = (role === 'estimator' || role === 'admin' || role === 'designer');

  // Fetch clients on mount if user is staff
  useEffect(() => {
    if (staffFields) {
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

  const updateField = (name) => (nextValue) => {
    setData((prev) => {
      const base = { ...GENERAL_DEFAULTS, ...(prev ?? {}) };
      return { ...base, [name]: nextValue };
    });
  };

  return (
    <div className="space-y-4">
      <TextInput
        label="Project Name"
        value={safe.name}
        onChange={updateField("name")}
      />

      {staffFields && (
        <>
          <div>
            <SelectInput
              label="Client"
              value={safe.client_id}
              onChange={updateField("client_id")}
              options={[
                { value: "", label: "None" },
                ...clients.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
            {clientsError && (
              <div className="text-red-500 text-sm mt-1">
                Error loading clients: {clientsError}
              </div>
            )}
          </div>

          <SelectInput
            label="Status"
            value={safe.status}
            onChange={updateField("status")}
            options={[{ value: "", label: "Select status" }, ...STATUS_OPTIONS]}
          />
        </> // End of staffFields block
      )}

      <TextInput
        label="Due Date"
        type="date"
        value={safe.due_date}
        onChange={updateField("due_date")}
      />

      <TextInput
        label="Info"
        value={safe.info}
        onChange={updateField("info")}
        placeholder="Notes or special instructions"
      />
    </div>
  );
}
