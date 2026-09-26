import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import RealtimeBridge from './components/RealtimeBridge';
import ThemeSync from './components/ThemeSync';
import ChatWidget from './components/ChatWidget';
import FeatureGate from './components/FeatureGate';
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
const StaffSales = lazy(() => import('./pages/staff/Sales'));
const StaffInventory = lazy(() => import('./pages/staff/Inventory'));
const StaffHistory = lazy(() => import('./pages/staff/History'));
const StaffSettings = lazy(() => import('./pages/staff/Settings'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminUserManager = lazy(() => import('./pages/admin/UserManager'));
const AdminInventory = lazy(() => import('./pages/admin/Inventory'));
const AdminSales = lazy(() => import('./pages/admin/Sales'));
const AdminBookingHistory = lazy(() => import('./pages/admin/AppointmentHistory'));
const AdminSystemSettings = lazy(() => import('./pages/admin/SystemSettings'));

// GUIDE-ONLY (delete with client/src/guide/ before real-world deploy).
const GuideHome = lazy(() => import('./guide/pages/GuideHome'));
const SystemDesign = lazy(() => import('./guide/pages/SystemDesign'));
const CustomerGuide = lazy(() => import('./guide/pages/CustomerGuide'));
const BarberGuide = lazy(() => import('./guide/pages/BarberGuide'));
const OwnerGuide = lazy(() => import('./guide/pages/OwnerGuide'));
const HipoIpo = lazy(() => import('./guide/pages/HipoIpo'));
const DatabaseChart = lazy(() => import('./guide/pages/DatabaseChart'));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app">
      <Spinner size="lg" className="text-brand" />
    </div>
  );
}

const BASE_TITLE = 'AzCuts — Barber Shop & Salon';

// Specific-first: the first prefix match wins ('/' and parents last).
const ROUTE_TITLES = [
  ['/guide/system-design', 'System Design Guide - AzCuts'],
  ['/guide/customer', 'Customer Guide - AzCuts'],
  ['/guide/barber', 'Barber Guide - AzCuts'],
  ['/guide/owner', 'Owner Guide - AzCuts'],
  ['/guide/hipo-ipo', 'HIPO & IPO Guide - AzCuts'],
  ['/guide/database', 'Database Guide - AzCuts'],
  ['/guide', 'Guide - AzCuts'],
  ['/app/book', 'Book a Service - AzCuts'],
  ['/app/history', 'My Bookings - AzCuts'],
  ['/app/settings', 'My Settings - AzCuts'],
  ['/app', 'Book a Service - AzCuts'],
  ['/staff/dashboard', 'Staff Dashboard - AzCuts'],
  ['/staff/sales', 'My Sales - AzCuts'],
  ['/staff/inventory', 'Staff Inventory - AzCuts'],
  ['/staff/history', 'Served History - AzCuts'],
  ['/staff/settings', 'Staff Settings - AzCuts'],
  ['/staff', 'Staff Dashboard - AzCuts'],
  ['/admin/dashboard', 'Admin Dashboard - AzCuts'],
  ['/admin/analytics', 'Analytics - AzCuts'],
  ['/admin/users', 'User Manager - AzCuts'],
  ['/admin/inventory', 'Admin Inventory - AzCuts'],
  ['/admin/sales', 'Admin Sales - AzCuts'],
  ['/admin/history', 'Booking History - AzCuts'],
  ['/admin/settings', 'System Settings - AzCuts'],
  ['/admin', 'Admin Dashboard - AzCuts'],
  ['/maintenance', 'Maintenance - AzCuts'],
  ['/login', BASE_TITLE],
  ['/register', BASE_TITLE],
  ['/', BASE_TITLE],
];

// Keeps the browser tab title accurate to the page being viewed.
function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const hit = ROUTE_TITLES.find(([prefix]) =>
      prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    document.title = hit ? hit[1] : 'Page Not Found - AzCuts';
  }, [pathname]);
  return null;
}

// Route map — CLIENT_PLAN §2.1. Each portal is role-gated and shares DashboardShell.
// S9: the AI assistant and real-time bridge mount only when their flags are on.
export default function App() {
  return (
    <>
      <RouteTitle />
      <FeatureGate feature="realtime.enabled">
        <RealtimeBridge />
      </FeatureGate>
      <ThemeSync />
      <FeatureGate feature="aiChatbot.enabled">
        <ChatWidget />
      </FeatureGate>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public — login/register happen in the landing slide-in panel */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/maintenance" element={<Maintenance />} />

          {/* GUIDE-ONLY classmate tour (public; flag-gated, delete before real-world deploy) */}
          <Route path="/guide" element={<FeatureGate feature="guide.enabled" fallback={<NotFound />}><GuideHome /></FeatureGate>} />
          <Route path="/guide/system-design" element={<FeatureGate feature="guide.enabled" fallback={<NotFound />}><SystemDesign /></FeatureGate>} />
          <Route path="/guide/customer" element={<FeatureGate feature="guide.enabled" fallback={<NotFound />}><CustomerGuide /></FeatureGate>} />
          <Route path="/guide/barber" element={<FeatureGate feature="guide.enabled" fallback={<NotFound />}><BarberGuide /></FeatureGate>} />
          <Route path="/guide/owner" element={<FeatureGate feature="guide.enabled" fallback={<NotFound />}><OwnerGuide /></FeatureGate>} />
          <Route path="/guide/hipo-ipo" element={<FeatureGate feature="guide.enabled" fallback={<NotFound />}><HipoIpo /></FeatureGate>} />
          <Route path="/guide/database" element={<FeatureGate feature="guide.enabled" fallback={<NotFound />}><DatabaseChart /></FeatureGate>} />

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
            <Route path="sales" element={<StaffSales />} />
            <Route path="inventory" element={<StaffInventory />} />
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
            <Route path="sales" element={<AdminSales />} />
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
