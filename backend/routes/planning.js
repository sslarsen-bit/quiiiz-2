const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  function checkMembership(tripId, userId) {
    return db.prepare('SELECT * FROM trip_memberships WHERE trip_id = ? AND user_id = ? AND left_at IS NULL').get(tripId, userId);
  }

  // Get plan tree for a trip
  router.get('/:tripId/plan', authenticateToken, (req, res) => {
    try {
      if (!checkMembership(req.params.tripId, req.user.id)) return res.status(403).json({ error: 'Ikke tilgang' });

      const groups = db.prepare('SELECT * FROM trip_option_groups WHERE trip_id = ? ORDER BY created_at').all(req.params.tripId);
      const items = db.prepare(`
        SELECT toi.*, co.name, co.type as obj_type, co.country_code, co.city, co.metadata
        FROM trip_option_items toi
        JOIN catalog_objects co ON co.id = toi.catalog_object_id
        WHERE toi.group_id IN (SELECT id FROM trip_option_groups WHERE trip_id = ?)
        AND toi.status = 'ACTIVE'
      `).all(req.params.tripId);

      const tree = groups.map(g => ({
        ...g,
        items: items.filter(i => i.group_id === g.id),
      }));

      res.json(tree);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente plan' });
    }
  });

  // Add option group
  router.post('/:tripId/plan/groups', authenticateToken, (req, res) => {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
      if (!trip || trip.leader_user_id !== req.user.id) return res.status(403).json({ error: 'Kun leder' });

      const { type, parent_group_id } = req.body;
      const id = uuid();
      db.prepare(`
        INSERT INTO trip_option_groups (id, trip_id, type, parent_group_id) VALUES (?, ?, ?, ?)
      `).run(id, req.params.tripId, type, parent_group_id || null);

      res.status(201).json({ id, trip_id: req.params.tripId, type, parent_group_id });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke opprette gruppe' });
    }
  });

  // Add item to group
  router.post('/:tripId/plan/items', authenticateToken, (req, res) => {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
      if (!trip || trip.leader_user_id !== req.user.id) return res.status(403).json({ error: 'Kun leder' });

      const { group_id, catalog_object_id } = req.body;
      const id = uuid();
      db.prepare(`
        INSERT INTO trip_option_items (id, group_id, catalog_object_id, source) VALUES (?, ?, ?, 'LEADER_CURATED')
      `).run(id, group_id, catalog_object_id);

      const item = db.prepare(`
        SELECT toi.*, co.name, co.type as obj_type, co.country_code, co.city, co.metadata
        FROM trip_option_items toi JOIN catalog_objects co ON co.id = toi.catalog_object_id
        WHERE toi.id = ?
      `).get(id);

      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke legge til element' });
    }
  });

  // Remove item
  router.delete('/:tripId/plan/items/:itemId', authenticateToken, (req, res) => {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
      if (!trip || trip.leader_user_id !== req.user.id) return res.status(403).json({ error: 'Kun leder' });

      db.prepare("UPDATE trip_option_items SET status = 'REMOVED' WHERE id = ?").run(req.params.itemId);
      res.json({ message: 'Element fjernet' });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke fjerne element' });
    }
  });

  // Submit suggestion
  router.post('/:tripId/suggestions', authenticateToken, (req, res) => {
    try {
      if (!checkMembership(req.params.tripId, req.user.id)) return res.status(403).json({ error: 'Ikke tilgang' });

      const { target_group_type, catalog_object_id } = req.body;
      const id = uuid();
      db.prepare(`
        INSERT INTO suggestions (id, trip_id, suggested_by_user_id, target_group_type, catalog_object_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, req.params.tripId, req.user.id, target_group_type, catalog_object_id);

      res.status(201).json({ id, status: 'PENDING' });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke sende forslag' });
    }
  });

  // Get suggestions
  router.get('/:tripId/suggestions', authenticateToken, (req, res) => {
    try {
      if (!checkMembership(req.params.tripId, req.user.id)) return res.status(403).json({ error: 'Ikke tilgang' });

      const suggestions = db.prepare(`
        SELECT s.*, co.name, co.type as obj_type, co.metadata, u.username as suggested_by_username
        FROM suggestions s
        JOIN catalog_objects co ON co.id = s.catalog_object_id
        JOIN users u ON u.id = s.suggested_by_user_id
        WHERE s.trip_id = ?
        ORDER BY s.created_at DESC
      `).all(req.params.tripId);

      res.json(suggestions);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente forslag' });
    }
  });

  // Approve/reject suggestion
  router.put('/:tripId/suggestions/:suggestionId', authenticateToken, (req, res) => {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
      if (!trip || trip.leader_user_id !== req.user.id) return res.status(403).json({ error: 'Kun leder' });

      const { status, group_id } = req.body;
      if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'Ugyldig status' });

      db.prepare(`
        UPDATE suggestions SET status = ?, reviewed_by_user_id = ?, reviewed_at = datetime('now') WHERE id = ?
      `).run(status, req.user.id, req.params.suggestionId);

      if (status === 'APPROVED' && group_id) {
        const suggestion = db.prepare('SELECT * FROM suggestions WHERE id = ?').get(req.params.suggestionId);
        if (suggestion) {
          db.prepare(`
            INSERT INTO trip_option_items (id, group_id, catalog_object_id, source) VALUES (?, ?, ?, 'USER_SUGGESTED_APPROVED')
          `).run(uuid(), group_id, suggestion.catalog_object_id);
        }
      }

      res.json({ message: `Forslag ${status === 'APPROVED' ? 'godkjent' : 'avvist'}` });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke oppdatere forslag' });
    }
  });

  return router;
};
