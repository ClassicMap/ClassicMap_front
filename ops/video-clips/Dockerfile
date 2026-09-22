FROM node:20-alpine

# yt-dlp 는 YouTube 의 n challenge 를 풀 때 JS 런타임이 필요하다.
# node 로는 풀리지 않고 deno 가 있어야 스트림 주소를 받을 수 있다.
# alpine 패키지의 yt-dlp 는 몇 달 뒤처져 있어 pip 로 최신을 받는다.
RUN apk add --no-cache ffmpeg deno python3 py3-pip \
 && pip3 install --no-cache-dir --break-system-packages yt-dlp \
 && yt-dlp --version

WORKDIR /app

COPY server.mjs ./server.mjs

CMD ["node", "server.mjs"]
