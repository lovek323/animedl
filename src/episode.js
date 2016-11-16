'use strict';

const config = require('../config.json');
const fs = require('fs');
const glob = require('glob');
const pad = require('pad');
const utils = require('./utils.js');

class Episode {

  /**
   * @param {Anime} anime
   * @param aniDbEpisode
   * @param malEpisode
   * @param {Provider} provider
   * @param {ProviderEpisode} providerEpisode
   * @param isSpecial
   * @param format
   * @param number
   */
  constructor(anime, aniDbEpisode, malEpisode, provider, providerEpisode, isSpecial, format, number) {
    this.anime = anime;
    this.provider = provider;
    this.providerEpisode = providerEpisode;
    this.isSpecial = isSpecial;
    this.format = format;

    if (malEpisode !== null) {
      this.synopsis = aniDbEpisode.synopsis;
    }

    if (aniDbEpisode !== null) {
      this.title = null;
      var self = this;
      aniDbEpisode.title.forEach(function (title) {
        if (title['$']['xml:lang'] === 'en') {
          self.name = title['_'];
        }
      });
      if (this.name === null) {
        throw new Error('Could not find English title');
      }

      //noinspection JSUnresolvedVariable
      this.number = aniDbEpisode.epno[0]['_'];

      //noinspection JSUnresolvedVariable
      if (aniDbEpisode.airdate.length > 0) {
        //noinspection JSUnresolvedVariable
        this.aired = aniDbEpisode.airdate[0];
      } else {
        this.aired = anime.aired;
      }
    } else {
      this.name = 'Episode ' + number;
      this.number = number;
      this.synopsis = anime.synopsis;
      this.aired = anime.aired;
    }
  }

  getFilenameSeriesTitle() {
    //noinspection JSUnresolvedVariable
    var sanitisedAnimeTitle = utils.sanitise(this.anime.getTitle());
    return sanitisedAnimeTitle;
  }

  getFinalFilename() {
    var path = '';

    //noinspection JSUnresolvedVariable
    var dateMatch = this.anime.aniDbAnime.startdate[0].match(/^([0-9]{4})-([0-9]{2})/);

    if (dateMatch) {
      var season;
      switch (dateMatch[2]) {
        case '01':
        case '02':
        case '03':
          season = '1-Winter';
          break;
        case '04':
        case '05':
        case '06':
          season = '2-Spring';
          break;
        case '07':
        case '08':
        case '09':
          season = '3-Summer';
          break;
        case '10':
        case '11':
        case '12':
          season = '4-Autumn';
          break;
      }

      path = season + '/' + dateMatch[1] + '/';
    }

    var sanitisedAnimeTitle = this.getFilenameSeriesTitle();
    var paddedEpisodeNumber = (this.isSpecial ? 'S00E' : 'S01E') + pad(2, this.number, '0');
    var sanitisedEpisodeName = utils.sanitise(this.name);

    if (this.anime.isMovie()) {
      return config.moviesFinalDirectory + '/' + path + sanitisedAnimeTitle + '/' + sanitisedAnimeTitle + ' (' +
        this.format + ').mp4';
    } else {
      return config.tvFinalDirectory + '/' + path + sanitisedAnimeTitle + '/' + paddedEpisodeNumber + ' ' +
        sanitisedEpisodeName + ' (' + this.format + ').mp4';
    }
  }

  getActualFilename() {
    var sanitisedAnimeTitle = this.getFilenameSeriesTitle();
    var paddedEpisodeNumber = (this.isSpecial ? 'S00E' : 'S01E') + pad(2, this.number, '0');

    if (!fs.existsSync(config.tvFinalDirectory + '/' + sanitisedAnimeTitle)) {
      fs.mkdirSync(config.tvFinalDirectory + '/' + sanitisedAnimeTitle);
    }

    var pattern;

    if (this.anime.isMovie()) {
      pattern = config.moviesFinalDirectory + '/' + sanitisedAnimeTitle + '/' + sanitisedAnimeTitle + ' \\(' + this.format +
        '\\).mp4';
    } else {
      pattern = config.tvFinalDirectory + '/' + sanitisedAnimeTitle + '/' + paddedEpisodeNumber + '*\\(' + this.format +
        '\\).mp4';
    }

    var results = glob.sync(pattern);
    if (results.length === 0) {
      return null;
    }
    return results[0];
  }

  fileExists() {
    return this.getActualFilename() !== null;
  }

}

module.exports = Episode;