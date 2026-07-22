import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Menu, Bell, LogOut, ChevronDown, Power, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useSettingsPublic } from '../../hooks/useSettingsPublic';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import staffApi from '../../api/staff.api';
import { getApiErrorMessage } from '../../config/axios';
import cn from '../../utils/cn';
import { ROLE_LABEL } from './navConfig';

// Auto-scrolls its text horizontally only when it overflows the fixed-width box,
// so a long account name never stretches the topbar.
function MarqueeText({ text, className }) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const w = wrapRef.current;
    const inner = innerRef.current;
    if (!w || !inner) return;
    const diff = inner.scrollWidth - w.clientWidth;
    setShift(diff > 2 ? diff : 0);
  }, [text]);
  return (
    <span ref={wrapRef} className={cn('block overflow-hidden whitespace-nowrap', className)}>
      <span
        ref={innerRef}
        className={cn('inline-block', shift > 0 && 'animate-marquee')}
        style={shift > 0 ? { '--marquee-shift': `-${shift}px` } : undefined}
      >
        {text}
      </span>
    </span>
  );
}

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

// System-mode status chip (from admin settings) + live clock.
const MODE_META = {
  online: { label: 'Online', dot: 'bg-success', text: 'text-success', ping: true },
  maintenance: { label: 'Maintenance', dot: 'bg-warning', text: 'text-warning', ping: false },
  offline: { label: 'Offline', dot: 'bg-danger', text: 'text-danger', ping: false },
};

function StatusClock() {
  const { data } = useSettingsPublic();
  const mode = data?.systemMode || 'online';
  const meta = MODE_META[mode] || MODE_META.online;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div
      className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 lg:flex"
      title={`System is ${meta.label.toLowerCase()}`}
    >
      <span className="relative flex h-2 w-2">
        {meta.ping && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', meta.dot)} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', meta.dot)} />
      </span>
      <span className={cn('text-xs font-semibold', meta.text)}>{meta.label}</span>
      <span className="text-xs text-muted">·</span>
      <span className="font-mono text-xs tabular-nums text-ink">{time}</span>
      <span className="text-xs text-muted">{date}</span>
    </div>
  );
}

export default function Topbar({ onMenuClick, onToggleSidebar, sidebarCollapsed = false }) {
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

      {/* Desktop sidebar collapse/hide toggle */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={sidebarCollapsed}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-ring lg:inline-flex"
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </button>

      <StatusClock />

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
          <Avatar src={user?.avatar} name={user?.fullName} className="h-8 w-8 text-xs" />
          <span className="hidden text-left sm:block">
            <MarqueeText
              text={user?.fullName || 'Account'}
              className="max-w-[9rem] text-sm font-medium leading-tight text-ink"
            />
            <span className="block text-xs leading-tight text-muted">{ROLE_LABEL[role] || ''}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted sm:block" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-dropdown mt-2 w-56 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop"
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium text-ink">{user?.fullName || 'Account'}</p>
              <p className="truncate text-xs text-muted">{user?.email || ''}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-2"
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
