FROM oven/bun:1.3.14 AS build
WORKDIR /app

COPY package.json bun.lock bunfig.toml turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN bun install --frozen-lockfile --ignore-scripts

COPY apps/web apps/web
COPY apps/server apps/server
COPY packages packages

RUN bun run env:generate

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV NODE_ENV=production

WORKDIR /app/apps/web
RUN bun run build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
