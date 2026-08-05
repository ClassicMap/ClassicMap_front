import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_ENCODING_PROFILE_VERSION = 'v1-copy';
export const MAX_CLIP_SECONDS = 600;

const SUPPORTED_ENCODING_PROFILES = new Set([DEFAULT_ENCODING_PROFILE_VERSION]);
const cacheDirectory = process.env.CLIP_CACHE_DIR ?? '/var/cache/classicmap-video-clips';
const invidiousApiBase = process.env.INVIDIOUS_API_BASE ?? 'http://127.0.0.1:3100';
const port = Number.parseInt(process.env.CLIP_PORT ?? '3200', 10);
const maxStartSeconds = 4 * 60 * 60;
const encodingProfileVersion =
  process.env.CLIP_ENCODING_PROFILE_VERSION ?? DEFAULT_ENCODING_PROFILE_VERSION;
const activeBuilds = new Map();

if (!SUPPORTED_ENCODING_PROFILES.has(encodingProfileVersion)) {
  throw new Error(`지원하지 않는 인코딩 프로필입니다: ${encodingProfileVersion}`);
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

async function getSourceUrl(videoId) {
  const response = await fetch(`${invidiousApiBase}/api/v1/videos/${encodeURIComponent(videoId)}`);

  if (!response.ok) {
    throw new Error(`영상 정보를 불러오지 못했습니다. (${response.status})`);
  }

  return selectStream(await response.json()).url;
}

function runFfmpeg(sourceUrl, start, duration, outputPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const process = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(start),
      '-i',
      sourceUrl,
      '-t',
      String(duration),
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      '-avoid_negative_ts',
      'make_zero',
      '-y',
      outputPath,
    ]);
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
      const sourceUrl = await getSourceUrl(clipRequest.videoId);
      await runFfmpeg(sourceUrl, clipRequest.start, clipRequest.duration, tempPath);
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

export function createClipServer() {
  return createServer(async (request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' });
      response.end();
      return;
    }

    try {
      const clipRequest = parseClipRequest(request.url ?? '/');
      const asset = await buildClip(clipRequest);
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
  const server = createClipServer();
  server.listen(port, '127.0.0.1', () => {
    console.info(`ClassicMap video clipper is listening on 127.0.0.1:${port}`);
  });
}
