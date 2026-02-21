const CircuitBreaker = require('./circuitBreaker');
const config = require('../config');

const breaker = new CircuitBreaker('HotelProvider', config.providers.hotel);

const HOTEL_TEMPLATES = [
  { prefix: 'Grand Hotel', stars: 5, basePriceNOK: 2500 },
  { prefix: 'Boutique Hotel', stars: 4, basePriceNOK: 1800 },
  { prefix: 'City Hostel', stars: 2, basePriceNOK: 500 },
  { prefix: 'Beach Resort', stars: 4, basePriceNOK: 2200 },
  { prefix: 'Downtown Inn', stars: 3, basePriceNOK: 1200 },
  { prefix: 'Luxury Suites', stars: 5, basePriceNOK: 3500 },
  { prefix: 'Backpacker Lodge', stars: 2, basePriceNOK: 350 },
  { prefix: 'Panorama Hotel', stars: 4, basePriceNOK: 2000 },
];

function generateHotels(city, nights) {
  return HOTEL_TEMPLATES.map((tmpl, i) => ({
    id: `HTL-${city}-${i}`,
    name: `${tmpl.prefix} ${city}`,
    city,
    stars: tmpl.stars,
    pricePerNight: tmpl.basePriceNOK + Math.floor(Math.random() * 500),
    totalPrice: (tmpl.basePriceNOK + Math.floor(Math.random() * 500)) * (nights || 3),
    currency: 'NOK',
    amenities: ['WiFi', 'Frokost', tmpl.stars >= 4 ? 'Basseng' : 'Felleskjokken', tmpl.stars >= 4 ? 'Spa' : 'Vaskerom'],
    rating: (3 + Math.random() * 2).toFixed(1),
    imageUrl: null,
    bookingUrl: '#demo-booking',
  }));
}

async function searchHotels(city, checkIn, checkOut) {
  return breaker.execute(async () => {
    await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
    const nights = checkIn && checkOut
      ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
      : 3;
    return generateHotels(city, nights);
  });
}

function getStatus() { return breaker.getStatus(); }

module.exports = { searchHotels, getStatus };
