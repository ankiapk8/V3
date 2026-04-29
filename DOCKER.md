# Run locally with Docker / VS Code

The project is a pnpm monorepo with a React + Vite frontend (`artifacts/anki-generator`) and an Express API (`artifacts/api-server`) backed by PostgreSQL. You can run it three ways.

---

## 1. One command with Docker Compose (easiest)

Requirements: Docker Desktop (or any recent Docker engine with `docker compose`).

```bash
cp .env.example .env          # then edit .env and set your OpenAI key
docker compose up --build
```

Then open <http://localhost:5000>.

What you get:
- `postgres` — PostgreSQL 16 with a persistent volume (`postgres_data`).
- `api` — the Express API at `http://localhost:8080/api` (also reachable inside the network as `http://api:8080`).
- `web` — Nginx serving the built React app on port `5000` and reverse-proxying `/api/*` to the API.

The API auto-creates / migrates its tables on startup (`ensureDatabaseSchema`), so you don't need to run any migration step manually.

To stop everything:

```bash
docker compose down            # keep data
docker compose down -v         # also wipe the postgres volume
```

---

## 2. Open in VS Code and run with Docker

1. Install the **Dev Containers** or **Docker** VS Code extension (optional but nice).
2. Open the repo folder in VS Code.
3. `Cmd/Ctrl+Shift+P` → **Tasks: Run Task** → **dev: all (docker)**.
4. Open <http://localhost:5000>.

The provided VS Code tasks live in `.vscode/tasks.json`.

---

## 3. Open in VS Code and run natively (no Docker)

Requirements: Node.js 24, pnpm 9+, a running PostgreSQL.

```bash
pnpm install

# in one terminal — start the API
PORT=8080 \
DATABASE_URL=postgres://anki:anki@localhost:5432/anki \
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1 \
AI_INTEGRATIONS_OPENAI_API_KEY=sk-... \
pnpm --filter @workspace/api-server run dev

# in another terminal — start the web app
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/anki-generator run dev
```

Open <http://localhost:5000>. The Vite dev server proxies nothing by itself — when running outside Docker, point your browser at the API directly or run nginx/another reverse proxy in front. The simplest dev setup is to keep using Docker Compose for `postgres` and `api` and only run `web` natively.

A `Debug API server` launch configuration is included in `.vscode/launch.json` for setting breakpoints on the API.

---

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. Compose sets this automatically. |
| `PORT` | yes | Port the service binds to. |
| `BASE_PATH` | yes (web) | Vite base path. Use `/` when serving from the root. |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | yes | `https://api.openai.com/v1` for plain OpenAI. |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | yes | Your OpenAI key (or Replit-provisioned key). |
