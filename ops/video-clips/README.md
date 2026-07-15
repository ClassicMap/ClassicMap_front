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

The endpoint only accepts an 11-character YouTube ID and a clip no longer than 120 seconds. It coalesces concurrent generation of the same clip and serves cached files with HTTP byte ranges.
