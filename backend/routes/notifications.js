const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  // Get notifications for user
  router.get('/', authenticateToken, (req, res) => {
    try {
      const { trip_id } = req.query;
      let query = 'SELECT * FROM notifications WHERE user_id = ?';
      const params = [req.user.id];

      if (trip_id) {
        query += ' AND trip_id = ?';
        params.push(trip_id);
      }

      query += ' ORDER BY created_at DESC LIMIT 50';
      const notifs = db.prepare(query).all(...params);
      res.json(notifs.map(n => ({ ...n, payload: JSON.parse(n.payload || '{}') })));
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Mark as read
  router.put('/:id/read', authenticateToken, (req, res) => {
    try {
      db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
      res.json({ message: 'Markert som lest' });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Mark all as read
  router.put('/read-all', authenticateToken, (req, res) => {
    try {
      const { trip_id } = req.body;
      if (trip_id) {
        db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND trip_id = ? AND read_at IS NULL").run(req.user.id, trip_id);
      } else {
        db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").run(req.user.id);
      }
      res.json({ message: 'Alle markert som lest' });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Unread count
  router.get('/unread-count', authenticateToken, (req, res) => {
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL').get(req.user.id);
      res.json({ count: count.count });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  return router;
};
