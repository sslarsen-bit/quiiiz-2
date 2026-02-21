import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { t } from '../i18n';

export default function AdminDashboard() {
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard').catch(() => null),
      api.get('/admin/users').catch(() => []),
      api.get('/admin/trips').catch(() => []),
      api.get('/admin/feature-flags').catch(() => ({})),
    ]).then(([d, u, tr, f]) => {
      setDashboard(d);
      setUsers(u);
      setTrips(tr);
      setFlags(f);
    }).finally(() => setLoading(false));
  }, []);

  const deleteUser = async (id) => {
    if (!confirm('Slette denne brukeren?')) return;
    await api.delete(`/admin/users/${id}`);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const deleteTrip = async (id) => {
    if (!confirm('Slette denne turen?')) return;
    await api.delete(`/admin/trips/${id}`);
    setTrips(prev => prev.filter(tr => tr.id !== id));
  };

  const toggleFlag = async (key) => {
    const newFlags = { ...flags, [key]: !flags[key] };
    const updated = await api.put('/admin/feature-flags', newFlags);
    setFlags(updated);
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="page-wide fade-in">
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:16}}>{t('admin')} - {t('dashboard')}</h1>

      <div className="tabs">
        <div className={`tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>{t('dashboard')}</div>
        <div className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>{t('users')}</div>
        <div className={`tab ${tab === 'trips' ? 'active' : ''}`} onClick={() => setTab('trips')}>{t('trips')}</div>
        <div className={`tab ${tab === 'flags' ? 'active' : ''}`} onClick={() => setTab('flags')}>Feature Flags</div>
      </div>

      {tab === 'dashboard' && dashboard && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
            <div className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:32,fontWeight:800,color:'var(--primary)'}}>{dashboard.userCount}</div>
              <div style={{fontSize:14,color:'var(--text-light)'}}>Brukere</div>
            </div>
            <div className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:32,fontWeight:800,color:'var(--primary)'}}>{dashboard.tripCount}</div>
              <div style={{fontSize:14,color:'var(--text-light)'}}>Turer</div>
            </div>
            <div className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:32,fontWeight:800,color:'var(--success)'}}>{dashboard.activeTrips}</div>
              <div style={{fontSize:14,color:'var(--text-light)'}}>Aktive</div>
            </div>
          </div>

          {dashboard.topDestinations?.length > 0 && (
            <div className="card">
              <h3 style={{fontWeight:700,marginBottom:8}}>Topp destinasjoner</h3>
              {dashboard.topDestinations.map((d, i) => (
                <div key={i} className="list-item"><span style={{fontWeight:600}}>{i+1}. {d.name}</span> <span className="badge badge-primary">{d.count}</span></div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <h3 style={{fontWeight:700,marginBottom:12}}>{t('users')} ({users.length})</h3>
          <p style={{fontSize:13,color:'var(--text-light)',marginBottom:12}}>Admin ser kun basis-info (navn, e-post). Sensitiv data er skjult.</p>
          {users.map(u => (
            <div key={u.id} className="list-item">
              <div className="avatar avatar-sm">{(u.first_name||'?')[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{u.first_name} {u.last_name} {u.is_admin ? '(Admin)' : ''}</div>
                <div style={{fontSize:12,color:'var(--text-light)'}}>{u.email} | @{u.username}</div>
              </div>
              {!u.is_admin && <button className="btn btn-small btn-danger" onClick={() => deleteUser(u.id)}>Slett</button>}
            </div>
          ))}
        </div>
      )}

      {tab === 'trips' && (
        <div className="card">
          <h3 style={{fontWeight:700,marginBottom:12}}>{t('trips')} ({trips.length})</h3>
          {trips.map(tr => (
            <div key={tr.id} className="list-item">
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{tr.title}</div>
                <div style={{fontSize:12,color:'var(--text-light)'}}>
                  {tr.status} | Leder: @{tr.leader_username} | {tr.member_count} medlemmer | {tr.start_date || 'Ingen dato'}
                </div>
              </div>
              <button className="btn btn-small btn-danger" onClick={() => deleteTrip(tr.id)}>Slett</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'flags' && (
        <div className="card">
          <h3 style={{fontWeight:700,marginBottom:12}}>Feature Flags</h3>
          <p style={{fontSize:13,color:'var(--text-light)',marginBottom:12}}>Slå av/på moduler i sanntid. UI degraderes automatisk.</p>
          {Object.entries(flags).map(([key, val]) => (
            <div key={key} className="checkbox-row" style={{borderBottom:'1px solid var(--border)',paddingBottom:8}}>
              <input type="checkbox" checked={!!val} onChange={() => toggleFlag(key)} />
              <label style={{fontWeight:600}}>{key}</label>
              <span className={`badge ${val ? 'badge-success' : 'badge-danger'}`} style={{marginLeft:'auto'}}>
                {val ? 'ON' : 'OFF'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
