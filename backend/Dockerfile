FROM node:20-slim

# mongodump, for real backups against MONGODB_URI (Atlas) — installed from
# the official static tools tarball rather than adding MongoDB's apt repo,
# to keep the image lean. node:20-slim is Debian 12 (bookworm); if the base
# image ever changes to a different Debian release, swap the "debian12"
# suffix below to match (a mismatch fails at first run with a libc/OpenSSL
# error, not at build time) — verify with
# `docker run --rm node:20-slim cat /etc/os-release` if unsure.
ARG MONGO_TOOLS_VERSION=100.9.4
ARG MONGO_TOOLS_OS=debian12
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-${MONGO_TOOLS_OS}-x86_64-${MONGO_TOOLS_VERSION}.tgz" -o /tmp/mongo-tools.tgz \
    && tar -xzf /tmp/mongo-tools.tgz -C /tmp \
    && cp /tmp/mongodb-database-tools-*/bin/mongodump /usr/local/bin/ \
    && rm -rf /tmp/mongo-tools.tgz /tmp/mongodb-database-tools-* \
    && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

RUN npm install -g pm2
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["pm2-runtime", "server.js"]