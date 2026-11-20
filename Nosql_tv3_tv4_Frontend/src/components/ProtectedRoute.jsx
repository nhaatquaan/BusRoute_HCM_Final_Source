import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = authService.getUserRole();
    if (!allowedRoles.includes(userRole)) {
      // Điều hướng an toàn về portal đúng vai trò của người dùng
      if (userRole === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      if (userRole === 'operator') {
        return <Navigate to="/operator/dashboard" replace />;
      }
      return <Navigate to="/portal" replace />;
    }
  }

  return children;
}
