import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const FIRST_LOGIN_PATH = '/auth/first-login-change-password';

/**
 * Route guard. Keeps /login as the single entry point, enforces the first-login
 * password change, and optionally restricts by role.
 * @param {{ children: React.ReactNode, allowedRoles?: string[] }} props
 */
const RequireAuth = ({ children, allowedRoles }) => {
  const { isAuthenticated, mustChangePassword, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // First-login password change cannot be dismissed.
  if (mustChangePassword && location.pathname !== FIRST_LOGIN_PATH) {
    return <Navigate to={FIRST_LOGIN_PATH} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RequireAuth;
