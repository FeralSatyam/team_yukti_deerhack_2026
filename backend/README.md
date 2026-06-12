# Drug Interaction Orchestrator (Node/Express)

A local orchestration + caching proxy layer that sits between the React frontend
and the internal Python FastAPI ML microservice (`http://localhost:8000`).

It does **no** machine learning. Its jobs are:

- **Routing** requests from the React client to the Python service.
- **Caching** heavy ML evaluations in PostgreSQL keyed by a deterministic hash
  of the (alphabetized) drug list, so identical requests never re-run the model.
- **Logging** every prediction request for a search-history / audit trail.
- **Graceful degradation** when the Python service is unreachable or errors.

## Stack

- Express 4 + CORS + morgan
- Supabase (PostgreSQL) via Sequelize (`pg`)
- axios for the upstream microservice calls

## Project layout

```
src/
  server.js                 # entry point: DB init, cache warm-up, listen
  app.js                    # express app, middleware, route mounting
  config/
    env.js                  # validated config from .env
    database.js             # shared Sequelize instance
  models/
    index.js                # registers models + initDatabase()
    InteractionCache.js     # hash -> cached ML result
    SearchLog.js            # audit trail of every request
  services/
    mlService.js            # axios client for the FastAPI microservice
    drugCatalog.js          # in-memory cache of the global drug list
    interactionService.js   # hash/cache-check orchestration + logging
  controllers/
    drugsController.js
    predictController.js
  routes/index.js           # /api routes + /health
  middleware/errorHandler.js
  utils/
    hash.js                 # normalize -> alphabetize -> MD5
    ApiError.js
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Provision a [Supabase](https://supabase.com) project. The `postgres` database
   already exists — no manual `CREATE DATABASE` is needed. Grab the connection
   string from **Project Settings > Database** (Connection pooling / Transaction,
   port 6543 is recommended).

3. Configure environment — copy and edit:

   ```bash
   cp .env.example .env
   ```

   Key vars: `DATABASE_URL` (or `PG*`), `DB_SSL` (true for Supabase),
   `ML_SERVICE_URL`, `CLIENT_ORIGIN`, `PORT`.

4. Run:

   ```bash
   npm run dev    # auto-restart on changes
   # or
   npm start
   ```

   Tables are created/updated automatically on startup (`sequelize.sync`).

## API

### `GET /api/drugs`
Returns the complete list of searchable drugs. Pulled from the microservice
once and cached in memory. Force a refresh with `?refresh=true`.

```json
{ "source": "cache+microservice", "drugs": [ ... ] }
```

### `POST /api/predict`
Body:
```json
{ "drugs": ["Warfarin", "Aspirin"] }
```

Flow: the list is normalized → de-duplicated → alphabetized → MD5-hashed. If the
hash exists in PostgreSQL, the cached result is returned instantly
(`cacheHit: true`). Otherwise the microservice is called, the result is stored,
and returned (`cacheHit: false`).

```json
{ "cacheHit": false, "hash": "…", "drugs": ["aspirin","warfarin"], "result": { ... } }
```

### `GET /api/history?limit=50`
Recent prediction requests (search history / audit log).

### `GET /api/health`
Reports server uptime, DB connectivity, and whether the drug catalog is loaded.

## Expected microservice contract

This server assumes the Python FastAPI service exposes:

- `GET  /drugs`   → JSON list (or object) of known drugs
- `POST /predict` → accepts `{ "drugs": [...] }`, returns the interaction result JSON

If the microservice is down, `/api/predict` returns `503`/`502` with a clear
message and the request is still recorded in the search log as an error.
