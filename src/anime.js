const AniDbEpisodeNumber = require('./aniDbEpisodeNumber.js');
const Episode = require('./episode.js');

const constants = require('./constants.js');
const fs = require('fs');
const pad = require('pad');
const parseString = require('xml2js').parseString;
const providers = require('./providers.js');
const request = require('request');
const util = require('util');

class Anime {
  /**
   * @param {SeriesConfig} seriesConfig
   * @param {ProviderConfig} providerConfig
   */
  constructor(seriesConfig, providerConfig) {
    this.seriesConfig = seriesConfig;
    this.providerConfig = providerConfig;
    this.episodes = [];
    /** @type {AniDbSeries} */
    this.aniDbSeries = null;
  }

  /**
   * @param {SeriesConfig} seriesConfig
   * @param {ProviderConfig} providerSeries
   * @param callback
   */
  static get(seriesConfig, providerSeries, callback) {
    const anime = new Anime(seriesConfig, providerSeries);

    anime.getAniDbData(() => {
      anime.aired = anime.aniDbSeries.startdate[0];
      anime.episodeCount = anime.aniDbEpisodes.length;

      anime.populateProviderData(() => callback(anime));
    });
  }

  getAniDbData(callback) {
    const cacheFile = 'cache/anidb-' + this.seriesConfig.aniDbId + '.json';
    const cache = {};

    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      const mtime = new Date(util.inspect(stat.mtime));
      const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
      if (mtime > yesterday) {
        /** @type AniDbResult */
        cache.result = require('../' + cacheFile);
        this.aniDbSeries = cache.result.anime;
        const aniDbEpisodes = cache.result.anime.episodes[0].episode;
        this.aniDbEpisodes = [];
        for (let i = 0; i < aniDbEpisodes.length; i++) {
          this.aniDbEpisodes.push(aniDbEpisodes[i]);
        }
        this.aniDbEpisodes.sort((a, b) => {
          let num1 = pad(10, a.epno[0]._, '0');
          let num2 = pad(10, b.epno[0]._, '0');
          num1 = a.epno[0]._.replace(/[0-9]/g, '') + num1;
          num2 = b.epno[0]._.replace(/[0-9]/g, '') + num2;

          return num1.toLocaleString().localeCompare(num2.toLocaleString());
        });
        /* (I bet I need this for debugging again) this.aniDbEpisodes.forEach((episode) => {
          console.log(episode.epno[0]._);
        }); */
        callback();
        return;
      }
    }

    console.log('Fetching series from AniDB with ID ' + this.seriesConfig.aniDbId);

    const self = this;
    const aniDbUrl = 'http://api.anidb.net:9001/httpapi?request=anime&client=animdl&clientver=1&protover=1&aid=' +
      this.seriesConfig.aniDbId;

    request({ uri: aniDbUrl, gzip: true }, (error, response, body) => {
      parseString(body, function (error, result) {
        cache.result = result;
        fs.writeFileSync(cacheFile, JSON.stringify(result));
        self.aniDbSeries = cache.result.anime;
        self.aniDbEpisodes = cache.result.anime.episodes[0].episode;
        callback();
      });
    });
  }

  populateProviderData(callback) {
    const self = this;

    let aniDbStart = new AniDbEpisodeNumber(this.seriesConfig.aniDbStart, this.aniDbSeries);
    if (aniDbStart.type !== constants.EPISODE_TYPE_NORMAL && aniDbStart.type !== constants.EPISODE_TYPE_SPECIAL) {
      throw new Error('Cannot process episode with type: ' + aniDbStart.type);
    }

    // We're dealing with a normal episode
    let provider;
    switch (this.providerConfig.name) {
      case constants.PROVIDER_9ANIME:
        provider = providers[this.providerConfig.name];
        break;
      default:
        throw new Error('Unrecognised name: ' + this.providerConfig.name);
    }

    provider.getEpisodes(self, this.seriesConfig, this.providerConfig,
      /**
       * @param {ProviderEpisode[]} providerEpisodes
       */
      (providerEpisodes) => {
        const providerEnd = this.providerConfig.providerEnd === null
          ? providerEpisodes.length - 1
          : this.providerConfig.providerEnd;

        for (let providerEpisodeIndex = parseInt(this.providerConfig.providerStart);
             providerEpisodeIndex <= providerEnd;
             providerEpisodeIndex++
        ) {
          const providerEpisode = providerEpisodes[providerEpisodeIndex];
          const providerEpisodeIndexFromStart = providerEpisodeIndex - self.providerConfig.providerStart;
          let aniDbEpisode = null;
          let aniDbEpisodeNumber = null;
          for (let aniDbEpisodeIndex = aniDbStart.index;
               aniDbEpisodeIndex < self.aniDbEpisodes.length;
               aniDbEpisodeIndex++
          ) {
            aniDbEpisodeNumber = new AniDbEpisodeNumber(
              self.aniDbEpisodes[aniDbEpisodeIndex].epno[0]['_'],
              self.aniDbSeries,
              aniDbStart
            );
            if (aniDbEpisodeNumber.indexFromStart === providerEpisodeIndexFromStart) {
              aniDbEpisode = self.aniDbEpisodes[aniDbEpisodeIndex];
              break;
            }
          }

          if (aniDbEpisode === null) {
            throw new Error('Could not match name episode to AniDB');
          }

          let episodeConfig = null;
          if (this.seriesConfig.episodes !== null) {
            for (let i = 0; i < this.seriesConfig.episodes.length; i++) {
              if (this.seriesConfig.episodes[i].aniDbNumber === aniDbEpisodeNumber.number) {
                episodeConfig = this.seriesConfig.episodes[i];
                break;
              }
            }
          }

          self.episodes.push(new Episode(
            self,
            aniDbEpisode,
            provider,
            providerEpisode,
            episodeConfig,
            aniDbEpisodeNumber.type === constants.EPISODE_TYPE_SPECIAL,
            this.providerConfig.format,
            providerEpisode.number
          ));
        }

        callback();
      });
  }

  getTitle() {
    if (this.seriesConfig.title !== null) {
      return this.seriesConfig.title;
    }

    let englishTitle = null;
    this.aniDbSeries.titles[0].title.forEach(function (title) {
      if (title['$']['xml:lang'] === 'en') {
        englishTitle = title['_'];
      }
    });
    if (englishTitle === null) {
      throw new Error('Could not find English title');
    }
    return englishTitle;
  }

}

module.exports = Anime;
