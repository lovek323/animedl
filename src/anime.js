const Episode = require('./episode.js');
const MyAnimeList = require('malapi').Anime;

const async = require('async');
const fs = require('fs');
const parseString = require('xml2js').parseString;
const providers = require('./providers.js');
const request = require('request');
const util = require('util');

class Anime {

  /**
   * @param {AnimeConfig} config
   * @param callback
   */
  static get(config, callback) {
    const anime = new Anime();

    anime.providerEpisodeRanges = config.providerEpisodeRanges;
    anime.aniDbId = config.aniDbId;
    anime.malId = anime.providerEpisodeRanges[0].malId;
    anime.episodes = [];

    anime.getMalData(() => {
      anime.getAniDbData(() => {
        //noinspection JSUnresolvedVariable
        anime.aired = anime.aniDbAnime.startdate[0];
        anime.characters = anime.malSeries.characters;
        anime.classification = anime.malSeries.classification;
        anime.genres = anime.malSeries.genres;
        anime.imageUrl = anime.malSeries.image;
        anime.staff = anime.malSeries.staff;
        anime.studios = anime.malSeries.studios;
        //noinspection JSUnresolvedVariable
        anime.synopsis = anime.aniDbAnime.description[0];
        anime.type = anime.malSeries.type;
        anime.episodeCount = anime.aniDbEpisodes.length;

        anime.getProviderData(() => callback(anime));
      });
    });
  }

  getMalData(callback) {
    const cacheFile = 'cache/mal-' + this.malId + '.json';

    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      const mtime = new Date(util.inspect(stat.mtime));
      const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
      if (mtime > yesterday) {
        const cacheObject = require('../' + cacheFile);
        this.malSeries = cacheObject.malSeries;
        this.malEpisodes = cacheObject.malEpisodes;
        callback();
        return;
      }
    }

    console.log('Fetching series from MAL with ID ' + this.malId);

    const self = this;

    MyAnimeList.fromId(this.malId).then(function (malSeries) {
      self.malSeries = malSeries;

      malSeries.getEpisodes().then(_malEpisodes => {
        self.malEpisodes = [];
        async.eachSeries(_malEpisodes, (_malEpisode, next) => {
          _malEpisode.getInformation().then(malEpisode => {
            self.malEpisodes.push(malEpisode);
            next();
          });
        }, () => {
          const cacheObject = {malSeries: self.malSeries, malEpisodes: self.malEpisodes};
          //noinspection ES6ModulesDependencies,NodeModulesDependencies
          fs.writeFileSync(cacheFile, JSON.stringify(cacheObject));
          callback();
        });
      });
    });
  }

  getAniDbData(callback) {
    const cacheFile = 'cache/anidb-' + this.aniDbId + '.json';
    const cache = {};

    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      const mtime = new Date(util.inspect(stat.mtime));
      const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
      if (mtime > yesterday) {
        cache.result = require('../' + cacheFile);
        //noinspection JSUnresolvedVariable
        this.aniDbAnime = cache.result.anime;
        //noinspection JSUnresolvedVariable
        this.aniDbEpisodes = cache.result.anime.episodes[0].episode;
        callback();
        return;
      }
    }

    console.log('Fetching series from AniDB with ID ' + this.aniDbId);

    const self = this;
    const aniDbUrl = 'http://api.anidb.net:9001/httpapi?request=anime&client=animdl&clientver=1&protover=1&aid=' +
      this.aniDbId;

    request({uri: aniDbUrl, gzip: true}, (error, response, body) => {
      parseString(body, function (error, result) {
        cache.result = result;
        //noinspection ES6ModulesDependencies,NodeModulesDependencies
        fs.writeFileSync(cacheFile, JSON.stringify(result));
        //noinspection JSUnresolvedVariable
        self.aniDbAnime = cache.result.anime;
        //noinspection JSUnresolvedVariable
        self.aniDbEpisodes = cache.result.anime.episodes[0].episode;
        callback();
      });
    });
  }

  getProviderData(callback) {
    const self = this;

    async.eachSeries(this.providerEpisodeRanges, (providerEpisodeRange, next) => {
      let isSpecial = false;
      let start = providerEpisodeRange.start;
      let proceed = true;
      if (/^S[0-9]+$/.test(start)) {
        // We're dealing with a special
        start = start.substr(1);
        isSpecial = true;
      } else if (/^OP[0-9]+[a-z]+$/.test(start)) {
        // We're dealing with an OP, don't know how to deal with these yet
        proceed = false;
      } else if (/^ED[0-9]+[a-z]+$/.test(start)) {
        // We're dealing with an ED, don't know how to deal with these yet
        proceed = false;
      } else if (/^T[0-9]+$/.test(start)) {
        // We're dealing with a preview episode, don't know how to deal with these yet
        proceed = false;
      }

      if (proceed) {
        // We're dealing with a normal episode
        start = parseInt(start);
        let provider;
        //noinspection JSUnresolvedVariable
        switch (providerEpisodeRange.provider) {
          case "9anime.to":
            //noinspection JSUnresolvedVariable
            provider = providers[providerEpisodeRange.provider];
            break;
          default:
            //noinspection JSUnresolvedVariable
            throw new Error('Unrecognised provider: ' + providerEpisodeRange.provider);
        }

        //noinspection JSUnresolvedVariable
        provider.getEpisodes(self, providerEpisodeRange.providerId, (providerEpisodes) => {
          for (let i = 0; i < providerEpisodes.length; i++) {
            const providerEpisode = providerEpisodes[i];
            let aniDbEpisode = null;
            for (let j = 0; j < self.aniDbEpisodes.length; j++) {
              //noinspection JSUnresolvedVariable
              let episodeNumber = self.aniDbEpisodes[j].epno[0]['_'];
              if (/^S[0-9]+/.test(episodeNumber)) {
                // We're dealing with a special
                if (!isSpecial) continue;
                episodeNumber = episodeNumber.substr(1);
              } else if (/^OP[0-9]+[a-z]+$/.test(episodeNumber)) {
                // We're dealing with an OP, don't know how to deal with these yet
                continue;
              } else if (/^ED[0-9]+[a-z]+$/.test(episodeNumber)) {
                // We're dealing with an ED, don't know how to deal with these yet
                continue;
              } else if (/^T[0-9]+$/.test(episodeNumber)) {
                // We're dealing with a preview episode, don't know how to deal with these yet
                continue;
              } else if (/^C[0-9]+$/.test(episodeNumber)) {
                // We're dealing with an opening, don't know how to deal with these yet
                continue;
              } else if (/^[0-9]+$/.test(episodeNumber)) {
                // We're dealing with a normal episode number
              } else {
                throw new Error('Unrecognised episode number format: ' + episodeNumber);
              }
              episodeNumber = parseInt(episodeNumber);
              episodeNumber -= start - 1;
              if (episodeNumber == providerEpisode.number) {
                aniDbEpisode = self.aniDbEpisodes[j];
                break;
              }
            }

            if (aniDbEpisode === null) {
              throw new Error('Could not match provider episode to AniDB');
            }

            let malEpisode = null;
            for (let i = 0; i < self.malEpisodes.length; i++) {
              if (self.malEpisodes[i].number === providerEpisode.number) {
                malEpisode = self.malEpisodes[i];
                break;
              }
            }

            self.episodes.push(new Episode(
              self,
              aniDbEpisode,
              malEpisode,
              provider,
              providerEpisode,
              isSpecial,
              providerEpisodeRange.format,
              providerEpisode.number
            ));
          }
        });
      }

      next();
    }, callback);
  }

  isMovie() {
    return this.malSeries.episodes === '1';
  }

  getTitle() {
    let englishTitle = null;
    //noinspection JSUnresolvedVariable
    this.aniDbAnime.titles[0].title.forEach(function (title) {
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
