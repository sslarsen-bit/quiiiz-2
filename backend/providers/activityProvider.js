const CircuitBreaker = require('./circuitBreaker');
const config = require('../config');

const breaker = new CircuitBreaker('ActivityProvider', config.providers.activity);

const ACTIVITY_TEMPLATES = [
  { name: 'Guidet byvandring', category: 'kultur', basePriceNOK: 250 },
  { name: 'Mattur og smaksprover', category: 'kultur', basePriceNOK: 600 },
  { name: 'Surfekurs', category: 'sport', basePriceNOK: 800 },
  { name: 'Fjelltur med guide', category: 'hiking', basePriceNOK: 400 },
  { name: 'Vinsmakingstur', category: 'kultur', basePriceNOK: 700 },
  { name: 'Nattklubb VIP-inngang', category: 'fest', basePriceNOK: 500 },
  { name: 'Pub crawl', category: 'fest', basePriceNOK: 350 },
  { name: 'Kajakk-tur', category: 'sport', basePriceNOK: 550 },
  { name: 'Museum-besok', category: 'kultur', basePriceNOK: 150 },
  { name: 'Konsertbilletter', category: 'fest', basePriceNOK: 900 },
  { name: 'Spa-dag', category: 'avslapning', basePriceNOK: 1200 },
  { name: 'Snorkle-tur', category: 'sport', basePriceNOK: 650 },
  { name: 'Segway-tur', category: 'sport', basePriceNOK: 450 },
  { name: 'Cooking class', category: 'kultur', basePriceNOK: 750 },
  { name: 'Solnedgangsseiling', category: 'avslapning', basePriceNOK: 850 },
];

function generateActivities(city, startDate) {
  return ACTIVITY_TEMPLATES.map((tmpl, i) => {
    const actDate = new Date(startDate || Date.now());
    actDate.setDate(actDate.getDate() + Math.floor(i / 3));
    return {
      id: `ACT-${city}-${i}`,
      name: `${tmpl.name} i ${city}`,
      city,
      category: tmpl.category,
      pricePerPerson: tmpl.basePriceNOK + Math.floor(Math.random() * 200),
      currency: 'NOK',
      date: actDate.toISOString().split('T')[0],
      duration: `${1 + Math.floor(Math.random() * 4)} timer`,
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      bookingUrl: '#demo-booking',
    };
  });
}

async function searchActivities(city, startDate, interests) {
  return breaker.execute(async () => {
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    let activities = generateActivities(city, startDate);
    if (interests && interests.length > 0) {
      const interestSet = new Set(interests.map(i => i.toLowerCase()));
      activities.sort((a, b) => {
        const aMatch = interestSet.has(a.category) ? 0 : 1;
        const bMatch = interestSet.has(b.category) ? 0 : 1;
        return aMatch - bMatch;
      });
    }
    return activities;
  });
}

function getStatus() { return breaker.getStatus(); }

module.exports = { searchActivities, getStatus };
