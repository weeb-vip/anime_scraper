FROM node:20.17.0-alpine AS build

RUN apk update && apk add bash
RUN corepack enable && corepack prepare yarn@4.3.1 --activate

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
COPY src ./src
COPY .yarnrc.yml .yarnrc.yml
COPY tsconfig.json tsconfig.build.json ./

RUN yarn install
RUN yarn build


FROM node:20.17.0-alpine AS prod

RUN apk add --no-cache tini \
  && apk add --no-cache \
    udev \
    ttf-freefont \
    ttf-opensans \
    ca-certificates \
    chromium

RUN corepack enable && corepack prepare yarn@4.3.1 --activate

WORKDIR /usr/src/app

# Copy built app and node_modules from build stage
COPY --from=build /usr/src/app/dist ./
COPY .yarnrc.yml .yarnrc.yml
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./package.json
COPY ormconfig.js ./ormconfig.js

ENV NODE_ENV=production
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "/main.js"]
