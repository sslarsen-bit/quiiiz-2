const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getAllFlags, setFlag } = require('../services/featureFlags');
const providers = require('../providers');

module.exports = function(db) {
  const router = express.Router();

  router.use(authenticateToken);
  router.use(requireAdmin);

  // Dashboard
  router.get('/dashboard', (req, res) => {
    try {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const tripCount = db.prepare('SELECT COUNT(*) as count FROM trips').get().count;
      const activeTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status NOT IN ('BOOKED')").get().count;

      const topDestinations = db.prepare(`
        SELECT co.name, co.country_code, COUNT(*) as count
        FROM trip_option_items toi
        JOIN catalog_objects co ON co.id = toi.catalog_object_id
        WHERE co.type IN ('COUNTRY','PLACE')
        GROUP BY co.id ORDER BY count DESC LIMIT 10
      `).all();

      const topHotels = db.prepare(`
        SELECT co.name, COUNT(*) as count
        FROM trip_option_items toi
        JOIN catalog_objects co ON co.id = toi.catalog_object_id
        WHERE co.type = 'HOTEL'
        GROUP BY co.id ORDER BY count DESC LIMIT 10
      `).all();

      const topActivities = db.prepare(`
        SELECT co.name, COUNT(*) as count
        FROM trip_option_items toi
        JOIN catalog_objects co ON co.id = toi.catalog_object_id
        WHERE co.type = 'ACTIVITY'
        GROUP BY co.id ORDER BY count DESC LIMIT 10
      `).all();

      res.json({ userCount, tripCount, activeTrips, topDestinations, topHotels, topActivities });
    } catch (err) {
      res.status(500).json({ error: 'Dashboard-feil' });
    }
  });

  // Users list (only basic info - no sensitive data)
  router.get('/users', (req, res) => {
    try {
      const users = db.prepare('SELECT id, email, username, first_name, last_name, created_at, is_admin, email_verified FROM users ORDER BY created_at DESC').all();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Delete user
  router.delete('/users/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM users WHERE id = ? AND is_admin = 0').run(req.params.id);
      res.json({ message: 'Bruker slettet' });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Trips list
  router.get('/trips', (req, res) => {
    try {
      const trips = db.prepare(`
        SELECT t.*, u.username as leader_username,
          (SELECT COUNT(*) FROM trip_memberships WHERE trip_id = t.id AND left_at IS NULL) as member_count
        FROM trips t JOIN users u ON u.id = t.leader_user_id
        ORDER BY t.created_at DESC
      `).all();
      res.json(trips);
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Delete trip
  router.delete('/trips/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
      res.json({ message: 'Tur slettet' });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Feature flags
  router.get('/feature-flags', (req, res) => {
    res.json(getAllFlags());
  });

  router.put('/feature-flags', (req, res) => {
    const flags = req.body;
    for (const [key, val] of Object.entries(flags)) {
      setFlag(key, val);
    }
    res.json(getAllFlags());
  });

  // Provider status
  router.get('/providers', (req, res) => {
    res.json(providers.getAllStatuses());
  });

  return router;
};
