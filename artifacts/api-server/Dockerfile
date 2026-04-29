# syntax=docker/dockerfile:1.7
# Build context MUST be the monorepo root.
# Build:  docker build -f artifacts/api-server/Dockerfile -t anki-api .

# ---------- builder ----------
FROM node:24-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# Native build deps for `canvas`
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 build-essential pkg-config \
      libcairo2-dev libpango1.0-dev libjpeg62-turbo-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

# Copy lockfile + workspace manifests first so install can be cached.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server
COPY scripts ./scripts

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

# ---------- runner ----------
FROM node:24-bookworm-slim AS runner

# Native runtime libs required by `canvas`
RUN apt-get update && apt-get install -y --no-install-recommends \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
      libjpeg62-turbo libgif7 librsvg2-2 libuuid1 wget \
    && rm -rf /var/lib/apt/lists/*

# Copy the whole workspace from the builder so pnpm's symlinked node_modules
# resolve correctly for esbuild externals (canvas, tesseract.js, pdfjs-dist, pino).
COPY --from=builder /repo /repo

WORKDIR /repo/artifacts/api-server

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
