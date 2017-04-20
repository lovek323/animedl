const constants = require('../src/constants.js');

module.exports = [
  // Sword Art Online
  {
    aniDbId: 8692,
    [constants.FORMAT_SUB]: { providerId: '5y9' },
    [constants.FORMAT_DUB]: { providerId: 'nw4k' },
  },

  // Sword Art Online: Sword Art Offline
  { aniDbId: 8692, aniDbStart: 'S1', [constants.FORMAT_SUB]: { providerId: 'q83v' } },

  // Sword Art Online: Extra Edition
  {
    aniDbId: 10022,
    [constants.FORMAT_SUB]: { providerId: '7268' },
    [constants.FORMAT_DUB]: { providerId: '7xy6' },
  },

  // Sword Art Online: Sword Art Offline: Extra Edition
  { aniDbId: 10022, aniDbStart: 'S1', [constants.FORMAT_SUB]: { providerId: 'ry0y' } },

  // Sword Art Online II
  {
    aniDbId: 10376,
    [constants.FORMAT_SUB]: { providerId: '6y0' },
    [constants.FORMAT_DUB]: { providerId: '6xyp' },
  },

  // Sword Art Online II: Debriefing
  {
    aniDbId: 10376,
    aniDbStart: 'S1',
    [constants.FORMAT_SUB]: { providerId: 'o304' },
    [constants.FORMAT_DUB]: { providerId: 'py14' },
  },

  // Sword Art Online II: Sword Art Offline 2
  { aniDbId: 10376, aniDbStart: 'S2', [constants.FORMAT_SUB]: { providerId: 'vm02' } },

  // Gekijouban Sword Art Online: Ordinal Scale
  {
    aniDbId: 11681,
    [constants.FORMAT_SUB]: { providerId: 'jz24' },
    [constants.FORMAT_DUB]: { providerId: 'x03q' },
  },
];
