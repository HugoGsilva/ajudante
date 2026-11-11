FROM oven/bun:1.3.14
WORKDIR /app

COPY package.json bun.lock bunfig.toml turbo.json tsconfig.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/config/package.json packages/config/package.json

RUN bun install --frozen-lockfile --ignore-scripts

COPY apps/server apps/server
COPY packages/api packages/api
COPY packages/auth packages/auth
COPY packages/db packages/db
COPY packages/config packages/config

RUN bun run env:generate && chmod +x apps/server/start.sh

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "apps/server/start.sh"]
