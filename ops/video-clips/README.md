# ClassicMap video clip cache

This service creates and caches the requested comparison interval as an MP4. The browser receives only that clipped file, so the player timeline and network transfer are limited to the selected interval.

## Server install

1. Copy this directory to `/home/kdh/Classicmap/video-clips`.
2. Start it with `docker compose up -d --build`.
3. Add this route before the generic `/classicmap*` route in the `kang1027.com` Caddy block:

```caddyfile
@classicmap_video_clips path /classicmap/clips/*
handle @classicmap_video_clips {
  uri strip_prefix /classicmap/clips
  reverse_proxy 127.0.0.1:3200
}
```

The endpoint only accepts an 11-character YouTube ID and a clip no longer than 600 seconds. It coalesces concurrent generation of the same clip and serves cached files with HTTP byte ranges.

## Seed clip prewarm

시드 반영 후 공개하기 전에 JSONL manifest로 클립을 순서대로 생성하고 HTTP Range 응답을 검증합니다.

```jsonl
{"performanceId":101,"videoId":"abcdefghijk","start":358,"end":420}
{"performanceId":102,"videoId":"lmnopqrstuv","start":120.5,"end":180.25}
```

기본 동시성은 1입니다. 동일한 `videoId + start + end`는 한 번만 생성하며 모든 `performanceId`를 검증 보고서에 남깁니다.

```bash
npm run video-clips:prewarm -- \
  --manifest ./seed-clips.jsonl \
  --base-url https://kang1027.com/classicmap/clips \
  --report ./seed-clips.report.json
```

중단한 배치는 같은 보고서 경로와 `--resume`으로 이어서 실행합니다.

```bash
npm run video-clips:prewarm -- \
  --manifest ./seed-clips.jsonl \
  --base-url https://kang1027.com/classicmap/clips \
  --report ./seed-clips.report.json \
  --resume
```

각 요청은 `Range: bytes=0-0`을 사용합니다. 클리퍼는 캐시가 없으면 먼저 MP4를 만들고, CLI는 `206`, `Accept-Ranges`, `Content-Range`와 1바이트 본문을 검증합니다. 실패나 잘못된 manifest 행이 하나라도 있으면 종료 코드는 1이며 원인은 JSON 보고서에 구조화해 기록합니다.
