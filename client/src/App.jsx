import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import RealtimeBridge from './components/RealtimeBridge';
import ThemeSync from './components/ThemeSync';
import DashboardShell from './components/layout/DashboardShell';
import Spinner from './components/ui/Spinner';

// Code-split every page so heavy deps (e.g. recharts on Analytics, html2canvas on
// the receipt) load only when their route is visited.
const Landing = lazy(() => import('./pages/public/Landing'));
const Maintenance = lazy(() => import('./pages/public/Maintenance'));
const NotFound = lazy(() => import('./pages/NotFound'));

const BookWizard = lazy(() => import('./pages/user/BookWizard'));
const UserHistory = lazy(() => import('./pages/user/History'));
const UserSettings = lazy(() => import('./pages/user/Settings'));

const StaffDashboard = lazy(() => import('./pages/staff/Dashboard'));
const StaffHistory = lazy(() => import('./pages/staff/History'));
const StaffSettings = lazy(() => import('./pages/staff/Settings'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminUserManager = lazy(() => import('./pages/admin/UserManager'));
const AdminInventory = lazy(() => import('./pages/admin/Inventory'));
const AdminBookingHistory = lazy(() => import('./pages/admin/AppointmentHistory'));
const AdminSystemSettings = lazy(() => import('./pages/admin/SystemSettings'));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app">
      <Spinner size="lg" className="text-brand" />
    </div>
  );
}

// Route map — CLIENT_PLAN §2.1. Each portal is role-gated and shares DashboardShell.
export default function App() {
  return (
    <>
      <RealtimeBridge />
      <ThemeSync />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public — login/register happen in the landing slide-in panel */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/maintenance" element={<Maintenance />} />

          {/* Customer portal */}
          <Route
            path="/app"
            element={
              <ProtectedRoute role="user">
                <DashboardShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/book" replace />} />
            <Route path="book" element={<BookWizard />} />
            <Route path="history" element={<UserHistory />} />
            <Route path="settings" element={<UserSettings />} />
          </Route>

          {/* Staff portal */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute role="staff">
                <DashboardShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="history" element={<StaffHistory />} />
            <Route path="settings" element={<StaffSettings />} />
          </Route>

          {/* Admin portal */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <DashboardShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUserManager />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="history" element={<AdminBookingHistory />} />
            {/* Legacy split-history routes now fold into the unified page. */}
            <Route path="history/staff" element={<Navigate to="/admin/history" replace />} />
            <Route path="history/users" element={<Navigate to="/admin/history" replace />} />
            <Route path="settings" element={<AdminSystemSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
