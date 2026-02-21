const { v4: uuid } = require('uuid');

function createNotification(db, { tripId, userId, type, payload = {} }) {
  const id = uuid();
  try {
    db.prepare(`
      INSERT INTO notifications (id, trip_id, user_id, type, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, tripId, userId, type, JSON.stringify(payload));
    console.log(`[NOTIFICATION] ${type} -> user ${userId} (trip ${tripId})`);
    return id;
  } catch (err) {
    console.error('[NOTIFICATION ERROR]', err.message);
    return null;
  }
}

function notifyTripMembers(db, tripId, type, payload = {}, excludeUserId = null) {
  try {
    const members = db.prepare(`
      SELECT user_id FROM trip_memberships WHERE trip_id = ? AND left_at IS NULL
    `).all(tripId);

    for (const m of members) {
      if (m.user_id !== excludeUserId) {
        createNotification(db, { tripId, userId: m.user_id, type, payload });
      }
    }
  } catch (err) {
    console.error('[NOTIFY MEMBERS ERROR]', err.message);
  }
}

function sendEmailSimulated(to, subject, body) {
  console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
  return true;
}

function sendSmsSimulated(phone, message) {
  console.log(`[SMS SIMULATED] To: ${phone} | Message: ${message}`);
  return true;
}

module.exports = { createNotification, notifyTripMembers, sendEmailSimulated, sendSmsSimulated };
