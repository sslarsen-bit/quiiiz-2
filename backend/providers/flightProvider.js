const CircuitBreaker = require('./circuitBreaker');
const config = require('../config');

const breaker = new CircuitBreaker('FlightProvider', config.providers.flight);

const MOCK_AIRLINES = ['Norwegian', 'SAS', 'Wideroe', 'Ryanair', 'EasyJet', 'Lufthansa', 'KLM'];
const AIRPORTS = {
  'NO': [{ code: 'OSL', name: 'Oslo Gardermoen' }, { code: 'BGO', name: 'Bergen Flesland' }, { code: 'TRD', name: 'Trondheim Vaernes' }],
  'ES': [{ code: 'BCN', name: 'Barcelona El Prat' }, { code: 'MAD', name: 'Madrid Barajas' }, { code: 'AGP', name: 'Malaga' }],
  'IT': [{ code: 'FCO', name: 'Roma Fiumicino' }, { code: 'MXP', name: 'Milano Malpensa' }],
  'GR': [{ code: 'ATH', name: 'Athen' }, { code: 'JTR', name: 'Santorini' }],
  'TH': [{ code: 'BKK', name: 'Bangkok Suvarnabhumi' }, { code: 'HKT', name: 'Phuket' }],
  'PT': [{ code: 'LIS', name: 'Lisboa' }, { code: 'FAO', name: 'Faro' }],
  'HR': [{ code: 'DBV', name: 'Dubrovnik' }, { code: 'SPU', name: 'Split' }],
  'FR': [{ code: 'CDG', name: 'Paris Charles de Gaulle' }, { code: 'NCE', name: 'Nice' }],
  'DEFAULT': [{ code: 'LHR', name: 'London Heathrow' }],
};

function getAirport(countryCode) {
  return AIRPORTS[countryCode] || AIRPORTS['DEFAULT'];
}

function generateFlights(from, toCountry, date, passengers) {
  const destAirports = getAirport(toCountry);
  const flights = [];
  for (let i = 0; i < 8; i++) {
    const airline = MOCK_AIRLINES[Math.floor(Math.random() * MOCK_AIRLINES.length)];
    const dest = destAirports[Math.floor(Math.random() * destAirports.length)];
    const depHour = 6 + Math.floor(Math.random() * 14);
    const duration = 1 + Math.floor(Math.random() * 6);
    const basePrice = 500 + Math.floor(Math.random() * 3000);

    flights.push({
      id: `FL-${Date.now()}-${i}`,
      airline,
      from: from,
      to: dest.code,
      toName: dest.name,
      date,
      departure: `${String(depHour).padStart(2, '0')}:${Math.random() > 0.5 ? '00' : '30'}`,
      arrival: `${String(depHour + duration).padStart(2, '0')}:${Math.random() > 0.5 ? '15' : '45'}`,
      duration: `${duration}t ${Math.floor(Math.random() * 50)}m`,
      pricePerPerson: basePrice,
      totalPrice: basePrice * passengers,
      currency: 'NOK',
      stops: Math.random() > 0.6 ? 1 : 0,
      bookingUrl: '#demo-booking',
    });
  }
  return flights.sort((a, b) => a.pricePerPerson - b.pricePerPerson);
}

async function searchFlights(from, toCountry, date, passengers) {
  return breaker.execute(async () => {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    return generateFlights(from, toCountry, date, passengers);
  });
}

function getStatus() { return breaker.getStatus(); }

module.exports = { searchFlights, getStatus, getAirport };
