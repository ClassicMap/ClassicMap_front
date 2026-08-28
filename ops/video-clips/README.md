# ClassicMap 비교 클립 저장소

이 서비스는 비교할 원본 영상 구간을 MP4로 생성하고 검증한 뒤 홈서버에 저장합니다. 브라우저에는 잘린 파일만 전달하므로 플레이어 시간과 네트워크 전송 범위가 선택한 구간으로 제한됩니다.

## 서버 설치

1. 이 디렉터리를 `/home/kdh/Classicmap/video-clips`에 복사합니다.
2. 32자 이상의 생성 전용 토큰을 환경 변수로 설정한 뒤 실행합니다.

```bash
export CLIP_BUILD_TOKEN='<secret-manager에서 주입한 값>'
docker compose up -d --build
```

토큰 값은 저장소, manifest, 보고서에 기록하지 않습니다.
3. `kang1027.com` Caddy 블록에서 일반 `/classicmap*` 경로보다 앞에 다음 경로를 추가합니다.

```caddyfile
@classicmap_video_clips path /classicmap/clips/*
handle @classicmap_video_clips {
  uri strip_prefix /classicmap/clips
  reverse_proxy 127.0.0.1:3200
}
```

클리퍼 프로세스는 계속 `127.0.0.1`에만 바인딩됩니다. Caddy가 공개 경로를 제한하고 프록시합니다.

공개 GET은 이미 검증되어 캐시에 존재하는 클립만 제공합니다. 캐시 미스에서 새 영상을 생성하려면 `CLIP_BUILD_TOKEN`과 일치하는 Bearer 토큰이 필요합니다. 따라서 공개 경로만 호출해서 임의 영상으로 CPU와 디스크를 사용할 수 없습니다. 생성 요청은 11자의 YouTube 영상 ID와 최대 600초 구간만 허용합니다. 같은 클립의 동시 생성 요청은 하나로 합치며, 완성된 파일은 HTTP Range로 제공합니다.

## 인코딩 프로필과 파일 키

현재 지원하는 인코딩 프로필은 `v1-copy`입니다. Docker 환경에도 버전을 명시합니다.

```yaml
CLIP_ENCODING_PROFILE_VERSION: v1-copy
```

파일 키는 입력과 인코딩 프로필로 결정됩니다.

```text
{videoId}-{startMs}-{durationMs}-{encodingProfileVersion}.mp4
{videoId}-{startMs}-{durationMs}-{encodingProfileVersion}.metadata.json
```

예시는 다음과 같습니다.

```text
abcdefghijk-1335000-40000-v1-copy.mp4
abcdefghijk-1335000-40000-v1-copy.metadata.json
```

사이드카에는 SHA-256, 파일 크기, FFprobe 재생시간, 비디오·오디오 코덱, 검증 시각을 기록합니다. 절대 경로나 Invidious 원본 스트림 URL은 기록하거나 응답하지 않습니다.

### 기존 파일 마이그레이션

기존 파일 키는 프로필이 없습니다.

```text
{videoId}-{startMs}-{durationMs}.mp4
```

`v1-copy` 요청에서 새 파일이 없고 기존 파일이 있으면 다음 순서로 한 번만 마이그레이션합니다.

1. FFprobe로 비디오 스트림과 실제 길이를 검증합니다.
2. SHA-256과 파일 크기를 계산합니다.
3. 새 `v1-copy` 파일 키로 원자 이동합니다.
4. 검증 사이드카를 원자 기록합니다.

검증에 실패한 기존 파일은 제공하지 않고 제거한 뒤 다시 생성합니다. 향후 다른 인코딩 프로필에는 무버전 파일을 자동으로 재사용하지 않습니다.

## 생성 검증

FFmpeg가 임시 파일을 만든 직후 다음 항목을 검증합니다.

- 비디오 스트림 존재
- 실제 재생시간과 요청 구간의 허용 오차
- 최대 600초 제한
- 파일 크기
- SHA-256

검증과 사이드카 기록이 모두 성공한 뒤에만 최종 파일 키로 이동합니다. 검증 실패나 사이드카 기록 실패가 발생하면 임시 파일과 불완전한 최종 자산을 제거합니다.

Range 응답에는 다음 메타데이터가 포함됩니다.

```text
X-ClassicMap-Clip-Storage-Key
X-ClassicMap-Clip-Sha256
X-ClassicMap-Clip-File-Size
X-ClassicMap-Clip-Duration-Ms
X-ClassicMap-Clip-Encoding-Profile
X-ClassicMap-Clip-Asset-Validated-At
```

`Storage-Key`는 저장소 내부 파일명이지만 임의 경로나 절대 경로가 아닙니다.

## 시드 클립 선생성

시드 반영 후 공개하기 전에 JSONL manifest로 클립을 순서대로 생성하고 HTTP Range 응답을 검증합니다.

```jsonl
{"performanceId":101,"videoId":"abcdefghijk","start":358,"end":420,"candidateStatus":"APPROVED","rightsMode":"permission_granted","rightsReviewedAt":"2026-08-05T00:00:00Z","rightsEvidence":"rights-review:CM-101"}
{"performanceId":102,"videoId":"lmnopqrstuv","start":120.5,"end":180.25,"candidateStatus":"APPROVED","rightsMode":"licensed_self_hosted","rightsReviewedAt":"2026-08-05T00:00:00Z","rightsEvidence":"license-contract:CM-102"}
```

`candidateStatus=APPROVED`이면서 `rightsMode`가 `licensed_self_hosted`, `permission_granted`, `public_domain` 중 하나이고 검토 시각과 근거가 있는 행만 실행합니다. `unknown`과 `youtube_embed_only`는 자체 호스팅 선생성 대상이 아닙니다. 기본 동시성은 1입니다. 동일한 `videoId + start + end + encodingProfileVersion`은 한 번만 생성하며 모든 `performanceId`를 검증 보고서에 남깁니다. 같은 `performanceId`가 서로 다른 클립에 중복되면 입력 오류로 처리합니다.

```bash
VIDEO_CLIP_BUILD_TOKEN="$CLIP_BUILD_TOKEN" npm run video-clips:prewarm -- \
  --manifest ./seed-clips.jsonl \
  --base-url http://127.0.0.1:3200 \
  --public-base-url https://kang1027.com/classicmap/clips \
  --encoding-profile-version v1-copy \
  --report ./seed-clips.report.json \
  --bundle ./seed-clips.clip-assets.jsonl
```

중단한 배치는 같은 보고서 경로와 `--resume`으로 이어서 실행합니다. 이전 보고서에 완전한 자산 메타데이터가 있는 성공 항목만 건너뜁니다.

```bash
VIDEO_CLIP_BUILD_TOKEN="$CLIP_BUILD_TOKEN" npm run video-clips:prewarm -- \
  --manifest ./seed-clips.jsonl \
  --base-url http://127.0.0.1:3200 \
  --public-base-url https://kang1027.com/classicmap/clips \
  --encoding-profile-version v1-copy \
  --report ./seed-clips.report.json \
  --bundle ./seed-clips.clip-assets.jsonl \
  --resume
```

각 요청은 생성 전용 Bearer 토큰과 `Range: bytes=0-0`을 사용합니다. 클리퍼는 승인된 내부 요청에서만 자산이 없을 때 MP4와 사이드카를 준비합니다. CLI는 전체 영상을 내려받지 않고 다음 항목을 확인합니다.

- HTTP `206`
- `Accept-Ranges`
- `Content-Range`
- 1바이트 본문
- 저장 키
- SHA-256
- 전체 파일 크기
- FFprobe 재생시간
- 인코딩 프로필
- 서버 자산 검증 시각

보고서의 성공 항목에는 `storageKey`, `sha256`, `fileSize`, `probedDurationMs`, `encodingProfileVersion`, `assetValidatedAt`, `rangeVerifiedAt`이 포함됩니다.

## clip_assets 적재 번들

CLI는 완료된 보고서와 함께 백엔드 `clip_assets` 적재용 JSONL을 원자 기록합니다. 행은 `performanceId`, `storageKey` 순서로 결정적으로 정렬됩니다. `publicUrl`에는 `--public-base-url`과 인코딩 프로필 쿼리로 만든 결정적 클립 URL이 들어갑니다. 공개 기본 주소는 외부에서 접근 가능한 HTTPS URL이어야 하며 `localhost`와 loopback 주소는 거부합니다. 선생성 요청을 내부 주소로 보내더라도 공개 URL은 별도로 안전하게 지정할 수 있습니다.

```jsonl
{"assetValidatedAt":"2026-08-05T00:00:00.000Z","encodingProfileVersion":"v1-copy","fileSize":1024,"performanceId":101,"probedDurationMs":62000,"publicUrl":"https://kang1027.com/classicmap/clips/abcdefghijk?end=420&profile=v1-copy&start=358","rangeVerifiedAt":"2026-08-05T00:01:00.000Z","sha256":"...","storageKey":"abcdefghijk-358000-62000-v1-copy.mp4"}
```

재개용 중간 체크포인트에는 보고서만 기록합니다. 완료 전이거나 실패 또는 입력 오류가 하나라도 있으면 이전 `bundlePath`도 제거합니다. 다음 조건을 모두 만족한 경우에만 최종 번들을 원자 기록합니다.

```text
counts.failed = 0
counts.invalid = 0
completedAt != null
```

백엔드는 번들 적재와 `clip_assets.status = READY` 전환을 한 트랜잭션 경계에서 처리해야 합니다. READY가 아닌 performance는 사용자 화면에 공개하지 않습니다.
