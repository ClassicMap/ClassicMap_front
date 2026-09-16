#!/usr/bin/env node

import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MAX_CLIP_SECONDS = 600;
export const DEFAULT_ENCODING_PROFILE_VERSION = 'v1-copy';
export const SELF_HOSTED_RIGHTS_MODES = new Set([
  'licensed_self_hosted',
  'permission_granted',
  'public_domain',
]);
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

function isLocalIpv4(hostname) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return false;
  }
  const [first, second, ...rest] = hostname
    .split('.')
    .map((value) => Number.parseInt(value, 10));
  if ([first, second, ...rest].some((value) => value < 0 || value > 255)) {
    return false;
  }
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isLocalHostname(hostname) {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  const mappedHexIpv4 = mappedHex
    ? [Number.parseInt(mappedHex[1], 16), Number.parseInt(mappedHex[2], 16)]
        .flatMap((value) => [value >> 8, value & 0xff])
        .join('.')
    : undefined;
  const firstIpv6Segment = normalized.includes(':')
    ? Number.parseInt(normalized.split(':', 1)[0], 16)
    : Number.NaN;
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    isLocalIpv4(normalized) ||
    (mappedIpv4 !== undefined && isLocalIpv4(mappedIpv4)) ||
    (mappedHexIpv4 !== undefined && isLocalIpv4(mappedHexIpv4)) ||
    (normalized.includes(':') && normalized.startsWith('fc')) ||
    (normalized.includes(':') && normalized.startsWith('fd')) ||
    (Number.isInteger(firstIpv6Segment) && (firstIpv6Segment & 0xffc0) === 0xfe80)
  );
}

export function parseArgs(args) {
  const options = {
    baseUrl: process.env.VIDEO_CLIP_BASE_URL ?? 'http://127.0.0.1:3200',
    bundlePath: undefined,
    buildToken: process.env.VIDEO_CLIP_BUILD_TOKEN?.trim(),
    concurrency: DEFAULT_CONCURRENCY,
    encodingProfileVersion:
      process.env.CLIP_ENCODING_PROFILE_VERSION ?? DEFAULT_ENCODING_PROFILE_VERSION,
    manifestPath: undefined,
    publicBaseUrl: process.env.VIDEO_CLIP_PUBLIC_BASE_URL,
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
    } else if (argument === '--public-base-url') {
      options.publicBaseUrl = requireValue(args, index, '--public-base-url');
      index += 1;
    } else if (argument === '--report') {
      options.reportPath = requireValue(args, index, '--report');
      index += 1;
    } else if (argument === '--bundle') {
      options.bundlePath = requireValue(args, index, '--bundle');
      index += 1;
    } else if (argument === '--encoding-profile-version') {
      options.encodingProfileVersion = requireValue(args, index, '--encoding-profile-version');
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
  if (!/^[a-z0-9][a-z0-9._-]{0,31}$/.test(options.encodingProfileVersion)) {
    throw new Error('--encoding-profile-version 값이 올바르지 않습니다.');
  }
  if (typeof options.buildToken !== 'string' || options.buildToken.length < 32) {
    throw new Error('VIDEO_CLIP_BUILD_TOKEN에는 32자 이상의 생성 전용 토큰이 필요합니다.');
  }

  options.manifestPath = resolve(options.manifestPath);
  options.reportPath = resolve(options.reportPath ?? `${options.manifestPath}.prewarm-report.json`);
  options.bundlePath = resolve(
    options.bundlePath ?? `${options.manifestPath}.clip-assets.jsonl`
  );
  options.baseUrl = options.baseUrl.replace(/\/+$/, '');
  if (!options.publicBaseUrl) {
    try {
      const requestUrl = new URL(options.baseUrl);
      if (requestUrl.protocol === 'https:' && !isLocalHostname(requestUrl.hostname)) {
        options.publicBaseUrl = options.baseUrl;
      }
    } catch {
      // 아래 공개 URL 검증에서 일관된 오류를 반환합니다.
    }
  }
  try {
    const publicUrl = new URL(options.publicBaseUrl);
    if (
      publicUrl.protocol !== 'https:' ||
      isLocalHostname(publicUrl.hostname) ||
      publicUrl.username !== '' ||
      publicUrl.password !== '' ||
      publicUrl.search !== '' ||
      publicUrl.hash !== ''
    ) {
      throw new Error();
    }
    options.publicBaseUrl = options.publicBaseUrl.replace(/\/+$/, '');
  } catch {
    throw new Error(
      '--public-base-url에는 외부에서 접근 가능한 HTTPS 클립 기본 주소가 필요합니다.'
    );
  }
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

function parseManifestRow(value, line, encodingProfileVersion) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('JSON 객체여야 합니다.');
  }

  const performanceId = Number(value.performanceId);
  const start = Number(value.start);
  const end = Number(value.end);
  const videoId = value.videoId;
  const duration = end - start;
  const candidateStatus = value.candidateStatus;
  const rightsMode = value.rightsMode;
  const rightsReviewedAt = value.rightsReviewedAt;
  const rightsEvidence = value.rightsEvidence;

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
  if (candidateStatus !== 'APPROVED') {
    throw new Error('candidateStatus가 APPROVED인 후보만 선생성할 수 있습니다.');
  }
  if (!SELF_HOSTED_RIGHTS_MODES.has(rightsMode)) {
    throw new Error('자체 호스팅 권리가 검증된 rightsMode가 필요합니다.');
  }
  if (typeof rightsReviewedAt !== 'string' || Number.isNaN(Date.parse(rightsReviewedAt))) {
    throw new Error('유효한 rightsReviewedAt이 필요합니다.');
  }
  if (typeof rightsEvidence !== 'string' || rightsEvidence.trim() === '') {
    throw new Error('자체 호스팅 권리 근거인 rightsEvidence가 필요합니다.');
  }

  return {
    cacheKey: `${videoId}:${start}:${end}:${encodingProfileVersion}`,
    encodingProfileVersion,
    end,
    lines: [line],
    performanceIds: [performanceId],
    rightsEvidence: rightsEvidence.trim(),
    rightsMode,
    rightsReviewedAt,
    start,
    videoId,
  };
}

export function parseManifest(
  content,
  encodingProfileVersion = DEFAULT_ENCODING_PROFILE_VERSION
) {
  const clipsByKey = new Map();
  const cacheKeyByPerformanceId = new Map();
  const invalid = [];

  content.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    if (rawLine.trim() === '') {
      return;
    }

    try {
      const clip = parseManifestRow(JSON.parse(rawLine), line, encodingProfileVersion);
      const performanceId = clip.performanceIds[0];
      const previousCacheKey = cacheKeyByPerformanceId.get(performanceId);
      if (previousCacheKey && previousCacheKey !== clip.cacheKey) {
        throw new Error(
          `performanceId ${performanceId}가 서로 다른 클립에 중복 지정되었습니다.`
        );
      }
      cacheKeyByPerformanceId.set(performanceId, clip.cacheKey);
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
  const params = new URLSearchParams({
    end: String(clip.end),
    profile: clip.encodingProfileVersion ?? DEFAULT_ENCODING_PROFILE_VERSION,
    start: String(clip.start),
  });
  return `${baseUrl}/${encodeURIComponent(clip.videoId)}?${params.toString()}`;
}

function hasVerifiedAssetMetadata(result) {
  return (
    result &&
    typeof result.storageKey === 'string' &&
    /^[a-f0-9]{64}$/.test(result.sha256 ?? '') &&
    Number.isInteger(result.fileSize) &&
    result.fileSize > 0 &&
    Number.isInteger(result.probedDurationMs) &&
    result.probedDurationMs > 0 &&
    typeof result.encodingProfileVersion === 'string' &&
    typeof result.assetValidatedAt === 'string' &&
    typeof result.rangeVerifiedAt === 'string' &&
    typeof result.url === 'string' &&
    typeof result.publicUrl === 'string' &&
    result.publicUrl.includes(`profile=${encodeURIComponent(result.encodingProfileVersion)}`)
  );
}

export function successfulResultsByCacheKey(report) {
  if (!report || typeof report !== 'object' || !Array.isArray(report.results)) {
    return new Map();
  }

  return new Map(
    report.results
      .filter(
        (result) =>
          ['succeeded', 'skipped'].includes(result.status) &&
          typeof result.cacheKey === 'string' &&
          hasVerifiedAssetMetadata(result)
      )
      .map((result) => [result.cacheKey, result])
  );
}

export function successfulCacheKeys(report) {
  return new Set(successfulResultsByCacheKey(report).keys());
}

async function readResumeResults(reportPath, resume) {
  if (!resume) {
    return new Map();
  }

  try {
    return successfulResultsByCacheKey(JSON.parse(await readFile(reportPath, 'utf8')));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return new Map();
    }
    throw new Error(`이전 보고서를 읽지 못했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function requireHeader(response, name) {
  const value = response.headers.get(name);
  if (!value) {
    throw new Error(`클립 메타데이터 헤더가 없습니다: ${name}`);
  }
  return value;
}

function parsePositiveIntegerHeader(response, name) {
  const raw = requireHeader(response, name);
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`클립 메타데이터 헤더가 올바르지 않습니다: ${name}`);
  }
  return value;
}

function parseAssetHeaders(response, clip, contentRange) {
  const storageKey = requireHeader(response, 'x-classicmap-clip-storage-key');
  const sha256 = requireHeader(response, 'x-classicmap-clip-sha256');
  const fileSize = parsePositiveIntegerHeader(response, 'x-classicmap-clip-file-size');
  const probedDurationMs = parsePositiveIntegerHeader(
    response,
    'x-classicmap-clip-duration-ms'
  );
  const responseProfile = requireHeader(
    response,
    'x-classicmap-clip-encoding-profile'
  );
  const assetValidatedAt = requireHeader(
    response,
    'x-classicmap-clip-asset-validated-at'
  );
  const contentRangeSize = Number(contentRange.match(/\/(\d+)$/)?.[1]);

  if (
    !/^[A-Za-z0-9_.-]+\.mp4$/.test(storageKey) ||
    storageKey.includes('..') ||
    storageKey.includes('/')
  ) {
    throw new Error('클립 storageKey가 올바르지 않습니다.');
  }
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error('클립 SHA-256 값이 올바르지 않습니다.');
  }
  if (fileSize !== contentRangeSize) {
    throw new Error('클립 파일 크기와 Content-Range 전체 크기가 다릅니다.');
  }
  if (
    probedDurationMs > MAX_CLIP_SECONDS * 1000 + 5000 ||
    Math.abs(probedDurationMs - (clip.end - clip.start) * 1000) >
      Math.max(3000, (clip.end - clip.start) * 1000 * 0.03)
  ) {
    throw new Error('검증된 클립 길이가 manifest 요청과 다릅니다.');
  }
  if (responseProfile !== clip.encodingProfileVersion) {
    throw new Error(
      `클립 인코딩 프로필이 다릅니다. (요청 ${clip.encodingProfileVersion}, 응답 ${responseProfile})`
    );
  }
  if (Number.isNaN(Date.parse(assetValidatedAt))) {
    throw new Error('클립 자산 검증 시각이 올바르지 않습니다.');
  }

  return {
    assetValidatedAt,
    encodingProfileVersion: responseProfile,
    fileSize,
    probedDurationMs,
    sha256,
    storageKey,
  };
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

export async function prewarmClip(
  baseUrl,
  clip,
  timeoutMs,
  buildToken,
  fetchImplementation = fetch
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = createClipUrl(baseUrl, clip);
  const startedAt = new Date().toISOString();
  const startedTime = Date.now();

  try {
    const response = await fetchImplementation(url, {
      headers: {
        Authorization: `Bearer ${buildToken}`,
        Range: 'bytes=0-0',
      },
      signal: controller.signal,
    });
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    if (response.status !== 206) {
      const contentType = response.headers.get('content-type') ?? '';
      const responseText = /application\/json|text\//i.test(contentType)
        ? (await response.text()).slice(0, 500)
        : '';
      if (!responseText) {
        await response.body?.cancel();
      }
      const error = new Error(`HTTP Range 검증에 실패했습니다. (${response.status})${responseText ? ` ${responseText}` : ''}`);
      error.httpStatus = response.status;
      throw error;
    }

    const body = new Uint8Array(await response.arrayBuffer());
    if (acceptRanges !== 'bytes' || !/^bytes 0-0\/\d+$/.test(contentRange ?? '') || body.byteLength !== 1) {
      throw new Error('응답의 Accept-Ranges, Content-Range 또는 본문 길이가 올바르지 않습니다.');
    }
    const assetMetadata = parseAssetHeaders(response, clip, contentRange);
    // assetValidatedAt 은 클리퍼 서버 시계, 검증 시각은 이 프로세스 시계다.
    // 두 시계가 조금 어긋나면 순서가 뒤집혀 보이므로 자산 검증 시각 아래로는
    // 내려가지 않게 맞춘다. 검증은 언제나 자산이 준비된 뒤에 일어난다.
    const rangeVerifiedAt = new Date(
      Math.max(Date.now(), Date.parse(assetMetadata.assetValidatedAt))
    ).toISOString();

    return {
      ...assetMetadata,
      cacheKey: clip.cacheKey,
      contentRange,
      durationMs: Date.now() - startedTime,
      finishedAt: new Date().toISOString(),
      lines: clip.lines,
      performanceIds: clip.performanceIds,
      rangeVerifiedAt,
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

export function createAssetBundleRows(report) {
  const rows = [];
  for (const result of report.results ?? []) {
    if (
      !['succeeded', 'skipped'].includes(result.status) ||
      !hasVerifiedAssetMetadata(result)
    ) {
      continue;
    }
    for (const performanceId of result.performanceIds ?? []) {
      rows.push({
        assetValidatedAt: result.assetValidatedAt,
        encodingProfileVersion: result.encodingProfileVersion,
        fileSize: result.fileSize,
        performanceId,
        probedDurationMs: result.probedDurationMs,
        publicUrl: result.publicUrl,
        rangeVerifiedAt: result.rangeVerifiedAt,
        sha256: result.sha256,
        storageKey: result.storageKey,
      });
    }
  }

  return rows.sort(
    (left, right) =>
      left.performanceId - right.performanceId ||
      left.storageKey.localeCompare(right.storageKey)
  );
}

export function serializeAssetBundle(report) {
  const rows = createAssetBundleRows(report);
  return rows.length > 0 ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '';
}

async function writeTextAtomic(outputPath, contents) {
  const tempPath = `${outputPath}.${process.pid}.tmp`;
  await mkdir(dirname(outputPath), { recursive: true });
  try {
    await writeFile(tempPath, contents, 'utf8');
    await rename(tempPath, outputPath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
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

export async function runPrewarm(options, fetchImplementation = fetch) {
  const manifestContent = await readFile(options.manifestPath, 'utf8');
  const { clips, invalid } = parseManifest(
    manifestContent,
    options.encodingProfileVersion
  );
  const resumeResults = await readResumeResults(options.reportPath, options.resume);
  const startedAt = new Date().toISOString();
  const results = [...invalid];
  const pending = [];

  for (const clip of clips) {
    const previousResult = resumeResults.get(clip.cacheKey);
    if (previousResult) {
      results.push({
        ...previousResult,
        cacheKey: clip.cacheKey,
        lines: clip.lines,
        performanceIds: clip.performanceIds,
        status: 'skipped',
        publicUrl: createClipUrl(options.publicBaseUrl, clip),
        url: createClipUrl(options.baseUrl, clip),
      });
    } else {
      pending.push(clip);
    }
  }

  const buildReport = (completedAt = null) => ({
    baseUrl: options.baseUrl,
    bundlePath: options.bundlePath,
    completedAt,
    concurrency: options.concurrency,
    counts: countResults(results),
    encodingProfileVersion: options.encodingProfileVersion,
    manifestPath: options.manifestPath,
    maxClipSeconds: MAX_CLIP_SECONDS,
    publicBaseUrl: options.publicBaseUrl,
    reportVersion: 2,
    results,
    resume: options.resume,
    startedAt,
  });

  const writeCheckpoint = async (completedAt = null) => {
    const report = buildReport(completedAt);
    await writeTextAtomic(
      options.reportPath,
      `${JSON.stringify(report, null, 2)}\n`
    );
    const isPublishable =
      completedAt !== null &&
      report.counts.failed === 0 &&
      report.counts.invalid === 0;
    if (isPublishable) {
      await writeTextAtomic(options.bundlePath, serializeAssetBundle(report));
    } else {
      await unlink(options.bundlePath).catch(() => undefined);
    }
    return report;
  };

  await writeCheckpoint();
  let reportWrite = Promise.resolve();
  await runWorkers(pending, options.concurrency, async (clip) => {
    const result = await prewarmClip(
      options.baseUrl,
      clip,
      options.timeoutMs,
      options.buildToken,
      fetchImplementation
    );
    result.publicUrl = createClipUrl(options.publicBaseUrl, clip);
    results.push(result);
    reportWrite = reportWrite.then(() => writeCheckpoint());
    await reportWrite;
  });

  return writeCheckpoint(new Date().toISOString());
}

function printHelp() {
  console.info(`사용법:
  node ops/video-clips/prewarm.mjs --manifest <clips.jsonl> [옵션]

옵션:
  --base-url <url>       클리퍼 주소 (기본: VIDEO_CLIP_BASE_URL 또는 http://127.0.0.1:3200)
  --public-base-url <url>
                         backend public_url에 저장할 외부 HTTPS 기본 주소
  --report <path>        JSON 검증 보고서 경로
  --bundle <path>        clip_assets 적재용 JSONL 경로
  --encoding-profile-version <version>
                         기대하는 인코딩 프로필 (기본: ${DEFAULT_ENCODING_PROFILE_VERSION})
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
    console.info(`clip_assets 적재 번들: ${options.bundlePath}`);
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
