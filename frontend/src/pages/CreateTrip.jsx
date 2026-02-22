import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { t } from '../i18n';

const INTEREST_OPTIONS = [
  { id: 'fest', label: 'Fest & Uteliv', icon: '🎉' },
  { id: 'kultur', label: 'Kultur & Historie', icon: '🏛️' },
  { id: 'strand', label: 'Strand & Sol', icon: '🏖️' },
  { id: 'hiking', label: 'Hiking & Fjell', icon: '🥾' },
  { id: 'sport', label: 'Sport & Aktivitet', icon: '⚽' },
  { id: 'avslapning', label: 'Avslapning & Spa', icon: '🧘' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'mat', label: 'Mat & Drikke', icon: '🍽️' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙' },
  { id: 'natur', label: 'Natur & Dyreliv', icon: '🌿' },
];

const COUNTRY_FLAGS = {
  ES: '🇪🇸', IT: '🇮🇹', GR: '🇬🇷', PT: '🇵🇹',
  HR: '🇭🇷', TH: '🇹🇭', FR: '🇫🇷', TR: '🇹🇷',
};

const MODULE_OPTIONS = [
  { key: 'enable_country', label: 'Land', desc: 'Stem over hvilke land dere vil reise til', icon: '🌍' },
  { key: 'enable_place', label: 'Byer / Steder', desc: 'Stem over hvilke byer eller steder', icon: '🏙️' },
  { key: 'enable_flight', label: 'Flyreiser', desc: 'Finn og sammenlign flyreiser', icon: '✈️' },
  { key: 'enable_hotel', label: 'Hotell', desc: 'Finn og sammenlign overnatting', icon: '🏨' },
  { key: 'enable_activity', label: 'Aktiviteter', desc: 'Legg til aktiviteter og opplevelser', icon: '🎭' },
];

const TOTAL_STEPS = 5;

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

  const [showVotingInfo, setShowVotingInfo] = useState(false);
  const [showDeadlineInfo, setShowDeadlineInfo] = useState(false);

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

  const toggleModule = (key) => {
    setForm(f => ({ ...f, [key]: !f[key] }));
  };

  const nextStep = () => {
    if (step === 1 && !form.title.trim()) {
      setError('Gi turen din et navn for å fortsette');
      return;
    }
    setError('');
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const prevStep = () => {
    setError('');
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Turnavn er påkrevd'); return; }
    setLoading(true);
    setError('');
    try {
      const trip = await api.post('/trips', {
        ...form,
        budget_per_person: form.budget_per_person ? Number(form.budget_per_person) : null,
      });
      navigate(`/trip/${trip.id}`);
    } catch (err) {
      setError(err.error || 'Kunne ikke opprette tur. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  const needsFixedDest = !form.enable_country && !form.enable_place;

  const renderSteps = () => (
    <div className="wizard-steps">
      {[1, 2, 3, 4, 5].map((s, i) => (
        <div className="wizard-step" key={s}>
          <div
            className={`wizard-step-circle ${step === s ? 'active' : ''} ${step > s ? 'done' : ''}`}
            onClick={() => s < step && setStep(s)}
            style={{ cursor: s < step ? 'pointer' : 'default' }}
          >
            {step > s ? '✓' : s}
          </div>
          {i < 4 && (
            <div className={`wizard-step-line ${step > s ? 'done' : ''} ${step === s + 1 ? 'active' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="page fade-in">
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>{t('create_trip')}</h1>
        <p style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 4 }}>
          {step === 1 && 'Hva skal turen hete?'}
          {step === 2 && 'Når og budsjett'}
          {step === 3 && 'Hva er dere interessert i?'}
          {step === 4 && 'Hva skal gruppen stemme over?'}
          {step === 5 && 'Avstemning og frister'}
        </p>
      </div>

      {renderSteps()}

      {error && <div className="error-box">{error}</div>}

      {/* Step 1: Trip Name */}
      {step === 1 && (
        <div className="card slide-up">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✈️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Gi turen et navn</h2>
            <p style={{ color: 'var(--text-light)', fontSize: 14 }}>Velg et navn som beskriver turen</p>
          </div>
          <div className="form-group">
            <input
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="F.eks. Sommerferie Barcelona 2026"
              style={{ fontSize: 17, padding: '16px 20px', textAlign: 'center' }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && nextStep()}
            />
          </div>
          <button className="btn btn-primary" onClick={nextStep} style={{ marginTop: 8 }}>
            Neste
          </button>
        </div>
      )}

      {/* Step 2: Dates & Budget */}
      {step === 2 && (
        <div className="card slide-up">
          <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 20 }}>Datoer og budsjett</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>Startdato</label>
              <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Sluttdato</label>
              <input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Budsjett per person (NOK)</label>
            <input
              type="number"
              value={form.budget_per_person}
              onChange={e => update('budget_per_person', e.target.value)}
              placeholder="F.eks. 15 000"
            />
            <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 6 }}>
              Valgfritt — hjelper med å finne riktige forslag
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={prevStep}>Tilbake</button>
            <button className="btn btn-primary" onClick={nextStep}>Neste</button>
          </div>
        </div>
      )}

      {/* Step 3: Interests & Countries */}
      {step === 3 && (
        <div className="card slide-up">
          <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Interesser</h2>
          <p style={{ color: 'var(--text-light)', fontSize: 14, marginBottom: 16 }}>
            Velg hva dere er interessert i (valgfritt)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 28 }}>
            {INTEREST_OPTIONS.map(opt => (
              <span
                key={opt.id}
                className={`tag ${form.interests.includes(opt.id) ? 'active' : ''}`}
                onClick={() => toggleInterest(opt.id)}
              >
                <span style={{ marginRight: 6 }}>{opt.icon}</span> {opt.label}
              </span>
            ))}
          </div>

          <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Foretrukne land</h2>
          <p style={{ color: 'var(--text-light)', fontSize: 14, marginBottom: 16 }}>
            Har dere allerede noen land i tankene? (valgfritt)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {countries.map(c => (
              <span
                key={c.id}
                className={`tag ${form.preferred_countries.includes(c.country_code) ? 'active' : ''}`}
                onClick={() => toggleCountry(c.country_code)}
              >
                <span style={{ marginRight: 6 }}>{COUNTRY_FLAGS[c.country_code] || '🌍'}</span> {c.name}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={prevStep}>Tilbake</button>
            <button className="btn btn-primary" onClick={nextStep}>Neste</button>
          </div>
        </div>
      )}

      {/* Step 4: Modules (what to vote on) */}
      {step === 4 && (
        <div className="card slide-up">
          <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Hva skal gruppen stemme over?</h2>
          <p style={{ color: 'var(--text-light)', fontSize: 14, marginBottom: 20 }}>
            Velg hvilke kategorier dere vil inkludere i turen
          </p>

          <div>
            {MODULE_OPTIONS.map(mod => (
              <div key={mod.key} className="toggle-wrapper" onClick={() => toggleModule(mod.key)}>
                <div className="toggle-label">
                  <div className="toggle-label-icon">{mod.icon}</div>
                  <div>
                    <div className="toggle-label-text">{mod.label}</div>
                    <div className="toggle-label-desc">{mod.desc}</div>
                  </div>
                </div>
                <div className={`toggle-switch ${form[mod.key] ? 'on' : ''}`} />
              </div>
            ))}
          </div>

          {needsFixedDest && (
            <div className="form-group" style={{ marginTop: 20 }}>
              <label>Fast destinasjon (påkrevd når land/byer er deaktivert)</label>
              <select value={form.fixed_destination_place_id} onChange={e => update('fixed_destination_place_id', e.target.value)}>
                <option value="">Velg sted...</option>
                {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={prevStep}>Tilbake</button>
            <button className="btn btn-primary" onClick={nextStep}>Neste</button>
          </div>
        </div>
      )}

      {/* Step 5: Voting & Deadlines */}
      {step === 5 && (
        <div className="card slide-up">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700 }}>Avstemning og frister</h2>
            <div className="info-tooltip" onClick={() => setShowVotingInfo(!showVotingInfo)}>
              ?
              <div className="info-tooltip-content" style={{ display: showVotingInfo ? 'block' : undefined }}>
                <strong>Avstemningsmodus:</strong><br />
                <strong>Alt på slutten</strong> — Alle stemmer samtidig etter at alle forslag er inn.<br />
                <strong>Løpende</strong> — Medlemmer kan stemme fortløpende når nye forslag legges til.
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--text-light)', fontSize: 14, marginBottom: 20 }}>
            Bestem hvordan gruppen skal stemme
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div
              onClick={() => update('voting_timing', 'ALL_AT_END')}
              style={{
                padding: '18px 16px',
                borderRadius: 'var(--radius)',
                border: `2px solid ${form.voting_timing === 'ALL_AT_END' ? 'var(--primary)' : 'var(--border)'}`,
                background: form.voting_timing === 'ALL_AT_END' ? 'var(--primary-50)' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🗳️</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Alt på slutten</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Samle inn først, stem etterpå</div>
            </div>
            <div
              onClick={() => update('voting_timing', 'CONTINUOUS')}
              style={{
                padding: '18px 16px',
                borderRadius: 'var(--radius)',
                border: `2px solid ${form.voting_timing === 'CONTINUOUS' ? 'var(--primary)' : 'var(--border)'}`,
                background: form.voting_timing === 'CONTINUOUS' ? 'var(--primary-50)' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔄</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Løpende</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Stem fortløpende</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Frister</h3>
            <div className="info-tooltip" onClick={() => setShowDeadlineInfo(!showDeadlineInfo)}>
              ?
              <div className="info-tooltip-content" style={{ display: showDeadlineInfo ? 'block' : undefined }}>
                <strong>Forslagsfrist:</strong> Siste tidspunkt for å legge til forslag.<br /><br />
                <strong>Avstemningsfrist:</strong> Siste tidspunkt for å avgi stemme. Etter dette låses resultatene.
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--text-light)', fontSize: 13, marginBottom: 16 }}>Valgfritt — kan settes senere</p>

          <div className="form-group">
            <label>Forslagsfrist</label>
            <input type="datetime-local" value={form.suggestion_deadline} onChange={e => update('suggestion_deadline', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Avstemningsfrist</label>
            <input type="datetime-local" value={form.voting_deadline} onChange={e => update('voting_deadline', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={prevStep}>Tilbake</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Oppretter...' : 'Opprett tur'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
