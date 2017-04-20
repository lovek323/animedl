'use strict';

const Anime = require('./src/anime.js');
const Kissanime = require('anime-scraper').Anime;
const SeriesConfig = require('./src/seriesConfig');

const providers = require('./src/providers.js');
const config = require('./config.json');

const async = require('async');
const cheerio = require('cheerio');
const constants = require('./src/constants');
/** @type {Data} */
const data = require('./data.js');
const debug = require('debug')('animedl');
const fs = require('fs');
const pad = require('pad');
const request = require('request');
const util = require('util');

String.prototype.replaceAll = function (search, replacement) {
  const target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

if (!fs.existsSync('cache/search.json')) {
  console.log('Downloading kissanime search cache');
  Kissanime.search('').then(function (results) {
    const cacheFile = 'cache/search.json';
    fs.writeFileSync(cacheFile, JSON.stringify(results));
  });
  return;
}

const SegfaultHandler = require('segfault-handler');
//noinspection JSUnresolvedFunction
SegfaultHandler.registerHandler('crash.log');

/**
 * @param {Anime} anime
 * @param callback
 */
const fetchSeries = (anime, callback) => {
  // Download each episode or, if we're dealing with a movie, the movie
  /** @type {Episode[]} */
  const episodes = orderEpisodes(anime.episodes);
  //noinspection JSUnresolvedFunction
  async.eachSeries(
    episodes,
    /**
     * @param {Episode} episode
     * @param {function} next
     */
    (episode, next) => {
      // We're dealing with a normal episode
      let provider;
      switch (anime.providerConfig.name) {
        case constants.PROVIDER_9ANIME:
          provider = providers[anime.providerConfig.name];
          break;
        default:
          throw new Error('Unrecognised name: ' + anime.providerConfig.name);
      }
      provider.downloadEpisode(anime, episode, next);
    },
    callback
  );
};

const orderEpisodes = (episodes) => {
  episodes.sort(
    /**
     * @param {Episode} episode1
     * @param {Episode} episode2
     * @return {int}
     */
    function (episode1, episode2) {
      if (episode1.number.indexFromStart < episode2.number.indexFromStart) {
        return -1;
      }
      if (episode1.number.indexFromStart > episode2.number.indexFromStart) {
        return 1;
      }
      return 0;
    });
  return episodes;
};

/**
 * @param {object} requestedSeries
 * @param {function} nextSeries
 */
const runSeries = function (requestedSeries, nextSeries) {
  if (typeof requestedSeries.aniDbId === 'undefined') {
    throw new Error('Invalid config.json');
  }
  const aniDbId = requestedSeries.aniDbId;
  let format = constants.FORMAT_SUB;
  if (typeof requestedSeries.format !== 'undefined') {
    format = requestedSeries.format;
  }
  /** @type {SeriesConfig[]} */
  const seriesConfigs = [];
  for (let i = 0; i < data.series.length; i++) {
    if (data.series[i].aniDbId === aniDbId) {
      seriesConfigs.push(SeriesConfig.fromData(data.series[i]));
      break;
    }
  }
  if (seriesConfigs.length === 0) {
    const franchises = fs.readdirSync('./franchises');
    for (let i = 0; i < franchises.length; i++) {
      const franchise = require('./franchises/' + franchises[i]);
      for (let j = 0; j < franchise.length; j++) {
        if (franchise[j].aniDbId === aniDbId) {
          seriesConfigs.push(SeriesConfig.fromData(franchise[j]));
          break;
        }
      }
    }

    if (seriesConfigs.length === 0) {
      throw new Error('Could not find anime with aniDB ID ' + aniDbId);
    }
  }

  //noinspection JSUnresolvedFunction
  async.eachSeries(seriesConfigs,
    /**
     * @param {SeriesConfig} seriesConfig
     */
    (seriesConfig) => {
      Anime.get(seriesConfig, seriesConfig.providerSeriesList[format],
        /**
         * @param {Anime} anime
         */
        anime => fetchSeries(anime, nextSeries));
    }
  );
};

const runFranchise = function (requestedFranchise, nextFranchise) {
  if (typeof requestedFranchise.name === 'undefined') {
    throw new Error('Invalid config.json');
  }
  const franchiseName = requestedFranchise.name;
  let format = constants.FORMAT_SUB;
  if (typeof requestedFranchise.format !== 'undefined') {
    format = requestedFranchise.format;
  }
  /** @type {SeriesConfig[]} */
  let seriesConfigs = require('./franchises/' + franchiseName + '.js');
  if (typeof seriesConfigs === 'undefined') {
    throw new Error('Could not find anime franchise ' + franchiseName);
  }
  seriesConfigs = seriesConfigs.map(SeriesConfig.fromData);

  //noinspection JSUnresolvedFunction
  async.eachSeries(seriesConfigs,
    /**
     * @param {SeriesConfig} seriesConfig
     * @param {function} nextSeriesConfig
     */
    (seriesConfig, nextSeriesConfig) => {
      Anime.get(seriesConfig, seriesConfig.providerSeriesList[format],
        /**
         * @param {Anime} anime
         */
        anime => fetchSeries(anime, nextSeriesConfig));
    },
    nextFranchise);
};

//noinspection JSUnresolvedFunction
async.eachSeries(config.series,
  /**
   * @param {object} series
   * @param {function} next
   */
  (series, next) => runSeries(series, next), () => {
    //noinspection JSUnresolvedFunction
    async.eachSeries(config.franchises,
      /**
       * @param {object} franchise
       * @param {function} next
       */
      (franchise, next) => runFranchise(franchise, next));
  });
