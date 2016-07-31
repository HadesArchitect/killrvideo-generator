import * as RefreshSourceOptions from './refresh';
import { withRetries, logger } from 'killrvideo-nodejs-common';
import Promise from 'bluebird';

// Tags that might apply to more than one YouTube source
const globalTags = [
  'asp.net', '.net', 'windows 10', 'c#', 'machine learning', 'big data', 'tutorial', 'beginner', 'mvc', 'roslyn', 'docker', 
  'internet of things', 'time series', 'data model'
];

function createSource(sourceId, tags, refreshAsync) {
  // Combine the tags provided with the global tags to come up with a final list
  Array.prototype.push.apply(tags, globalTags);
  
  // Return the object
  return { sourceId, tags, refreshAsync };
}

function createChannelSource(sourceId, channelId, tags) {
  const refresh = RefreshSourceOptions.refreshChannelAsync.bind(undefined, sourceId, channelId);
  return createSource(sourceId, tags, refresh);
}

function createKeywordSearchSource(sourceId, searchTerms, tags) {
  const refresh = RefreshSourceOptions.refreshKeywordSearchAsync.bind(undefined, sourceId, searchTerms);
  return createSource(sourceId, tags, refresh);
}

function createPlaylistSource(sourceId, playlistId, tags) {
  const refresh = RefreshSourceOptions.refreshPlaylistAsync.bind(undefined, sourceId, playlistId);
  return createSource(sourceId, tags, refresh);
}

/**
 * All the available YouTube video sources.
 */
export const YouTubeVideoSources = {
  // Tech-related sources
  PLANET_CASSANDRA: createChannelSource('PLANET_CASSANDRA', 'UCvP-AXuCr-naAeEccCfKwUA', [ 'cassandra', 'database', 'nosql' ]),
  DATASTAX_MEDIA: createChannelSource('DATASTAX_MEDIA', 'UCqA6zOSMpQ55vvguq4Y0jAg', [ 'datastax', 'cassandra', 'database', 'nosql' ]),
  MICROSOFT_AZURE: createChannelSource('MICROSOFT_AZURE', 'UC0m-80FnNY2Qb7obvTL_2fA', [ 'microsoft', 'azure', 'cloud', 'windows', 'linux' ]),
  MICROSOFT_CLOUD_PLATFORM: createChannelSource('MICROSOFT_CLOUD_PLATFORM', 'UCSgzRJMqIiCNtoM6Q7Q9Lqw', [ 'microsoft', 'azure', 'cloud', 'windows', 'linux' ]),
  HANSELMAN: createChannelSource('HANSELMAN', 'UCL-fHOdarou-CR2XUmK48Og', [ 'microsoft', 'windows', 'linux', 'azure' ]),
  CASSANDRA_DATABASE: createKeywordSearchSource('CASSANDRA_DATABASE', 'cassandra database', [ 'cassandra', 'database', 'nosql' ]),

  // Random sources
  FUNNY_CAT_VIDEOS: createKeywordSearchSource('FUNNY_CAT_VIDEOS', 'funny cat videos', [ 'cat', 'funny' ]),
  GRUMPY_CAT: createChannelSource('GRUMPY_CAT', 'UCTzVrd9ExsI3Zgnlh3_btLg', [ 'grumpy cat', 'funny' ]),
  MOVIE_TRAILERS: createChannelSource('MOVIE_TRAILERS', 'UCi8e0iOVk1fEOogdfu4YgfA', [ 'movie', 'trailer', 'preview' ]),
  SNL: createChannelSource('SNL', 'UCqFzWxSCi39LnW1JKFR3efg', [ 'snl', 'saturday night live', 'comedy' ]),
  KEY_AND_PEELE: createPlaylistSource('KEY_AND_PEELE', 'PL83DDC2327BEB616D', [ 'key and peele', 'comedy' ])
};

/**
 * Refresh all the available YouTube video sources.
 */
export async function refreshAllSourcesAsync() {
  let promises = Object.keys(YouTubeVideoSources).map(sourceName => {
    logger.log('verbose', `Refreshing YouTube source ${sourceName}`);
    
    let source = YouTubeVideoSources[sourceName];
    return withRetries(source.refreshAsync, 10, 2, `Error refreshing YouTube source ${sourceName}`, true);
  });

  try {
    await Promise.all(promises);
  } catch (err) {
    logger.log('error', 'At least one YouTube source failed to refresh', err);
  }
};