'use strict';

// Loads .env once and exposes a single, validated config object so the rest of
// the app never reads process.env directly.
require('dotenv').config();

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toList(value, fallback) {
  if (!value) return fallback;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = {
  port: toInt(process.env.PORT, 5000),

  // Origins allowed to talk to this server from a browser.
  clientOrigins: toList(process.env.CLIENT_ORIGIN, [
    'http://localhost:3000',
    'http://localhost:5173',
  ]),

  ml: {
    baseUrl: (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, ''),
    timeout: toInt(process.env.ML_SERVICE_TIMEOUT, 30000),
  },

  db: {
    url: process.env.DATABASE_URL || '',
    host: process.env.PGHOST || 'localhost',
    port: toInt(process.env.PGPORT, 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    name: process.env.PGDATABASE || 'drug_interactions',
    logging: String(process.env.DB_LOGGING).toLowerCase() === 'true',
    // Supabase (and most hosted Postgres) require SSL. Defaults to true unless
    // explicitly disabled, e.g. DB_SSL=false for a plain local Postgres.
    ssl: String(process.env.DB_SSL ?? 'true').toLowerCase() === 'true',
  },
};

module.exports = config;
