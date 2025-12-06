import React, { useEffect, useState } from 'react';
import '../styles/index.css';

import { apiFetch } from '../services/auth';

function Home() {
  const name = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  const [createMsg, setCreateMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'admin') {
      fetchUsers();
    }
  }, [role]);

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


  return (
    <div className="page p-8">
      <h1 className= "text-center font-Cambria text-2xl mb-10 dark:text-white">Hello {name}, you are {role}</h1>

      {role === 'admin' && (
        <div className="mt-10">
          <h3 className="text-xl font-bold mb-4 dark:text-white">All Users</h3>
          {loading ? (
            <p className="dark:text-gray-300">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="dark:text-gray-300">No users found.</p>
          ) : (
            <table className="tableBase">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.username}>
                    <td>{user.username}</td>
                    <td>{user.role}</td>
                    <td>{user.verified ? 'Yes' : 'No'}</td>
                    <td>
                      {!user.verified && (
                        <button onClick={() => handleVerify(user.username)} className="text-blue-600 hover:underline dark:text-blue-400">Verify</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <hr className="my-10 border-gray-300 dark:border-gray-700" />

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
            </select>
            <button type="submit" className="buttonStyle">Create</button>
          </form>
          {createMsg && <div className="mt-4 text-sm dark:text-white">{createMsg}</div>}
        </div>
      )}
    </div>
  );
}

export default Home;
