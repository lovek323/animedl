const constants = require('../src/constants.js');

module.exports = [
  // Steins;Gate
  {
    aniDbId: 7729,
    [constants.FORMAT_SUB]: { providerId: '1rx' },
    [constants.FORMAT_DUB]: { providerId: '718j' },
  },

  // Steins;Gate 0 -- This is coming soon
  // { aniDbId: 11167, [constants.FORMAT_SUB]: { providerId: '000' } },

  // Steins;Gate: Egoistic Poriomania
  {
    aniDbId: 7729,
    aniDbStart: 'S1',
    [constants.FORMAT_SUB]: { providerId: 'qvqn' },
    [constants.FORMAT_DUB]: { providerId: 'm318' },
  },

  // Steins;Gate: Soumei Eichi no Cognitive Computing
  { aniDbId: 10887, [constants.FORMAT_SUB]: { providerId: '4137' } },

  // Steins;Gate Movie: Fuka Ryouiki no Deja vu
  {
    aniDbId: 8655,
    [constants.FORMAT_SUB]: { providerId: '5w4m' },
    [constants.FORMAT_DUB]: { providerId: 'q9nw' },
  },
];
