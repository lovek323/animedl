"use strict";

const Anime = require('./src/anime.js');
const Kissanime = require('anime-scraper').Anime;

const providers = require('./src/providers.js');
const config = require('./config.json');

const async = require('async');
const cheerio = require('cheerio');
const fs = require('fs');
const pad = require('pad');
const request = require('request');
const util = require('util');
const debug = require('debug')('animedl');

String.prototype.replaceAll = function (search, replacement) {
  const target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

if (!fs.existsSync('cache/search.json')) {
  console.log('Downloading kissanime search cache');
  Kissanime.search('').then(function (results) {
    const cacheFile = "cache/search.json";
    //noinspection ES6ModulesDependencies,NodeModulesDependencies
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
  if (anime.isMovie()) {
    console.log('welp');
  } else {
    async.eachSeries(
      anime.episodes,
      (episode, next) => episode.provider.downloadEpisode(anime, episode, next),
      callback
    );
  }
};

const runSeries = function (series, nextSeries) {
  if (series.finished) {
    nextSeries();
    return;
  }

  Anime.get(series, anime => {
    fetchSeries(anime, nextSeries)
  });
};


//noinspection JSUnusedLocalSymbols
/* var fetchKissanime = (title, malSeries, malEpisodeInformations, nextSeries) => {
  console.log('Fetching series ' + title);

  var url = null;
  var i;

  //noinspection JSUnresolvedVariable
  for (i = 0; i < kissanimeSeries.length; i++) {
    if (kissanimeSeries[i].name == title) {
      url = kissanimeSeries[i].url;
      break;
    }
  }

  if (url === null) {
    console.error('Could not find URL for ' + title + ' on kissanime.to');
    nextSeries();
    return;
  }

  Kissanime.fromUrl(url).then(kissanimeSeries => {
    kissanimeSeries.fetchAllEpisodes().then(kissanimeEpisodes => {
      async.eachSeries(kissanimeEpisodes, (kissanimeEpisode, nextEpisode) => {
      }, nextSeries);
    });
  });
}; */

async.eachSeries(config.series, (series, next) => runSeries(series, next));
