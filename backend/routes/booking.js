const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { isEnabled } = require('../services/featureFlags');
const providers = require('../providers');

module.exports = function(db) {
  const router = express.Router();

  // Search flights
  router.get('/:tripId/flights', authenticateToken, (req, res) => {
    if (!isEnabled('flights_enabled')) {
      return res.status(503).json({ error: 'Fly-modulen er midlertidig utilgjengelig', degraded: true });
    }
    try {
      const { from, date } = req.query;
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
      if (!trip) return res.status(404).json({ error: 'Tur ikke funnet' });

      const dest = trip.fixed_destination_place_id
        ? db.prepare('SELECT * FROM catalog_objects WHERE id = ?').get(trip.fixed_destination_place_id)
        : null;
      const toCountry = dest?.country_code || 'ES';

      providers.flight.searchFlights(from || 'OSL', toCountry, date || trip.start_date, 1)
        .then(flights => res.json(flights))
        .catch(err => {
          console.error('Flight search error:', err.message);
          res.status(503).json({ error: 'Fly-leverandor midlertidig utilgjengelig', degraded: true, fallbackMessage: 'Prøv igjen senere eller søk direkte hos leverandøren' });
        });
    } catch (err) {
      res.status(500).json({ error: 'Fly-søk feilet' });
    }
  });

  // Search hotels
  router.get('/:tripId/hotels', authenticateToken, (req, res) => {
    if (!isEnabled('hotels_enabled')) {
      return res.status(503).json({ error: 'Hotell-modulen er midlertidig utilgjengelig', degraded: true });
    }
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
      if (!trip) return res.status(404).json({ error: 'Tur ikke funnet' });

      const city = req.query.city || 'Barcelona';
      providers.hotel.searchHotels(city, trip.start_date, trip.end_date)
        .then(hotels => res.json(hotels))
        .catch(err => {
          console.error('Hotel search error:', err.message);
          res.status(503).json({ error: 'Hotell-leverandor midlertidig utilgjengelig', degraded: true });
        });
    } catch (err) {
      res.status(500).json({ error: 'Hotell-søk feilet' });
    }
  });

  // Search activities
  router.get('/:tripId/activities', authenticateToken, (req, res) => {
    if (!isEnabled('activities_enabled')) {
      return res.status(503).json({ error: 'Aktivitets-modulen er midlertidig utilgjengelig', degraded: true });
    }
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
      if (!trip) return res.status(404).json({ error: 'Tur ikke funnet' });

      const city = req.query.city || 'Barcelona';
      const interests = JSON.parse(trip.interests || '[]');
      providers.activity.searchActivities(city, trip.start_date, interests)
        .then(activities => res.json(activities))
        .catch(err => {
          console.error('Activity search error:', err.message);
          res.status(503).json({ error: 'Aktivitets-leverandor midlertidig utilgjengelig', degraded: true });
        });
    } catch (err) {
      res.status(500).json({ error: 'Aktivitets-søk feilet' });
    }
  });

  // Get transport options
  router.get('/:tripId/transport', authenticateToken, (req, res) => {
    if (!isEnabled('transport_enabled')) {
      return res.status(503).json({ error: 'Transport-modulen er midlertidig utilgjengelig', degraded: true });
    }
    try {
      const { airport, city } = req.query;
      providers.transport.getTransportOptions(airport || 'BCN', city || 'Barcelona')
        .then(options => res.json(options))
        .catch(err => {
          console.error('Transport error:', err.message);
          res.status(503).json({ error: 'Transportforslag utilgjengelig akkurat nå', degraded: true });
        });
    } catch (err) {
      res.status(500).json({ error: 'Transport-søk feilet' });
    }
  });

  // Get passenger info for booking
  router.get('/:tripId/passengers', authenticateToken, (req, res) => {
    try {
      const membership = db.prepare('SELECT * FROM trip_memberships WHERE trip_id = ? AND user_id = ? AND left_at IS NULL').get(req.params.tripId, req.user.id);
      if (!membership || (membership.role !== 'LEADER' && membership.role !== 'BOOKER')) {
        return res.status(403).json({ error: 'Kun leder eller booker' });
      }

      const passengers = db.prepare(`
        SELECT u.first_name, u.last_name, u.birthdate, u.gender, u.nationality, u.phone
        FROM trip_memberships tm JOIN users u ON u.id = tm.user_id
        WHERE tm.trip_id = ? AND tm.left_at IS NULL AND tm.consent_given = 1
      `).all(req.params.tripId);

      res.json(passengers);
    } catch (err) {
      res.status(500).json({ error: 'Kunne ikke hente passasjerinfo' });
    }
  });

  // Provider status
  router.get('/provider-status', authenticateToken, (req, res) => {
    res.json(providers.getAllStatuses());
  });

  return router;
};
