'use strict';

const { Sequelize } = require('sequelize');
const config = require('./env');

// Supabase terminates TLS but uses certificates that aren't in the default CA
// bundle (especially via the connection pooler), so disable strict verification.
const dialectOptions = config.db.ssl
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

// A single shared Sequelize instance for the whole app. Prefer a full
// connection string (DATABASE_URL) when present, otherwise assemble from parts.
const sequelize = config.db.url
  ? new Sequelize(config.db.url, {
      dialect: 'postgres',
      dialectOptions,
      logging: config.db.logging ? console.log : false,
    })
  : new Sequelize(config.db.name, config.db.user, config.db.password, {
      host: config.db.host,
      port: config.db.port,
      dialect: 'postgres',
      dialectOptions,
      logging: config.db.logging ? console.log : false,
    });

module.exports = sequelize;
