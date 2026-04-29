# syntax=docker/dockerfile:1.7
# Build context MUST be the monorepo root.
# Build:  docker build -f artifacts/anki-generator/Dockerfile -t anki-web .

# ---------- builder ----------
FROM node:24-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./
COPY lib ./lib
COPY artifacts/anki-generator ./artifacts/anki-generator
COPY scripts ./scripts

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Vite needs PORT and BASE_PATH at build time.
ENV PORT=5000
ENV BASE_PATH=/
RUN pnpm --filter @workspace/anki-generator run build

# ---------- runner ----------
FROM nginx:1.27-alpine AS runner

COPY --from=builder /repo/artifacts/anki-generator/dist/public /usr/share/nginx/html
COPY artifacts/anki-generator/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
