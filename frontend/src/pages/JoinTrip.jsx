import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { t } from '../i18n';

export default function JoinTrip() {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(urlCode || '');
  const [tripInfo, setTripInfo] = useState(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlCode) lookupTrip(urlCode);
  }, [urlCode]);

  const lookupTrip = async (c) => {
    try {
      const info = await api.get(`/trips/invite/${c}`);
      setTripInfo(info);
      setError('');
    } catch (err) {
      setError(err.error || 'Ugyldig kode');
      setTripInfo(null);
    }
  };

  const handleLookup = () => {
    if (code.length > 0) lookupTrip(code);
  };

  const handleJoin = async () => {
    if (!consent) { setError(t('consent_text') + ' er påkrevd'); return; }
    setLoading(true);
    try {
      const result = await api.post('/trips/join', { invite_code: code, consent: true });
      navigate(`/trip/${result.trip_id}`);
    } catch (err) {
      setError(err.error || 'Kunne ikke bli med');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page fade-in">
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:16}}>{t('join_trip')}</h1>

      {error && <div style={{background:'#fee2e2',color:'#dc2626',padding:12,borderRadius:8,marginBottom:16,fontSize:14}}>{error}</div>}

      <div className="card">
        <div className="form-group">
          <label>{t('invite_code')}</label>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="F.eks. DEMO01" maxLength={10} />
        </div>
        {!tripInfo && (
          <button className="btn btn-primary" onClick={handleLookup}>{t('search')}</button>
        )}

        {tripInfo && (
          <div className="fade-in">
            <div style={{padding:16,background:'#f0f4ff',borderRadius:8,marginBottom:16}}>
              <h3 style={{fontWeight:700}}>{tripInfo.title}</h3>
              <p style={{color:'var(--text-light)',fontSize:14}}>
                Leder: {tripInfo.leader_name} | {tripInfo.member_count} {t('members').toLowerCase()}
                {tripInfo.start_date && ` | ${tripInfo.start_date} - ${tripInfo.end_date}`}
              </p>
            </div>

            <div className="checkbox-row" style={{background:'#fef3c7',padding:12,borderRadius:8}}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <label style={{fontSize:14}}>{t('consent_text')}</label>
            </div>

            <button className="btn btn-primary" style={{marginTop:16}} onClick={handleJoin} disabled={!consent || loading}>
              {loading ? t('loading') : t('join')}
            </button>
          </div>
        )}
      </div>

      <div style={{marginTop:20,padding:16,background:'#f0f4ff',borderRadius:8,fontSize:13}}>
        <strong>Demo:</strong> Bruk kode <strong>DEMO01</strong> for å bli med i demo-turen.
      </div>
    </div>
  );
}
