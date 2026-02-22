const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { notifyTripMembers, createNotification } = require('../services/notifications');

module.exports = function(db) {
  const router = express.Router();

  function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Create trip
  router.post('/', authenticateToken, (req, res) => {
    try {
      const {
        title, start_date, end_date, budget_per_person, budget_currency,
        interests, preferred_countries,
        enable_country, enable_place, enable_flight, enable_hotel, enable_activity,
        voting_timing, suggestion_deadline, voting_deadline,
        fixed_destination_place_id,
      } = req.body;

      if (!title) return res.status(400).json({ error: 'Turnavn er påkrevd' });

      const id = uuid();
      const invite_code = generateInviteCode();

      db.prepare(`
        INSERT INTO trips (id, title, leader_user_id, start_date, end_date, budget_per_person, budget_currency,
          interests, preferred_countries, enable_country, enable_place, enable_flight, enable_hotel, enable_activity,
          voting_timing, suggestion_deadline, voting_deadline, invite_code, fixed_destination_place_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, title, req.user.id, start_date || null, end_date || null,
        budget_per_person || null, budget_currency || 'NOK',
        JSON.stringify(interests || []), JSON.stringify(preferred_countries || []),
        enable_country === false ? 0 : 1, enable_place === false ? 0 : 1, enable_flight === false ? 0 : 1, enable_hotel === false ? 0 : 1, enable_activity === false ? 0 : 1,
        voting_timing || 'ALL_AT_END', suggestion_deadline || null, voting_deadline || null,
        invite_code, fixed_destination_place_id || null
      );

      // Add leader as member
      db.prepare(`
        INSERT INTO trip_memberships (id, trip_id, user_id, role, consent_given, consent_timestamp)
        VALUES (?, ?, ?, 'LEADER', 1, datetime('now'))
      `).run(uuid(), id, req.user.id);

      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
      res.status(201).json(trip);
    } catch (err) {
      console.error('Create trip error:', err);
      res.status(500).json({ error: 'Kunne ikke opprette tur' });
    }
  });

  // Get user's trips
  router.get('/', authenticateToken, (req, res) => {
    try {
      const trips = db.prepare(`
        SELECT t.*, tm.role, u.first_name as leader_first_name, u.last_name as leader_last_name,
          (SELECT COUNT(*) FROM trip_memberships WHERE trip_id = t.id AND left_at IS NULL) as member_count
        FROM trips t
        JOIN trip_memberships tm ON tm.trip_id = t.id AND tm.user_id = ? AND tm.left_at IS NULL
        JOIN users u ON u.id = t.leader_user_id
        ORDER BY t.created_at DESC
      `).all(req.user.id);
      res.json(trips);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente turer' });
    }
  });

  // Get single trip
  router.get('/:id', authenticateToken, (req, res) => {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
      if (!trip) return res.status(404).json({ error: 'Tur ikke funnet' });

      const membership = db.prepare('SELECT * FROM trip_memberships WHERE trip_id = ? AND user_id = ? AND left_at IS NULL').get(req.params.id, req.user.id);
      if (!membership && !req.user.is_admin) return res.status(403).json({ error: 'Ikke tilgang' });

      const members = db.prepare(`
        SELECT tm.*, u.first_name, u.last_name, u.username, u.avatar_url
        FROM trip_memberships tm JOIN users u ON u.id = tm.user_id
        WHERE tm.trip_id = ? AND tm.left_at IS NULL
      `).all(req.params.id);

      res.json({ ...trip, members, currentUserRole: membership?.role });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente tur' });
    }
  });

  // Join trip via invite code
  router.post('/join', authenticateToken, (req, res) => {
    try {
      const { invite_code, consent } = req.body;
      if (!invite_code) return res.status(400).json({ error: 'Invitasjonskode er påkrevd' });
      if (!consent) return res.status(400).json({ error: 'Du må godta samtykke for å bli med' });

      const trip = db.prepare('SELECT * FROM trips WHERE invite_code = ?').get(invite_code.toUpperCase());
      if (!trip) return res.status(404).json({ error: 'Ugyldig invitasjonskode' });

      const existing = db.prepare('SELECT * FROM trip_memberships WHERE trip_id = ? AND user_id = ?').get(trip.id, req.user.id);
      if (existing && !existing.left_at) return res.status(409).json({ error: 'Du er allerede med i denne turen' });

      if (existing && existing.left_at) {
        db.prepare('UPDATE trip_memberships SET left_at = NULL, consent_given = 1, consent_timestamp = datetime(\'now\') WHERE id = ?').run(existing.id);
      } else {
        db.prepare(`
          INSERT INTO trip_memberships (id, trip_id, user_id, role, consent_given, consent_timestamp)
          VALUES (?, ?, ?, 'MEMBER', 1, datetime('now'))
        `).run(uuid(), trip.id, req.user.id);
      }

      createNotification(db, { tripId: trip.id, userId: trip.leader_user_id, type: 'GENERAL', payload: { message: `Ny deltaker ble med i turen` } });

      res.json({ message: 'Du er nå med i turen', trip_id: trip.id });
    } catch (err) {
      console.error('Join trip error:', err);
      res.status(500).json({ error: 'Kunne ikke bli med i tur' });
    }
  });

  // Get trip by invite code (public info)
  router.get('/invite/:code', (req, res) => {
    try {
      const trip = db.prepare(`
        SELECT t.id, t.title, t.start_date, t.end_date, t.status, t.interests,
          u.first_name as leader_name,
          (SELECT COUNT(*) FROM trip_memberships WHERE trip_id = t.id AND left_at IS NULL) as member_count
        FROM trips t JOIN users u ON u.id = t.leader_user_id
        WHERE t.invite_code = ?
      `).get(req.params.code.toUpperCase());
      if (!trip) return res.status(404).json({ error: 'Ugyldig invitasjonskode' });
      res.json(trip);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente turinformasjon' });
    }
  });

  // Update trip
  router.put('/:id', authenticateToken, (req, res) => {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
      if (!trip) return res.status(404).json({ error: 'Tur ikke funnet' });
      if (trip.leader_user_id !== req.user.id) return res.status(403).json({ error: 'Kun leder kan endre turen' });

      const fields = req.body;
      const allowed = ['title', 'start_date', 'end_date', 'budget_per_person', 'budget_currency', 'interests', 'preferred_countries',
        'enable_country', 'enable_place', 'enable_flight', 'enable_hotel', 'enable_activity',
        'voting_timing', 'suggestion_deadline', 'voting_deadline', 'status', 'booker_user_id'];

      const updates = [];
      const values = [];
      for (const key of allowed) {
        if (fields[key] !== undefined) {
          updates.push(`${key} = ?`);
          let val = fields[key];
          if (typeof val === 'object') val = JSON.stringify(val);
          else if (typeof val === 'boolean') val = val ? 1 : 0;
          values.push(val);
        }
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        values.push(req.params.id);
        db.prepare(`UPDATE trips SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }

      // Notify on status change
      if (fields.status === 'VOTING_OPEN') {
        notifyTripMembers(db, req.params.id, 'VOTING_STARTED', { message: 'Avstemning er åpnet!' });
      } else if (fields.status === 'LOCKED' || fields.status === 'VOTING_CLOSED') {
        notifyTripMembers(db, req.params.id, 'VOTING_LOCKED_RESULT', { message: 'Avstemning er avsluttet!' });
      }

      // Handle booker assignment
      if (fields.booker_user_id) {
        db.prepare('UPDATE trip_memberships SET role = \'MEMBER\' WHERE trip_id = ? AND role = \'BOOKER\'').run(req.params.id);
        db.prepare('UPDATE trip_memberships SET role = \'BOOKER\' WHERE trip_id = ? AND user_id = ?').run(req.params.id, fields.booker_user_id);
      }

      const updated = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (err) {
      console.error('Update trip error:', err);
      res.status(500).json({ error: 'Kunne ikke oppdatere tur' });
    }
  });

  // Remove member
  router.delete('/:id/members/:userId', authenticateToken, (req, res) => {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
      if (!trip) return res.status(404).json({ error: 'Tur ikke funnet' });

      const isLeader = trip.leader_user_id === req.user.id;
      const isSelf = req.params.userId === req.user.id;
      if (!isLeader && !isSelf) return res.status(403).json({ error: 'Ikke tilgang' });

      db.prepare("UPDATE trip_memberships SET left_at = datetime('now') WHERE trip_id = ? AND user_id = ?").run(req.params.id, req.params.userId);
      res.json({ message: 'Medlem fjernet' });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke fjerne medlem' });
    }
  });

  // Get members with booking info (for leader/booker)
  router.get('/:id/members/booking-info', authenticateToken, (req, res) => {
    try {
      const membership = db.prepare('SELECT * FROM trip_memberships WHERE trip_id = ? AND user_id = ? AND left_at IS NULL').get(req.params.id, req.user.id);
      if (!membership || (membership.role !== 'LEADER' && membership.role !== 'BOOKER')) {
        return res.status(403).json({ error: 'Kun leder eller booker har tilgang' });
      }

      const members = db.prepare(`
        SELECT u.id, u.first_name, u.last_name, u.birthdate, u.gender, u.nationality, u.phone, u.address
        FROM trip_memberships tm JOIN users u ON u.id = tm.user_id
        WHERE tm.trip_id = ? AND tm.left_at IS NULL AND tm.consent_given = 1
      `).all(req.params.id);

      res.json(members);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente bookinginfo' });
    }
  });

  // Send nudge
  router.post('/:id/nudge', authenticateToken, (req, res) => {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
      if (!trip || trip.leader_user_id !== req.user.id) return res.status(403).json({ error: 'Kun leder' });

      notifyTripMembers(db, req.params.id, 'REMINDER', { message: 'Husk å stemme!' }, req.user.id);
      res.json({ message: 'Påminnelse sendt' });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke sende påminnelse' });
    }
  });

  return router;
};
