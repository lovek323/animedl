const Episode = require('./episode.js');
const MyAnimeList = require('malapi').Anime;

const async = require('async');
const deasync = require('deasync');
const fs = require('fs');
const parseString = require('xml2js').parseString;
const providers = require('./providers.js');
const request = require('request');
const util = require('util');

class Anime {

  /**
   * @param {AnimeConfig} config
   */
  constructor(config) {
    this.providerEpisodeRanges = config.providerEpisodeRanges;
    this.aniDbId = config.aniDbId;
    this.malId = this.providerEpisodeRanges[0].malId;
    this.episodes = [];

    this.getMalData();
    this.getAniDbData();

    //noinspection JSUnresolvedVariable
    this.aired = this.aniDbAnime.startdate[0];
    this.characters = this.malSeries.characters;
    this.classification = this.malSeries.classification;
    this.genres = this.malSeries.genres;
    this.imageUrl = this.malSeries.image;
    this.staff = this.malSeries.staff;
    this.studios = this.malSeries.studios;
    this.synopsis = this.malSeries.synopsis;
    this.type = this.malSeries.type;
    this.episodeCount = this.aniDbEpisodes.length;

    this.getProviderData();
  }

  getMalData() {
    const cacheFile = 'cache/mal-' + this.malId + '.json';

    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      const mtime = new Date(util.inspect(stat.mtime));
      const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
      if (mtime > yesterday) {
        const cacheObject = require('../' + cacheFile);
        this.malSeries = cacheObject.malSeries;
        this.aniDbEpisodes = cacheObject.aniDbEpisodes;
        return;
      }
    }

    console.log('Fetching series from MAL with ID ' + this.malId);

    let done = false;
    const self = this;

    MyAnimeList.fromId(this.malId).then(function (malSeries) {
      self.malSeries = malSeries;

      malSeries.getEpisodes().then(_malEpisodes => {
        self.aniDbEpisodes = [];
        async.eachSeries(_malEpisodes, (_malEpisode, next) => {
          _malEpisode.getInformation().then(malEpisode => {
            self.aniDbEpisodes.push(malEpisode);
            next();
          });
        }, () => {
          const cacheObject = {malSeries: self.malSeries, malEpisodes: self.aniDbEpisodes};
          //noinspection ES6ModulesDependencies,NodeModulesDependencies
          fs.writeFileSync(cacheFile, JSON.stringify(cacheObject));
          done = true;
        });
      });
    });

    // Wait to be done
    deasync.loopWhile(() => !done);
  }

  getAniDbData() {
    const cacheFile = 'cache/anidb-' + this.aniDbId + '.json';
    const cache = {};
    let done = false;

    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      const mtime = new Date(util.inspect(stat.mtime));
      const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
      if (mtime > yesterday) {
        cache.result = require('../' + cacheFile);
        done = true;
      }
    }

    if (!done) {
      console.log('Fetching series from AniDB with ID ' + this.aniDbId);

      const aniDbUrl = 'http://api.anidb.net:9001/httpapi?request=anime&client=animdl&clientver=1&protover=1&aid=' +
        this.aniDbId;
      request({uri: aniDbUrl, gzip: true}, (error, response, body) => {
        parseString(body, function (error, result) {
          cache.result = result;
          //noinspection ES6ModulesDependencies,NodeModulesDependencies
          fs.writeFileSync(cacheFile, JSON.stringify(result));
          done = true;
        });
      });
    }

    // Wait to be done
    deasync.loopWhile(() => !done);

    //noinspection JSUnresolvedVariable
    this.aniDbAnime = cache.result.anime;
    //noinspection JSUnresolvedVariable
    this.aniDbEpisodes = cache.result.anime.episodes[0].episode;
  }

  getProviderData() {
    let done;
    const self = this;

    this.providerEpisodeRanges.forEach(function (providerEpisodeRange) {
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

        done = false;

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

            self.episodes.push(new Episode(
              self,
              aniDbEpisode,
              null,
              provider,
              providerEpisode,
              isSpecial,
              providerEpisodeRange.format,
              providerEpisode.number
            ));
          }

          done = true;
        });
      }

      // Wait to be done
      deasync.loopWhile(() => !done);
    });

    /* this.provider.getEpisodes(this, (providerEpisodeRanges) => {
     self.episodes = [];
     for (var i = 0; i < providerEpisodeRanges.length; i++) {
     var providerEpisode = providerEpisodeRanges[i];
     var aniDbEpisode = null;
     for (var j = 0; j < this.aniDbEpisodes.length; j++) {
     //noinspection JSUnresolvedVariable
     var episodeNumber = this.aniDbEpisodes[j].epno[0]['_'];
     if (episodeNumber == providerEpisode.number) {
     aniDbEpisode = this.aniDbEpisodes[j];
     break;
     }
     }
     self.episodes.push(new Episode(this, aniDbEpisode, providerEpisode, providerEpisode.number));
     }
     done = true;
     }); */
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
