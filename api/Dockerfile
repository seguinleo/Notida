FROM node:26-alpine
ENV NODE_ENV=production
RUN apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
