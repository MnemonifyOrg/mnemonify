import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [membership, setMembership] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const result = await api.getAuthMe();
      setUser(result.user);
      setMembership(result.membership);
      setMemberships(result.memberships || []);
      return result;
    } catch {
      setUser(null);
      setMembership(null);
      setMemberships([]);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function login(credentials) {
    const result = await api.login(credentials);
    setUser(result.user);
    setMembership(result.membership);
    setMemberships(result.memberships || []);
    return result;
  }

  async function logout() {
    await api.logout();
    setUser(null);
    setMembership(null);
    setMemberships([]);
  }

  async function switchOrganization(organisationId) {
    const result = await api.switchOrganization(organisationId);
    setMembership(result.membership);
    await refresh();
    return result;
  }

  const value = useMemo(() => ({
    user,
    membership,
    memberships,
    role: membership?.role || null,
    loading,
    isReviewer: membership?.role === 'reviewer',
    canEdit: membership?.role === 'owner' || membership?.role === 'editor',
    canManageMembership: membership?.role === 'owner',
    login,
    logout,
    refresh,
    switchOrganization,
  }), [user, membership, memberships, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
