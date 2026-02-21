import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';

const NATIONALITIES = [
  { code: 'NO', name: 'Norge' }, { code: 'SE', name: 'Sverige' }, { code: 'DK', name: 'Danmark' },
  { code: 'FI', name: 'Finland' }, { code: 'GB', name: 'Storbritannia' }, { code: 'DE', name: 'Tyskland' },
  { code: 'US', name: 'USA' }, { code: 'ES', name: 'Spania' }, { code: 'FR', name: 'Frankrike' },
  { code: 'IT', name: 'Italia' }, { code: 'PL', name: 'Polen' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', username: '',
    birthdate: '', gender: '', nationality: 'NO', phone: '', address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Passord må være minst 8 tegn'); return; }
    if (form.birthdate) {
      const age = (Date.now() - new Date(form.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 16) { setError('Du må være minst 16 år'); return; }
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/hub');
    } catch (err) {
      setError(err.error || 'Registrering feilet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card fade-in" style={{maxWidth:460}}>
        <h1 className="auth-title">{t('register')}</h1>
        <p className="auth-subtitle">{t('tagline')}</p>

        {error && <div style={{background:'#fee2e2',color:'#dc2626',padding:12,borderRadius:8,marginBottom:16,fontSize:14}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="form-group">
              <label>{t('first_name')} *</label>
              <input required value={form.first_name} onChange={e => update('first_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('last_name')} *</label>
              <input required value={form.last_name} onChange={e => update('last_name', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('email')} *</label>
            <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('username')} *</label>
            <input required value={form.username} onChange={e => update('username', e.target.value)} placeholder="Unikt brukernavn" />
          </div>
          <div className="form-group">
            <label>{t('password')} *</label>
            <input type="password" required value={form.password} onChange={e => update('password', e.target.value)} placeholder="Minst 8 tegn" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="form-group">
              <label>{t('birthdate')}</label>
              <input type="date" value={form.birthdate} onChange={e => update('birthdate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('gender')}</label>
              <select value={form.gender} onChange={e => update('gender', e.target.value)}>
                <option value="">Velg...</option>
                <option value="male">{t('male')}</option>
                <option value="female">{t('female')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="form-group">
              <label>{t('nationality')}</label>
              <select value={form.nationality} onChange={e => update('nationality', e.target.value)}>
                {NATIONALITIES.map(n => <option key={n.code} value={n.code}>{n.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('phone')}</label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+47..." />
            </div>
          </div>
          <div className="form-group">
            <label>{t('address')}</label>
            <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Gateadresse, postnr, by" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('loading') : t('register')}
          </button>
        </form>
        <div style={{marginTop:12,textAlign:'center',fontSize:14}}>
          Har du konto? <Link to="/login">{t('login')}</Link>
        </div>
      </div>
    </div>
  );
}
