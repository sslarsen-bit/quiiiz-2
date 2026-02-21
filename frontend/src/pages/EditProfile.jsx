import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { t } from '../i18n';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auth/me').then(data => {
      setForm(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.put('/auth/me', form);
      updateUser(updated);
      navigate('/profile');
    } catch (err) {
      setError(err.error || 'Kunne ikke lagre');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="page fade-in">
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:16}}>{t('edit_profile')}</h1>

      {error && <div style={{background:'#fee2e2',color:'#dc2626',padding:12,borderRadius:8,marginBottom:16}}>{error}</div>}

      <div className="card">
        <div className="form-group">
          <label>{t('email')} (kan ikke endres)</label>
          <input value={form.email || ''} disabled style={{background:'#f1f5f9'}} />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group">
            <label>{t('first_name')}</label>
            <input value={form.first_name || ''} onChange={e => update('first_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('last_name')}</label>
            <input value={form.last_name || ''} onChange={e => update('last_name', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>{t('username')}</label>
          <input value={form.username || ''} onChange={e => update('username', e.target.value)} />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group">
            <label>{t('birthdate')}</label>
            <input type="date" value={form.birthdate || ''} onChange={e => update('birthdate', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('gender')}</label>
            <select value={form.gender || ''} onChange={e => update('gender', e.target.value)}>
              <option value="">{t('other')}</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
              <option value="other">{t('other')}</option>
            </select>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group">
            <label>{t('nationality')}</label>
            <input value={form.nationality || ''} onChange={e => update('nationality', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('phone')}</label>
            <input value={form.phone || ''} onChange={e => update('phone', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>{t('address')}</label>
          <input value={form.address || ''} onChange={e => update('address', e.target.value)} />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group">
            <label>{t('language')}</label>
            <select value={form.language_pref || 'auto'} onChange={e => update('language_pref', e.target.value)}>
              <option value="auto">Auto</option>
              <option value="no">{t('norwegian')}</option>
              <option value="en">{t('english')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>Valuta</label>
            <select value={form.currency_pref || 'NOK'} onChange={e => update('currency_pref', e.target.value)}>
              <option value="NOK">NOK</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="SEK">SEK</option>
            </select>
          </div>
        </div>

        <div style={{display:'flex',gap:12,marginTop:16}}>
          <button className="btn btn-secondary" onClick={() => navigate('/profile')}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t('loading') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
