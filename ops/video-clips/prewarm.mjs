#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MAX_CLIP_SECONDS = 600;
const MAX_START_SECONDS = 4 * 60 * 60;
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

function requireValue(args, index, name) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} 값이 필요합니다.`);
  }
  return value;
}

export function parseArgs(args) {
  const options = {
    baseUrl: process.env.VIDEO_CLIP_BASE_URL ?? 'http://127.0.0.1:3200',
    concurrency: DEFAULT_CONCURRENCY,
    manifestPath: undefined,
    reportPath: undefined,
    resume: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--manifest') {
      options.manifestPath = requireValue(args, index, '--manifest');
      index += 1;
    } else if (argument === '--base-url') {
      options.baseUrl = requireValue(args, index, '--base-url');
      index += 1;
    } else if (argument === '--report') {
      options.reportPath = requireValue(args, index, '--report');
      index += 1;
    } else if (argument === '--concurrency') {
      options.concurrency = Number.parseInt(requireValue(args, index, '--concurrency'), 10);
      index += 1;
    } else if (argument === '--timeout-ms') {
      options.timeoutMs = Number.parseInt(requireValue(args, index, '--timeout-ms'), 10);
      index += 1;
    } else if (argument === '--resume') {
      options.resume = true;
    } else if (argument === '--help') {
      options.help = true;
    } else {
      throw new Error(`지원하지 않는 옵션입니다: ${argument}`);
    }
  }

  if (options.help) {
    return options;
  }
  if (!options.manifestPath) {
    throw new Error('--manifest 경로가 필요합니다.');
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error('--concurrency는 1 이상의 정수여야 합니다.');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1) {
    throw new Error('--timeout-ms는 1 이상의 정수여야 합니다.');
  }

  options.manifestPath = resolve(options.manifestPath);
  options.reportPath = resolve(options.reportPath ?? `${options.manifestPath}.prewarm-report.json`);
  options.baseUrl = options.baseUrl.replace(/\/+$/, '');
  return options;
}

function validationError(line, message) {
  return {
    cacheKey: null,
    error: { code: 'INVALID_MANIFEST_ROW', message },
    line,
    performanceIds: [],
    status: 'invalid',
  };
}

function parseManifestRow(value, line) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('JSON 객체여야 합니다.');
  }

  const performanceId = Number(value.performanceId);
  const start = Number(value.start);
  const end = Number(value.end);
  const videoId = value.videoId;
  const duration = end - start;

  if (!Number.isInteger(performanceId) || performanceId <= 0) {
    throw new Error('performanceId는 1 이상의 정수여야 합니다.');
  }
  if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error('videoId는 11자의 유효한 YouTube 영상 ID여야 합니다.');
  }
  if (!Number.isFinite(start) || start < 0 || start > MAX_START_SECONDS) {
    throw new Error(`start는 0~${MAX_START_SECONDS}초 범위여야 합니다.`);
  }
  if (!Number.isFinite(end) || duration <= 0 || duration > MAX_CLIP_SECONDS) {
    throw new Error(`end는 start보다 크고 구간은 ${MAX_CLIP_SECONDS}초 이하여야 합니다.`);
  }

  return {
    cacheKey: `${videoId}:${start}:${end}`,
    end,
    lines: [line],
    performanceIds: [performanceId],
    start,
    videoId,
  };
}

export function parseManifest(content) {
  const clipsByKey = new Map();
  const invalid = [];

  content.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    if (rawLine.trim() === '') {
      return;
    }

    try {
      const clip = parseManifestRow(JSON.parse(rawLine), line);
      const existing = clipsByKey.get(clip.cacheKey);
      if (existing) {
        existing.lines.push(line);
        existing.performanceIds = [...new Set([...existing.performanceIds, ...clip.performanceIds])];
      } else {
        clipsByKey.set(clip.cacheKey, clip);
      }
    } catch (error) {
      const message = error instanceof SyntaxError
        ? `JSON을 해석할 수 없습니다: ${error.message}`
        : error instanceof Error
          ? error.message
          : '알 수 없는 manifest 오류입니다.';
      invalid.push(validationError(line, message));
    }
  });

  return { clips: [...clipsByKey.values()], invalid };
}

export function createClipUrl(baseUrl, clip) {
  const params = new URLSearchParams({ end: String(clip.end), start: String(clip.start) });
  return `${baseUrl}/${encodeURIComponent(clip.videoId)}?${params.toString()}`;
}

export function successfulCacheKeys(report) {
  if (!report || typeof report !== 'object' || !Array.isArray(report.results)) {
    return new Set();
  }

  return new Set(
    report.results
      .filter((result) => ['succeeded', 'skipped'].includes(result.status))
      .map((result) => result.cacheKey)
      .filter((cacheKey) => typeof cacheKey === 'string')
  );
}

async function readResumeKeys(reportPath, resume) {
  if (!resume) {
    return new Set();
  }

  try {
    return successfulCacheKeys(JSON.parse(await readFile(reportPath, 'utf8')));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return new Set();
    }
    throw new Error(`이전 보고서를 읽지 못했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function errorDetails(error) {
  if (error?.name === 'AbortError') {
    return { code: 'TIMEOUT', message: '클립 생성 요청 시간이 초과되었습니다.' };
  }
  if (error instanceof Error) {
    return { code: 'REQUEST_FAILED', message: error.message };
  }
  return { code: 'REQUEST_FAILED', message: '알 수 없는 요청 오류입니다.' };
}

export async function prewarmClip(baseUrl, clip, timeoutMs, fetchImplementation = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = createClipUrl(baseUrl, clip);
  const startedAt = new Date().toISOString();
  const startedTime = Date.now();

  try {
    const response = await fetchImplementation(url, {
      headers: { Range: 'bytes=0-0' },
      signal: controller.signal,
    });
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');
    const body = new Uint8Array(await response.arrayBuffer());

    if (response.status !== 206) {
      const responseText = new TextDecoder().decode(body).slice(0, 500);
      const error = new Error(`HTTP Range 검증에 실패했습니다. (${response.status})${responseText ? ` ${responseText}` : ''}`);
      error.httpStatus = response.status;
      throw error;
    }
    if (acceptRanges !== 'bytes' || !/^bytes 0-0\/\d+$/.test(contentRange ?? '') || body.byteLength !== 1) {
      throw new Error('응답의 Accept-Ranges, Content-Range 또는 본문 길이가 올바르지 않습니다.');
    }

    return {
      cacheKey: clip.cacheKey,
      contentRange,
      durationMs: Date.now() - startedTime,
      finishedAt: new Date().toISOString(),
      lines: clip.lines,
      performanceIds: clip.performanceIds,
      startedAt,
      status: 'succeeded',
      url,
    };
  } catch (error) {
    const details = errorDetails(error);
    if (error && typeof error === 'object' && Number.isInteger(error.httpStatus)) {
      details.httpStatus = error.httpStatus;
    }
    return {
      cacheKey: clip.cacheKey,
      durationMs: Date.now() - startedTime,
      error: details,
      finishedAt: new Date().toISOString(),
      lines: clip.lines,
      performanceIds: clip.performanceIds,
      startedAt,
      status: 'failed',
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function countResults(results) {
  return results.reduce(
    (counts, result) => {
      counts[result.status] += 1;
      return counts;
    },
    { failed: 0, invalid: 0, skipped: 0, succeeded: 0 }
  );
}

async function writeReportAtomic(reportPath, report) {
  const tempPath = `${reportPath}.${process.pid}.tmp`;
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await rename(tempPath, reportPath);
}

async function runWorkers(items, concurrency, worker) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

export async function runPrewarm(options) {
  const manifestContent = await readFile(options.manifestPath, 'utf8');
  const { clips, invalid } = parseManifest(manifestContent);
  const resumeKeys = await readResumeKeys(options.reportPath, options.resume);
  const startedAt = new Date().toISOString();
  const results = [...invalid];
  const pending = [];

  for (const clip of clips) {
    if (resumeKeys.has(clip.cacheKey)) {
      results.push({
        cacheKey: clip.cacheKey,
        lines: clip.lines,
        performanceIds: clip.performanceIds,
        status: 'skipped',
      });
    } else {
      pending.push(clip);
    }
  }

  const buildReport = (completedAt = null) => ({
    baseUrl: options.baseUrl,
    completedAt,
    concurrency: options.concurrency,
    counts: countResults(results),
    manifestPath: options.manifestPath,
    maxClipSeconds: MAX_CLIP_SECONDS,
    reportVersion: 1,
    results,
    resume: options.resume,
    startedAt,
  });

  await writeReportAtomic(options.reportPath, buildReport());
  let reportWrite = Promise.resolve();
  await runWorkers(pending, options.concurrency, async (clip) => {
    results.push(await prewarmClip(options.baseUrl, clip, options.timeoutMs));
    reportWrite = reportWrite.then(() => writeReportAtomic(options.reportPath, buildReport()));
    await reportWrite;
  });

  const report = buildReport(new Date().toISOString());
  await writeReportAtomic(options.reportPath, report);
  return report;
}

function printHelp() {
  console.info(`사용법:
  node ops/video-clips/prewarm.mjs --manifest <clips.jsonl> [옵션]

옵션:
  --base-url <url>       클리퍼 주소 (기본: VIDEO_CLIP_BASE_URL 또는 http://127.0.0.1:3200)
  --report <path>        JSON 검증 보고서 경로
  --concurrency <n>      동시 요청 수 (기본: 1)
  --timeout-ms <n>       클립 하나의 제한 시간 (기본: ${DEFAULT_TIMEOUT_MS})
  --resume               이전 성공 항목을 보고서에서 읽어 건너뜁니다.
  --help                 도움말을 표시합니다.`);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }

    const report = await runPrewarm(options);
    console.info(`클립 선생성 완료: 성공 ${report.counts.succeeded}, 재사용 ${report.counts.skipped}, 실패 ${report.counts.failed}, 입력 오류 ${report.counts.invalid}`);
    console.info(`검증 보고서: ${options.reportPath}`);
    if (report.counts.failed > 0 || report.counts.invalid > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

const currentFile = pathToFileURL(fileURLToPath(import.meta.url)).href;
const entryFile = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (currentFile === entryFile) {
  await main();
}
