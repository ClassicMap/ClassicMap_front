import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';

const cacheDirectory = process.env.CLIP_CACHE_DIR ?? '/var/cache/classicmap-video-clips';
const invidiousApiBase = process.env.INVIDIOUS_API_BASE ?? 'http://127.0.0.1:3100';
const port = Number.parseInt(process.env.CLIP_PORT ?? '3200', 10);
const maxClipSeconds = 120;
const maxStartSeconds = 4 * 60 * 60;
const activeBuilds = new Map();

function selectStream(video) {
  const candidates = (video.formatStreams ?? []).filter(
    (stream) => typeof stream.url === 'string' && stream.url.length > 0 && stream.type?.startsWith('video/')
  );

  if (candidates.length === 0) {
    throw new Error('재생 가능한 영상 스트림이 없어.');
  }

  return candidates.sort((left, right) => qualityRank(right) - qualityRank(left))[0];
}

function qualityRank(stream) {
  const quality = stream.qualityLabel ?? stream.quality ?? '';
  const match = quality.match(/(\d{3,4})p/i);

  return match ? Number.parseInt(match[1], 10) : 0;
}

function parseClipRequest(requestUrl) {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  const videoId = url.pathname.slice(1);
  const start = Number(url.searchParams.get('start'));
  const end = Number(url.searchParams.get('end'));
  const duration = end - start;

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error('유효하지 않은 영상 ID야.');
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > maxStartSeconds) {
    throw new Error('유효하지 않은 영상 구간이야.');
  }

  if (duration <= 0 || duration > maxClipSeconds) {
    throw new Error(`영상 구간은 ${maxClipSeconds}초 이하여야 해.`);
  }

  return { duration, end, start, videoId };
}

async function getSourceUrl(videoId) {
  const response = await fetch(`${invidiousApiBase}/api/v1/videos/${encodeURIComponent(videoId)}`);

  if (!response.ok) {
    throw new Error(`영상 정보를 불러오지 못했어. (${response.status})`);
  }

  return selectStream(await response.json()).url;
}

function runFfmpeg(sourceUrl, start, duration, outputPath) {
  return new Promise((resolve, reject) => {
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
      stderr = `${stderr}${chunk}`.slice(-2000);
    });
    process.on('error', reject);
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `FFmpeg가 종료됐어. (${code})`));
    });
  });
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function buildClip({ duration, start, videoId }) {
  const fileName = `${videoId}-${Math.round(start * 1000)}-${Math.round(duration * 1000)}.mp4`;
  const outputPath = join(cacheDirectory, fileName);

  if (await fileExists(outputPath)) {
    return outputPath;
  }

  const existingBuild = activeBuilds.get(fileName);
  if (existingBuild) {
    return existingBuild;
  }

  const build = (async () => {
    await mkdir(cacheDirectory, { recursive: true });
    const tempPath = `${outputPath}.${process.pid}.tmp.mp4`;

    try {
      const sourceUrl = await getSourceUrl(videoId);
      await runFfmpeg(sourceUrl, start, duration, tempPath);
      await rename(tempPath, outputPath);
      return outputPath;
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    } finally {
      activeBuilds.delete(fileName);
    }
  })();

  activeBuilds.set(fileName, build);
  return build;
}

async function sendClip(request, response, clipPath) {
  const metadata = await stat(clipPath);
  const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  const headers = {
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=2592000, immutable',
    'Content-Type': 'video/mp4',
  };

  if (!range) {
    response.writeHead(200, { ...headers, 'Content-Length': metadata.size });
    createReadStream(clipPath).pipe(response);
    return;
  }

  const start = range[1] === '' ? 0 : Number.parseInt(range[1], 10);
  const end = range[2] === '' ? metadata.size - 1 : Number.parseInt(range[2], 10);

  if (start >= metadata.size || end < start) {
    response.writeHead(416, { 'Content-Range': `bytes */${metadata.size}` });
    response.end();
    return;
  }

  const boundedEnd = Math.min(end, metadata.size - 1);
  response.writeHead(206, {
    ...headers,
    'Content-Length': boundedEnd - start + 1,
    'Content-Range': `bytes ${start}-${boundedEnd}/${metadata.size}`,
  });
  createReadStream(clipPath, { end: boundedEnd, start }).pipe(response);
}

function sendError(response, statusCode, message) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: message }));
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET') {
    response.writeHead(405, { Allow: 'GET' });
    response.end();
    return;
  }

  try {
    const clipRequest = parseClipRequest(request.url ?? '/');
    const clipPath = await buildClip(clipRequest);
    await sendClip(request, response, clipPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : '영상 구간을 준비하지 못했어.';
    sendError(response, 502, message);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.info(`ClassicMap video clipper is listening on 127.0.0.1:${port}`);
});
