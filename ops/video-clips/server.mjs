import { spawn } from 'node:child_process';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_ENCODING_PROFILE_VERSION = 'v1-copy';
export const MAX_CLIP_SECONDS = 600;

const SUPPORTED_ENCODING_PROFILES = new Set([DEFAULT_ENCODING_PROFILE_VERSION]);
const cacheDirectory = process.env.CLIP_CACHE_DIR ?? '/var/cache/classicmap-video-clips';
const invidiousApiBase = process.env.INVIDIOUS_API_BASE ?? 'http://127.0.0.1:3100';
// YouTube 가 익명 요청을 봇으로 막으면서 invidious 의 PO token 검증이 통과하지 못한다.
// yt-dlp 는 로그인 쿠키로 같은 관문을 지나므로 기본 경로로 둔다.
// CLIP_SOURCE_RESOLVER=invidious 로 되돌릴 수 있다.
const sourceResolver = process.env.CLIP_SOURCE_RESOLVER ?? 'ytdlp';
const ytdlpBinary = process.env.YTDLP_BIN ?? 'yt-dlp';
const configuredCookiesPath = process.env.YTDLP_COOKIES?.trim() ?? '';
// yt-dlp 는 실행을 마치면 쿠키 파일을 갱신하려 한다. 쿠키는 Secret 으로 들어와
// 읽기 전용으로 붙으므로, 시작할 때 쓸 수 있는 곳으로 옮겨 두고 그 사본을 넘긴다.
const ytdlpCookiesPath = configuredCookiesPath
  ? join(process.env.CLIP_RUNTIME_DIR ?? '/tmp', 'yt-cookies.txt')
  : '';
const ytdlpFormat =
  process.env.YTDLP_FORMAT ??
  'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]';
const port = Number.parseInt(process.env.CLIP_PORT ?? '3200', 10);
// 컨테이너에서는 서비스가 붙을 수 있게 0.0.0.0 으로 열어야 한다.
// 기본값은 로컬 개발을 생각해 loopback 으로 둔다.
const host = process.env.CLIP_HOST?.trim() || '127.0.0.1';
const maxStartSeconds = 4 * 60 * 60;
const encodingProfileVersion =
  process.env.CLIP_ENCODING_PROFILE_VERSION ?? DEFAULT_ENCODING_PROFILE_VERSION;
const clipBuildToken = process.env.CLIP_BUILD_TOKEN?.trim() ?? '';
const activeBuilds = new Map();
// 같은 영상에서 구간을 여러 개 뽑을 때 영상을 한 번만 받는다. 구간마다 스트림을 받으면
// 실시간의 1.2~1.6배로만 내려와 45분 영상의 네 구간에 6분 넘게 걸렸다. 원본을 통째로
// 받으면 조각을 나눠 받아 71초였고, 재인코딩 없이 자르는 데는 1초였다. 유튜브 요청도
// 구간 수만큼 줄어든다. CLIP_SOURCE_CACHE=off 면 예전처럼 구간만 받는다.
const sourceCacheEnabled = (process.env.CLIP_SOURCE_CACHE ?? 'on') !== 'off';
const sourceDirectory = join(cacheDirectory, 'sources');
// 원본은 같은 영상의 구간을 이어서 뽑는 동안만 쓰고 지운다. 45분 720p 가 150MB 안팎이다.
const sourceMaxAgeMs =
  Number.parseFloat(process.env.CLIP_SOURCE_MAX_AGE_HOURS ?? '24') * 60 * 60 * 1000;
// 받다가 끊긴 임시 파일은 이보다 오래되면 지운다.
const sourceTempMaxAgeMs = 60 * 60 * 1000;
const activeSources = new Map();

if (!SUPPORTED_ENCODING_PROFILES.has(encodingProfileVersion)) {
  throw new Error(`지원하지 않는 인코딩 프로필입니다: ${encodingProfileVersion}`);
}

async function prepareCookies() {
  if (!configuredCookiesPath) {
    return;
  }

  const contents = await readFile(configuredCookiesPath);
  await writeFile(ytdlpCookiesPath, contents, { mode: 0o600 });
}

function selectStream(video) {
  const candidates = (video.formatStreams ?? []).filter(
    (stream) =>
      typeof stream.url === 'string' &&
      stream.url.length > 0 &&
      stream.type?.startsWith('video/')
  );

  if (candidates.length === 0) {
    throw new Error('재생 가능한 영상 스트림이 없습니다.');
  }

  return candidates.sort((left, right) => qualityRank(right) - qualityRank(left))[0];
}

function qualityRank(stream) {
  const quality = stream.qualityLabel ?? stream.quality ?? '';
  const match = quality.match(/(\d{3,4})p/i);

  return match ? Number.parseInt(match[1], 10) : 0;
}

function assertSafeEncodingProfile(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,31}$/.test(value)) {
    throw new Error('인코딩 프로필 버전이 올바르지 않습니다.');
  }
  return value;
}

export function createClipIdentity(
  { duration, start, videoId },
  profileVersion = DEFAULT_ENCODING_PROFILE_VERSION
) {
  const safeProfileVersion = assertSafeEncodingProfile(profileVersion);
  const startMs = Math.round(start * 1000);
  const durationMs = Math.round(duration * 1000);
  const legacyStem = `${videoId}-${startMs}-${durationMs}`;
  const versionedStem = `${legacyStem}-${safeProfileVersion}`;

  return {
    durationMs,
    encodingProfileVersion: safeProfileVersion,
    legacyStorageKey: `${legacyStem}.mp4`,
    metadataKey: `${versionedStem}.metadata.json`,
    startMs,
    storageKey: `${versionedStem}.mp4`,
    videoId,
  };
}

export function parseClipRequest(requestUrl) {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  const videoId = url.pathname.slice(1);
  const start = Number(url.searchParams.get('start'));
  const end = Number(url.searchParams.get('end'));
  const duration = end - start;
  const requestedProfile = url.searchParams.get('profile');

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error('유효하지 않은 영상 ID입니다.');
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > maxStartSeconds) {
    throw new Error('유효하지 않은 영상 구간입니다.');
  }

  if (duration <= 0 || duration > MAX_CLIP_SECONDS) {
    throw new Error(`영상 구간은 ${MAX_CLIP_SECONDS}초 이하여야 합니다.`);
  }

  if (requestedProfile && requestedProfile !== encodingProfileVersion) {
    throw new Error(`요청한 인코딩 프로필을 제공할 수 없습니다: ${requestedProfile}`);
  }

  return { duration, end, start, videoId };
}

export function isBuildAuthorized(authorization, configuredToken = clipBuildToken) {
  if (configuredToken.length < 32 || typeof authorization !== 'string') {
    return false;
  }
  const prefix = 'Bearer ';
  if (!authorization.startsWith(prefix)) {
    return false;
  }
  const suppliedToken = authorization.slice(prefix.length);
  const expected = Buffer.from(configuredToken);
  const supplied = Buffer.from(suppliedToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function getInvidiousSourceUrls(videoId) {
  const response = await fetch(`${invidiousApiBase}/api/v1/videos/${encodeURIComponent(videoId)}`);

  if (!response.ok) {
    throw new Error(`영상 정보를 불러오지 못했습니다. (${response.status})`);
  }

  return [selectStream(await response.json()).url];
}

function runYtdlp(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(ytdlpBinary, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout = `${stdout}${chunk}`;
    });
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-4000);
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(stdout);
        return;
      }
      rejectPromise(new Error(stderr || `yt-dlp가 종료되었습니다. (${code})`));
    });
  });
}

// googlevideo 주소는 쿠키와 User-Agent 까지 함께 검증한다. 주소만 뽑아
// ffmpeg 에 넘기면 403 이 돌아오므로, 구간 자르기까지 yt-dlp 에 맡긴다.
async function downloadClipWithYtdlp(videoId, start, duration, outputPath) {
  const args = [
    '--no-update',
    '--no-playlist',
    '--remote-components',
    'ejs:github',
    '-f',
    ytdlpFormat,
    '--download-sections',
    `*${start}-${start + duration}`,
    '--merge-output-format',
    'mp4',
    '-o',
    outputPath,
  ];

  if (ytdlpCookiesPath) {
    args.push('--cookies', ytdlpCookiesPath);
  }
  args.push('--', videoId);

  await runYtdlp(args);
}

export function sourceFileName(videoId, format) {
  // 포맷이 바뀌면 다른 원본이다. 같은 이름으로 덮지 않게 포맷을 이름에 넣는다.
  const formatHash = createHash('sha256').update(format).digest('hex').slice(0, 12);
  return `${videoId}-${formatHash}.mp4`;
}

export function isSourceStale(modifiedAtMs, nowMs, maxAgeMs) {
  return nowMs - modifiedAtMs >= maxAgeMs;
}

async function pruneSources(nowMs = Date.now()) {
  let names;
  try {
    names = await readdir(sourceDirectory);
  } catch {
    return;
  }

  await Promise.all(
    names.map(async (name) => {
      const path = join(sourceDirectory, name);
      const maxAgeMs = name.includes('.tmp.') ? sourceTempMaxAgeMs : sourceMaxAgeMs;
      try {
        const info = await stat(path);
        if (isSourceStale(info.mtimeMs, nowMs, maxAgeMs)) {
          await unlink(path);
        }
      } catch {
        // 다른 요청이 먼저 지웠다.
      }
    })
  );
}

async function ensureSource(videoId) {
  const sourcePath = join(sourceDirectory, sourceFileName(videoId, ytdlpFormat));
  try {
    const info = await stat(sourcePath);
    if (!isSourceStale(info.mtimeMs, Date.now(), sourceMaxAgeMs)) {
      return sourcePath;
    }
  } catch {
    // 아직 받지 않았다.
  }

  // 같은 영상의 구간 요청이 동시에 들어오면 원본은 한 번만 받는다.
  const existingDownload = activeSources.get(sourcePath);
  if (existingDownload) {
    return existingDownload;
  }

  const download = (async () => {
    await mkdir(sourceDirectory, { recursive: true });
    await pruneSources();
    const tempPath = `${sourcePath}.${process.pid}.${randomUUID()}.tmp.mp4`;
    const args = [
      '--no-update',
      '--no-playlist',
      '--remote-components',
      'ejs:github',
      '-f',
      ytdlpFormat,
      '--concurrent-fragments',
      '4',
      '--merge-output-format',
      'mp4',
      '-o',
      tempPath,
    ];
    if (ytdlpCookiesPath) {
      args.push('--cookies', ytdlpCookiesPath);
    }
    args.push('--', videoId);

    try {
      await runYtdlp(args);
      await rename(tempPath, sourcePath);
      return sourcePath;
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    } finally {
      activeSources.delete(sourcePath);
    }
  })();

  activeSources.set(sourcePath, download);
  return download;
}

// 720 는 영상과 소리가 따로 제공되므로 URL 이 둘 나올 수 있다.
async function getYtdlpSourceUrls(videoId) {
  // YouTube 는 스트림 주소를 JS 챌린지로 가린다. 푸는 스크립트는 yt-dlp 에 들어 있지 않고
  // 처음 한 번 내려받아 캐시에 둬야 한다. 캐시가 비면 포맷 자체를 받지 못한다.
  const args = [
    '--no-update',
    '--no-playlist',
    '--remote-components',
    'ejs:github',
    '-f',
    ytdlpFormat,
    '-g',
  ];

  if (ytdlpCookiesPath) {
    args.push('--cookies', ytdlpCookiesPath);
  }
  args.push('--', videoId);

  const urls = (await runYtdlp(args))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('https://'));

  if (urls.length === 0) {
    throw new Error('재생 가능한 영상 스트림이 없습니다.');
  }

  return urls;
}

function getSourceUrls(videoId) {
  return sourceResolver === 'invidious'
    ? getInvidiousSourceUrls(videoId)
    : getYtdlpSourceUrls(videoId);
}

// 로컬 원본은 입력 앞 -ss 로 자르면 바로 앞 키프레임부터 복사된다. -avoid_negative_ts
// make_zero 를 주면 그 앞부분까지 재생 길이에 들어가, 30초 요청이 36.7초가 되어 자산
// 검증에서 거부됐다. 빼면 편집 목록이 앞부분을 가려 요청한 길이로 나온다. 예전 yt-dlp
// 구간 받기와 같은 구조다.
export function ffmpegCutArgs(sourceUrls, start, duration, outputPath, { keepEditList = false } = {}) {
  const inputs = [];

  // -ss 를 각 입력 앞에 둬야 입력 단계에서 탐색한다 (디코딩 없이 빠르다).
  for (const sourceUrl of sourceUrls) {
    inputs.push('-ss', String(start), '-i', sourceUrl);
  }

  // 영상과 소리가 따로 오면 각각 다른 입력에서 가져온다.
  const maps =
    sourceUrls.length > 1
      ? ['-map', '0:v:0', '-map', '1:a:0']
      : ['-map', '0:v:0', '-map', '0:a:0?'];

  return [
    '-hide_banner',
    '-loglevel',
    'error',
    ...inputs,
    '-t',
    String(duration),
    ...maps,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    ...(keepEditList ? [] : ['-avoid_negative_ts', 'make_zero']),
    '-y',
    outputPath,
  ];
}

function runFfmpeg(sourceUrls, start, duration, outputPath, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const process = spawn('ffmpeg', ffmpegCutArgs(sourceUrls, start, duration, outputPath, options));
    let stderr = '';

    process.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-4000);
    });
    process.on('error', rejectPromise);
    process.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(stderr || `FFmpeg가 종료되었습니다. (${code})`));
    });
  });
}

function runFfprobe(inputPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const process = spawn('ffprobe', [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ]);
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (chunk) => {
      stdout = `${stdout}${chunk}`.slice(-1_000_000);
    });
    process.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-4000);
    });
    process.on('error', rejectPromise);
    process.on('close', (code) => {
      if (code === 0) {
        resolvePromise(stdout);
        return;
      }
      rejectPromise(new Error(stderr || `FFprobe가 종료되었습니다. (${code})`));
    });
  });
}

export function parseProbeOutput(stdout, expectedDurationMs) {
  let probe;
  try {
    probe = JSON.parse(stdout);
  } catch {
    throw new Error('FFprobe 결과를 해석하지 못했습니다.');
  }

  const streams = Array.isArray(probe.streams) ? probe.streams : [];
  const videoStream = streams.find((stream) => stream.codec_type === 'video');
  const audioStream = streams.find((stream) => stream.codec_type === 'audio');
  const durationSeconds = [probe.format?.duration, videoStream?.duration]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);
  const probedDurationMs = Math.round(durationSeconds * 1000);
  const durationToleranceMs = Math.max(3000, Math.round(expectedDurationMs * 0.03));

  if (!videoStream || typeof videoStream.codec_name !== 'string') {
    throw new Error('검증된 비디오 스트림이 없습니다.');
  }
  if (!Number.isFinite(probedDurationMs) || probedDurationMs <= 0) {
    throw new Error('클립 재생시간을 확인하지 못했습니다.');
  }
  if (
    probedDurationMs > MAX_CLIP_SECONDS * 1000 + durationToleranceMs ||
    Math.abs(probedDurationMs - expectedDurationMs) > durationToleranceMs
  ) {
    throw new Error(
      `실제 클립 길이가 요청과 다릅니다. (요청 ${expectedDurationMs}ms, 실제 ${probedDurationMs}ms)`
    );
  }

  return {
    audioCodec: typeof audioStream?.codec_name === 'string' ? audioStream.codec_name : null,
    probedDurationMs,
    videoCodec: videoStream.codec_name,
  };
}

async function sha256File(inputPath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(inputPath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

export async function describeClipAsset(inputPath, identity, probeImplementation = runFfprobe) {
  const fileStat = await stat(inputPath);
  if (!fileStat.isFile() || fileStat.size <= 0) {
    throw new Error('생성된 클립 파일이 비어 있습니다.');
  }

  const probe = parseProbeOutput(await probeImplementation(inputPath), identity.durationMs);
  return {
    assetValidatedAt: new Date().toISOString(),
    audioCodec: probe.audioCodec,
    durationMs: identity.durationMs,
    encodingProfileVersion: identity.encodingProfileVersion,
    fileSize: fileStat.size,
    metadataVersion: 1,
    probedDurationMs: probe.probedDurationMs,
    sha256: await sha256File(inputPath),
    startMs: identity.startMs,
    storageKey: identity.storageKey,
    videoCodec: probe.videoCodec,
  };
}

function isAssetMetadata(value, identity, fileSize) {
  return (
    value &&
    typeof value === 'object' &&
    value.metadataVersion === 1 &&
    value.storageKey === identity.storageKey &&
    value.encodingProfileVersion === identity.encodingProfileVersion &&
    value.startMs === identity.startMs &&
    value.durationMs === identity.durationMs &&
    Number.isInteger(value.fileSize) &&
    value.fileSize === fileSize &&
    Number.isInteger(value.probedDurationMs) &&
    value.probedDurationMs > 0 &&
    typeof value.sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(value.sha256) &&
    typeof value.videoCodec === 'string' &&
    typeof value.assetValidatedAt === 'string'
  );
}

async function writeMetadataAtomic(metadataPath, metadata) {
  const tempPath = `${metadataPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
    await rename(tempPath, metadataPath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readOrRebuildMetadata(clipPath, metadataPath, identity) {
  const clipStat = await stat(clipPath);
  try {
    const stored = JSON.parse(await readFile(metadataPath, 'utf8'));
    if (isAssetMetadata(stored, identity, clipStat.size)) {
      return stored;
    }
  } catch {
    // 사이드카가 없거나 손상된 경우 실제 미디어를 다시 검증합니다.
  }

  const metadata = await describeClipAsset(clipPath, identity);
  await writeMetadataAtomic(metadataPath, metadata);
  return metadata;
}

async function removeAsset(clipPath, metadataPath) {
  await Promise.all([
    unlink(clipPath).catch(() => undefined),
    unlink(metadataPath).catch(() => undefined),
  ]);
}

async function loadExistingAsset(identity) {
  const clipPath = join(cacheDirectory, identity.storageKey);
  const metadataPath = join(cacheDirectory, identity.metadataKey);

  if (await fileExists(clipPath)) {
    try {
      const metadata = await readOrRebuildMetadata(clipPath, metadataPath, identity);
      return { clipPath, metadata };
    } catch {
      await removeAsset(clipPath, metadataPath);
      return null;
    }
  }

  await unlink(metadataPath).catch(() => undefined);
  if (identity.encodingProfileVersion !== DEFAULT_ENCODING_PROFILE_VERSION) {
    return null;
  }

  const legacyPath = join(cacheDirectory, identity.legacyStorageKey);
  if (!(await fileExists(legacyPath))) {
    return null;
  }

  try {
    const metadata = await describeClipAsset(legacyPath, identity);
    await rename(legacyPath, clipPath);
    try {
      await writeMetadataAtomic(metadataPath, metadata);
    } catch (error) {
      await removeAsset(clipPath, metadataPath);
      throw error;
    }
    return { clipPath, metadata };
  } catch {
    await unlink(legacyPath).catch(() => undefined);
    return null;
  }
}

async function buildClip(clipRequest) {
  const identity = createClipIdentity(clipRequest, encodingProfileVersion);
  const existingAsset = await loadExistingAsset(identity);
  if (existingAsset) {
    return existingAsset;
  }

  const existingBuild = activeBuilds.get(identity.storageKey);
  if (existingBuild) {
    return existingBuild;
  }

  const build = (async () => {
    await mkdir(cacheDirectory, { recursive: true });
    const clipPath = join(cacheDirectory, identity.storageKey);
    const metadataPath = join(cacheDirectory, identity.metadataKey);
    const tempPath = `${clipPath}.${process.pid}.${randomUUID()}.tmp.mp4`;

    try {
      if (sourceResolver === 'invidious') {
        const sourceUrls = await getSourceUrls(clipRequest.videoId);
        await runFfmpeg(sourceUrls, clipRequest.start, clipRequest.duration, tempPath);
      } else if (sourceCacheEnabled) {
        const sourcePath = await ensureSource(clipRequest.videoId);
        await runFfmpeg([sourcePath], clipRequest.start, clipRequest.duration, tempPath, {
          keepEditList: true,
        });
      } else {
        await downloadClipWithYtdlp(
          clipRequest.videoId,
          clipRequest.start,
          clipRequest.duration,
          tempPath
        );
      }
      const metadata = await describeClipAsset(tempPath, identity);
      await rename(tempPath, clipPath);
      try {
        await writeMetadataAtomic(metadataPath, metadata);
      } catch (error) {
        await removeAsset(clipPath, metadataPath);
        throw error;
      }
      return { clipPath, metadata };
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    } finally {
      activeBuilds.delete(identity.storageKey);
    }
  })();

  activeBuilds.set(identity.storageKey, build);
  return build;
}

export function metadataHeaders(metadata) {
  return {
    'ETag': `"${metadata.sha256}"`,
    'X-ClassicMap-Clip-Asset-Validated-At': metadata.assetValidatedAt,
    'X-ClassicMap-Clip-Duration-Ms': String(metadata.probedDurationMs),
    'X-ClassicMap-Clip-Encoding-Profile': metadata.encodingProfileVersion,
    'X-ClassicMap-Clip-File-Size': String(metadata.fileSize),
    'X-ClassicMap-Clip-Sha256': metadata.sha256,
    'X-ClassicMap-Clip-Storage-Key': metadata.storageKey,
  };
}

async function sendClip(request, response, asset) {
  const fileStat = await stat(asset.clipPath);
  const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  const headers = {
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=2592000, immutable',
    'Content-Type': 'video/mp4',
    ...metadataHeaders(asset.metadata),
  };

  if (!range) {
    response.writeHead(200, { ...headers, 'Content-Length': fileStat.size });
    createReadStream(asset.clipPath).pipe(response);
    return;
  }

  const start = range[1] === '' ? 0 : Number.parseInt(range[1], 10);
  const end = range[2] === '' ? fileStat.size - 1 : Number.parseInt(range[2], 10);

  if (start >= fileStat.size || end < start) {
    response.writeHead(416, { 'Content-Range': `bytes */${fileStat.size}` });
    response.end();
    return;
  }

  const boundedEnd = Math.min(end, fileStat.size - 1);
  response.writeHead(206, {
    ...headers,
    'Content-Length': boundedEnd - start + 1,
    'Content-Range': `bytes ${start}-${boundedEnd}/${fileStat.size}`,
  });
  createReadStream(asset.clipPath, { end: boundedEnd, start }).pipe(response);
}

function sendError(response, statusCode, message) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: message }));
}

export function createClipServer({ buildToken = clipBuildToken } = {}) {
  return createServer(async (request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' });
      response.end();
      return;
    }

    try {
      const clipRequest = parseClipRequest(request.url ?? '/');
      const identity = createClipIdentity(clipRequest, encodingProfileVersion);
      let asset = await loadExistingAsset(identity);
      if (!asset) {
        if (!isBuildAuthorized(request.headers.authorization, buildToken)) {
          sendError(response, 404, '준비된 클립 자산이 없습니다.');
          return;
        }
        asset = await buildClip(clipRequest);
      }
      await sendClip(request, response, asset);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '영상 구간을 준비하지 못했습니다.';
      sendError(response, 502, message);
    }
  });
}

const currentFile = pathToFileURL(fileURLToPath(import.meta.url)).href;
const entryFile = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (currentFile === entryFile) {
  prepareCookies()
    .then(() => {
      const server = createClipServer();
      server.listen(port, host, () => {
        console.info(`ClassicMap video clipper is listening on ${host}:${port}`);
      });
    })
    .catch((error) => {
      console.error('쿠키를 준비하지 못했습니다.', error);
      process.exitCode = 1;
    });
}
