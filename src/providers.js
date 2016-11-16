const Episode = require('./episode.js');
const ProgressBar = require('progress');

const async = require('async');
const cheerio = require('cheerio');
const debug = require('debug')('animedl');
const debugTrace = require('debug')('animedl-trace');
const exec = require('child_process').exec;
const fs = require('fs');
const numeral = require('numeral');
const progress = require('request-progress');
const shellescape = require('shell-escape');
const syncrequest = require('sync-request');
const request = require('request');
const utils = require('./utils.js');

class Provider {
  /**
   * @param {Anime} anime
   * @param providerId
   * @param callback
   */
  getEpisodes(anime, providerId, callback) {
    callback([]);
  }

  /**
   * @param {Anime} anime
   * @param {Episode} episode
   * @param callback
   */
  downloadEpisode(anime, episode, callback) {
    if (episode.fileExists()) {
      // this.writeMetadata(anime, episode, episode.getActualFilename(), callback);
      callback();
      return;
    }

    const finalFilename = episode.getFinalFilename();
    const jpgFilename = utils.getTemporaryFilename(anime, episode, 'jpg');

    episode.providerEpisode.getVideo(video => {
      if (anime.isMovie()) {
        console.log('Downloading ' + anime.getTitle() + ' (' + video.resolution + 'p) to ' + finalFilename);
      } else {
        console.log('Downloading ' + anime.getTitle() + ' - ' + episode.number + ' - ' + episode.name + ' (' +
          video.resolution + 'p) to ' + finalFilename);
      }

      if (!fs.existsSync(jpgFilename)) {
        //noinspection JSUnresolvedFunction
        const response = syncrequest('GET', anime.imageUrl);
        //noinspection JSUnresolvedVariable
        const contentLength = parseInt(response.headers['content-length']);
        fs.writeFileSync(jpgFilename, response.body, 'binary');
        const stat = fs.statSync(jpgFilename);
        if (stat.size != contentLength) {
          throw new Error('Could not download JPG');
        }
      }

      this.downloadAndWriteMetadata(anime, episode, video, callback);
    });
  }

  /**
   * @param {Anime} anime
   * @param {Episode} episode
   * @param video
   * @param callback
   */
  downloadAndWriteMetadata(anime, episode, video, callback) {
    var temporaryMp4Filename = utils.getTemporaryFilename(anime, episode, 'mp4');
    if (!fs.existsSync(temporaryMp4Filename)) {
      this.downloadVideo(anime, episode, video, callback);
    } else {
      this.writeMetadata(anime, episode, temporaryMp4Filename, () => {
          fs.renameSync(temporaryMp4Filename, episode.getFinalFilename());
          callback();
        }
      );
    }
  }

  downloadVideo(anime, episode, video, callback) {
    //noinspection JSUnresolvedFunction
    var bar = new ProgressBar(
      '[:bar] :bytesTransferred/:bytesTotal :percent :speed/s :remainingTime remaining',
      {
        bytesTransferred: '',
        bytesTotal: '',
        remainingTime: '',
        speed: '',
        total: 100
      }
    );

    var self = this;
    var temporaryFilename = utils.getTemporaryFilename(anime, episode, 'mp4');
    var mp4File = fs.createWriteStream(temporaryFilename);
    mp4File.on('finish', () => {
      if (bar.curr < 90) {
        fs.unlinkSync(temporaryFilename);
        debug('Could not download file. Waiting 5 seconds to try again.');
        setTimeout(() => self.downloadVideo(anime, episode, video, callback), 5000);
        return;
      } else {
        console.log('');
      }
      self.writeMetadata(anime, episode, temporaryFilename, () => {
        fs.renameSync(temporaryFilename, episode.getFinalFilename());
        callback();
      });
    });

    //noinspection JSUnresolvedFunction
    progress(request({url: video.url, method: 'GET', followAllRedirects: true}))
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
   * @param {Anime} anime
   * @param {Episode} episode
   * @param filename
   * @param callback
   */
  writeMetadata(anime, episode, filename, callback) {
    var synopsis = episode.synopsis;
    var genre = anime.genres[0];
    var contentRating = '';

    //noinspection JSUnresolvedVariable
    switch (anime.classification) {
      case 'G - All Ages':
        contentRating = 'G';
        break;
      case 'PG-13 - Teens 13 or older':
        contentRating = 'PG-13';
        break;
      case 'R - 17+ (violence & profanity)':
      case 'R+ - Mild Nudity':
        contentRating = 'R';
        break;
      case 'None':
        contentRating = null;
        break;
      default:
        //noinspection JSUnresolvedVariable
        throw new Error('Unrecognised classification: ' + anime.classification);
    }

    const jpgFilename = utils.getTemporaryFilename(anime, episode, 'jpg');

    var args = [
      'AtomicParsley',
      filename,
      '--overWrite',
      '--genre',
      genre,
      '--longdesc',
      synopsis,
      '--storedesc',
      anime.synopsis,
      '--grouping',
      anime.type
    ];

    if (fs.existsSync(jpgFilename)) {
      args.push('--artwork');
      args.push(jpgFilename);
    }

    if (contentRating !== null) {
      args.push('--contentRating');
      args.push(contentRating);
    }

    if (episode.aired !== null) {
      args.push('--year');
      args.push(episode.aired);
    }

    if (anime.isMovie()) {
      args = args.concat([
        '--stik',
        'Movie',
        '--title',
        anime.getTitle(),
      ]);
    } else {
      // Treat this as a TV series
      args = args.concat([
        '--stik',
        'TV Show',
        '--title',
        episode.name,
        '--tracknum',
        episode.number + '/' + anime.episodeCount,
        '--TVShowName',
        anime.getTitle(),
        '--TVEpisodeNum',
        episode.number,
      ]);
    }

    debugTrace(args);

    exec(shellescape(args), (error, stdout, stderr) => {
      if (error) {
        if (stderr.includes('could not be loaded')) {
          fs.unlinkSync(jpgFilename);
          console.log(jpgFilename + ' is not a valid JPEG');
          process.exit(1);
          return;
        }
        if (stdout.includes('APar_readX read failed')) {
          fs.unlinkSync(filename);
          console.log(jpgFilename + ' is not a valid MP4');
          process.exit(1);
          return;
        }
        process.stdout.write(error + "\n");
        process.stdout.write(stdout + "\n");
        process.stdout.write(stderr + "\n");
        process.exit(1);
        return;
      }

      args = ['perl', 'iTunMOVI-1.1.pl'];
      anime.characters.forEach(character => {
        if (character.actor === '' || character.language !== 'Japanese') {
          // We are adding actors, not characters and Japanese voice actors not English dub actors
          return;
        }
        var match = character.actor.match(/(.*), (.*)/);
        var actor;
        if (match === null) {
          actor = character.actor;
        } else {
          actor = match[2] + ' ' + match[1];
        }
        args.push('--cast');
        args.push(actor);
      });
      anime.staff.forEach(staff => {
        var match = staff.name.match(/(.*), (.*)/);
        var name;
        if (match === null) {
          // Handle single names like 'nano'
          name = staff.name;
        } else {
          name = match[2] + ' ' + match[1];
        }
        staff.role.forEach(role => {
          switch (role) {
            case 'Assistant Producer':
            case 'Producer':
            case 'Executive Producer':
              args.push('--producers');
              args.push(name);
              break;
            case 'Director':
              args.push('--directors');
              args.push(name);
              break;
            case 'Screenplay':
            case 'Script':
            case 'Storyboard':
              args.push('--screenwriters');
              args.push(name);
              break;
            case 'ADR Director':
            case 'Animation Director':
            case 'Chief Animation Director':
            case 'Episode Director':
            case 'Sound Director':
              args.push('--codirectors');
              args.push(name);
              break;
            case '2nd Key Animation':
            case 'Background Art':
            case 'Character Design':
            case 'Key Animation':
            case 'Music':
            case 'Series Composition':
            case 'Original Character Design':
            case 'Original Creator':
            case 'Theme Song Arrangement':
            case 'Theme Song Composition':
            case 'Theme Song Lyrics':
            case 'Theme Song Performance':
              // Ignore these roles, they don't fit
              break;
            default:
              throw new Error('Unrecognised staff role: ' + role);
          }
        });
      });
      anime.studios.forEach(studio => {
        args.push('--studio');
        args.push(studio);
      });
      args.push('--file');
      args.push(filename);
      args.push('--write');

      debugTrace(args);
      exec(shellescape(args), error => {
        if (error) {
          process.stdout.write(error + "\n");
          process.exit(4);
          return;
        }
        callback();
      });
    });
  }

}

class ProviderEpisode {
  constructor(number) {
    this.number = number;
  }

  getVideo() {
  }
}

class _9AnimeProvider extends Provider {

  /**
   * @param {Anime} anime
   * @param providerId
   * @param callback
   */
  getEpisodes(anime, providerId, callback) {
    var episodes = [];

    console.log('Fetching series from 9anime.to: ' + anime.getTitle());

    utils.cachedRequest('http://9anime.to/watch/_.' + providerId, (error, response, body) => {
      var $ = cheerio.load(body);
      var _9AnimeEpisodes = {};
      $("ul.episodes a").each((index, element) => {
        var id = $(element).data("id");
        var name = $(element).text();
        if (typeof _9AnimeEpisodes[name] === 'undefined') {
          _9AnimeEpisodes[name] = [];
        }
        _9AnimeEpisodes[name].push(id);
      });

      async.eachSeries(Object.keys(_9AnimeEpisodes), (_9AnimeEpisode, nextEpisode) => {
        var _9AnimeEpisodeId = _9AnimeEpisodes[_9AnimeEpisode][0];
        var _9AnimeEpisodeNumberMatch = _9AnimeEpisode.match(/^([0-9]+)/);
        var _9AnimeEpisodeNumber = 0;

        if (_9AnimeEpisodeNumberMatch !== null) {
          _9AnimeEpisodeNumber = parseInt(_9AnimeEpisodeNumberMatch[0]);
        }

        debugTrace('Processing 9anime.to episode ' + _9AnimeEpisodeNumber);

        /* if (new Episode(anime, null, _9AnimeEpisode, _9AnimeEpisodeNumber).fileExists()) {
         if (anime.isMovie()) {
         debug('Skipping ' + this.anime.getTitle());
         } else {
         debug('Skipping _9AnimeEpisode ' + _9AnimeEpisodeNumber);
         }
         nextEpisode();
         return;
         } */

        var url = 'http://9anime.to/ajax/episode/info?id=' + _9AnimeEpisodeId + '&update=1&film=' + providerId;
        episodes.push(new _9AnimeProviderEpisode(_9AnimeEpisodeNumber, _9AnimeEpisodeId, url));
        nextEpisode();
      }, () => callback(episodes));
    }

    );
  };

}

class _9AnimeProviderEpisode extends ProviderEpisode {

  constructor(number, id, url) {
    super(number);

    this.malId = id;
    this.url = url;
    this.video = null;
  }

  getVideo(callback) {
    if (this.video !== null) {
      callback(this.video);
      return;
    }

    var self = this;
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
        var grabberUrl = body.grabber + '?malId=' + this.malId + '&token=' + encodeURIComponent(body.params.token) +
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

            var bestLink = null;
            var bestResolution = 0;

            for (var k = 0; k < body.data.length; k++) {
              var video = body.data[k];
              var resolution = 0;
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

            self.video = {url: bestLink, resolution: bestResolution};
            callback(self.video);
          }
        );
      }
    );
  }

}

class KissanimeProvider extends Provider {
}

module.exports = {"9anime.to": new _9AnimeProvider(), "kissanime.to": new KissanimeProvider()};
