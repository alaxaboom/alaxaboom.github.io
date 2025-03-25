import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/altMain" replace />;
};

export default ProtectedRoute;