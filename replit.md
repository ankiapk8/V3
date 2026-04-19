# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (`@workspace/integrations-openai-ai-server`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### Anki Card Generator (`artifacts/anki-generator`)
- React + Vite web app at `/`
- Upload files (PDF, TXT) or paste text to generate Anki flashcards via AI
- Browse and manage decks, edit cards inline, export `.apkg` for Anki import
- **Study mode** on deck detail page: flip cards, reveal answer, mark "Got It"/"Still Learning", shuffle, progress bar, completion screen with missed-card review
- PDF extraction in `src/lib/pdf-extraction.ts`: files >20MB skip client and go straight to server; smaller files try embedded text first, then server, then client OCR
- Server upload uses `FormData` multipart (avoids Replit proxy limits on raw binary bodies)
- Safari/iPad compatibility uses a `Promise.withResolvers` polyfill in `src/main.tsx` before loading the app and the legacy PDF.js build
- Direct API fetches use the Vite base path helper in `src/lib/utils.ts` so PDF extraction, explain, and `.apkg` export requests route correctly in the preview/deployed app

### API Server (`artifacts/api-server`)
- Express 5 backend at `/api`
- Routes: `/api/decks`, `/api/cards`, `/api/generate`, `/api/extract-pdf`, `/api/export-apkg`, `/api/healthz`
- AI generation uses `gpt-5.2` model via Replit AI Integrations (env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`)
- The AI client is loaded lazily so missing AI configuration returns a 503 from `/api/generate` instead of crashing the server
- Route `/api/extract-pdf` accepts both `multipart/form-data` (via multer, field name `file`) and raw `application/pdf` body; embedded text → server OCR fallback
- The server runs a safe startup schema initializer from `@workspace/db` before listening, creating/updating `decks` and `cards` if needed for fresh databases
- System dependency `util-linux` (provides `libuuid.so.1`) is required by the `canvas` npm package; installed via Nix
- `canvas` and `tesseract.js` are listed in `pnpm.onlyBuiltDependencies` in the root `package.json` so their native build scripts run

## Database Schema

- `decks` — Deck metadata (id, name, description, parentId FK self-ref, timestamps)
  - `parentId` is nullable; if set, the deck is a sub-deck of the referenced deck
- `cards` — Flashcard data (id, deckId, front, back, tags, timestamps)

## Deck Hierarchy

- Decks can have a `parentId` pointing to another deck (one level deep)
- Library shows parent decks as main topics with expandable sub-decks nested below
- "New Deck" and Generate flows have a Main Topic selector to assign `parentId`
- Export uses Anki's `::` convention: sub-deck cards are tagged `Parent::Child`
- Deleting a parent nullifies `parentId` on children (they become standalone)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
