const CircuitBreaker = require('./circuitBreaker');
const config = require('../config');

const breaker = new CircuitBreaker('TransportProvider', config.providers.transport);

function generateTransportOptions(airportCode, hotelCity) {
  return [
    {
      type: 'taxi',
      name: 'Taxi / Uber',
      estimatedTime: '20-40 min',
      estimatedPrice: '300-600 NOK',
      currency: 'NOK',
      bookingUrl: '#demo-taxi',
      icon: 'taxi',
    },
    {
      type: 'bus',
      name: `Flybuss ${airportCode} → ${hotelCity}`,
      estimatedTime: '30-60 min',
      estimatedPrice: '100-200 NOK',
      currency: 'NOK',
      bookingUrl: '#demo-bus',
      icon: 'bus',
    },
    {
      type: 'train',
      name: `Tog ${airportCode} → ${hotelCity} sentrum`,
      estimatedTime: '15-45 min',
      estimatedPrice: '80-180 NOK',
      currency: 'NOK',
      bookingUrl: '#demo-train',
      icon: 'train',
    },
    {
      type: 'shuttle',
      name: 'Hotell-shuttle (forhåndsbestill)',
      estimatedTime: '25-50 min',
      estimatedPrice: '150-350 NOK',
      currency: 'NOK',
      bookingUrl: '#demo-shuttle',
      icon: 'shuttle',
    },
  ];
}

async function getTransportOptions(airportCode, hotelCity) {
  return breaker.execute(async () => {
    await new Promise(r => setTimeout(r, 100 + Math.random() * 150));
    return generateTransportOptions(airportCode, hotelCity);
  });
}

function getStatus() { return breaker.getStatus(); }

module.exports = { getTransportOptions, getStatus };
