const ProgressBar = require('progress');

const async = require('async');
const cheerio = require('cheerio');
const debug = require('debug')('animedl');
const debugTrace = require('debug')('animedl-trace');
const fs = require('fs');
const numeral = require('numeral');
const progress = require('request-progress');
const request = require('request');
const utils = require('./utils.js');

class Provider {
  /**
   * @param {Anime} anime
   * @param {SeriesConfig} seriesConfig
   * @param {ProviderConfig} providerConfig
   * @param callback
   */
  getEpisodes(anime, seriesConfig, providerConfig, callback) {
  }

  /**
   * @param {Anime} anime
   * @param {Episode} episode
   * @param callback
   */
  downloadEpisode(anime, episode, callback) {
    const finalFilename = episode.getFinalFilename();

    if (fs.existsSync(finalFilename)) {
      callback();
      return;
    }

    episode.providerEpisode.getVideo(video => {
      console.log('Downloading ' + anime.getTitle() + ' - ' + episode.number.number + ' - ' + episode.name + ' (' +
        video.resolution + 'p) to ' + finalFilename);

      this.downloadVideo(anime, episode, video, callback);
    });
  }

  downloadVideo(anime, episode, video, callback) {
    //noinspection JSUnresolvedFunction
    const bar = new ProgressBar(
      '[:bar] :bytesTransferred/:bytesTotal :percent :speed/s :remainingTime remaining',
      {
        bytesTransferred: '',
        bytesTotal: '',
        remainingTime: '',
        speed: '',
        total: 100
      }
    );

    const self = this;
    const temporaryFilename = utils.getTemporaryFilename(anime, episode, 'mp4');
    const mp4File = fs.createWriteStream(temporaryFilename);
    mp4File.on('finish', () => {
      if (bar.curr < 90) {
        fs.unlinkSync(temporaryFilename);
        debug('Could not download file. Waiting 5 seconds to try again.');
        setTimeout(() => self.downloadVideo(anime, episode, video, callback), 5000);
        return;
      } else {
        console.log('');
      }
      self.moveVideo(temporaryFilename, episode, callback);
    });

    //noinspection JSUnresolvedFunction
    progress(request({ url: video.url, method: 'GET', followAllRedirects: true }))
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
  }

  /**
   * @param {string} temporaryFilename
   * @param {Episode} episode
   * @param {function} callback
   */
  moveVideo(temporaryFilename, episode, callback) {
    const is = fs.createReadStream(temporaryFilename);
    const os = fs.createWriteStream(episode.getFinalFilename());
    is.pipe(os);
    is.on('end', () => fs.unlinkSync(temporaryFilename));
    callback();
  }
}

class ProviderEpisode {
  /**
   * @param {int} number
   * @param {int} start
   */
  constructor(number, start) {
    this.number = number - start + 1;
  }

  getVideo(callback) {
  }
}

class _9AnimeProvider extends Provider {
  /**
   * @param {Anime} anime
   * @param {SeriesConfig} seriesConfig
   * @param {ProviderConfig} providerConfig
   * @param callback
   */
  getEpisodes(anime, seriesConfig, providerConfig, callback) {
    const episodes = [];

    console.log('Fetching series from 9anime.to (' + providerConfig.providerId + '): ' + anime.getTitle());

    utils.cachedRequest('http://9anime.to/watch/_.' + providerConfig.providerId, (error, response, body) => {
        //noinspection JSUnresolvedFunction
        const $ = cheerio.load(body);
        const _9AnimeEpisodes = {};
        $('ul.episodes a').each((index, element) => {
          const id = $(element).data('id');
          const name = $(element).text();
          if (typeof _9AnimeEpisodes[name] === 'undefined') {
            _9AnimeEpisodes[name] = [];
          }
          _9AnimeEpisodes[name].push(id);
        });

        //noinspection JSUnresolvedFunction
        async.eachSeries(Object.keys(_9AnimeEpisodes), (_9AnimeEpisode, nextEpisode) => {
          const _9AnimeEpisodeId = _9AnimeEpisodes[_9AnimeEpisode][0];
          const _9AnimeEpisodeNumberMatch = _9AnimeEpisode.match(/^([0-9]+)/);
          let _9AnimeEpisodeNumber = 0;

          if (_9AnimeEpisodeNumberMatch !== null) {
            _9AnimeEpisodeNumber = parseInt(_9AnimeEpisodeNumberMatch[0]);
          }

          debugTrace('Processing 9anime.to episode ' + _9AnimeEpisodeNumber);

          const url = 'http://9anime.to/ajax/episode/info?id=' + _9AnimeEpisodeId + '&update=1&film='
            + providerConfig.providerId;
          episodes.push(
            new _9AnimeProviderEpisode(_9AnimeEpisodeNumber, providerConfig.providerStart, _9AnimeEpisodeId, url)
          );
          nextEpisode();
        }, () => {
          const sorted = [];
          for (let i = 0; i < episodes.length; i++) {
            sorted.push(episodes[i]);
          }
          sorted.sort(
            /**
             * @param {ProviderEpisode} episode1
             * @param {ProviderEpisode} episode2
             * @return int
             */
            (episode1, episode2) => {
              if (episode1.number < episode2.number) {
                return -1;
              }
              if (episode1.number > episode2.number) {
                return 1;
              }
              return 0;
            });
            callback(sorted);
        });
      }
    );
  };

}

class _9AnimeProviderEpisode extends ProviderEpisode {
  constructor(number, start, id, url) {
    super(number, start);

    this.malId = id;
    this.url = url;
    this.video = null;
  }

  getVideo(callback) {
    if (this.video !== null) {
      callback(this.video);
      return;
    }

    const self = this;
    request(
      this.url,
      (error, response, body) => {
        try {
          //noinspection ES6ModulesDependencies,NodeModulesDependencies
          body = JSON.parse(body);
        } catch (error) {
          if (body.includes('The web server reported a gateway time-out error.')) {
            debug('Gateway time-out error. Waiting 5 seconds.');
            setTimeout(() => self.getVideo(callback), 5000);
            return;
          }

          console.error(body);
          console.error(error);
          process.exit(1);
        }

        //noinspection JSUnresolvedVariable
        const grabberUrl = body.grabber + '?malId=' + this.malId + '&token=' + encodeURIComponent(body.params.token) +
          '&options=' + encodeURIComponent(body.params.options) + '&mobile=0';

        request(grabberUrl, (error, response, body) => {
            try {
              //noinspection ES6ModulesDependencies,NodeModulesDependencies
              body = JSON.parse(body);
            } catch (error) {
              if (body.includes('The web server reported a gateway time-out error.')) {
                debug('Gateway time-out error. Waiting 5 seconds.');
                setTimeout(() => self.getVideo(callback), 5000);
                return;
              }

              console.error(body);
              console.error(error);
              process.exit(1);
              return;
            }

            let bestLink = null;
            let bestResolution = 0;

            for (let k = 0; k < body.data.length; k++) {
              const video = body.data[k];
              let resolution = 0;
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

            self.video = { url: bestLink, resolution: bestResolution };
            callback(self.video);
          }
        );
      }
    );
  }
}

module.exports = { '9anime.to': new _9AnimeProvider() };
