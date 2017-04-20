'use strict';

const AniDbEpisodeNumber = require('./aniDbEpisodeNumber.js');

const config = require('../config.json');
const fs = require('fs');
const glob = require('glob');
const mkdirp = require('mkdirp');
const pad = require('pad');
const utils = require('./utils.js');

class Episode {
  /**
   * @param {Anime} anime
   * @param {AniDbEpisodeEpisode} aniDbEpisode
   * @param {Provider} provider
   * @param {ProviderEpisode} providerEpisode
   * @param {EpisodeConfig} episodeConfig
   * @param {boolean} isSpecial
   * @param {string} format
   * @param {string} number
   */
  constructor(anime, aniDbEpisode, provider, providerEpisode, episodeConfig, isSpecial, format, number) {
    this.anime = anime;
    this.name = provider;
    this.providerEpisode = providerEpisode;
    this.episodeConfig = episodeConfig;
    this.isSpecial = isSpecial;
    this.format = format;

    if (aniDbEpisode !== null) {
      this.title = null;
      const self = this;
      aniDbEpisode.title.forEach(function (title) {
        if (title['$']['xml:lang'] === 'en') {
          self.name = title['_'];
        }
      });
      if (this.name === null) {
        throw new Error('Could not find English title');
      }

      this.number = new AniDbEpisodeNumber(aniDbEpisode.epno[0]['_'], anime.aniDbSeries);
    } else {
      this.name = 'Episode ' + number;
      this.number = number;
    }
  }

  getFilenameSeriesTitle() {
    return utils.sanitise(this.anime.getTitle());
  }

  getName() {
    if (this.episodeConfig !== null) {
      return this.episodeConfig.name;
    }

    return this.name;
  }

  /**
   * @return {AniDbEpisodeNumber}
   */
  getNumber() {
    if (this.episodeConfig !== null) {
      return new AniDbEpisodeNumber(this.episodeConfig.number, this.number.series, this.number.start);
    }

    return this.number;
  }

  getFinalFilename() {
    const config = require('../config.json');
    const sanitisedAnimeTitle = this.getFilenameSeriesTitle();
    const sanitisedEpisodeName = utils.sanitise(this.getName());
    const number = this.getNumber();

    if (!fs.existsSync(config.tvFinalDirectory + '/' + sanitisedAnimeTitle)) {
      mkdirp(config.tvFinalDirectory + '/' + sanitisedAnimeTitle);
    }

    if (this.isSpecial) {
      if (!fs.existsSync(config.tvFinalDirectory + '/' + sanitisedAnimeTitle + '/Specials')) {
        mkdirp(config.tvFinalDirectory + '/' + sanitisedAnimeTitle + '/Specials');
      }

      return config.tvFinalDirectory + '/' + sanitisedAnimeTitle + '/Specials/' + number.number
        + ' ' + sanitisedEpisodeName + ' (' + this.format + ').mp4';
    } else {
      const paddedEpisodeNumber = 'S01E' + pad(2, number.number, '0');
      return config.tvFinalDirectory + '/' + sanitisedAnimeTitle + '/' + paddedEpisodeNumber + ' ' +
        sanitisedEpisodeName + ' (' + this.format + ').mp4';
    }
  }

}

module.exports = Episode;
