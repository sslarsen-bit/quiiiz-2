const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');
const { featureFlagMiddleware } = require('./services/featureFlags');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(featureFlagMiddleware);

// Database setup
const DB_PATH = path.resolve(config.DB_PATH);
let db;

function initDatabase() {
  const needsSeed = !fs.existsSync(DB_PATH);
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  if (needsSeed) {
    console.log('No database found, running schema and seed...');
    const schema = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');
    db.exec(schema);

    // Run seed inline
    const bcrypt = require('bcryptjs');
    const { v4: uuid } = require('uuid');

    // Create admin
    const adminId = uuid();
    db.prepare(`INSERT INTO users (id, email, email_verified, password_hash, username, first_name, last_name, is_admin) VALUES (?, ?, 1, ?, ?, ?, ?, 1)`)
      .run(adminId, config.ADMIN_EMAIL, bcrypt.hashSync(config.ADMIN_PASSWORD, 10), 'admin', 'Admin', 'Bruker');

    // Create demo user
    const userId = uuid();
    db.prepare(`INSERT INTO users (id, email, email_verified, password_hash, username, first_name, last_name, birthdate, gender, nationality, phone, address) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, 'ola@demo.no', bcrypt.hashSync('demo1234', 10), 'ola_nordmann', 'Ola', 'Nordmann', '1995-06-15', 'male', 'NO', '+4791234567', 'Oslo, Norge');

    // Add basic catalog
    seedCatalog(db);

    console.log('Database initialized with default data.');
  }
}

function seedCatalog(database) {
  const { v4: uuid } = require('uuid');

  const countries = [
    { name: 'Spania', code: 'ES' }, { name: 'Italia', code: 'IT' }, { name: 'Hellas', code: 'GR' },
    { name: 'Portugal', code: 'PT' }, { name: 'Kroatia', code: 'HR' }, { name: 'Thailand', code: 'TH' },
    { name: 'Frankrike', code: 'FR' }, { name: 'Tyrkia', code: 'TR' },
  ];
  for (const c of countries) {
    database.prepare(`INSERT OR IGNORE INTO catalog_objects (id, type, name, country_code, metadata) VALUES (?, 'COUNTRY', ?, ?, '{}')`)
      .run(`country-${c.code.toLowerCase()}`, c.name, c.code);
  }

  const places = [
    { name: 'Barcelona', code: 'ES' }, { name: 'Madrid', code: 'ES' }, { name: 'Malaga', code: 'ES' },
    { name: 'Roma', code: 'IT' }, { name: 'Milano', code: 'IT' },
    { name: 'Athen', code: 'GR' }, { name: 'Santorini', code: 'GR' },
    { name: 'Lisboa', code: 'PT' }, { name: 'Porto', code: 'PT' },
    { name: 'Dubrovnik', code: 'HR' }, { name: 'Split', code: 'HR' },
    { name: 'Bangkok', code: 'TH' }, { name: 'Phuket', code: 'TH' },
    { name: 'Paris', code: 'FR' }, { name: 'Nice', code: 'FR' },
    { name: 'Istanbul', code: 'TR' }, { name: 'Antalya', code: 'TR' },
  ];
  for (const p of places) {
    database.prepare(`INSERT OR IGNORE INTO catalog_objects (id, type, name, country_code, city, metadata) VALUES (?, 'PLACE', ?, ?, ?, '{}')`)
      .run(`place-${p.name.toLowerCase()}`, p.name, p.code, p.name);
  }
}

initDatabase();

// Feature flags endpoint (public)
app.get('/api/feature-flags', (req, res) => {
  res.json(req.featureFlags);
});

// Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/trips', require('./routes/trips')(db));
app.use('/api/trips', require('./routes/planning')(db));
app.use('/api/trips', require('./routes/voting')(db));
app.use('/api/trips', require('./routes/chat')(db));
app.use('/api/trips', require('./routes/booking')(db));
app.use('/api/trips', require('./routes/documents')(db));
app.use('/api/notifications', require('./routes/notifications')(db));
app.use('/api/social', require('./routes/social')(db));
app.use('/api/catalog', require('./routes/catalog')(db));
app.use('/api/admin', require('./routes/admin')(db));

// Serve frontend in production
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'En uventet feil oppstod' });
});

app.listen(config.PORT, () => {
  console.log(`\nReiseplanlegger backend kjorer pa port ${config.PORT}`);
  console.log(`API: http://localhost:${config.PORT}/api`);
  console.log(`Feature flags: http://localhost:${config.PORT}/api/feature-flags`);
});
