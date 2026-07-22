import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLE_HOME } from '../utils/constants';
import Spinner from './ui/Spinner';

// Auth + role gate (CLIENT_PLAN §2.1). Unauthenticated → landing (auth happens in
// the landing slide-in panel); wrong role → that role's own home.
export default function ProtectedRoute({ role, children }) {
  const { isAuthenticated, isLoading, role: userRole } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <Spinner size="lg" className="text-brand" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(userRole)) {
      return <Navigate to={ROLE_HOME[userRole] || '/'} replace />;
    }
  }

  return children;
}
