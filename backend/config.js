module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'reiseplanlegger-demo-secret-key-2024',
  JWT_EXPIRY: '7d',
  PORT: process.env.PORT || 3001,
  DB_PATH: process.env.DB_PATH || './reiseplanlegger.db',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@reiseplanlegger.no',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123!',

  featureFlags: {
    flights_enabled: true,
    hotels_enabled: true,
    activities_enabled: true,
    transport_enabled: true,
    documents_enabled: true,
    sms_enabled: false,
    email_enabled: false,
    social_enabled: true,
  },

  providers: {
    flight: { enabled: true, timeout: 5000, maxFailures: 3, resetAfterMs: 60000 },
    hotel: { enabled: true, timeout: 5000, maxFailures: 3, resetAfterMs: 60000 },
    activity: { enabled: true, timeout: 5000, maxFailures: 3, resetAfterMs: 60000 },
    transport: { enabled: true, timeout: 5000, maxFailures: 3, resetAfterMs: 60000 },
  },
};
