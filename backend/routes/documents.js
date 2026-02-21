const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { isEnabled } = require('../services/featureFlags');
const { notifyTripMembers } = require('../services/notifications');

module.exports = function(db) {
  const router = express.Router();

  // Get documents for trip
  router.get('/:tripId/documents', authenticateToken, (req, res) => {
    if (!isEnabled('documents_enabled')) {
      return res.status(503).json({ error: 'Dokumenter er midlertidig utilgjengelig', degraded: true });
    }
    try {
      const docs = db.prepare('SELECT * FROM documents WHERE trip_id = ? ORDER BY created_at DESC').all(req.params.tripId);
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente dokumenter' });
    }
  });

  // Webhook endpoint (simulated - receives documents from providers)
  router.post('/webhook/document', (req, res) => {
    try {
      const { trip_id, type, provider, provider_ref, url, title } = req.body;
      if (!trip_id || !type) return res.status(400).json({ error: 'Mangler data' });

      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(trip_id);
      if (!trip) return res.status(404).json({ error: 'Tur ikke funnet' });

      const members = db.prepare('SELECT user_id FROM trip_memberships WHERE trip_id = ? AND left_at IS NULL').all(trip_id);
      const participantIds = members.map(m => m.user_id);

      const id = uuid();
      db.prepare(`
        INSERT INTO documents (id, trip_id, type, provider, provider_ref, url, title, participants)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, trip_id, type, provider || 'DEMO', provider_ref || null, url || '#demo-doc', title || 'Bekreftelse', JSON.stringify(participantIds));

      notifyTripMembers(db, trip_id, 'GENERAL', { message: `Nytt dokument: ${title || type}` });

      console.log(`[DOCUMENT WEBHOOK] ${type} for trip ${trip_id}`);
      res.status(201).json({ id, message: 'Dokument mottatt' });
    } catch (err) {
      console.error('[DOCUMENT WEBHOOK ERROR]', err.message);
      res.status(500).json({ error: 'Webhook-feil, dokumenter kan være forsinket' });
    }
  });

  // Simulate document creation (for demo)
  router.post('/:tripId/documents/simulate', authenticateToken, (req, res) => {
    try {
      const { type, title } = req.body;
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
      if (!trip) return res.status(404).json({ error: 'Tur ikke funnet' });

      const members = db.prepare('SELECT user_id FROM trip_memberships WHERE trip_id = ? AND left_at IS NULL').all(req.params.tripId);
      const participantIds = members.map(m => m.user_id);

      const id = uuid();
      db.prepare(`
        INSERT INTO documents (id, trip_id, type, provider, url, title, participants)
        VALUES (?, ?, ?, 'DEMO', '#demo-doc', ?, ?)
      `).run(id, req.params.tripId, type || 'OTHER', title || 'Demo-dokument', JSON.stringify(participantIds));

      res.status(201).json({ id, message: 'Demo-dokument opprettet' });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Get notifications
  router.get('/notifications', authenticateToken, (req, res) => {
    try {
      const notifications = db.prepare(`
        SELECT n.*, t.title as trip_title FROM notifications n
        LEFT JOIN trips t ON t.id = n.trip_id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 50
      `).all(req.user.id);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Mark notification as read
  router.put('/notifications/:id/read', authenticateToken, (req, res) => {
    try {
      db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
      res.json({ message: 'Lest' });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  return router;
};
