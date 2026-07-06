## 1. Environment configuration

- [x] 1.1 Create `.env.example` at repo root with `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `REDIS_PORT`, `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT` (with sensible defaults, e.g. 5432/6379/1025/8025)
- [x] 1.2 Add `.env` to root `.gitignore` if not already covered

## 2. Docker Compose services

- [x] 2.1 Create root `docker-compose.yml`
- [x] 2.2 Define `postgres` service using `postgres:16-alpine`, reading env vars for user/password/db/port, with a named volume for `/var/lib/postgresql/data`
- [x] 2.3 Define `redis` service using `redis:7-alpine`, exposing the configurable port
- [x] 2.4 Define `mailpit` service using `axllent/mailpit`, exposing both the SMTP port and web UI port

## 3. Verification

- [x] 3.1 Run `docker compose up` and confirm all three containers report healthy/running
- [x] 3.2 Connect to Postgres with a client (e.g. `psql` or a GUI) using the `.env` credentials to confirm it accepts connections
- [x] 3.3 Confirm Redis responds to `redis-cli ping` (or equivalent) with `PONG`
- [x] 3.4 Open the Mailpit web UI in a browser and confirm it loads
- [x] 3.5 Run `docker compose down` then `docker compose up` again and confirm Postgres data persisted
- [x] 3.6 Run `docker compose down -v` and confirm the Postgres volume is removed (fresh start on next `up`)
