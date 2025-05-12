FROM node:20.17.0-alpine AS build

ENV NODE_ENV development
RUN apk update && apk add bash
RUN corepack enable
RUN corepack prepare yarn@4.3.1 --activate
WORKDIR /usr/src/app

COPY package.json package.json
COPY yarn.lock yarn.lock
COPY src src
COPY tsconfig.json tsconfig.json
COPY tsconfig.build.json tsconfig.build.json


RUN yarn install
RUN yarn build

FROM node:20.17.0-alpine AS PROD
ENV NODE_ENV development
ARG SERVICE_VERSION
ENV SERVICE_VERSION=$SERVICE_VERSION
RUN corepack enable
RUN corepack prepare yarn@4.3.1 --activate
WORKDIR /usr/src/app

RUN apk add --no-cache tini

ENV CHROME_BIN="/usr/bin/chromium-browser" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
RUN set -x \
    && apk update \
    && apk upgrade \
    && apk add --no-cache \
    udev \
    ttf-freefont \
    ttf-opensans \
    ca-certificates \
    chromium

COPY package.json package.json
COPY yarn.lock yarn.lock
COPY --from=build /usr/src/app/dist ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY ormconfig.js ./ormconfig.js

RUN yarn install
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "main.js"]
