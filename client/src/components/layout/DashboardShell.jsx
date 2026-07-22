import { Suspense, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Spinner from '../ui/Spinner';
import cn from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { useSettingsPublic } from '../../hooks/useSettingsPublic';

const SIDEBAR_KEY = 'az-sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  } catch {
    return false;
  }
}

// Shared shell for all three portals: collapsible fixed sidebar (lg+) or slide-in
// drawer (mobile) + sticky topbar + routed content.
export default function DashboardShell() {
  const { role } = useAuth();
  const { data: settings } = useSettingsPublic();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {
        /* storage unavailable — non-fatal */
      }
      return next;
    });

  // System-mode gate (SERVER_PLAN §2.5): maintenance blocks customers; offline
  // blocks customers + staff. Admins always pass. The API enforces this too.
  const mode = settings?.systemMode;
  const blocked =
    (mode === 'maintenance' && role === 'user') ||
    (mode === 'offline' && (role === 'user' || role === 'staff'));
  if (blocked) return <Navigate to="/maintenance" replace />;

  return (
    <div
      className="min-h-screen bg-app"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 900px 600px at 0% -10%, rgba(225,29,72,0.10), transparent 60%), radial-gradient(ellipse 800px 600px at 100% 100%, rgba(14,165,233,0.07), transparent 60%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Desktop sidebar — collapses to an icon rail (not fully hidden) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 hidden border-r border-line transition-[width] duration-300 ease-out lg:block',
          collapsed ? 'lg:w-20' : 'lg:w-64'
        )}
      >
        <Sidebar role={role} collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-modal lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-in-left border-r border-line bg-app shadow-pop">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-ring"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar role={role} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className={cn('transition-[padding] duration-300 ease-out', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <Topbar
          onMenuClick={() => setDrawerOpen(true)}
          onToggleSidebar={toggleCollapsed}
          sidebarCollapsed={collapsed}
        />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <Spinner size="lg" className="text-brand" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
