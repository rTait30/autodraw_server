import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/auth';
import { Button } from '../components/ui';
import { TextInput, SelectInput, FormContainer } from '../components/FormUI';
import GenericTable from '../components/GenericTable';

function Users() {
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  const [createMsg, setCreateMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (role !== 'admin') {
      navigate('/copelands/projects');
    } else {
      fetchUsers();
    }
  }, [role, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (username) => {
    try {
      const res = await apiFetch('/verify_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        alert('User verified!');
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to verify user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/register_staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCreateMsg('Staff user created!');
        setNewUsername('');
        setNewPassword('');
        setNewRole('');
        fetchUsers();
      } else {
        setCreateMsg(data.error || 'Failed to create user.');
      }
    } catch (err) {
      console.error(err);
      setCreateMsg('Error creating user.');
    }
  };

  if (role !== 'admin') return null;

  const columns = [
      { header: 'Username', accessor: 'username', headerClassName: 'w-1/4' },
      { header: 'Role', accessor: 'role', headerClassName: 'w-1/4' },
      { 
          header: 'Verified', 
          headerClassName: 'w-1/4',
          render: (user) => (
             <span className={`px-2 py-1 rounded text-xs font-bold ${user.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {user.verified ? 'Yes' : 'No'}
            </span>
          ) 
      },
      {
          header: 'Actions',
          headerClassName: 'w-1/4',
          render: (user) => (
              !user.verified && (
                <button 
                    onClick={(e) => { e.stopPropagation(); handleVerify(user.username); }} 
                    className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 text-sm font-medium transition-colors"
                >
                    Verify
                </button>
              )
          )
      }
  ];

  const roleOptions = [
      { label: 'Select Role', value: '' },
      { label: 'Designer', value: 'designer' },
      { label: 'Estimator', value: 'estimator' },
      { label: 'Admin', value: 'admin' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Management</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">All Users</h3>
        </div>
        {loading ? (
          <p className="p-6 text-gray-500 dark:text-gray-400">Loading users...</p>
        ) : (
          <GenericTable 
            columns={columns} 
            data={users} 
            keyFn={(u) => u.username} 
            className="border-none shadow-none rounded-none"
          />
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create Staff User</h3>
        <form onSubmit={handleCreate} className="max-w-md space-y-4">
            <FormContainer>
                <TextInput
                    label="Username"
                    value={newUsername}
                    onChange={setNewUsername}
                    required
                />
                <TextInput
                    label="Password"
                    type="password"
                    value={newPassword}
                    onChange={setNewPassword}
                    required
                />
                <SelectInput
                    label="Role"
                    value={newRole}
                    onChange={setNewRole}
                    options={roleOptions}
                    required
                />
            </FormContainer>
            
            <div className="pt-2">
                <Button type="submit">Create User</Button>
            </div>
        </form>
        {createMsg && (
            <div className={`mt-4 text-sm font-medium ${createMsg.includes('created') ? 'text-green-600' : 'text-red-500'}`}>
                {createMsg}
            </div>
        )}
      </div>
    </div>
  );
}

export default Users;
