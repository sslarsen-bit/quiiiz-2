import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { t } from '../i18n';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(setNotifications).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    for (const n of notifications.filter(n => !n.read_at)) {
      await api.put(`/notifications/${n.id}/read`);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  const typeLabels = {
    REMINDER: 'Påminnelse',
    VOTING_STARTED: 'Avstemning startet',
    VOTING_LOCKED_RESULT: 'Resultat klart',
    INVITATION: 'Invitasjon',
    BOOKER_ASSIGNED: 'Booker valgt',
    GENERAL: 'Varsel',
  };

  const unread = notifications.filter(n => !n.read_at).length;

  return (
    <div className="page fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h1 style={{fontSize:22,fontWeight:700}}>{t('inbox')} {unread > 0 && `(${unread})`}</h1>
        {unread > 0 && <button className="btn btn-small btn-secondary" onClick={markAllRead}>Merk alle som lest</button>}
      </div>

      {loading && <div className="spinner" />}

      {!loading && notifications.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">&#128276;</div>
          <p>Ingen varsler</p>
        </div>
      )}

      {notifications.map(n => {
        const payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : (n.payload || {});
        return (
          <div key={n.id} className="card" style={{background: n.read_at ? '' : '#eff6ff',cursor:'pointer'}} onClick={() => markRead(n.id)}>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              {!n.read_at && <span style={{width:10,height:10,background:'var(--primary)',borderRadius:5,flexShrink:0}} />}
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>{typeLabels[n.type] || n.type}</div>
                <div style={{fontSize:14,color:'var(--text-light)'}}>{payload.message || ''}</div>
                {n.trip_title && <div style={{fontSize:12,color:'var(--text-light)',marginTop:2}}>Tur: {n.trip_title}</div>}
                <div style={{fontSize:11,color:'var(--text-light)',marginTop:4}}>{new Date(n.created_at).toLocaleString('no-NO')}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
