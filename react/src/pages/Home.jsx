import React, { useEffect, useState } from 'react';

function Home() {
  const name = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('access_token');

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
      const res = await fetch('/copelands/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setUsers([]);
      setLoading(false);
    }
  };

  const handleVerify = async (username) => {
    try {
      const res = await fetch('/copelands/api/verify_user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        alert('User verified!');
        fetchUsers();
      } else {
        alert('Failed to verify user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/copelands/api/register_staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      if (res.ok) {
        setCreateMsg('Staff user created!');
        setNewUsername('');
        setNewPassword('');
        setNewRole('');
        fetchUsers();
      } else {
        const data = await res.json();
        setCreateMsg(data.error || 'Failed to create user.');
      }
    } catch (err) {
      console.error(err);
      setCreateMsg('Error creating user.');
    }
  };

  return (
    <div>
      <h1>Hello {name}, you are {role}</h1>

      {role === 'admin' && (
        <div style={{ marginTop: '40px' }}>
          <h3>All Users</h3>
          {loading ? (
            <p>Loading users...</p>
          ) : users.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <table border="1" style={{ borderCollapse: 'collapse', width: '100%' }}>
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
                        <button onClick={() => handleVerify(user.username)}>Verify</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <hr style={{ margin: '40px 0' }} />

          <h3>Create Staff User</h3>
          <form onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              required
            >
              <option value="">Select Role</option>
              <option value="designer">Designer</option>
              <option value="estimator">Estimator</option>
            </select>
            <button type="submit">Create</button>
          </form>
          {createMsg && <div>{createMsg}</div>}
        </div>
      )}
    </div>
  );
}

export default Home;