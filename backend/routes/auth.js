const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');

module.exports = function(db) {
  const router = express.Router();

  // Register
  router.post('/register', rateLimiter(10, 60000), (req, res) => {
    try {
      const { email, password, first_name, last_name, username, birthdate, gender, nationality, phone, address } = req.body;

      if (!email || !password || !first_name || !last_name || !username) {
        return res.status(400).json({ error: 'Mangler påkrevde felter' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Passord må være minst 8 tegn' });
      }
      if (birthdate) {
        const age = (Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 16) return res.status(400).json({ error: 'Du må være minst 16 år' });
      }

      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingEmail) return res.status(409).json({ error: 'E-post allerede i bruk' });

      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existingUser) return res.status(409).json({ error: 'Brukernavn allerede i bruk' });

      const id = uuid();
      const password_hash = bcrypt.hashSync(password, 10);

      db.prepare(`
        INSERT INTO users (id, email, password_hash, username, first_name, last_name, birthdate, gender, nationality, phone, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, email, password_hash, username, first_name, last_name, birthdate || null, gender || null, nationality || null, phone || null, address || null);

      const token = jwt.sign({ id, email, username, is_admin: false }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRY });

      res.status(201).json({ token, user: { id, email, username, first_name, last_name, email_verified: false } });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registrering feilet' });
    }
  });

  // Login
  router.post('/login', rateLimiter(20, 60000), (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'E-post og passord er påkrevd' });

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) return res.status(401).json({ error: 'Feil e-post eller passord' });

      if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Feil e-post eller passord' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username, is_admin: !!user.is_admin },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRY }
      );

      res.json({
        token,
        user: {
          id: user.id, email: user.email, username: user.username,
          first_name: user.first_name, last_name: user.last_name,
          email_verified: !!user.email_verified, is_admin: !!user.is_admin,
          language_pref: user.language_pref, currency_pref: user.currency_pref,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Innlogging feilet' });
    }
  });

  // Get current user profile
  router.get('/me', authenticateToken, (req, res) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      if (!user) return res.status(404).json({ error: 'Bruker ikke funnet' });

      const { password_hash, ...safe } = user;
      res.json(safe);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente profil' });
    }
  });

  // Update profile
  router.put('/me', authenticateToken, (req, res) => {
    try {
      const { first_name, last_name, username, birthdate, gender, nationality, phone, address, language_pref, currency_pref } = req.body;

      if (username) {
        const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
        if (existing) return res.status(409).json({ error: 'Brukernavn allerede i bruk' });
      }

      db.prepare(`
        UPDATE users SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          username = COALESCE(?, username),
          birthdate = COALESCE(?, birthdate),
          gender = COALESCE(?, gender),
          nationality = COALESCE(?, nationality),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          language_pref = COALESCE(?, language_pref),
          currency_pref = COALESCE(?, currency_pref),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(first_name, last_name, username, birthdate, gender, nationality, phone, address, language_pref, currency_pref, req.user.id);

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const { password_hash, ...safe } = user;
      res.json(safe);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke oppdatere profil' });
    }
  });

  // Forgot password (simulated)
  router.post('/forgot-password', rateLimiter(5, 60000), (req, res) => {
    const { email } = req.body;
    console.log(`[FORGOT PASSWORD] Reset requested for: ${email}`);
    res.json({ message: 'Hvis kontoen finnes, vil du motta en e-post med instruksjoner for å tilbakestille passordet.' });
  });

  // Verify email (simulated)
  router.post('/verify-email', authenticateToken, (req, res) => {
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(req.user.id);
    res.json({ message: 'E-post verifisert (demo)' });
  });

  return router;
};
