'use strict';

class AnimeConfig {

  constructor(id, aniDbId, kissanimeTitle, providerEpisodes) {
    this.aniDbId = aniDbId;
    this.kissanimeTitle = kissanimeTitle;
    this.providerEpisodeRanges = providerEpisodes;
    this.malId = id;
  }

}