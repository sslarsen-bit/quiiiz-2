const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Krever innlogging' });

  try {
    const user = jwt.verify(token, config.JWT_SECRET);
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ error: 'Ugyldig eller utløpt token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Kun admin har tilgang' });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin };
