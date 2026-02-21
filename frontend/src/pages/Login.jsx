import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/hub');
    } catch (err) {
      setError(err.error || 'Innlogging feilet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card fade-in">
        <h1 className="auth-title">{t('login')}</h1>
        <p className="auth-subtitle">{t('tagline')}</p>

        {error && <div className="card" style={{background:'#fee2e2',color:'#dc2626',marginBottom:16,padding:12,fontSize:14}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@epost.no" />
          </div>
          <div className="form-group">
            <label>{t('password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minst 8 tegn" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('loading') : t('login')}
          </button>
        </form>

        <div style={{marginTop:16,textAlign:'center',fontSize:14}}>
          <Link to="/register">{t('register')}</Link>
          <span style={{margin:'0 8px'}}>|</span>
          <a href="#" onClick={(e) => { e.preventDefault(); alert('Demo: E-post sendt til ' + (email || 'din adresse')); }}>{t('forgot_password')}</a>
        </div>

        <div style={{marginTop:20,padding:12,background:'#f0f4ff',borderRadius:8,fontSize:13,color:'#64748b'}}>
          <strong>Demo-kontoer:</strong><br/>
          admin@reiseplanlegger.no / admin123!<br/>
          ola@demo.no / demo1234
        </div>
      </div>
    </div>
  );
}
