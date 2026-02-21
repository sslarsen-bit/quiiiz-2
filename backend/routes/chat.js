const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  function checkMembership(tripId, userId) {
    return db.prepare('SELECT * FROM trip_memberships WHERE trip_id = ? AND user_id = ? AND left_at IS NULL').get(tripId, userId);
  }

  // Get messages
  router.get('/:tripId/chat', authenticateToken, (req, res) => {
    try {
      if (!checkMembership(req.params.tripId, req.user.id)) return res.status(403).json({ error: 'Ikke tilgang' });

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const messages = db.prepare(`
        SELECT cm.*, u.username, u.first_name, u.avatar_url
        FROM chat_messages cm JOIN users u ON u.id = cm.sender_user_id
        WHERE cm.trip_id = ?
        ORDER BY cm.created_at DESC
        LIMIT ? OFFSET ?
      `).all(req.params.tripId, limit, offset);

      const messageIds = messages.map(m => m.id);
      let reactions = [];
      if (messageIds.length > 0) {
        reactions = db.prepare(`
          SELECT cr.*, u.username FROM chat_reactions cr
          JOIN users u ON u.id = cr.user_id
          WHERE cr.message_id IN (${messageIds.map(() => '?').join(',')})
        `).all(...messageIds);
      }

      const result = messages.reverse().map(m => ({
        ...m,
        reactions: reactions.filter(r => r.message_id === m.id),
      }));

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente meldinger' });
    }
  });

  // Send message
  router.post('/:tripId/chat', authenticateToken, (req, res) => {
    try {
      if (!checkMembership(req.params.tripId, req.user.id)) return res.status(403).json({ error: 'Ikke tilgang' });

      const { text } = req.body;
      if (!text || !text.trim()) return res.status(400).json({ error: 'Melding kan ikke være tom' });

      const id = uuid();
      db.prepare('INSERT INTO chat_messages (id, trip_id, sender_user_id, text) VALUES (?, ?, ?, ?)')
        .run(id, req.params.tripId, req.user.id, text.trim());

      const msg = db.prepare(`
        SELECT cm.*, u.username, u.first_name, u.avatar_url
        FROM chat_messages cm JOIN users u ON u.id = cm.sender_user_id
        WHERE cm.id = ?
      `).get(id);

      res.status(201).json({ ...msg, reactions: [] });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke sende melding' });
    }
  });

  // Add reaction
  router.post('/:tripId/chat/:messageId/reactions', authenticateToken, (req, res) => {
    try {
      if (!checkMembership(req.params.tripId, req.user.id)) return res.status(403).json({ error: 'Ikke tilgang' });

      const { emoji } = req.body;
      if (!emoji) return res.status(400).json({ error: 'Emoji påkrevd' });

      const existing = db.prepare('SELECT id FROM chat_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?')
        .get(req.params.messageId, req.user.id, emoji);

      if (existing) {
        db.prepare('DELETE FROM chat_reactions WHERE id = ?').run(existing.id);
        res.json({ action: 'removed' });
      } else {
        db.prepare('INSERT INTO chat_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)')
          .run(uuid(), req.params.messageId, req.user.id, emoji);
        res.json({ action: 'added' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Reaksjon feilet' });
    }
  });

  return router;
};
