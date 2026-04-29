# Deploy on Render.com

This project is preconfigured for Render via `render.yaml` (Blueprint).
It provisions:

- **`anki-postgres`** — PostgreSQL 16 (free plan)
- **`anki-api`** — API server (Docker, Starter plan)
- **`anki-web`** — Static React/Vite site (free plan)

## One-time setup

1. Push this repo to GitHub (e.g. `https://github.com/ankiapk8/V2`).
2. In Render, click **New → Blueprint** and pick the repo. Render reads `render.yaml`
   and creates all three resources at once.
   - If you instead created a regular **Web Service** (not Blueprint), the repo also
     ships a root-level `Dockerfile` that builds the API server, so the default
     "Dockerfile Path = `./Dockerfile`" works without any tweaking.
3. Fill in the secrets Render asks for:
   - `AI_INTEGRATIONS_OPENAI_API_KEY` — your OpenAI API key
     (works with any OpenAI-compatible endpoint; default base URL is `https://api.openai.com/v1`)
   - `CORS_ORIGIN` — paste the Render URL of `anki-web` once it's known
     (e.g. `https://anki-web.onrender.com`)
   - `VITE_API_BASE_URL` — paste the Render URL of `anki-api` followed by `/api`
     (e.g. `https://anki-api.onrender.com/api`)
4. Click **Apply**. First build takes ~10 minutes (the API image installs Cairo/Pango natives).

## How requests flow

```
Browser
  └─ https://anki-web.onrender.com   (static site, served by Render's CDN)
       └─ fetch(VITE_API_BASE_URL + "/...")
              └─ https://anki-api.onrender.com/api/...   (Docker web service)
                     └─ DATABASE_URL  →  anki-postgres
                     └─ AI_INTEGRATIONS_OPENAI_API_KEY  →  OpenAI
```

## Updating secrets later

In the Render dashboard, open the service → **Environment** tab → edit the variable →
**Save Changes** triggers a redeploy automatically.

## Local override (optional)

For local dev with `vite dev`, leave `VITE_API_BASE_URL` unset — `apiUrl()` falls back
to a same-origin `/api` request, which is what the Replit/Docker setups already use.

## Free-plan limitations

- The free PostgreSQL instance is **deleted after 30 days** unless upgraded.
- Free static sites sleep on inactivity but wake on request.
- The API service is on Starter ($7/mo) because Cairo/Pango won't fit in a free
  service's RAM during build. Drop to free if you remove the `canvas` dependency.
