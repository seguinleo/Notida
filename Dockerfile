FROM node:24 AS build-stage

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:stable-alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

COPY nginx/nginx.conf /etc/nginx/nginx.conf

COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

RUN addgroup -S lowgroup && adduser -S lowuser -G lowgroup

RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/log/nginx && \
    mkdir -p /tmp/nginx && \
    chown -R lowuser:lowgroup /var/cache/nginx && \
    chown -R lowuser:lowgroup /var/log/nginx && \
    chown -R lowuser:lowgroup /usr/share/nginx/html && \
    chown -R lowuser:lowgroup /tmp

USER lowuser

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
