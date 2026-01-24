import React, { useEffect, useState } from 'react';
import '../styles/index.css';
import { apiFetch } from '../services/auth';
import { useNavigate } from 'react-router-dom';

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

  return (
    <div className="page p-8 max-w-4xl mx-auto">
      <h1 className="headingStyle mb-6">User Management</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold mb-4 dark:text-white">All Users</h3>
        {loading ? (
          <p className="dark:text-gray-300">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="dark:text-gray-300">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tableBase w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Username</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Verified</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.username} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="p-2">{user.username}</td>
                    <td className="p-2">{user.role}</td>
                    <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.verified ? 'Yes' : 'No'}
                        </span>
                    </td>
                    <td className="p-2">
                      {!user.verified && (
                        <button onClick={() => handleVerify(user.username)} className="text-blue-600 hover:underline dark:text-blue-400 text-sm font-medium">Verify</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mt-8">
        <h3 className="text-xl font-bold mb-4 dark:text-white">Create Staff User</h3>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 max-w-md">
          <input
            type="text"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
            className="inputStyle"
          />
          <input
            type="password"
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="inputStyle"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            required
            className="inputStyle"
          >
            <option value="">Select Role</option>
            <option value="designer">Designer</option>
            <option value="estimator">Estimator</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="buttonStyle">Create User</button>
        </form>
        {createMsg && <div className={`mt-4 text-sm font-medium ${createMsg.includes('created') ? 'text-green-600' : 'text-red-500'}`}>{createMsg}</div>}
      </div>
    </div>
  );
}

export default Users;
