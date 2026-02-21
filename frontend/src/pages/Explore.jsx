import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { t } from '../i18n';

export default function Explore() {
  const [countries, setCountries] = useState([]);
  const [places, setPlaces] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState('destinations');

  useEffect(() => {
    api.get('/catalog/type/COUNTRY').then(setCountries).catch(() => {});
    api.get('/catalog/type/PLACE').then(setPlaces).catch(() => {});
    api.get('/catalog/type/ACTIVITY').then(setActivities).catch(() => {});
  }, []);

  return (
    <div className="page fade-in">
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:4}}>{t('explore')}</h1>
      <p style={{color:'var(--text-light)',marginBottom:16}}>Populære reisemål og aktiviteter</p>

      <div className="tabs">
        <div className={`tab ${tab === 'destinations' ? 'active' : ''}`} onClick={() => setTab('destinations')}>Destinasjoner</div>
        <div className={`tab ${tab === 'activities' ? 'active' : ''}`} onClick={() => setTab('activities')}>{t('activities')}</div>
      </div>

      {tab === 'destinations' && (
        <div>
          <h3 style={{fontWeight:700,marginBottom:8}}>{t('countries')}</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
            {countries.map(c => (
              <div key={c.id} className="card" style={{textAlign:'center',padding:16}}>
                <div style={{fontSize:28}}>&#127758;</div>
                <div style={{fontWeight:700,marginTop:4}}>{c.name}</div>
                <div style={{fontSize:12,color:'var(--text-light)'}}>{c.country_code}</div>
              </div>
            ))}
          </div>

          <h3 style={{fontWeight:700,marginBottom:8}}>{t('places')}</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {places.map(p => (
              <div key={p.id} className="card" style={{textAlign:'center',padding:16}}>
                <div style={{fontSize:28}}>&#127961;&#65039;</div>
                <div style={{fontWeight:700,marginTop:4}}>{p.name}</div>
                <div style={{fontSize:12,color:'var(--text-light)'}}>{p.country_code}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'activities' && (
        <div>
          {activities.map(a => {
            const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : (a.metadata || {});
            return (
              <div key={a.id} className="card" style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{fontSize:24}}>&#127914;</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700}}>{a.name}</div>
                  <div style={{fontSize:12,color:'var(--text-light)'}}>{a.city || a.country_code} {meta.category && `| ${meta.category}`} {meta.pricePerPerson && `| ${meta.pricePerPerson} NOK`}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
