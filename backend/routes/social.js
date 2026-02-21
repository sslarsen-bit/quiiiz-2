const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { isEnabled } = require('../services/featureFlags');

module.exports = function(db) {
  const router = express.Router();

  // Search users
  router.get('/users/search', authenticateToken, (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) return res.json([]);

      const users = db.prepare(`
        SELECT id, username, first_name, last_name, avatar_url
        FROM users WHERE (username LIKE ? OR first_name LIKE ? OR last_name LIKE ?) AND id != ?
        LIMIT 20
      `).all(`%${q}%`, `%${q}%`, `%${q}%`, req.user.id);

      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Søk feilet' });
    }
  });

  // Send friend request
  router.post('/friends/request', authenticateToken, (req, res) => {
    if (!isEnabled('social_enabled')) return res.status(503).json({ error: 'Sosial-modulen er utilgjengelig' });
    try {
      const { friend_user_id } = req.body;
      if (friend_user_id === req.user.id) return res.status(400).json({ error: 'Kan ikke legge til deg selv' });

      const existing = db.prepare('SELECT * FROM friendships WHERE (user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?)')
        .get(req.user.id, friend_user_id, friend_user_id, req.user.id);

      if (existing) {
        if (existing.status === 'ACCEPTED') return res.status(409).json({ error: 'Allerede venner' });
        return res.status(409).json({ error: 'Venneforespørsel finnes allerede' });
      }

      db.prepare('INSERT INTO friendships (id, user_id, friend_user_id) VALUES (?, ?, ?)')
        .run(uuid(), req.user.id, friend_user_id);

      res.status(201).json({ message: 'Venneforespørsel sendt' });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke sende forespørsel' });
    }
  });

  // Accept friend request
  router.put('/friends/:friendshipId/accept', authenticateToken, (req, res) => {
    try {
      const friendship = db.prepare('SELECT * FROM friendships WHERE id = ? AND friend_user_id = ?').get(req.params.friendshipId, req.user.id);
      if (!friendship) return res.status(404).json({ error: 'Forespørsel ikke funnet' });

      db.prepare("UPDATE friendships SET status = 'ACCEPTED' WHERE id = ?").run(req.params.friendshipId);
      res.json({ message: 'Venn lagt til' });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Get friends
  router.get('/friends', authenticateToken, (req, res) => {
    try {
      const friends = db.prepare(`
        SELECT f.id as friendship_id, f.status,
          CASE WHEN f.user_id = ? THEN f.friend_user_id ELSE f.user_id END as friend_id,
          u.username, u.first_name, u.last_name, u.avatar_url
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_user_id ELSE f.user_id END
        WHERE (f.user_id = ? OR f.friend_user_id = ?)
      `).all(req.user.id, req.user.id, req.user.id, req.user.id);

      res.json(friends);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente venner' });
    }
  });

  // Get pending friend requests
  router.get('/friends/pending', authenticateToken, (req, res) => {
    try {
      const pending = db.prepare(`
        SELECT f.id as friendship_id, u.id as user_id, u.username, u.first_name, u.last_name, u.avatar_url
        FROM friendships f JOIN users u ON u.id = f.user_id
        WHERE f.friend_user_id = ? AND f.status = 'PENDING'
      `).all(req.user.id);
      res.json(pending);
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Get user profile (public)
  router.get('/profile/:userId', authenticateToken, (req, res) => {
    try {
      const user = db.prepare('SELECT id, username, first_name, last_name, avatar_url FROM users WHERE id = ?').get(req.params.userId);
      if (!user) return res.status(404).json({ error: 'Bruker ikke funnet' });

      const isFriend = db.prepare(`
        SELECT id FROM friendships WHERE ((user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?)) AND status = 'ACCEPTED'
      `).get(req.user.id, req.params.userId, req.params.userId, req.user.id);

      const posts = db.prepare(`
        SELECT p.*, (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count
        FROM posts p WHERE p.user_id = ? AND (p.visibility = 'PUBLIC' OR ?)
        ORDER BY p.created_at DESC
      `).all(req.params.userId, isFriend ? 1 : 0);

      const ratings = db.prepare(`
        SELECT r.*, co.name, co.type as obj_type FROM ratings r
        JOIN catalog_objects co ON co.id = r.catalog_object_id
        WHERE r.user_id = ? ORDER BY r.created_at DESC
      `).all(req.params.userId);

      const visitedPlaces = db.prepare(`
        SELECT vp.*, co.name, co.country_code FROM visited_places vp
        JOIN catalog_objects co ON co.id = vp.catalog_place_id
        WHERE vp.user_id = ? ORDER BY vp.created_at DESC
      `).all(req.params.userId);

      res.json({ ...user, isFriend: !!isFriend, posts, ratings, visitedPlaces });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente profil' });
    }
  });

  // Create post
  router.post('/posts', authenticateToken, (req, res) => {
    try {
      const { caption, visibility, tagged_catalog_object_ids, image_url } = req.body;
      const id = uuid();
      db.prepare(`
        INSERT INTO posts (id, user_id, image_url, caption, visibility, tagged_catalog_object_ids)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, image_url || null, caption || '', visibility || 'PUBLIC', JSON.stringify(tagged_catalog_object_ids || []));

      res.status(201).json({ id });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke opprette innlegg' });
    }
  });

  // Like post
  router.post('/posts/:postId/like', authenticateToken, (req, res) => {
    try {
      const existing = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(req.params.postId, req.user.id);
      if (existing) {
        db.prepare('DELETE FROM post_likes WHERE id = ?').run(existing.id);
        res.json({ action: 'unliked' });
      } else {
        db.prepare('INSERT INTO post_likes (id, post_id, user_id) VALUES (?, ?, ?)').run(uuid(), req.params.postId, req.user.id);
        res.json({ action: 'liked' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Rate catalog object
  router.post('/ratings', authenticateToken, (req, res) => {
    try {
      const { catalog_object_id, stars } = req.body;
      if (stars < 1 || stars > 5) return res.status(400).json({ error: 'Rating må være 1-5' });

      const existing = db.prepare('SELECT id FROM ratings WHERE user_id = ? AND catalog_object_id = ?').get(req.user.id, catalog_object_id);
      if (existing) {
        db.prepare('UPDATE ratings SET stars = ? WHERE id = ?').run(stars, existing.id);
      } else {
        db.prepare('INSERT INTO ratings (id, user_id, catalog_object_id, stars) VALUES (?, ?, ?, ?)').run(uuid(), req.user.id, catalog_object_id, stars);
      }
      res.json({ message: 'Rating lagret' });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  // Add visited place
  router.post('/visited', authenticateToken, (req, res) => {
    try {
      const { catalog_place_id, source } = req.body;
      const existing = db.prepare('SELECT id FROM visited_places WHERE user_id = ? AND catalog_place_id = ?').get(req.user.id, catalog_place_id);
      if (existing) return res.status(409).json({ error: 'Allerede lagt til' });

      db.prepare('INSERT INTO visited_places (id, user_id, catalog_place_id, source) VALUES (?, ?, ?, ?)').run(uuid(), req.user.id, catalog_place_id, source || 'MANUAL');
      res.status(201).json({ message: 'Sted lagt til' });
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  return router;
};
