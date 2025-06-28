import React from 'react';
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children }) {
  const isLoggedIn = !!localStorage.getItem('access_token');
  console.log('PrivateRoute', isLoggedIn);

  return isLoggedIn ? children : <Navigate to="/copelands/react" />;
}

export default PrivateRoute;