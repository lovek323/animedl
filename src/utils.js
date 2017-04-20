const config = require('../config.json');
const fs = require('fs');
const pad = require('pad');
const request = require('request');
const util = require('util');

const cachedRequest = (url, callback) => {
  const cacheFile = 'cache/' + new Buffer(url).toString('base64');
  if (fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    const mtime = new Date(util.inspect(stat.mtime));
    const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
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

const sanitise = string => {
  //noinspection JSUnresolvedFunction
  return string.replaceAll('"', '_').replaceAll(':', '_').replaceAll('/', '_').replaceAll('\\?', '_');
};

/**
 * @param {Anime} anime
 * @param {Episode} episode
 * @param extension
 */
const getTemporaryFilename = (anime, episode, extension) => {
  const sanitisedSeriesTitle = sanitise(anime.getTitle());
  const filename = 'cache/' + sanitisedSeriesTitle + '_' + pad(2, episode.number.number, '0') + ' ' +
    sanitise(episode.name) + '.' + extension;
  return filename.replaceAll("'", '_');
};

module.exports = {cachedRequest, sanitise, getTemporaryFilename};
