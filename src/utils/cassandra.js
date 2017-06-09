import Promise from 'bluebird';
import config from 'config';
import { Client, types as CassandraTypes } from 'cassandra-driver';
import { logger } from './logging';
import { lookupServiceAsync } from './lookup-service';

//const dse = require('dse-driver');

/**
 * An array of CQL table strings to use for the schema.
 */
const schema = [
  // Keeps track of sample users added
  `
  CREATE TABLE IF NOT EXISTS users (
    userid uuid,
    PRIMARY KEY(userid)
  );`,

  // Keeps track of sample videos added
  `
  CREATE TABLE IF NOT EXISTS videos (
    videoid uuid,
    PRIMARY KEY (videoid)
  );`,

  // Keeps track of the available YouTube videos
  `
  CREATE TABLE IF NOT EXISTS youtube_videos (
    sourceid text,
    published_at timestamp,
    youtube_video_id text,
    name text,
    description text,
    used boolean,
    PRIMARY KEY (sourceid, published_at, youtube_video_id)
  ) WITH CLUSTERING ORDER BY (published_at DESC, youtube_video_id ASC);`
];

// Get cassandra configuration options
function getCassandraConfig() {
  const { keyspace, replication } = config.get('cassandra');
  return { keyspace, replication };
}

// Client promises by keyspace
const clientPromises = new Map();

/**
 * Gets a Cassandra client instance that is connected to the specified keyspace.
 */
export function getCassandraClientAsync(keyspace) {
  if (clientPromises.has(keyspace)) {
    return clientPromises.get(keyspace);
  }
    
  const promise = lookupServiceAsync('cassandra')
    .then(contactPoints => {
      let clientOpts = {
        contactPoints,
        //authProvider: new dse.auth.DsePlainTextAuthProvider("cassandra", "cassandra"), 
        queryOptions: { 
          prepare: true,
          consistency: CassandraTypes.consistencies.localQuorum
        }
      };
      
      if (keyspace) {
        clientOpts.keyspace = keyspace;
      }
      
      // Create a client and promisify it
      let client = new Client(clientOpts);
      client = Promise.promisifyAll(client);
      
      // Connect and return the connected client
      return client.connectAsync().return(client);
    })
    .catch(err => {
      clientPromises.delete(keyspace);
      throw err;
    });
  
  clientPromises.set(keyspace, promise);
  return promise;
};

/**
 * Creates a keyspace in Cassandra if it doesn't already exist. Pass the name of the keyspace and the
 * string to be used as the REPLICATION setting (i.e. after WITH REPLIACTION = ...).
 */
function createKeyspaceIfNotExistsAsync(keyspace, replication) {
  // Create CQL
  const cql = `CREATE KEYSPACE IF NOT EXISTS ${keyspace} WITH REPLICATION = ${replication}`;
  
  // Get a client, then create the keyspace
  return getCassandraClientAsync().then(client => client.executeAsync(cql));
};

/**
 * Create the tables if they don't already exist.
 */
function createTablesAsync(client) {
  // Run each CQL statement in the schema array one at a time and then return the client
  return Promise.mapSeries(schema, cql => client.executeAsync(cql)).return(client);
}

// Singleton client instance for app
let clientInstance = null;

/**
 * Get a Cassandra client instance.
 */
export function getCassandraClient() {
  if (clientInstance == null) {
    throw new Error('No client instance found. Did you forget to call initCassandraAsync?');
  }
  return clientInstance;
};

/**
 * Initializes the Cassandra keyspace and schema needed.
 */
export async function initCassandraAsync() {
  // Create keyspace
  let config = getCassandraConfig();
  await createKeyspaceIfNotExistsAsync(config.keyspace, config.replication);

  // Create tables
  let client = await getCassandraClientAsync(config.keyspace);
  await createTablesAsync(client);

  // Save client instance
  clientInstance = client;
};