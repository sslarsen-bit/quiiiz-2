import React from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';

export default function Welcome() {
  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✈️</div>
        <h1 className="auth-title">Reiseplanlegger</h1>
        <p className="auth-subtitle">{t('tagline')}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32 }}>
          <Link to="/login" className="btn btn-primary" style={{ fontSize: 16, padding: '16px 32px' }}>
            {t('login')}
          </Link>
          <Link to="/register" className="btn btn-secondary" style={{ fontSize: 16, padding: '16px 32px' }}>
            {t('register')}
          </Link>
        </div>

        <div style={{
          marginTop: 28,
          padding: '14px 20px',
          background: 'rgba(37, 99, 235, 0.06)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--text-light)',
          lineHeight: 1.5,
        }}>
          Demo-modus — alle integrasjoner er simulert
        </div>
      </div>
    </div>
  );
}
