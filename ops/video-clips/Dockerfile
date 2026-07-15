FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY server.mjs ./server.mjs

CMD ["node", "server.mjs"]
