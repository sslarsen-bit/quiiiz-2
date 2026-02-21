const config = require('../config');

const runtimeOverrides = {};

function isEnabled(flag) {
  if (flag in runtimeOverrides) return runtimeOverrides[flag];
  return config.featureFlags[flag] ?? false;
}

function setFlag(flag, value) {
  runtimeOverrides[flag] = value;
}

function getAllFlags() {
  const flags = { ...config.featureFlags, ...runtimeOverrides };
  return flags;
}

function featureFlagMiddleware(req, res, next) {
  req.featureFlags = getAllFlags();
  next();
}

module.exports = { isEnabled, setFlag, getAllFlags, featureFlagMiddleware };
