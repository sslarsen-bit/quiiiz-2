const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

function recalculateAggregates(db, tripId, groupId) {
  const votes = db.prepare('SELECT * FROM votes WHERE trip_id = ? AND target_group_id = ?').all(tripId, groupId);
  db.prepare('DELETE FROM vote_aggregates WHERE trip_id = ? AND group_id = ?').run(tripId, groupId);

  const scores = {};
  for (const vote of votes) {
    const ranking = JSON.parse(vote.ranking);
    ranking.forEach((objId, index) => {
      if (!scores[objId]) scores[objId] = { points: 0, first: 0, second: 0, third: 0 };
      const pts = [3, 2, 1][index] || 0;
      scores[objId].points += pts;
      if (index === 0) scores[objId].first++;
      if (index === 1) scores[objId].second++;
      if (index === 2) scores[objId].third++;
    });
  }

  const insert = db.prepare(`
    INSERT INTO vote_aggregates (id, trip_id, group_id, catalog_object_id, points_total, first_place_count, second_place_count, third_place_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [objId, s] of Object.entries(scores)) {
    insert.run(uuid(), tripId, groupId, objId, s.points, s.first, s.second, s.third);
  }
}

module.exports = function(db) {
  const router = express.Router();

  function checkMembership(tripId, userId) {
    return db.prepare('SELECT * FROM trip_memberships WHERE trip_id = ? AND user_id = ? AND left_at IS NULL').get(tripId, userId);
  }

  router.post('/:tripId/votes', authenticateToken, (req, res) => {
    try {
      if (!checkMembership(req.params.tripId, req.user.id)) return res.status(403).json({ error: 'Ikke tilgang' });

      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
      if (!trip || (trip.status !== 'VOTING_OPEN' && trip.status !== 'COLLECTING_SUGGESTIONS')) {
        return res.status(400).json({ error: 'Avstemning er ikke åpen' });
      }

      const { vote_context, target_group_id, ranking } = req.body;
      if (!ranking || ranking.length === 0 || ranking.length > 3) {
        return res.status(400).json({ error: 'Rangering må ha 1-3 valg' });
      }

      const existing = db.prepare('SELECT id FROM votes WHERE trip_id = ? AND user_id = ? AND vote_context = ? AND target_group_id = ?')
        .get(req.params.tripId, req.user.id, vote_context, target_group_id);

      if (existing) {
        db.prepare("UPDATE votes SET ranking = ?, submitted_at = datetime('now') WHERE id = ?")
          .run(JSON.stringify(ranking), existing.id);
      } else {
        db.prepare('INSERT INTO votes (id, trip_id, user_id, vote_context, target_group_id, ranking) VALUES (?, ?, ?, ?, ?, ?)')
          .run(uuid(), req.params.tripId, req.user.id, vote_context, target_group_id, JSON.stringify(ranking));
      }

      recalculateAggregates(db, req.params.tripId, target_group_id);
      res.json({ message: 'Stemme registrert' });
    } catch (err) {
      console.error('Vote error:', err);
      res.status(500).json({ error: 'Kunne ikke registrere stemme' });
    }
  });

  router.get('/:tripId/votes/results', authenticateToken, (req, res) => {
    try {
      if (!checkMembership(req.params.tripId, req.user.id)) return res.status(403).json({ error: 'Ikke tilgang' });

      const { group_id } = req.query;
      let aggregates;
      if (group_id) {
        aggregates = db.prepare(`
          SELECT va.*, co.name FROM vote_aggregates va
          JOIN catalog_objects co ON co.id = va.catalog_object_id
          WHERE va.trip_id = ? AND va.group_id = ?
          ORDER BY va.points_total DESC, va.first_place_count DESC
        `).all(req.params.tripId, group_id);
      } else {
        aggregates = db.prepare(`
          SELECT va.*, co.name FROM vote_aggregates va
          JOIN catalog_objects co ON co.id = va.catalog_object_id
          WHERE va.trip_id = ?
          ORDER BY va.group_id, va.points_total DESC, va.first_place_count DESC
        `).all(req.params.tripId);
      }

      const voters = db.prepare(`
        SELECT DISTINCT v.user_id, v.vote_context, v.target_group_id, u.username
        FROM votes v JOIN users u ON u.id = v.user_id
        WHERE v.trip_id = ?
      `).all(req.params.tripId);

      const memberCount = db.prepare('SELECT COUNT(*) as count FROM trip_memberships WHERE trip_id = ? AND left_at IS NULL').get(req.params.tripId);

      res.json({ aggregates, voters, totalMembers: memberCount.count });
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente resultater' });
    }
  });

  router.get('/:tripId/votes/my', authenticateToken, (req, res) => {
    try {
      const votes = db.prepare('SELECT * FROM votes WHERE trip_id = ? AND user_id = ?').all(req.params.tripId, req.user.id);
      res.json(votes.map(v => ({ ...v, ranking: JSON.parse(v.ranking) })));
    } catch (err) {
      res.status(500).json({ error: 'Feil' });
    }
  });

  return router;
};
