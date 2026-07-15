# ClassicMap Invidious deployment

This stack is intentionally only reachable through the ClassicMap video API proxy. It is not a public Invidious instance.

## Server install

1. Clone the official `iv-org/invidious` repository into `/home/kdh/Classicmap/invidious`.
2. Copy this directory's `docker-compose.yml` there as `docker-compose.yml`.
3. Generate distinct random values for the three entries in `.env`; `INVIDIOUS_COMPANION_KEY` must be exactly 16 characters. Do not commit that file.
4. Start it with `docker compose up -d`.
5. Add a Caddy route before the generic `/classicmap*` route:

```caddyfile
@classicmap_invidious_api path /classicmap/invidious/api/v1/videos/*
handle @classicmap_invidious_api {
  uri strip_prefix /classicmap/invidious
  reverse_proxy 127.0.0.1:3100
}

@classicmap_invidious_video path /classicmap/invidious/videoplayback*
handle @classicmap_invidious_video {
  uri strip_prefix /classicmap/invidious
  reverse_proxy 127.0.0.1:3100
}
```

The web client requests `/api/v1/videos/<YouTube video id>?local=true`, which makes Invidious return a local `/videoplayback` URL. The browser then streams through the home server instead of attempting an IP-bound YouTube URL directly. This keeps the Invidious UI and its unrelated routes private.
