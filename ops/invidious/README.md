# ClassicMap Invidious deployment

This stack is intentionally only reachable through the ClassicMap video API proxy. It is not a public Invidious instance.

## Server install

1. Clone the official `iv-org/invidious` repository into `/home/kdh/Classicmap/invidious`.
2. Copy this directory's `docker-compose.yml` there as `docker-compose.yml`.
3. Generate distinct random values for the three entries in `.env`; `INVIDIOUS_COMPANION_KEY` must be exactly 16 characters. Do not commit that file.
4. Start it with `docker compose up -d`.
5. Add a Caddy route before the generic `/classicmap*` route:

```caddyfile
handle_path /classicmap/invidious/api/v1/videos/* {
  reverse_proxy 127.0.0.1:3100
}
```

The web client requests only `/api/v1/videos/<YouTube video id>`, selects a progressive video stream, and plays it in the browser's native video element. This keeps the Invidious UI and its unrelated routes private.
