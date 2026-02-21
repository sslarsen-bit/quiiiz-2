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

  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-title">Reiseplanlegger</Link>
      <div className="navbar-actions">
        <Link to="/notifications" style={{fontSize:'18px'}}>
          {'\u{1F514}'}
        </Link>
        <select
          value={lang}
          onChange={e => { setLanguage(e.target.value); window.location.reload(); }}
          style={{padding:'4px 8px',borderRadius:6,border:'1px solid #ddd',fontSize:13}}
        >
          <option value="no">NO</option>
          <option value="en">EN</option>
        </select>
        {user.is_admin ? <Link to="/admin" className="btn btn-small btn-warning">{t('admin')}</Link> : null}
        <Link to="/profile" style={{fontSize:'14px',fontWeight:600}}>{user.username || user.first_name}</Link>
        <button className="btn btn-small btn-secondary" onClick={logout}>{t('logout')}</button>
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
