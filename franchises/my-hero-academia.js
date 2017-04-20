const constants = require('../src/constants.js');

module.exports = [
  // Boku no Hero Academia
  {
    aniDbId: 11739,
    [constants.FORMAT_SUB]: { providerId: 'jvl2' },
    [constants.FORMAT_DUB]: { providerId: 'jwwn' },
  },

  // My Hero Academia (2016) -- This one contains the Jump Festa 2016 special, but it's not included with the main
  //                            Boku no Hero Academia entry, so we have some custom handling
  {
    aniDbId: 12344,
    title: 'Boku no Hero Academia',
    episodes: [
      {
        aniDbNumber: '1',
        name: 'Jump Special Anime Festa 2016',
        number: 'S1',
      }
    ],
    [constants.FORMAT_SUB]: { providerId: 'n8nl' },
  },

  // Boku no Hero Academia (2017)
  {
    aniDbId: 12233,
    [constants.FORMAT_SUB]: { providerId: '6z94' },
    [constants.FORMAT_DUB]: { providerId: 'm5op' },
  },

  // Boku no Hero Academia (2017): Hero Notebook
  {
    aniDbId: 12233,
    aniDbStart: 'S1',
    [constants.FORMAT_SUB]: { providerId: '6z94', providerStart: 0, providerEnd: 0 },
    [constants.FORMAT_DUB]: { providerId: 'm5op', providerStart: 0, providerEnd: 0 },
  },
];
