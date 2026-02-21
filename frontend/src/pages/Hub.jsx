import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { t } from '../i18n';

export default function Hub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/trips').then(setTrips).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statusLabels = {
    COLLECTING_SUGGESTIONS: t('collecting_suggestions'),
    VOTING_OPEN: t('voting_open'),
    VOTING_CLOSED: t('voting_closed'),
    LOCKED: t('locked'),
    BOOKING_IN_PROGRESS: t('booking_in_progress'),
    BOOKED: t('booked'),
  };

  const statusColors = {
    COLLECTING_SUGGESTIONS: 'badge-primary',
    VOTING_OPEN: 'badge-warning',
    VOTING_CLOSED: 'badge-warning',
    LOCKED: 'badge-success',
    BOOKING_IN_PROGRESS: 'badge-primary',
    BOOKED: 'badge-success',
  };

  return (
    <div className="page fade-in">
      <div style={{textAlign:'center',padding:'20px 0'}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Hei, {user?.first_name}!</h1>
        <p style={{color:'var(--text-light)',marginTop:4}}>{t('tagline')}</p>
      </div>

      <div className="hub-grid">
        <div className="hub-card" onClick={() => navigate('/create-trip')}>
          <div className="hub-card-icon">&#10133;</div>
          <div className="hub-card-title">{t('create_trip')}</div>
        </div>
        <div className="hub-card" onClick={() => navigate('/join')}>
          <div className="hub-card-icon">&#128279;</div>
          <div className="hub-card-title">{t('join_trip')}</div>
        </div>
        <div className="hub-card" onClick={() => navigate('/explore')}>
          <div className="hub-card-icon">&#127758;</div>
          <div className="hub-card-title">{t('explore')}</div>
        </div>
        <div className="hub-card" onClick={() => navigate('/profile')}>
          <div className="hub-card-icon">&#128100;</div>
          <div className="hub-card-title">{t('profile')}</div>
        </div>
      </div>

      <div style={{marginTop:24}}>
        <h2 style={{fontSize:18,fontWeight:700,marginBottom:12}}>{t('my_trips')}</h2>
        {loading && <div className="spinner" />}
        {!loading && trips.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">&#9992;&#65039;</div>
            <p>Ingen turer ennå. Opprett en ny tur eller bli med via invitasjonskode!</p>
          </div>
        )}
        {trips.map(trip => (
          <div key={trip.id} className="trip-card" onClick={() => navigate(`/trip/${trip.id}`)}>
            <div className="trip-card-header">
              <div className="trip-card-title">{trip.title}</div>
              <span className={`badge ${statusColors[trip.status] || 'badge-primary'}`}>
                {statusLabels[trip.status] || trip.status}
              </span>
            </div>
            <div className="trip-card-meta">
              {trip.start_date && trip.end_date && `${trip.start_date} - ${trip.end_date}`}
              {trip.member_count && ` \u00B7 ${trip.member_count} ${t('members').toLowerCase()}`}
              {trip.role && ` \u00B7 ${t(trip.role.toLowerCase())}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
