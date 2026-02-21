const rateLimits = new Map();

function rateLimiter(maxRequests = 60, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimits.has(key)) {
      rateLimits.set(key, []);
    }

    const requests = rateLimits.get(key).filter(t => t > windowStart);
    requests.push(now);
    rateLimits.set(key, requests);

    if (requests.length > maxRequests) {
      return res.status(429).json({ error: 'For mange forespørsler, prøv igjen senere' });
    }

    next();
  };
}

module.exports = { rateLimiter };
