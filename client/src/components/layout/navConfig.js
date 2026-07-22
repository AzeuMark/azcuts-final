import {
  Scissors,
  History,
  Settings,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Users,
  Boxes,
  CalendarClock,
} from 'lucide-react';

// Role-aware side-panel links (CLIENT_PLAN §2.1).
export const NAV_BY_ROLE = {
  user: [
    { to: '/app/book', label: 'Book', icon: Scissors },
    { to: '/app/history', label: 'My Bookings', icon: History },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ],
  staff: [
    { to: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/staff/history', label: 'Served History', icon: ClipboardList },
    { to: '/staff/settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
    { to: '/admin/history', label: 'Booking History', icon: CalendarClock },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ],
};

export const ROLE_LABEL = { user: 'Customer', staff: 'Staff', admin: 'Admin' };
