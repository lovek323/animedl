const constants = require('./constants.js');

class ProviderConfig {
  /**
   * @param {int} providerStart
   * @param {int} providerEnd
   * @param {string} provider
   * @param {string} providerId
   * @param {string} format
   */
  constructor(providerStart, providerEnd, provider, providerId, format) {
    this.providerStart = providerStart;
    this.providerEnd = providerEnd;
    this.name = provider;
    this.providerId = providerId;
    this.format = format;
  }

  /**
   * @param {object} data
   * @param {string} format
   * @return {ProviderConfig}
   */
  static fromData(data, format) {
    const providerStart = typeof data.providerStart !== 'undefined' ? data.providerStart : 1;
    const providerEnd = typeof data.providerEnd !== 'undefined' ? data.providerStart : null;
    const provider = typeof data.name !== 'undefined' ? data.name : constants.PROVIDER_9ANIME;
    const providerId = data.providerId;

    return new ProviderConfig(
      providerStart,
      providerEnd,
      provider,
      providerId,
      format
    );
  }
}

module.exports = ProviderConfig;
