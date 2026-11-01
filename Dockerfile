FROM node:26-alpine AS build
WORKDIR /notida
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
USER root
RUN apk upgrade --no-cache
USER nginx
COPY --from=build /notida/dist /usr/share/nginx/html
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
