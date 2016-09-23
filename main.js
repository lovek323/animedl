"use strict";

var Kissanime = require('anime-scraper').Anime;
var MyAnimeList = require('malapi').Anime;

var config = require('./config.json');

var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var mkdirp = require('mkdirp');
var request = require('request');
var sanitise = require('sanitize-filename');
var shellescape = require('shell-escape');
var util = require('util');

const debug = require('debug')('kissanime');

var runSeries = function (seriesId, nextSeries) {
  debug('Processing series: ' + seriesId);

  var cacheFile = "cache/" + seriesId + ".json";

  if (fs.existsSync(cacheFile)) {
    var stat = fs.statSync(cacheFile);
    var mtime = new Date(util.inspect(stat.mtime));
    var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    if (mtime > yesterday) {
      debug('Reading from cache file: ' + cacheFile);
      var cacheObject = require('./cache/' + seriesId);
      var malSeries = cacheObject.malSeries;
      var kissanimeEpisodes = cacheObject.kissanimeEpisodes;
      var malEpisodeInformations = cacheObject.malEpisodeInformations;

      async.eachSeries(kissanimeEpisodes, (kissanimeEpisode, nextEpisode) => {
        var kissanimeEpisodeNumber = kissanimeEpisode.name.match(/Episode ([0-9]+)/)[1];
        var malEpisodeInformation = null;

        for (var i = 0; i < malEpisodeInformations.length; i++) {
          if (malEpisodeInformations[i].number == kissanimeEpisodeNumber) {
            malEpisodeInformation = malEpisodeInformations[i];
            break;
          }
        }

        return runEpisode(malSeries, malEpisodeInformation, kissanimeEpisode, nextEpisode);
      }, nextSeries);
    }
    return;
  }

  MyAnimeList.fromId(seriesId).then(function (malSeries) {
    debug('Fetching series ' + malSeries.title);

    var titles = [];

    if (typeof config.seriesNameOverrides[seriesId] !== 'undefined') {
      titles = [config.seriesNameOverrides[seriesId]];
    } else {
      titles = [malSeries.title];
      titles = titles.concat(malSeries.alternativeTitles.english);
      titles = titles.concat(malSeries.alternativeTitles.synoynms)
    }

    malSeries.getEpisodes().then(malEpisodes => {
      async.eachSeries(titles, (title, nextTitle) => {
        var malEpisodeInformations = [];
        async.eachSeries(malEpisodes, (malEpisode, nextMalEpisode) => {
          malEpisode.getInformation().then(malEpisodeInformation => {
            malEpisodeInformations.push(malEpisodeInformation);
            nextMalEpisode();
          });
        }, () => {
          runSeriesTitle(title, malSeries, malEpisodeInformations, nextTitle, nextSeries)
        });
      });
    });
  });
};

var runSeriesTitle = (title, malSeries, malEpisodeInformations, nextTitle, nextSeries) => {
  Kissanime.fromName(title).then(kissanimeSeries => {
    kissanimeSeries.fetchAllEpisodes().then(kissanimeEpisodes => {
      var cacheFile = "cache/" + malSeries.id + ".json";
      var cacheObject = {malSeries, malEpisodeInformations, kissanimeEpisodes};
      fs.writeFileSync(cacheFile, JSON.stringify(cacheObject));
      debug('Wrote cache file ' + cacheFile);

      async.eachSeries(kissanimeEpisodes, (kissanimeEpisode, nextEpisode) => {
        var kissanimeEpisodeNumber = kissanimeEpisode.name.match(/Episode ([0-9]+)/)[1];
        var malEpisodeInformation = null;

        for (var i = 0; i < malEpisodeInformations.length; i++) {
          if (malEpisodeInformations[i].number == kissanimeEpisodeNumber) {
            malEpisodeInformation = malEpisodeInformations[i];
            break;
          }
        }

        return runEpisode(malSeries, malEpisodeInformation, kissanimeEpisode, nextEpisode);
      }, nextSeries);
    });
  });
};

var runEpisode = function (malSeries, malEpisode, kissanimeEpisode, next) {
  var bestVideo = getBestVideo(kissanimeEpisode);
  var directory = config.outputDirectory;
  var finalDirectory = config.finalDirectory + '/' + sanitise(malSeries.title);

  debug('Downloading ' + kissanimeEpisode.name + ' (' + bestVideo.resolution + 'p)');

  var kissanimeEpisodeNumber = kissanimeEpisode.name.match(/Episode ([0-9]+)/)[1];
  var episodeName = 'Episode ' + kissanimeEpisodeNumber;
  var synopsis = '';
  var genre = '';

  if (malEpisode !== null) {
    episodeName = malEpisode.name;
    synopsis = malEpisode.synopsis;
    genre = malSeries.genres[0];
  }

  var fileName = directory + '/' + sanitise(episodeName) + ".mp4";
  var finalFileName = finalDirectory + '/' + sanitise('Episode ' + kissanimeEpisodeNumber) + ".mp4";

  var malAired = malSeries.aired.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([0-9]{2}), ([0-9]{4})/);
  var malYear = malAired[3];

  if (fs.existsSync(fileName) || fs.existsSync(finalFileName)) {
    next();
    return;
  }

  var jpgFile = fs.createWriteStream('temp.jpg');
  jpgFile.on('finish', function () {
    var mp4File = fs.createWriteStream('temp.mp4');
    mp4File.on('finish', function () {
      var args = [
        'AtomicParsley',
        'temp.mp4',
        '--overWrite',
        '--genre',
        genre,
        '--stik',
        'TV Show',
        '--TVShowName',
        malSeries.title,
        '--TVEpisodeNum',
        kissanimeEpisodeNumber,
        '--artwork',
        'temp.jpg',
        '--year',
        malYear,
        '--longdesc',
        synopsis,
      ];
      var cmd = shellescape(args);
      exec(cmd, error => {
        if (error) {
          debug("Could not run command: " + cmd);
          debug(error);
          process.exit(1);
          return;
        }
        fs.renameSync('temp.mp4', fileName);
        next();
      });
    });
    //noinspection JSUnresolvedFunction
    request({url: bestVideo.url, method: 'GET', followAllRedirects: true}).pipe(mp4File);
  });
  //noinspection JSUnresolvedFunction
  request({url: malSeries.image, method: 'GET', followAllRedirects: true}).pipe(jpgFile);
};

var getBestVideo = (kissanimeEpisode) => {
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

async.eachSeries(config.seriesIds, runSeries);
