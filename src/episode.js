const config = require('../config.json');
const fs = require('fs');
const glob = require('glob');
const pad = require('pad');
const utils = require('./utils.js');

class Episode {

  /**
   * @param {Anime} anime
   * @param malEpisode
   * @param {ProviderEpisode} providerEpisode
   * @param number
   */
  constructor(anime, malEpisode, providerEpisode, number) {
    this.anime = anime;
    this.providerEpisode = providerEpisode;

    if (malEpisode !== null) {
      this.name = malEpisode.name;
      this.number = malEpisode.number;
      this.synopsis = malEpisode.synopsis;

      this.aired = malEpisode.aired;
      if (typeof this.aired === 'object') {
        this.aired = malEpisode.aired.toISOString();
      }
      this.aired = this.aired.replace('.000', '');
    } else {
      this.name = 'Episode ' + number;
      this.number = number;
      this.synopsis = anime.synopsis;
      this.aired = anime.aired;
    }
  }

  getFinalFilename() {
    var sanitisedTitle = utils.sanitise(this.anime.getTitle());
    var paddedEpisodeNumber = pad(2, this.number, '0');
    var sanitisedEpisodeName = utils.sanitise(this.name);

    if (this.anime.isMovie()) {
      return config.moviesFinalDirectory + '/' + sanitisedTitle + '/' + sanitisedTitle + '.mp4';
    } else {
      return config.tvFinalDirectory + '/' + sanitisedTitle + '/' + paddedEpisodeNumber + ' ' + sanitisedEpisodeName
        + '.mp4';
    }
  }

  fileExists() {
    var sanitisedTitle = utils.sanitise(this.anime.getTitle());
    var paddedEpisodeNumber = pad(2, this.number, '0');
    var pattern;

    if (!fs.existsSync(config.tvFinalDirectory + '/' + sanitisedTitle)) {
      return false;
    }

    if (this.anime.isMovie()) {
      pattern = config.moviesFinalDirectory + '/' + sanitisedTitle + '/' + sanitisedTitle + '.mp4';
    } else {
      pattern = config.tvFinalDirectory + '/' + sanitisedTitle + '/' + paddedEpisodeNumber + '*.mp4';
    }

    var results = glob.sync(pattern);
    return results.length > 0;
  }

}

module.exports = Episode;