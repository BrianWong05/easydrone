import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  // 如果還在載入中，顯示載入畫面
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">載入中...</div>
      </div>
    );
  }

  // 如果未認證，重定向到登入頁面
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 如果已認證，渲染子組件
  return children;
};

export default ProtectedRoute;