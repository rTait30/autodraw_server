import React, { useState, useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken, refresh } from '../services/auth';

export default function RequireAuth() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Keep track of the last verification time to avoid spamming the refresh endpoint.
  const lastCheck = useRef(Date.now());

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check if we already have a valid token in memory
      if (getAccessToken()) {
        setIsAuthenticated(true);
        setIsChecking(false);
        return;
      }

      // 2. If not, try to refresh the session (use httpOnly cookie)
      const success = await refresh();
      setIsAuthenticated(success);
      setIsChecking(false);
      lastCheck.current = Date.now();
    };

    checkAuth();
  }, []);

  // 3. Re-verify session when the user returns to the tab (focus/visibility).
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // If it has been more than 1 minute (access token lifetime) since the last check,
        // we force a refresh to confirm the session (refresh cookie) is still valid.
        const timeSinceLastCheck = Date.now() - lastCheck.current;
        console.log(`[RequireAuth] Visible. Time since last check: ${timeSinceLastCheck/1000}s`);
        
        // 1 minutes in ms (TESTING)
        if (timeSinceLastCheck > 1 * 60 * 1000) {
           console.log("[RequireAuth] Triggering stale session check...");
           const success = await refresh();
           lastCheck.current = Date.now();
           
           if (!success) {
             // If refresh failed (e.g. 14 days expired), force user to login page immediately.
             console.error("[RequireAuth] Session expired (> 5m). Redirecting to login.");
             setIsAuthenticated(false);
             navigate('/copelands');
           } else {
             console.log("[RequireAuth] Session verified and refreshed.");
           }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [navigate]);

  if (isChecking) {
    return null; // or <div className="loading">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/copelands/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
