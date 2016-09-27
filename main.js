"use strict";

var Kissanime = require('anime-scraper').Anime;
var MyAnimeList = require('malapi').Anime;
var ProgressBar = require('progress');

var config = require('./config.json');
var kissanimeSeries = require('./cache/search.json');

var async = require('async');
var cheerio = require('cheerio');
var exec = require('child_process').exec;
var fs = require('fs');
var numeral = require('numeral');
var pad = require('pad');
var progress = require('request-progress');
var request = require('request');
var shellescape = require('shell-escape');
var util = require('util');

const debug = require('debug')('animedl');
const debugTrace = require('debug')('animedl-trace');

String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

var cachedRequest = (url, callback) => {
  var cacheFile = 'cache/' + new Buffer(url).toString('base64');
  if (fs.existsSync(cacheFile)) {
    var stat = fs.statSync(cacheFile);
    var mtime = new Date(util.inspect(stat.mtime));
    var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    if (mtime > yesterday) {
      callback(null, null, fs.readFileSync(cacheFile));
      return;
    }
  }
  request(url, (error, request, body) => {
    fs.writeFileSync(cacheFile, body);
    callback(error, request, body);
  });
};

var sanitise = string => {
  //noinspection JSUnresolvedFunction
  return string.replaceAll('"', '_').replaceAll(':', '_');
};

var getFileName = () => {
  return config.outputDirectory + '/episode.mp4';
};

var getFinalFileName = (malEpisodeInformation, malSeries, episodeName) => {
  if (malSeries.episodes === '1') {
    return config.moviesFinalDirectory + '/' + sanitise(malSeries.title) + '/' + sanitise(malSeries.title) + '.mp4';
  } else {
    return config.tvFinalDirectory + '/' + sanitise(malSeries.title) + '/' +
      pad(2, malEpisodeInformation.number, '0') + ' ' + sanitise(episodeName) + '.mp4';
  }
};

var getTemporaryFilename = (malSeries, malEpisodeInformation, extension) => {
  if (malSeries.episodes === '1') {
    return 'cache/' + sanitise(malSeries.title) + '.' + extension;
  } else {
    var episodeName = malSeries.episodes === '1' ? malSeries.title : malEpisodeInformation.name;
    return 'cache/' + sanitise(malSeries.title) + '_' + pad(2, malEpisodeInformation.number, '0') + ' ' +
      sanitise(episodeName) + '.' + extension;
  }
};

var runSeries = function (series, nextSeries, provider) {
  var seriesId = series.id;
  var cacheFile = "cache/" + seriesId + ".json";

  //noinspection JSUnresolvedVariable
  if (typeof series.provider !== 'undefined') {
    //noinspection JSUnresolvedVariable
    provider = series.provider;
  }

  debug('Processing series: ' + seriesId);

  if (fs.existsSync(cacheFile)) {
    var stat = fs.statSync(cacheFile);
    var mtime = new Date(util.inspect(stat.mtime));
    var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    if (mtime > yesterday) {
      var cacheObject = require('./cache/' + seriesId);
      var malSeries = cacheObject.malSeries;
      var malEpisodeInformations = cacheObject.malEpisodeInformations;

      if (provider === 'kissanime.to') {
        //noinspection JSUnresolvedVariable
        runSeriesKissanime(series.kissanimeTitle, malSeries, malEpisodeInformations, nextSeries)
      } else {
        //noinspection JSUnresolvedVariable
        runSeries9Anime(series._9AnimeTitle, malSeries, malEpisodeInformations, nextSeries)
      }
      return;
    }
  }

  MyAnimeList.fromId(seriesId).then(function (malSeries) {
    console.log('Fetching series ' + seriesId);

    malSeries.getEpisodes().then(malEpisodes => {
      var malEpisodeInformations = [];
      async.eachSeries(malEpisodes, (malEpisode, nextMalEpisode) => {
        malEpisode.getInformation().then(malEpisodeInformation => {
          malEpisodeInformations.push(malEpisodeInformation);
          nextMalEpisode();
        });
      }, () => {
        var cacheFile = "cache/" + malSeries.id + ".json";
        var cacheObject = {malSeries, malEpisodeInformations};
        fs.writeFileSync(cacheFile, JSON.stringify(cacheObject));

        if (provider === 'kissanime.to') {
          //noinspection JSUnresolvedVariable
          runSeriesKissanime(series.kissanimeTitle, malSeries, malEpisodeInformations, nextSeries)
        } else {
          //noinspection JSUnresolvedVariable
          runSeries9Anime(series._9AnimeTitle, malSeries, malEpisodeInformations, nextSeries)
        }
      });
    });
  });
};

var runSeriesKissanime = (title, malSeries, malEpisodeInformations, nextSeries) => {
  console.log('Fetching series ' + title);

  var url = null;

  //noinspection JSUnresolvedVariable
  for (var i = 0; i < kissanimeSeries.length; i++) {
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

        for (var i = 0; i < malEpisodeInformations.length; i++) {
          if (malEpisodeInformations[i].number == kissanimeEpisodeNumber) {
            malEpisodeInformation = malEpisodeInformations[i];
            break;
          }
        }

        return downloadEpisode(
          malSeries,
          malEpisodeInformation,
          getBestVideoFromKissanimeEpisode(kissanimeEpisode),
          nextEpisode
        );
      }, nextSeries);
    });
  });
};

var runSeries9Anime = (title, malSeries, malEpisodeInformations, nextSeries) => {
  console.log('Fetching series ' + title);

  cachedRequest(
    'http://9anime.to/ajax/film/search?sort=year%3Adesc&keyword=' + encodeURIComponent(title),
    (error, response, body) => {
      body = JSON.parse(body);
      var $ = cheerio.load(body.html);
      var found = false;
      $(".item a.name").each((index, element) => {
        var url = $(element).attr('href');
        var filmId = url.match(/\/(.*?)$/)[1];
        var name = $(element).text();
        if (name.toLowerCase() === title.toLowerCase()) {
          found = true;
          cachedRequest(url, (error, response, body) => {
            var $ = cheerio.load(body);
            var episodes = {};
            $("ul.episodes a").each((index, element) => {
              var id = $(element).data("id");
              var name = $(element).text();
              if (typeof episodes[name] === 'undefined') {
                episodes[name] = [];
              }
              episodes[name].push(id);
            });

            async.eachSeries(Object.keys(episodes), (episode, nextEpisode) => {
              var _9AnimeEpisodeId = episodes[episode][0];
              var _9AnimeEpisodeNumberMatch = episode.match(/^([0-9]+)/);
              var _9AnimeEpisodeNumber = 0;
              var malEpisodeInformation = null;

              if (_9AnimeEpisodeNumberMatch !== null) {
                _9AnimeEpisodeNumber = parseInt(_9AnimeEpisodeNumberMatch[0]);
              }

              for (var i = 0; i < malEpisodeInformations.length; i++) {
                if (malEpisodeInformations[i].number == _9AnimeEpisodeNumber) {
                  malEpisodeInformation = malEpisodeInformations[i];
                  break;
                }
              }

              var episodeName = malSeries.episodes === '1' ? malSeries.title : malEpisodeInformation.name;
              var finalFileName = getFinalFileName(malEpisodeInformation, malSeries, episodeName);

              if (fs.existsSync(finalFileName)) {
                if (malSeries.episodes === '1') {
                  debug('Skipping ' + malSeries.title);
                } else {
                  debug('Skipping episode ' + malEpisodeInformation.number);
                }
                nextEpisode();
                return;
              }

              request(
                'http://9anime.to/ajax/episode/info?id=' + _9AnimeEpisodeId + '&update=0&film=' + filmId,
                (error, response, body) => process9AnimeEpisodeInfo(
                  error,
                  response,
                  body,
                  _9AnimeEpisodeId,
                  malSeries,
                  malEpisodeInformation,
                  nextEpisode
                )
              )
            }, nextSeries);
          });
        }
      });

      if (!found) {
        debug('Could not find ' + title + ' in 9anime.to\'s database');
        nextSeries();
      }
    }
  );
};

var process9AnimeEpisodeInfo = (error, response, body, episodeId, malSeries, malEpisodeInformation, nextEpisode) => {
  try {
    body = JSON.parse(body);
  } catch (error) {
    if (body.includes('The web server reported a gateway time-out error.')) {
      debug('Gateway time-out error. Waiting 5 seconds.');
      setTimeout(() =>
        process9AnimeEpisodeInfo(error, response, body, malSeries, malEpisodeInformation, nextEpisode), 5000);
      return;
    }

    console.error(body);
    console.error(error);
    process.exit(3);
  }

  //noinspection JSUnresolvedVariable
  var url = body.grabber + '?id=' + episodeId + '&token=' + body.params.token + '&options=' +
    body.params.options + '&mobile=0';

  request(url, (error, response, body) =>
    process9AnimeGrabberResponse(error, response, body, malSeries, malEpisodeInformation, nextEpisode));
};

var process9AnimeGrabberResponse = (error, response, body, malSeries, malEpisodeInformation, nextEpisode) => {
  try {
    body = JSON.parse(body);
  } catch (error) {
    if (body.includes('The web server reported a gateway time-out error.')) {
      debug('Gateway time-out error. Waiting 5 seconds.');
      setTimeout(() =>
        process9AnimeGrabberResponse(error, response, body, malSeries, malEpisodeInformation, nextEpisode), 5000);
      return;
    }

    console.error(body);
    console.error(error);
    process.exit(1);
  }

  return downloadEpisode(
    malSeries,
    malEpisodeInformation,
    getBestVideoFrom9AnimeEpisode(body),
    nextEpisode
  )
};

var downloadEpisode = function (malSeries, malEpisodeInformation, bestVideo, next) {
  var title = malSeries.episodes === '1' ? malSeries.title : malEpisodeInformation.name;
  var finalFileName = getFinalFileName(malEpisodeInformation, malSeries, title);

  if (fs.existsSync(finalFileName)) {
    next();
    return;
  }

  if (malSeries.episodes === '1') {
    console.log('Downloading ' + malSeries.title + ' (' + bestVideo.resolution + 'p) to ' + finalFileName);
  } else {
    console.log('Downloading ' + malEpisodeInformation.number + ' - ' + malEpisodeInformation.name + ' (' +
      bestVideo.resolution + 'p) to ' + finalFileName);
  }

  if (!fs.existsSync(getTemporaryFilename(malSeries, malEpisodeInformation, 'jpg'))) {
    var jpgFile = fs.createWriteStream(getTemporaryFilename(malSeries, malEpisodeInformation, 'jpg'));
    jpgFile.on('finish', () => downloadMp4(malSeries, malEpisodeInformation, bestVideo, title, next));

    //noinspection JSUnresolvedFunction
    request({url: malSeries.image, method: 'GET', followAllRedirects: true}).pipe(jpgFile);
  } else if (!fs.existsSync(getTemporaryFilename(malSeries, malEpisodeInformation, 'mp4'))) {
    downloadMp4(malSeries, malEpisodeInformation, bestVideo, title, next);
  } else {
    writeMetadataAndMoveFile(malSeries, malEpisodeInformation, title, next);
  }
};

var downloadMp4 = (malSeries, malEpisodeInformation, bestVideo, title, next) => {
  //noinspection JSUnresolvedFunction
  var bar = new ProgressBar(
    '[:bar] :bytesTransferred/:bytesTotal :percent :speed/s :remainingTime remaining',
    {
      bytesTransferred: '',
      bytesTotal: '',
      remainingTime: '',
      speed: '',
      total: 100
    }
  );

  var temporaryFilename = getTemporaryFilename(malSeries, malEpisodeInformation, 'mp4');
  var mp4File = fs.createWriteStream(temporaryFilename);
  mp4File.on('finish', () => {
    if (bar.curr < 90) {
      fs.unlinkSync(temporaryFilename);
      throw new Error('Could not download file');
    }
    writeMetadataAndMoveFile(malSeries, malEpisodeInformation, title, next);
  });

  //noinspection JSUnresolvedFunction
  progress(request({url: bestVideo.url, method: 'GET', followAllRedirects: true}))
    .on(
      'progress',
      state => bar.update(
        state.percentage,
        {
          bytesTransferred: numeral(state.size.transferred).format('0b'),
          bytesTotal: numeral(state.size.total).format('0b'),
          remainingTime: numeral(state.time.remaining).format('00:00:00'),
          speed: numeral(state.speed).format('0b')
        }
      )
    )
    .pipe(mp4File);
};

var writeMetadataAndMoveFile = (malSeries, malEpisodeInformation, title, next) => {
  var synopsis = malSeries.episodes === '1' ? malSeries.synopsis : malEpisodeInformation.synopsis;
  var genre = malSeries.genres[0];
  var contentRating = '';

  switch (malSeries.classification) {
    case "G - All Ages":
      contentRating = "G";
      break;
    case "PG-13 - Teens 13 or older":
      contentRating = "PG-13";
      break;
    case "R - 17+ (violence & profanity)":
      contentRating = "R";
      break;
    default:
      throw new Error('Unrecognised classification: ' + malSeries.classification);
  }

  var aired;
  if (malSeries.episodes === '1') {
    aired = new Date(malSeries.aired).toISOString();
  } else {
    aired = malEpisodeInformation.aired;
    if (typeof aired === 'object') {
      aired = aired.toISOString();
    }
    aired = aired.replace('.000', '');
  }

  var fileName = getFileName();

  var args = [
    'AtomicParsley',
    getTemporaryFilename(malSeries, malEpisodeInformation, 'mp4'),
    '--overWrite',
    '--genre',
    genre,
    '--artwork',
    getTemporaryFilename(malSeries, malEpisodeInformation, 'jpg'),
    '--year',
    aired,
    '--longdesc',
    synopsis,
    '--storedesc',
    malSeries.synopsis,
    '--contentRating',
    contentRating,
    '--grouping',
    malSeries.type
  ];

  if (malSeries.episodes === '1') {
    // Treat this as a movie
    args = args.concat([
      '--stik',
      'Movie',
      '--title',
      malSeries.title,
    ]);
  } else {
    // Treat this as a TV series
    args = args.concat([
      '--stik',
      'TV Show',
      '--title',
      title,
      '--tracknum',
      malEpisodeInformation.number + '/' + malSeries.episodes,
      '--TVShowName',
      malSeries.title,
      '--TVEpisodeNum',
      malEpisodeInformation.number,
    ]);
  }

  debugTrace(args);

  exec(shellescape(args), error => {
    if (error) {
      console.log(error);
      debug(error);
      process.exit(2);
      return;
    }

    args = ['perl', 'iTunMOVI-1.1.pl'];
    malSeries.characters.forEach(character => {
      if (character.actor === '' || character.language !== 'Japanese') {
        // We are adding actors, not characters and Japanese voice actors not English dub actors
        return;
      }
      var match = character.actor.match(/(.*), (.*)/);
      var actor = match[2] + ' ' + match[1];
      args.push('--cast');
      args.push(actor);
    });
    malSeries.staff.forEach(staff => {
      var match = staff.name.match(/(.*), (.*)/);
      var name = match[2] + ' ' + match[1];
      staff.role.forEach(role => {
        switch (role) {
          case 'Director':
            args.push('--directors');
            args.push(name);
            break;
          case 'Producer':
            args.push('--producers');
            args.push(name);
            break;
          case 'Script':
          case 'Storyboard':
            args.push('--screenwriters');
            args.push(name);
            break;
          case 'Sound Director':
            args.push('--codirectors');
            args.push(name);
            break;
          case 'Music':
          case 'Series Composition':
            break;
            // Ignore these roles, they don't fit
            break;
          default:
            throw new Error('Unrecognised staff role: ' + role);
        }
      });
    });
    malSeries.studios.forEach(studio => {
      args.push('--studio');
      args.push(studio);
    });
    args.push('--file');
    args.push(getTemporaryFilename(malSeries, malEpisodeInformation, 'mp4'));
    args.push('--write');

    debugTrace(args);
    exec(shellescape(args), error => {
      if (error) {
        console.log(error);
        debug(error);
        process.exit(4);
        return;
      }

      fs.renameSync(getTemporaryFilename(malSeries, malEpisodeInformation, 'mp4'), fileName);
      console.log('');
      next();
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

var getBestVideoFrom9AnimeEpisode = (_9AnimeEpisode) => {
  var bestLink = null;
  var bestResolution = 0;

  for (var k = 0; k < _9AnimeEpisode.data.length; k++) {
    var video = _9AnimeEpisode.data[k];
    var resolution = 0;
    switch (video.label) {
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
      bestLink = video.file;
    }
  }

  return {url: bestLink, resolution: bestResolution};
};

async.eachSeries(config.series, runSeries, '9anime.to');

/* Kissanime.search('').then(function (results) {
 var cacheFile = "cache/search.json";
 fs.writeFileSync(cacheFile, JSON.stringify(results));
 }); */
