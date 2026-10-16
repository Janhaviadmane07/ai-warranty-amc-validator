import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/Shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserDashboardPage from './pages/UserDashboardPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import MyCasesPage from './pages/MyCasesPage';
import CaseDetailPage from './pages/CaseDetailPage';
import SuggestionsPage from './pages/SuggestionsPage';
import ManagerUsersPage from './pages/ManagerUsersPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import DocumentsPage from './pages/DocumentsPage';
import ValidationPage from './pages/ValidationPage';
import ContractsPage from './pages/ContractsPage';
import RenewalsPage from './pages/RenewalsPage';
import VendorsPage from './pages/VendorsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import UserRequestsPage from './pages/UserRequestsPage';
import ManagerMonitoringPage from './pages/ManagerMonitoringPage';
import ManagerDetailPage from './pages/ManagerDetailPage';
import TaskAssignmentPage from './pages/TaskAssignmentPage';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const storedUser = localStorage.getItem('warrantyiq_user');
      const token = localStorage.getItem('warrantyiq_token');
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
        loadNotifications();
      } else {
        const me = await api.getMe();
        setUser(me);
        loadNotifications();
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      // ignore
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('warrantyiq_token');
    localStorage.removeItem('warrantyiq_user');
    setUser(null);
  };

  if (loadingUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-sm">
        Initializing WarrantyIQ decision system...
      </div>
    );
  }

  const role = user?.role || 'User';
  const isAdmin = role === 'Administrator';
  const isManager = role === 'Contract Manager';
  const isUser = role === 'User';

  const defaultHomeRoute = isUser 
    ? '/user-dashboard' 
    : isManager 
    ? '/manager-dashboard' 
    : '/dashboard';

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={defaultHomeRoute} replace />
            ) : (
              <LoginPage onLoginSuccess={(u) => { setUser(u); loadNotifications(); }} />
            )
          }
        />

        {/* Protected Application Routes under Shell */}
        <Route
          path="/*"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : (
              <Shell user={user} onLogout={handleLogout} notifications={notifications}>
                <Routes>
                  {/* Default entry redirects to role specific home */}
                  <Route path="/" element={<Navigate to={defaultHomeRoute} replace />} />

                  {/* 3 Dedicated Dashboards */}
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/user-dashboard" element={<UserDashboardPage />} />
                  <Route path="/manager-dashboard" element={<ManagerDashboardPage />} />

                  {/* Review Cases Workflow (User, Manager, Admin) */}
                  <Route path="/my-cases" element={<MyCasesPage />} />
                  <Route path="/my-cases/:id" element={<CaseDetailPage />} />
                  <Route path="/manager/cases" element={<MyCasesPage />} />

                  {/* Suggestions & Recommendations */}
                  <Route path="/suggestions" element={<SuggestionsPage />} />

                  {/* Manager Assigned Users */}
                  <Route path="/manager/users" element={<ManagerUsersPage />} />

                  {/* Shared Operations */}
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route path="/assets/:id" element={<AssetDetailPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/documents/upload" element={<DocumentsPage />} />
                  <Route path="/validation" element={<ValidationPage />} />
                  <Route path="/validation/:id" element={<ValidationPage />} />
                  <Route path="/contracts" element={<ContractsPage />} />
                  <Route path="/renewals" element={<RenewalsPage />} />
                  <Route path="/vendors" element={<VendorsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Admin Governance */}
                  <Route
                    path="/admin/user-requests"
                    element={isAdmin ? <UserRequestsPage /> : <Navigate to={defaultHomeRoute} replace />}
                  />
                  <Route
                    path="/admin/users"
                    element={isAdmin ? <UserManagementPage /> : <Navigate to={defaultHomeRoute} replace />}
                  />
                  <Route
                    path="/admin/managers"
                    element={isAdmin ? <ManagerMonitoringPage /> : <Navigate to={defaultHomeRoute} replace />}
                  />
                  <Route
                    path="/admin/managers/:id"
                    element={<ManagerDetailPage />}
                  />
                  <Route
                    path="/admin/tasks"
                    element={isAdmin ? <TaskAssignmentPage currentUser={user} /> : <Navigate to={defaultHomeRoute} replace />}
                  />

                  {/* Tasks / Workflow for Managers */}
                  <Route
                    path="/my-work"
                    element={<TaskAssignmentPage currentUser={user} />}
                  />

                  <Route path="*" element={<Navigate to={defaultHomeRoute} replace />} />
                </Routes>
              </Shell>
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
