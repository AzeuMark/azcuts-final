import { useAuth } from '../hooks/useAuth';

// Conditionally render children based on the current user's role.
export default function RoleGate({ roles, children, fallback = null }) {
  const { role } = useAuth();
  const allowed = Array.isArray(roles) ? roles : [roles];
  return allowed.includes(role) ? children : fallback;
}
