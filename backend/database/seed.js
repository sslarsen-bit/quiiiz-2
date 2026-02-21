const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'reiseplanlegger.db');

// Remove existing db
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

console.log('Database created with schema.');

// Seed admin
const adminId = uuid();
db.prepare(`INSERT INTO users (id, email, email_verified, password_hash, username, first_name, last_name, birthdate, gender, nationality, phone, is_admin) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
  .run(adminId, 'admin@reiseplanlegger.no', bcrypt.hashSync('admin123!', 10), 'admin', 'Admin', 'Bruker', '1990-01-01', 'other', 'NO', '+4790000000');

// Seed demo users
const demoUsers = [
  { email: 'ola@demo.no', username: 'ola_nordmann', first_name: 'Ola', last_name: 'Nordmann', birthdate: '1995-06-15', gender: 'male', nationality: 'NO', phone: '+4791234567' },
  { email: 'kari@demo.no', username: 'kari_hansen', first_name: 'Kari', last_name: 'Hansen', birthdate: '1998-03-22', gender: 'female', nationality: 'NO', phone: '+4792345678' },
  { email: 'erik@demo.no', username: 'erik_berg', first_name: 'Erik', last_name: 'Berg', birthdate: '1997-11-08', gender: 'male', nationality: 'NO', phone: '+4793456789' },
  { email: 'lisa@demo.no', username: 'lisa_storm', first_name: 'Lisa', last_name: 'Storm', birthdate: '2000-01-20', gender: 'female', nationality: 'NO', phone: '+4794567890' },
  { email: 'magnus@demo.no', username: 'magnus_sol', first_name: 'Magnus', last_name: 'Solberg', birthdate: '1996-09-12', gender: 'male', nationality: 'NO', phone: '+4795678901' },
];

const userIds = [];
for (const u of demoUsers) {
  const id = uuid();
  userIds.push(id);
  db.prepare(`INSERT INTO users (id, email, email_verified, password_hash, username, first_name, last_name, birthdate, gender, nationality, phone, address) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, u.email, bcrypt.hashSync('demo1234', 10), u.username, u.first_name, u.last_name, u.birthdate, u.gender, u.nationality, u.phone, 'Oslo, Norge');
}

console.log(`Created ${demoUsers.length} demo users + admin`);

// Seed catalog objects
const countries = [
  { name: 'Spania', code: 'ES' }, { name: 'Italia', code: 'IT' }, { name: 'Hellas', code: 'GR' },
  { name: 'Portugal', code: 'PT' }, { name: 'Kroatia', code: 'HR' }, { name: 'Thailand', code: 'TH' },
  { name: 'Frankrike', code: 'FR' }, { name: 'Tyrkia', code: 'TR' },
];

const countryIds = {};
for (const c of countries) {
  const id = `country-${c.code.toLowerCase()}`;
  countryIds[c.code] = id;
  db.prepare(`INSERT INTO catalog_objects (id, type, name, country_code, metadata) VALUES (?, 'COUNTRY', ?, ?, ?)`)
    .run(id, c.name, c.code, JSON.stringify({ flag: c.code }));
}

const places = [
  { name: 'Barcelona', code: 'ES', city: 'Barcelona' },
  { name: 'Madrid', code: 'ES', city: 'Madrid' },
  { name: 'Malaga', code: 'ES', city: 'Malaga' },
  { name: 'Roma', code: 'IT', city: 'Roma' },
  { name: 'Milano', code: 'IT', city: 'Milano' },
  { name: 'Athen', code: 'GR', city: 'Athen' },
  { name: 'Santorini', code: 'GR', city: 'Santorini' },
  { name: 'Lisboa', code: 'PT', city: 'Lisboa' },
  { name: 'Porto', code: 'PT', city: 'Porto' },
  { name: 'Dubrovnik', code: 'HR', city: 'Dubrovnik' },
  { name: 'Split', code: 'HR', city: 'Split' },
  { name: 'Bangkok', code: 'TH', city: 'Bangkok' },
  { name: 'Phuket', code: 'TH', city: 'Phuket' },
  { name: 'Paris', code: 'FR', city: 'Paris' },
  { name: 'Nice', code: 'FR', city: 'Nice' },
  { name: 'Istanbul', code: 'TR', city: 'Istanbul' },
  { name: 'Antalya', code: 'TR', city: 'Antalya' },
];

const placeIds = {};
for (const p of places) {
  const id = `place-${p.city.toLowerCase().replace(/\s+/g, '-')}`;
  placeIds[p.city] = id;
  db.prepare(`INSERT INTO catalog_objects (id, type, name, country_code, city, metadata) VALUES (?, 'PLACE', ?, ?, ?, ?)`)
    .run(id, p.name, p.code, p.city, JSON.stringify({ popular: true }));
}

// Hotels
const hotelData = [
  { city: 'Barcelona', hotels: ['Hotel Arts Barcelona', 'W Barcelona', 'Generator Barcelona'] },
  { city: 'Roma', hotels: ['Hotel de Russie', 'The St. Regis Rome', 'Generator Rome'] },
  { city: 'Athen', hotels: ['Hotel Grande Bretagne', 'Electra Palace Athens', 'Athens Backpackers'] },
  { city: 'Lisboa', hotels: ['Pestana Palace Lisboa', 'Hotel Avenida Palace', 'Yes Lisbon Hostel'] },
  { city: 'Dubrovnik', hotels: ['Hotel Excelsior Dubrovnik', 'Hilton Imperial Dubrovnik', 'Old Town Hostel'] },
  { city: 'Bangkok', hotels: ['Mandarin Oriental Bangkok', 'Chatrium Hotel', 'NapPark Hostel'] },
  { city: 'Paris', hotels: ['Le Meurice', 'Hotel Plaza Athenee', 'Generator Paris'] },
  { city: 'Santorini', hotels: ['Canaves Oia Suites', 'Katikies Hotel', 'Youth Hostel Anna'] },
];

const hotelIds = {};
for (const h of hotelData) {
  hotelIds[h.city] = [];
  for (const name of h.hotels) {
    const id = `hotel-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}`;
    hotelIds[h.city].push(id);
    const price = 500 + Math.floor(Math.random() * 3000);
    db.prepare(`INSERT INTO catalog_objects (id, type, name, country_code, city, metadata) VALUES (?, 'HOTEL', ?, ?, ?, ?)`)
      .run(id, name, places.find(p => p.city === h.city)?.code || 'ES', h.city, JSON.stringify({ pricePerNight: price, currency: 'NOK', stars: Math.floor(Math.random() * 3) + 3, amenities: ['WiFi', 'Frokost'] }));
  }
}

// Activities
const activityData = [
  { city: 'Barcelona', activities: ['La Sagrada Familia-tur', 'Tapas-vandring i El Born', 'Strandfest Barcelona'] },
  { city: 'Roma', activities: ['Colosseum-tur', 'Pasta-laging i Trastevere', 'Nattvandring Roma'] },
  { city: 'Athen', activities: ['Akropolis-tur', 'Gresk matsmakingtur', 'Rooftop-bar Athen'] },
  { city: 'Lisboa', activities: ['Tram 28-tur', 'Vinsmakingtur Lisboa', 'Fado-kveld i Alfama'] },
  { city: 'Bangkok', activities: ['Grand Palace-tur', 'Street food-tur', 'Khao San Road nightlife'] },
  { city: 'Paris', activities: ['Eiffel Tower-tur', 'Vinsmakingtur Montmartre', 'Moulin Rouge'] },
];

for (const a of activityData) {
  for (const name of a.activities) {
    const id = `act-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}`;
    const price = 150 + Math.floor(Math.random() * 800);
    const categories = ['kultur', 'fest', 'sport', 'avslapning'];
    db.prepare(`INSERT INTO catalog_objects (id, type, name, country_code, city, metadata) VALUES (?, 'ACTIVITY', ?, ?, ?, ?)`)
      .run(id, name, places.find(p => p.city === a.city)?.code || 'ES', a.city, JSON.stringify({ pricePerPerson: price, currency: 'NOK', category: categories[Math.floor(Math.random() * categories.length)], duration: '2-4 timer' }));
  }
}

console.log('Catalog objects seeded.');

// Create a demo trip
const tripId = uuid();
db.prepare(`INSERT INTO trips (id, title, leader_user_id, start_date, end_date, budget_per_person, budget_currency, interests, preferred_countries, invite_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  .run(tripId, 'Sommerferie 2026 Barcelona', userIds[0], '2026-07-15', '2026-07-22', 15000, 'NOK', JSON.stringify(['fest', 'kultur', 'strand']), JSON.stringify(['ES']), 'DEMO01', 'COLLECTING_SUGGESTIONS');

// Add members
db.prepare(`INSERT INTO trip_memberships (id, trip_id, user_id, role, consent_given, consent_timestamp) VALUES (?, ?, ?, 'LEADER', 1, datetime('now'))`).run(uuid(), tripId, userIds[0]);
db.prepare(`INSERT INTO trip_memberships (id, trip_id, user_id, role, consent_given, consent_timestamp) VALUES (?, ?, ?, 'MEMBER', 1, datetime('now'))`).run(uuid(), tripId, userIds[1]);
db.prepare(`INSERT INTO trip_memberships (id, trip_id, user_id, role, consent_given, consent_timestamp) VALUES (?, ?, ?, 'MEMBER', 1, datetime('now'))`).run(uuid(), tripId, userIds[2]);
db.prepare(`INSERT INTO trip_memberships (id, trip_id, user_id, role, consent_given, consent_timestamp) VALUES (?, ?, ?, 'MEMBER', 1, datetime('now'))`).run(uuid(), tripId, userIds[3]);

// Add some chat messages
db.prepare('INSERT INTO chat_messages (id, trip_id, sender_user_id, text) VALUES (?, ?, ?, ?)').run(uuid(), tripId, userIds[0], 'Hei alle! Klar for sommerferie? La oss planlegge!');
db.prepare('INSERT INTO chat_messages (id, trip_id, sender_user_id, text) VALUES (?, ?, ?, ?)').run(uuid(), tripId, userIds[1], 'Jaa! Barcelona hadde vart sykt bra!');
db.prepare('INSERT INTO chat_messages (id, trip_id, sender_user_id, text) VALUES (?, ?, ?, ?)').run(uuid(), tripId, userIds[2], 'Enig! Men kanskje vi bør vurdere Lisboa også?');

// Add friendships
db.prepare("INSERT INTO friendships (id, user_id, friend_user_id, status) VALUES (?, ?, ?, 'ACCEPTED')").run(uuid(), userIds[0], userIds[1]);
db.prepare("INSERT INTO friendships (id, user_id, friend_user_id, status) VALUES (?, ?, ?, 'ACCEPTED')").run(uuid(), userIds[0], userIds[2]);
db.prepare("INSERT INTO friendships (id, user_id, friend_user_id, status) VALUES (?, ?, ?, 'PENDING')").run(uuid(), userIds[3], userIds[4]);

console.log('Demo trip and data seeded.');
console.log('\n--- Demo Login Credentials ---');
console.log('Admin: admin@reiseplanlegger.no / admin123!');
console.log('User (Ola): ola@demo.no / demo1234');
console.log('User (Kari): kari@demo.no / demo1234');
console.log('User (Erik): erik@demo.no / demo1234');
console.log('User (Lisa): lisa@demo.no / demo1234');
console.log('User (Magnus): magnus@demo.no / demo1234');
console.log('Demo trip invite code: DEMO01');
console.log('---');

db.close();
