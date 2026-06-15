# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS deps
RUN apt-get update -y && apt-get install -y openssl procps wget curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
ARG APP_NAME=gateway
COPY . .
RUN npm run prisma:generate:all
RUN npx nest build ${APP_NAME}

FROM node:20-bookworm-slim AS runtime
RUN apt-get update -y && apt-get install -y openssl procps && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

RUN npm run prisma:generate:all

ARG APP_NAME=gateway
ENV APP_NAME=${APP_NAME}
ENV PORT=3000

EXPOSE 3000
CMD ["sh", "-c", "node dist/apps/${APP_NAME}/main.js"]
