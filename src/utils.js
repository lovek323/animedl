var config = require('../config.json');
var fs = require('fs');
var pad = require('pad');
var request = require('request');
var util = require('util');

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
  return string.replaceAll('"', '_').replaceAll(':', '_').replaceAll('/', '_').replaceAll('\\?', '_');
};

/**
 * @param {Anime} anime
 * @param {Episode} episode
 * @param extension
 */
var getTemporaryFilename = (anime, episode, extension) => {
  var filename;
  var sanitisedSeriesTitle = sanitise(anime.getTitle());
  if (anime.isMovie()) {
    filename = 'cache/' + sanitisedSeriesTitle + '.' + extension;
  } else {
    filename = 'cache/' + sanitisedSeriesTitle + '_' + pad(2, episode.number, '0') + ' ' +
      sanitise(episode.name) + '.' + extension;
  }
  return filename.replaceAll("'", '_');
};

module.exports = {cachedRequest, sanitise, getTemporaryFilename};
