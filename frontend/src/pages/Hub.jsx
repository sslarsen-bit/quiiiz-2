import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { t } from '../i18n';

const DESTINATION_GRADIENTS = {
  ES: 'linear-gradient(135deg, #e74c3c 0%, #f39c12 100%)',
  IT: 'linear-gradient(135deg, #27ae60 0%, #e74c3c 100%)',
  GR: 'linear-gradient(135deg, #2980b9 0%, #f5f5f5 100%)',
  PT: 'linear-gradient(135deg, #27ae60 0%, #e74c3c 100%)',
  HR: 'linear-gradient(135deg, #2980b9 0%, #e74c3c 100%)',
  TH: 'linear-gradient(135deg, #f39c12 0%, #e74c3c 100%)',
  FR: 'linear-gradient(135deg, #2980b9 0%, #e74c3c 50%, #f5f5f5 100%)',
  TR: 'linear-gradient(135deg, #e74c3c 0%, #f5f5f5 100%)',
};

const POPULAR_DESTINATIONS = [
  { name: 'Barcelona', country: 'Spania', code: 'ES', gradient: 'linear-gradient(135deg, #e74c3c, #f39c12)' },
  { name: 'Roma', country: 'Italia', code: 'IT', gradient: 'linear-gradient(135deg, #2ecc71, #3498db)' },
  { name: 'Paris', country: 'Frankrike', code: 'FR', gradient: 'linear-gradient(135deg, #9b59b6, #e74c3c)' },
  { name: 'Santorini', country: 'Hellas', code: 'GR', gradient: 'linear-gradient(135deg, #3498db, #2ecc71)' },
];

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

  const statusIcons = {
    COLLECTING_SUGGESTIONS: '💡',
    VOTING_OPEN: '🗳️',
    VOTING_CLOSED: '🔒',
    LOCKED: '✅',
    BOOKING_IN_PROGRESS: '📋',
    BOOKED: '🎉',
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'God morgen';
    if (hour < 18) return 'God ettermiddag';
    return 'God kveld';
  };

  return (
    <div className="page fade-in">
      {/* Welcome section */}
      <div style={{ padding: '28px 0 8px', marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
          {getGreeting()}, {user?.first_name} 👋
        </h1>
        <p style={{ color: 'var(--text-light)', fontSize: 15 }}>
          Klar for neste eventyr?
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        <div className="card-action" onClick={() => navigate('/create-trip')}>
          <div className="card-action-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #eff6ff)' }}>✈️</div>
          <div className="card-action-text">
            <h3>{t('create_trip')}</h3>
            <p>Start planlegging</p>
          </div>
        </div>
        <div className="card-action" onClick={() => navigate('/join')}>
          <div className="card-action-icon" style={{ background: 'linear-gradient(135deg, #dcfce7, #f0fdf4)' }}>🔗</div>
          <div className="card-action-text">
            <h3>{t('join_trip')}</h3>
            <p>Bruk invitasjonskode</p>
          </div>
        </div>
      </div>

      {/* Popular destinations */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Populære reisemål</h2>
          <span
            onClick={() => navigate('/explore')}
            style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Se alle →
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {POPULAR_DESTINATIONS.map(dest => (
            <div
              key={dest.name}
              className="dest-card"
              onClick={() => navigate('/explore')}
            >
              <div className="dest-card-bg" style={{ background: dest.gradient }} />
              <div className="dest-card-overlay" />
              <div className="dest-card-content">
                <div className="dest-card-title">{dest.name}</div>
                <div className="dest-card-sub">{dest.country}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My trips */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{t('my_trips')}</h2>
        {loading && <div className="spinner" />}
        {!loading && trips.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌍</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Ingen turer ennå</h3>
            <p style={{ color: 'var(--text-light)', marginBottom: 20, fontSize: 14 }}>
              Opprett en ny tur eller bli med via invitasjonskode!
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/create-trip')} style={{ maxWidth: 280, margin: '0 auto' }}>
              Opprett din første tur
            </button>
          </div>
        )}
        {trips.map(trip => {
          const preferredCountries = (() => {
            try { return JSON.parse(trip.preferred_countries || '[]'); } catch { return []; }
          })();
          return (
            <div key={trip.id} className="trip-card" onClick={() => navigate(`/trip/${trip.id}`)}>
              <div className="trip-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 20 }}>{statusIcons[trip.status] || '✈️'}</div>
                  <div className="trip-card-title">{trip.title}</div>
                </div>
                <span className={`badge ${statusColors[trip.status] || 'badge-primary'}`}>
                  {statusLabels[trip.status] || trip.status}
                </span>
              </div>
              <div className="trip-card-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {trip.start_date && trip.end_date && (
                  <span>📅 {trip.start_date} — {trip.end_date}</span>
                )}
                {trip.member_count && (
                  <span>👥 {trip.member_count} {t('members').toLowerCase()}</span>
                )}
                {trip.role && (
                  <span className="badge badge-primary" style={{ padding: '2px 8px', fontSize: 11 }}>
                    {t(trip.role.toLowerCase())}
                  </span>
                )}
              </div>
              {preferredCountries.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  {preferredCountries.map(code => (
                    <span key={code} style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      background: 'var(--primary-alpha)',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 12,
                      color: 'var(--primary)',
                      fontWeight: 600,
                    }}>
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom nav shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20, paddingBottom: 20 }}>
        <div className="card-action" onClick={() => navigate('/explore')}>
          <div className="card-action-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fffbeb)' }}>🌍</div>
          <div className="card-action-text">
            <h3>{t('explore')}</h3>
            <p>Utforsk destinasjoner</p>
          </div>
        </div>
        <div className="card-action" onClick={() => navigate('/profile')}>
          <div className="card-action-icon" style={{ background: 'linear-gradient(135deg, #e0e7ff, #eef2ff)' }}>👤</div>
          <div className="card-action-text">
            <h3>{t('profile')}</h3>
            <p>Din profil</p>
          </div>
        </div>
      </div>
    </div>
  );
}
