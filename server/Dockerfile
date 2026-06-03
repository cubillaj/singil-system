FROM node:24-bookworm-slim AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY server.ts ./
COPY src ./src

EXPOSE 5000

CMD ["npm", "run", "dev", "--", "--legacy-watch"]

FROM dev AS build

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim AS production

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 5000

CMD ["npm", "start"]
