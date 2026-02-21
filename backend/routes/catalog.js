const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  // Search catalog objects
  router.get('/search', authenticateToken, (req, res) => {
    try {
      const { q, type, country_code, limit } = req.query;
      let query = 'SELECT * FROM catalog_objects WHERE 1=1';
      const params = [];

      if (type) { query += ' AND type = ?'; params.push(type); }
      if (country_code) { query += ' AND country_code = ?'; params.push(country_code); }
      if (q) { query += ' AND (name LIKE ? OR city LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }

      query += ' ORDER BY name LIMIT ?';
      params.push(parseInt(limit) || 50);

      const results = db.prepare(query).all(...params);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: 'Søk feilet' });
    }
  });

  // Get by type
  router.get('/type/:type', authenticateToken, (req, res) => {
    try {
      const objects = db.prepare('SELECT * FROM catalog_objects WHERE type = ? ORDER BY name').all(req.params.type.toUpperCase());
      res.json(objects);
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Get single object
  router.get('/:id', authenticateToken, (req, res) => {
    try {
      const obj = db.prepare('SELECT * FROM catalog_objects WHERE id = ?').get(req.params.id);
      if (!obj) return res.status(404).json({ error: 'Ikke funnet' });
      res.json(obj);
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  return router;
};
