const constants = require('./constants.js');

class EpisodeConfig {
  /**
   * @param {string|null} aniDbNumber
   * @param {string|null} number
   * @param {string|null} name
   */
  constructor(aniDbNumber, number, name) {
    this.aniDbNumber = aniDbNumber;
    this.number = number;
    this.name = name;
  }

  /**
   * @param {object} data
   * @return {EpisodeConfig}
   */
  static fromData(data) {
    const aniDbNumber = typeof data.aniDbNumber !== 'undefined' ? data.aniDbNumber : null;
    const number = typeof data.number !== 'undefined' ? data.number : null;
    const name = typeof data.name !== 'undefined' ? data.name : null;

    return new EpisodeConfig(aniDbNumber, number, name);
  }
}

module.exports = EpisodeConfig;
