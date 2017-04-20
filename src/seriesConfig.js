const constants = require('./constants.js');

const EpisodeConfig = require('./episodeConfig.js');
const ProviderSeries = require('./providerConfig.js');
const ProviderConfigList = require('./providerConfigList.js');

class SeriesConfig {
  /**
   * @param {int} aniDbId
   * @param {string} aniDbStart
   * @param {ProviderConfigList} providerSeriesList
   * @param {string} title
   * @param {EpisodeConfig[]} episodes
   */
  constructor(aniDbId, aniDbStart, providerSeriesList, title, episodes) {
    this.aniDbId = aniDbId;
    this.aniDbStart = aniDbStart;
    this.providerSeriesList = providerSeriesList;
    this.title = title;
    this.episodes = episodes;
  }

  /**
   * @param {DataSeries} data
   * @return {SeriesConfig}
   */
  static fromData(data) {
    const aniDbStart = typeof data.aniDbStart !== 'undefined' ? data.aniDbStart : '1';
    const providerSeriesList = new ProviderConfigList(null, null);
    const title = typeof data.title !== 'undefined' ? data.title : null;
    const episodes = typeof data.episodes !== 'undefined' ? data.episodes.map(EpisodeConfig.fromData) : null;

    if (typeof data[constants.FORMAT_SUB] !== 'undefined') {
      providerSeriesList[constants.FORMAT_SUB] =
        ProviderSeries.fromData(data[constants.FORMAT_SUB], constants.FORMAT_SUB);
    }

    if (typeof data[constants.FORMAT_DUB] !== 'undefined') {
      providerSeriesList[constants.FORMAT_DUB] =
        ProviderSeries.fromData(data[constants.FORMAT_DUB], constants.FORMAT_DUB);
    }

    return new SeriesConfig(data.aniDbId, aniDbStart, providerSeriesList, title, episodes);
  }
}

module.exports = SeriesConfig;
