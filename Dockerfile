# Frontend
FROM node:24 AS frontend-build

WORKDIR /notida

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# API
FROM node:24 AS api-build

WORKDIR /notida/api

COPY api/package*.json ./
RUN npm install

COPY api/ .

EXPOSE 3000

# Prod
FROM nginx:stable-alpine

RUN apk add --no-cache nodejs npm

RUN addgroup -S lowgroup && \
    adduser -S lowuser -G lowgroup

COPY --from=frontend-build /notida/dist /usr/share/nginx/html
COPY --from=api-build /notida/api /notida/api
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh && \
    mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/log/nginx && \
    mkdir -p /tmp/nginx && \
    chown -R lowuser:lowgroup \
        /var/cache/nginx \
        /var/log/nginx \
        /usr/share/nginx/html \
        /notida/api \
        /tmp

USER lowuser

EXPOSE 80 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
