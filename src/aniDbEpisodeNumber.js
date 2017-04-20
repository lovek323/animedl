const constants = require('./constants.js');
const pad = require('pad');

class AniDbEpisodeNumber {

  /**
   * @param {string} number
   * @param {AniDbSeries} series
   * @param {AniDbEpisodeNumber} start
   */
  constructor(number, series, start = null) {
    this.series = series;
    this.start = start;

    if (/^S[0-9]+$/.test(number)) {
      // We're dealing with a special
      this.type = constants.EPISODE_TYPE_SPECIAL;
    } else if (/^OP[0-9]+[a-z]+$/.test(number)) {
      // We're dealing with an OP, don't know how to deal with these yet
      this.type = constants.EPISODE_TYPE_OP;
    } else if (/^C[0-9]+$/.test(number)) {
      // We're dealing with an OP, don't know how to deal with these yet
      this.type = constants.EPISODE_TYPE_OP;
    } else if (/^ED[0-9]+[a-z]+$/.test(number)) {
      // We're dealing with an ED, don't know how to deal with these yet
      this.type = constants.EPISODE_TYPE_ED;
    } else if (/^T[0-9]+$/.test(number)) {
      // We're dealing with a preview episode, don't know how to deal with these yet
      this.type = constants.EPISODE_TYPE_PREVIEW;
    } else if (/^[0-9]+$/.test(number)) {
      this.type = constants.EPISODE_TYPE_NORMAL;
    } else {
      throw new Error('Unrecognised episode number format: ' + number);
    }

    /** @type {string[]} */
    const numbers = [];
    series.episodes[0].episode.forEach(
      /**
       * @param {AniDbEpisodeEpisode} episode
       */
      episode => numbers.push(episode.epno[0]._)
    );
    numbers.sort((a, b) => {
      let num1 = pad(10, a, '0');
      let num2 = pad(10, b, '0');
      num1 = a.replace(/[0-9]/g, '') + num1;
      num2 = b.replace(/[0-9]/g, '') + num2;

      return num1.toLocaleString().localeCompare(num2.toLocaleString());
    });

    this.number = number;
    this.index = numbers.findIndex(_n => _n === number);

    if (start !== null) {
      this.indexFromStart = this.index - start.index;
    } else {
      this.indexFromStart = this.index;
    }
  }

}

module.exports = AniDbEpisodeNumber;
