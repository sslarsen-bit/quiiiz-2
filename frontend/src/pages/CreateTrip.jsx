import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { t } from '../i18n';

const INTEREST_OPTIONS = ['fest', 'kultur', 'strand', 'hiking', 'sport', 'avslapning', 'shopping', 'mat', 'nightlife', 'natur'];

export default function CreateTrip() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [places, setPlaces] = useState([]);

  const [form, setForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    budget_per_person: '',
    interests: [],
    preferred_countries: [],
    enable_country: true,
    enable_place: true,
    enable_flight: true,
    enable_hotel: true,
    enable_activity: true,
    voting_timing: 'ALL_AT_END',
    suggestion_deadline: '',
    voting_deadline: '',
    fixed_destination_place_id: '',
  });

  useEffect(() => {
    api.get('/catalog/type/COUNTRY').then(setCountries).catch(() => {});
    api.get('/catalog/type/PLACE').then(setPlaces).catch(() => {});
  }, []);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleInterest = (tag) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(tag) ? f.interests.filter(i => i !== tag) : [...f.interests, tag],
    }));
  };
  const toggleCountry = (code) => {
    setForm(f => ({
      ...f,
      preferred_countries: f.preferred_countries.includes(code)
        ? f.preferred_countries.filter(c => c !== code)
        : [...f.preferred_countries, code],
    }));
  };

  const handleSubmit = async () => {
    if (!form.title) { setError('Turnavn er påkrevd'); return; }
    setLoading(true);
    setError('');
    try {
      const trip = await api.post('/trips', form);
      navigate(`/trip/${trip.id}`);
    } catch (err) {
      setError(err.error || 'Kunne ikke opprette tur');
    } finally {
      setLoading(false);
    }
  };

  const needsFixedDest = !form.enable_country && !form.enable_place;

  return (
    <div className="page fade-in">
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:16}}>{t('create_trip')}</h1>

      <div className="status-bar">
        <div className={`status-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`} />
        <div className={`status-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`} />
        <div className={`status-step ${step >= 3 ? 'active' : ''}`} />
      </div>

      {error && <div style={{background:'#fee2e2',color:'#dc2626',padding:12,borderRadius:8,marginBottom:16,fontSize:14}}>{error}</div>}

      {step === 1 && (
        <div className="card">
          <h2 style={{fontSize:17,fontWeight:700,marginBottom:16}}>Grunnleggende info</h2>
          <div className="form-group">
            <label>{t('trip_name')} *</label>
            <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="F.eks. Sommerferie 2026" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="form-group">
              <label>{t('start_date')}</label>
              <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('end_date')}</label>
              <input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('budget')} (NOK)</label>
            <input type="number" value={form.budget_per_person} onChange={e => update('budget_per_person', e.target.value)} placeholder="15000" />
          </div>
          <div className="form-group">
            <label>{t('interests')}</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {INTEREST_OPTIONS.map(tag => (
                <span key={tag} className={`tag ${form.interests.includes(tag) ? 'active' : ''}`} onClick={() => toggleInterest(tag)}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Foretrukne land (valgfritt)</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {countries.map(c => (
                <span key={c.id} className={`tag ${form.preferred_countries.includes(c.country_code) ? 'active' : ''}`} onClick={() => toggleCountry(c.country_code)}>
                  {c.name}
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setStep(2)}>{t('next')}</button>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2 style={{fontSize:17,fontWeight:700,marginBottom:16}}>{t('modules_enabled')}</h2>
          <div className="checkbox-row">
            <input type="checkbox" checked={form.enable_country} onChange={e => update('enable_country', e.target.checked)} />
            <label>{t('countries')}</label>
          </div>
          <div className="checkbox-row">
            <input type="checkbox" checked={form.enable_place} onChange={e => update('enable_place', e.target.checked)} />
            <label>{t('places')}</label>
          </div>
          <div className="checkbox-row">
            <input type="checkbox" checked={form.enable_flight} onChange={e => update('enable_flight', e.target.checked)} />
            <label>{t('flights')}</label>
          </div>
          <div className="checkbox-row">
            <input type="checkbox" checked={form.enable_hotel} onChange={e => update('enable_hotel', e.target.checked)} />
            <label>{t('hotels')}</label>
          </div>
          <div className="checkbox-row">
            <input type="checkbox" checked={form.enable_activity} onChange={e => update('enable_activity', e.target.checked)} />
            <label>{t('activities')}</label>
          </div>

          {needsFixedDest && (
            <div className="form-group" style={{marginTop:16}}>
              <label>{t('fixed_destination')} *</label>
              <select value={form.fixed_destination_place_id} onChange={e => update('fixed_destination_place_id', e.target.value)}>
                <option value="">Velg sted...</option>
                {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div style={{display:'flex',gap:12,marginTop:16}}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>{t('back')}</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>{t('next')}</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h2 style={{fontSize:17,fontWeight:700,marginBottom:16}}>{t('voting_mode')} og frister</h2>
          <div className="form-group">
            <label>{t('voting_mode')}</label>
            <select value={form.voting_timing} onChange={e => update('voting_timing', e.target.value)}>
              <option value="ALL_AT_END">{t('all_at_end')}</option>
              <option value="CONTINUOUS">{t('continuous')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t('suggestion_deadline')}</label>
            <input type="datetime-local" value={form.suggestion_deadline} onChange={e => update('suggestion_deadline', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('voting_deadline')}</label>
            <input type="datetime-local" value={form.voting_deadline} onChange={e => update('voting_deadline', e.target.value)} />
          </div>
          <div style={{display:'flex',gap:12,marginTop:16}}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>{t('back')}</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? t('loading') : t('create_trip')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
