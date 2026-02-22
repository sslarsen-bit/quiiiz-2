import React from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { t, getLanguage, setLanguage } from './i18n';

// Pages
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import Hub from './pages/Hub';
import CreateTrip from './pages/CreateTrip';
import JoinTrip from './pages/JoinTrip';
import TripRoom from './pages/TripRoom';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Explore from './pages/Explore';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';

function Navbar() {
  const { user, logout } = useAuth();
  const lang = getLanguage();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to="/hub" className="navbar-title">Reiseplanlegger</Link>
      <div className="navbar-actions">
        <Link
          to="/notifications"
          className="btn-icon"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          🔔
        </Link>
        <select
          value={lang}
          onChange={e => { setLanguage(e.target.value); window.location.reload(); }}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-pill)',
            border: '2px solid var(--border)',
            fontSize: 13,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="no">🇳🇴 NO</option>
          <option value="en">🇬🇧 EN</option>
        </select>
        {user.is_admin && (
          <Link to="/admin" className="btn btn-small btn-warning">Admin</Link>
        )}
        <Link
          to="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            color: 'var(--text)',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <div className="avatar avatar-sm">{(user.first_name || '?')[0]}</div>
          <span style={{ display: 'none' }}>{user.first_name}</span>
        </Link>
        <button
          className="btn btn-small btn-ghost"
          onClick={logout}
          style={{ color: 'var(--text-light)' }}
        >
          {t('logout')}
        </button>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user || !user.is_admin) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="spinner" />;

  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/hub" /> : <Welcome />} />
        <Route path="/login" element={user ? <Navigate to="/hub" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/hub" /> : <Register />} />
        <Route path="/hub" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
        <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
        <Route path="/join" element={<ProtectedRoute><JoinTrip /></ProtectedRoute>} />
        <Route path="/join/:code" element={<ProtectedRoute><JoinTrip /></ProtectedRoute>} />
        <Route path="/trip/:id/*" element={<ProtectedRoute><TripRoom /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
