const constants = require('../src/constants.js');

module.exports = [
  // Hibike! Euphonium
  {
    aniDbId: 10889,
    [constants.FORMAT_SUB]: { providerId: 'qkxn', providerStart: 1, providerEnd: 13 },
  },
  // Hibike! Euphonium: Ready, Set, Monaka
  {
    aniDbId: 10889,
    aniDbStart: 'S1',
    [constants.FORMAT_SUB]: { providerId: 'qkxn', providerStart: 14, providerEnd: 14 },
  },
  // Hibike! Euphonium: The Everyday Life of Band
  {
    aniDbId: 10889,
    aniDbStart: 'S2',
    [constants.FORMAT_SUB]: { providerId: 'qv33' },
  },

  // Gekijouban Hibike! Euphonium: Kitauji Koukou Suisougaku Bu e Youkoso
  {
    aniDbId: 11747,
    [constants.FORMAT_SUB]: { providerId: 'p816' },
  },

  // Hibike! Euphonium 2
  {
    aniDbId: 11746,
    [constants.FORMAT_SUB]: { providerId: '4xpx' },
  },
  {
    aniDbId: 11746,
    aniDbStart: 'S1',
    [constants.FORMAT_SUB]: { providerId: 'k19v' },
  },
];
