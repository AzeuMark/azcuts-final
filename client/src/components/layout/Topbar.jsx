import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Menu, Bell, LogOut, ChevronDown, Power } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import staffApi from '../../api/staff.api';
import { getApiErrorMessage } from '../../config/axios';
import cn from '../../utils/cn';
import { ROLE_LABEL } from './navConfig';

function ShiftToggle() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const onShift = user?.status !== 'inactive';

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await staffApi.setShift(onShift ? 'inactive' : 'active');
      setUser({ ...user, status: res?.data?.status });
      toast.success(res?.message || (onShift ? 'You are off shift' : 'You are on shift'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not update shift'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={onShift}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-ring disabled:opacity-60',
        onShift
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-line bg-surface-2 text-muted'
      )}
      title="Toggle shift"
    >
      <Power className="h-3.5 w-3.5" />
      {onShift ? 'On shift' : 'Off shift'}
    </button>
  );
}

function initialsOf(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
}

export default function Topbar({ onMenuClick }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef(null);

  const bump = useCallback(() => {
    if (role === 'staff' || role === 'admin') setUnread((n) => Math.min(99, n + 1));
  }, [role]);
  useSocketEvent('appointment:new', bump);
  useSocketEvent('appointment:assigned', bump);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center gap-2 border-b border-line bg-surface/80 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-ring lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      {role === 'staff' && <ShiftToggle />}

      <button
        type="button"
        aria-label={unread > 0 ? `Notifications (${unread} new)` : 'Notifications'}
        onClick={() => setUnread(0)}
        className="relative rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-ring"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-fg">
            {unread}
          </span>
        )}
      </button>

      <ThemeToggle />

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-2 focus-ring"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
            {initialsOf(user?.fullName)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-ink">
              {user?.fullName || 'Account'}
            </span>
            <span className="block text-xs leading-tight text-muted">{ROLE_LABEL[role] || ''}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-dropdown mt-2 w-56 origin-top-right animate-scale-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
          >
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-medium text-ink">{user?.fullName || 'Account'}</p>
              <p className="truncate text-xs text-muted">{user?.email || ''}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
