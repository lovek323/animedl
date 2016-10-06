"use strict";

var Anime = require('./src/anime.js');

var providers = require('./src/providers.js');

var Kissanime = require('anime-scraper').Anime;

var config = require('./config.json');

var async = require('async');
var cheerio = require('cheerio');
var fs = require('fs');
var pad = require('pad');
var request = require('request');
var util = require('util');

const debug = require('debug')('animedl');

// Set to true to update the metadata on existing files
//noinspection JSUnusedLocalSymbols
const UPDATE = true;

String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

if (!fs.existsSync('cache/search.json')) {
  console.log('Downloading kissanime search cache');
  Kissanime.search('').then(function (results) {
    var cacheFile = "cache/search.json";
    fs.writeFileSync(cacheFile, JSON.stringify(results));
  });
  return;
}

var kissanimeSeries = require('./cache/search.json');

var runSeries = function (series, nextSeries) {
  fetchSeries(new Anime(series), nextSeries);
};

/**
 * @param {Anime} anime
 * @param callback
 */
var fetchSeries = (anime, callback) => {
  // Download each episode or, if we're dealing with a movie, the movie
  if (anime.isMovie()) {
    console.log('welp');
  } else {
    async.eachSeries(
      anime.episodes,
      (episode, next) => anime.provider.downloadEpisode(anime, episode, next),
      callback
    );
  }

  /* if (notPresent === 0) {
    if (UPDATE) {
      async.eachSeries(malEpisodes, (malEpisodeInformation, next) => {
        var temporaryJpgFilename = getTemporaryFilename(
          malSeries,
          malEpisodeInformation,
          malEpisodeInformation.number,
          'jpg'
        );
        if (!fs.existsSync(temporaryJpgFilename)) {
          var jpgFile = fs.createWriteStream(temporaryJpgFilename);
          jpgFile.on('finish', () => {
            writeMetadata(
              malSeries,
              malEpisodeInformation,
              title,
              getFinalFileName(malSeries, malEpisodeInformation),
              next
            );
          });
          //noinspection JSUnresolvedFunction
          request({url: malSeries.image, method: 'GET', followAllRedirects: true}).pipe(jpgFile);
        } else {
          console.log('Rewriting metadata for ' + getFinalFileName(malSeries, malEpisodeInformation));
          writeMetadata(
            malSeries,
            malEpisodeInformation,
            title,
            getFinalFileName(malSeries, malEpisodeInformation),
            next
          );
        }
      }, callback);
    }

    // All episodes have been downloaded
    return;
  } */
};

//noinspection JSUnusedLocalSymbols
var fetchKissanime = (title, malSeries, malEpisodeInformations, nextSeries) => {
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
        var malEpisodeInformation = null;
        var kissanimeEpisodeNumber = 0;
        var kissanimeEpisodeNumberMatch = kissanimeEpisode.name.match(/Episode ([0-9]+)/);

        if (kissanimeEpisodeNumberMatch !== null) {
          kissanimeEpisodeNumber = kissanimeEpisodeNumberMatch[1];
        }

        for (var i = 0; i < malEpisodes.length; i++) {
          if (malEpisodes[i].number == kissanimeEpisodeNumber) {
            malEpisodeInformation = malEpisodes[i];
            break;
          }
        }

        return downloadEpisode(
          malSeries,
          malEpisodeInformation,
          getBestVideoFromKissanimeEpisode(kissanimeEpisode),
          kissanimeEpisodeNumber,
          nextEpisode
        );
      }, nextSeries);
    });
  });
};

var getBestVideoFromKissanimeEpisode = (kissanimeEpisode) => {
  var bestLink = null;
  var bestResolution = 0;

  for (var k = 0; k < kissanimeEpisode.video_links.length; k++) {
    var video = kissanimeEpisode.video_links[k];
    var resolution = 0;
    switch (video.name) {
      case '1080p':
        resolution = 1080;
        break;
      case '720p':
        resolution = 720;
        break;
      case '480p':
        resolution = 480;
        break;
      case '360p':
        resolution = 360;
        break;
      default:
        throw new Error('Unrecognised resolution: ' + video.name);
    }
    if (bestResolution < resolution) {
      bestResolution = resolution;
      bestLink = video.url;
    }
  }

  return {url: bestLink, resolution: bestResolution};
};

async.eachSeries(config.series, (series, next) => runSeries(series, next));
