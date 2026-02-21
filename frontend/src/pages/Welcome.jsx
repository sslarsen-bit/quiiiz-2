import React from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';

export default function Welcome() {
  return (
    <div className="auth-bg">
      <div className="auth-card" style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>&#9992;&#65039;</div>
        <h1 className="auth-title">Reiseplanlegger</h1>
        <p className="auth-subtitle">{t('tagline')}</p>
        <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:24}}>
          <Link to="/login" className="btn btn-primary">{t('login')}</Link>
          <Link to="/register" className="btn btn-secondary">{t('register')}</Link>
        </div>
        <p style={{marginTop:16,fontSize:12,color:'#94a3b8'}}>
          {t('demo_mode')} - Alle integrasjoner er simulert
        </p>
      </div>
    </div>
  );
}
