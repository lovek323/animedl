var Episode = require('./episode.js');
var MyAnimeList = require('malapi').Anime;

var async = require('async');
var deasync = require('deasync');
var fs = require('fs');
var providers = require('./providers.js');
var util = require('util');

class Anime {

  /**
   * @param {AnimeConfig} config
   */
  constructor(config) {
    this.id = config.id;

    var providerName;

    if (typeof config.provider === 'undefined') {
      providerName = '9anime.to';
      this.provider = providers['9anime.to'];
    } else {
      providerName = config.provider;
      this.provider = providers[config.provider];

      if (typeof this.provider === 'undefined') {
        throw new Error('Unrecognised provider: ' + config.provider);
      }
    }

    switch (providerName) {
      case '9anime.to':
        this.providerTitle = config._9AnimeTitle;
        break;

      case 'kissanime.to':
        this.providerTitle = config.kissanimeTitle;
        break;

      default:
    }

    this.getMalData();

    var match = this.malSeries.aired.match(/^((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [0-9]+, [0-9]{4})/);
    if (match !== null) {
      this.aired = new Date(match[1]).toISOString();
    } else {
      this.aired = null;
    }

    this.characters = this.malSeries.characters;
    this.classification = this.malSeries.classification;
    this.genres = this.malSeries.genres;
    this.imageUrl = this.malSeries.image;
    this.staff = this.malSeries.staff;
    this.studios = this.malSeries.studios;
    this.synopsis = this.malSeries.synopsis;
    this.type = this.malSeries.type;
    this.episodeCount = this.malSeries.episodes;

    this.getProviderData();
  }

  getMalData() {
    var cacheFile = "cache/" + this.id + ".json";

    if (fs.existsSync(cacheFile)) {
      var stat = fs.statSync(cacheFile);
      var mtime = new Date(util.inspect(stat.mtime));
      var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
      if (mtime > yesterday) {
        var cacheObject = require('../' + cacheFile);
        this.malSeries = cacheObject.malSeries;
        this.malEpisodes = cacheObject.malEpisodes;
        return;
      }
    }

    console.log('Fetching series from MAL with ID ' + this.id);

    var done = false;
    var self = this;
    MyAnimeList.fromId(this.id).then(function (malSeries) {
      self.malSeries = malSeries;

      malSeries.getEpisodes().then(_malEpisodes => {
        self.malEpisodes = [];
        async.eachSeries(_malEpisodes, (_malEpisode, next) => {
          _malEpisode.getInformation().then(malEpisode => {
            self.malEpisodes.push(malEpisode);
            next();
          });
        }, () => {
          var cacheFile = "cache/" + self.id + ".json";
          var cacheObject = {malSeries: self.malSeries, malEpisodes: self.malEpisodes};
          fs.writeFileSync(cacheFile, JSON.stringify(cacheObject));
          done = true;
        });
      });
    });

    // Wait to be done
    deasync.loopWhile(() => !done);
  }

  getProviderData() {
    var done = false;
    var self = this;
    this.provider.getEpisodes(this, (providerEpisodes) => {
      self.episodes = [];
      for (var i = 0; i < providerEpisodes.length; i++) {
        var providerEpisode = providerEpisodes[i];
        var malEpisode = null;
        for (var j = 0; j < this.malEpisodes.length; j++) {
          if (this.malEpisodes[j].number == providerEpisode.number) {
            malEpisode = this.malEpisodes[j];
            break;
          }
        }
        self.episodes.push(new Episode(this, malEpisode, providerEpisode, providerEpisode.number));
      }
      done = true;
    });

    // Wait to be done
    deasync.loopWhile(() => !done);
  }

  isMovie() {
    return this.malSeries.episodes === '1';
  }

  getTitle() {
    var title = this.malSeries.title;
    if (this.malSeries.alternativeTitles.english === null) {
      return title;
    }
    var englishTitle = this.malSeries.alternativeTitles.english[0];
    if (englishTitle.toLowerCase() === title.toLowerCase()) {
      return title;
    }
    return englishTitle + ' (' + title + ')';
  }

}

module.exports = Anime;
