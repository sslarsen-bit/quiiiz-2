import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { t } from '../i18n';

const COUNTRY_VISUALS = {
  ES: { flag: '🇪🇸', gradient: 'linear-gradient(135deg, #e74c3c, #f39c12)', desc: 'Sol, tapas og flamenco' },
  IT: { flag: '🇮🇹', gradient: 'linear-gradient(135deg, #27ae60, #2980b9)', desc: 'Pasta, kunst og historie' },
  GR: { flag: '🇬🇷', gradient: 'linear-gradient(135deg, #3498db, #1abc9c)', desc: 'Blå hav og hvite hus' },
  PT: { flag: '🇵🇹', gradient: 'linear-gradient(135deg, #e74c3c, #27ae60)', desc: 'Fado, vin og kystbyer' },
  HR: { flag: '🇭🇷', gradient: 'linear-gradient(135deg, #e74c3c, #2980b9)', desc: 'Adriaterhavet og gamlebyer' },
  TH: { flag: '🇹🇭', gradient: 'linear-gradient(135deg, #f39c12, #e67e22)', desc: 'Templer, strand og street food' },
  FR: { flag: '🇫🇷', gradient: 'linear-gradient(135deg, #2980b9, #e74c3c)', desc: 'Romantikk, vin og croissant' },
  TR: { flag: '🇹🇷', gradient: 'linear-gradient(135deg, #e74c3c, #c0392b)', desc: 'Basarer, moskeer og kebab' },
};

const CITY_GRADIENTS = {
  Barcelona: 'linear-gradient(135deg, #e74c3c, #f39c12)',
  Madrid: 'linear-gradient(135deg, #c0392b, #e67e22)',
  Malaga: 'linear-gradient(135deg, #f39c12, #e74c3c)',
  Roma: 'linear-gradient(135deg, #8e44ad, #c0392b)',
  Milano: 'linear-gradient(135deg, #2c3e50, #3498db)',
  Athen: 'linear-gradient(135deg, #2980b9, #1abc9c)',
  Santorini: 'linear-gradient(135deg, #3498db, #2ecc71)',
  Lisboa: 'linear-gradient(135deg, #f39c12, #e74c3c)',
  Porto: 'linear-gradient(135deg, #2980b9, #27ae60)',
  Dubrovnik: 'linear-gradient(135deg, #e74c3c, #2980b9)',
  Split: 'linear-gradient(135deg, #1abc9c, #2980b9)',
  Bangkok: 'linear-gradient(135deg, #f39c12, #e67e22)',
  Phuket: 'linear-gradient(135deg, #1abc9c, #3498db)',
  Paris: 'linear-gradient(135deg, #9b59b6, #e74c3c)',
  Nice: 'linear-gradient(135deg, #3498db, #2ecc71)',
  Istanbul: 'linear-gradient(135deg, #e74c3c, #f39c12)',
  Antalya: 'linear-gradient(135deg, #16a085, #2980b9)',
};

const ACTIVITY_ICONS = {
  kultur: '🏛️',
  fest: '🎉',
  sport: '⚽',
  avslapning: '🧘',
  mat: '🍽️',
  natur: '🌿',
};

export default function Explore() {
  const [countries, setCountries] = useState([]);
  const [places, setPlaces] = useState([]);
  const [activities, setActivities] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [tab, setTab] = useState('destinations');

  useEffect(() => {
    api.get('/catalog/type/COUNTRY').then(setCountries).catch(() => {});
    api.get('/catalog/type/PLACE').then(setPlaces).catch(() => {});
    api.get('/catalog/type/ACTIVITY').then(setActivities).catch(() => {});
    api.get('/catalog/type/HOTEL').then(setHotels).catch(() => {});
  }, []);

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>Utforsk</h1>
        <p className="section-subtitle">Finn din neste drømmereise</p>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'destinations' ? 'active' : ''}`} onClick={() => setTab('destinations')}>
          Destinasjoner
        </div>
        <div className={`tab ${tab === 'hotels' ? 'active' : ''}`} onClick={() => setTab('hotels')}>
          Hotell
        </div>
        <div className={`tab ${tab === 'activities' ? 'active' : ''}`} onClick={() => setTab('activities')}>
          Aktiviteter
        </div>
      </div>

      {tab === 'destinations' && (
        <div>
          {/* Countries */}
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 17 }}>Land</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            {countries.map(c => {
              const visual = COUNTRY_VISUALS[c.country_code] || { flag: '🌍', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', desc: '' };
              return (
                <div key={c.id} className="dest-card" style={{ aspectRatio: '16/9' }}>
                  <div className="dest-card-bg" style={{ background: visual.gradient }} />
                  <div className="dest-card-overlay" />
                  <div className="dest-card-content">
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{visual.flag}</div>
                    <div className="dest-card-title" style={{ fontSize: 16 }}>{c.name}</div>
                    <div className="dest-card-sub">{visual.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cities */}
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 17 }}>Byer</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {places.map(p => {
              const gradient = CITY_GRADIENTS[p.name] || CITY_GRADIENTS[p.city] || 'linear-gradient(135deg, #667eea, #764ba2)';
              return (
                <div key={p.id} className="dest-card" style={{ aspectRatio: '16/10' }}>
                  <div className="dest-card-bg" style={{ background: gradient }} />
                  <div className="dest-card-overlay" />
                  <div className="dest-card-content">
                    <div className="dest-card-title" style={{ fontSize: 16 }}>{p.name}</div>
                    <div className="dest-card-sub">
                      {(COUNTRY_VISUALS[p.country_code] || {}).flag || ''} {p.country_code}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'hotels' && (
        <div>
          {hotels.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🏨</div>
              <p>Ingen hotell funnet</p>
            </div>
          )}
          {/* Group hotels by city */}
          {Object.entries(
            hotels.reduce((acc, h) => {
              const city = h.city || 'Ukjent';
              if (!acc[city]) acc[city] = [];
              acc[city].push(h);
              return acc;
            }, {})
          ).map(([city, cityHotels]) => (
            <div key={city} style={{ marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 17 }}>
                {city}
              </h3>
              {cityHotels.map(h => {
                const meta = typeof h.metadata === 'string' ? JSON.parse(h.metadata) : (h.metadata || {});
                const gradient = CITY_GRADIENTS[city] || 'linear-gradient(135deg, #667eea, #764ba2)';
                return (
                  <div key={h.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: 14,
                      background: gradient, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, color: 'white',
                    }}>
                      🏨
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{h.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>
                        {meta.stars && '★'.repeat(meta.stars)} · {h.city}
                      </div>
                      {meta.amenities && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                          {meta.amenities.map(a => (
                            <span key={a} style={{
                              fontSize: 11, padding: '2px 8px', background: 'var(--primary-alpha)',
                              borderRadius: 'var(--radius-pill)', color: 'var(--primary)', fontWeight: 600,
                            }}>{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {meta.pricePerNight && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)' }}>
                          {meta.pricePerNight} kr
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-light)' }}>per natt</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'activities' && (
        <div>
          {activities.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🎭</div>
              <p>Ingen aktiviteter funnet</p>
            </div>
          )}
          {activities.map(a => {
            const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : (a.metadata || {});
            const gradient = CITY_GRADIENTS[a.city] || 'linear-gradient(135deg, #667eea, #764ba2)';
            const icon = ACTIVITY_ICONS[meta.category] || '🎭';
            return (
              <div key={a.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: gradient, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: 'white',
                }}>
                  {icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>
                    {a.city || a.country_code}
                    {meta.category && ` · ${meta.category}`}
                    {meta.duration && ` · ${meta.duration}`}
                  </div>
                </div>
                {meta.pricePerPerson && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)' }}>
                      {meta.pricePerPerson} kr
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>per pers.</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
