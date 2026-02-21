const flightProvider = require('./flightProvider');
const hotelProvider = require('./hotelProvider');
const activityProvider = require('./activityProvider');
const transportProvider = require('./transportProvider');

module.exports = {
  flight: flightProvider,
  hotel: hotelProvider,
  activity: activityProvider,
  transport: transportProvider,

  getAllStatuses() {
    return {
      flight: flightProvider.getStatus(),
      hotel: hotelProvider.getStatus(),
      activity: activityProvider.getStatus(),
      transport: transportProvider.getStatus(),
    };
  },
};
