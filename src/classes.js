'use strict';

const constants = require('./constants.js');

class AniDbResult {
  /** @type {AniDbSeries} */
  anime;
}

class AniDbSeries {
  /** @type {string[]} */
  description;
  /** @type {AniDbEpisode[]} */
  episodes;
  /** @type {string[]} */
  startdate;
  /** @type {string[]} */
  titles;
}

class AniDbEpisode {
  /** @type {AniDbEpisodeEpisode[]} */
  episode;
}

class AniDbEpisodeEpisode {
  /** @type {AniDbData[]} **/
  airdate;
  /** @type {AniDbData[]} **/
  epno;
  /** @type {AniDbData[]} **/
  length;
  /** @type {AniDbData[]} **/
  title;
}

class MalSeries {
  /** @type {string} */
  aired;
  /** @type {string} */
  characters;
  /** @type {string} */
  classification;
  /** @type {string} */
  episodes;
  /** @type {string} */
  genres;
  /** @type {string} */
  image;
  /** @type {string} */
  staff;
  /** @type {string} */
  studios;
  /** @type {string} */
  synopsis;
  /** @type {string} */
  type;
}

class Data {
  /** @type {object} */
  franchises;

  /** @type {DataSeries[]} */
  series;
}

class DataSeries {
  /** @type {int} */
  aniDbId;
  /** @type {string} */
  aniDbStart;
  /** @type {string} */
  title;
  /** @type {EpisodeConfig[]} */
  episodes;
  /** @type {ProviderConfig} */
  [constants.FORMAT_SUB];
  /** @type {ProviderConfig} */
  [constants.FORMAT_DUB];
}

class DataSeriesFormat {
  /** @type {string} */
  providerId;
}

class AniDbData {
  /** @type {string} */
  _;

  /**
   * @param {string} _
   */
  constructor(_) {
    this._ = _;
  }
}
