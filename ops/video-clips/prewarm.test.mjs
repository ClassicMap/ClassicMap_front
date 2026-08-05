import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  MAX_CLIP_SECONDS,
  createAssetBundleRows,
  createClipUrl,
  parseArgs,
  parseManifest,
  prewarmClip,
  runPrewarm,
  serializeAssetBundle,
  successfulCacheKeys,
} from './prewarm.mjs';

const VERIFIED_ASSET = {
  assetValidatedAt: '2026-08-05T00:00:00.000Z',
  encodingProfileVersion: 'v1-copy',
  fileSize: 1024,
  probedDurationMs: 10_000,
  rangeVerifiedAt: '2026-08-05T00:01:00.000Z',
  sha256: 'a'.repeat(64),
  storageKey: 'abcdefghijk-10000-10000-v1-copy.mp4',
};

function testClip() {
  return {
    cacheKey: 'abcdefghijk:10:20:v1-copy',
    encodingProfileVersion: 'v1-copy',
    end: 20,
    lines: [1],
    performanceIds: [1],
    start: 10,
    videoId: 'abcdefghijk',
  };
}

function successfulRangeResponse() {
  return new Response(new Uint8Array([0]), {
    status: 206,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Range': 'bytes 0-0/1024',
      'X-ClassicMap-Clip-Asset-Validated-At': VERIFIED_ASSET.assetValidatedAt,
      'X-ClassicMap-Clip-Duration-Ms': String(VERIFIED_ASSET.probedDurationMs),
      'X-ClassicMap-Clip-Encoding-Profile': VERIFIED_ASSET.encodingProfileVersion,
      'X-ClassicMap-Clip-File-Size': String(VERIFIED_ASSET.fileSize),
      'X-ClassicMap-Clip-Sha256': VERIFIED_ASSET.sha256,
      'X-ClassicMap-Clip-Storage-Key': VERIFIED_ASSET.storageKey,
    },
  });
}

test('manifest를 검증하고 동일 클립을 하나로 합친다', () => {
  const content = [
    JSON.stringify({ performanceId: 11, videoId: 'abcdefghijk', start: 10, end: 70 }),
    JSON.stringify({ performanceId: 12, videoId: 'abcdefghijk', start: 10, end: 70 }),
    JSON.stringify({ performanceId: 13, videoId: 'abcdefghijk', start: 0, end: MAX_CLIP_SECONDS + 1 }),
    '{broken',
  ].join('\n');

  const parsed = parseManifest(content);

  assert.equal(parsed.clips.length, 1);
  assert.deepEqual(parsed.clips[0].performanceIds, [11, 12]);
  assert.deepEqual(parsed.clips[0].lines, [1, 2]);
  assert.equal(parsed.invalid.length, 2);
  assert.deepEqual(parsed.invalid.map((item) => item.line), [3, 4]);
});

test('같은 performanceId가 서로 다른 클립에 있으면 입력 오류로 분리한다', () => {
  const parsed = parseManifest(
    [
      JSON.stringify({ performanceId: 11, videoId: 'abcdefghijk', start: 10, end: 20 }),
      JSON.stringify({ performanceId: 11, videoId: 'lmnopqrstuv', start: 10, end: 20 }),
    ].join('\n')
  );

  assert.equal(parsed.clips.length, 1);
  assert.equal(parsed.invalid.length, 1);
  assert.match(parsed.invalid[0].error.message, /서로 다른 클립/);
});

test('CLI 기본 동시성은 1이고 보고서 기본 경로를 만든다', () => {
  const options = parseArgs(['--manifest', './clips.jsonl']);

  assert.equal(options.concurrency, 1);
  assert.equal(options.reportPath, `${options.manifestPath}.prewarm-report.json`);
  assert.equal(options.bundlePath, `${options.manifestPath}.clip-assets.jsonl`);
  assert.equal(options.encodingProfileVersion, 'v1-copy');
});

test('클립 URL에 원본 타임라인의 시작과 끝을 넣는다', () => {
  const url = createClipUrl('https://example.com/clips', {
    encodingProfileVersion: 'v1-copy',
    videoId: 'abcdefghijk',
    start: 10.5,
    end: 30.25,
  });

  assert.equal(
    url,
    'https://example.com/clips/abcdefghijk?end=30.25&profile=v1-copy&start=10.5'
  );
});

test('Range 206과 1바이트 응답을 검증한다', async () => {
  const mockFetch = async (_url, options) => {
    assert.equal(options.headers.Range, 'bytes=0-0');
    return successfulRangeResponse();
  };

  const result = await prewarmClip(
    'https://example.com/clips',
    testClip(),
    1000,
    mockFetch
  );

  assert.equal(result.status, 'succeeded');
  assert.equal(result.contentRange, 'bytes 0-0/1024');
  assert.equal(result.storageKey, VERIFIED_ASSET.storageKey);
  assert.equal(result.sha256, VERIFIED_ASSET.sha256);
  assert.equal(result.fileSize, VERIFIED_ASSET.fileSize);
  assert.equal(result.probedDurationMs, VERIFIED_ASSET.probedDurationMs);
  assert.equal(result.encodingProfileVersion, VERIFIED_ASSET.encodingProfileVersion);
  assert.equal(typeof result.rangeVerifiedAt, 'string');
});

test('Range가 무시된 전체 영상 응답은 본문을 내려받지 않고 중단한다', async () => {
  let cancelled = false;
  const mockFetch = async () => ({
    body: {
      async cancel() {
        cancelled = true;
      },
    },
    headers: new Headers({ 'Content-Type': 'video/mp4' }),
    status: 200,
    async text() {
      throw new Error('영상 본문을 읽으면 안 됩니다.');
    },
  });

  const result = await prewarmClip(
    'https://example.com/clips',
    testClip(),
    1000,
    mockFetch
  );

  assert.equal(result.status, 'failed');
  assert.equal(result.error.httpStatus, 200);
  assert.equal(cancelled, true);
});

test('resume은 이전 성공과 건너뛴 캐시키만 재사용한다', () => {
  const keys = successfulCacheKeys({
    results: [
      { ...VERIFIED_ASSET, cacheKey: 'success', status: 'succeeded' },
      { ...VERIFIED_ASSET, cacheKey: 'skipped', status: 'skipped' },
      { ...VERIFIED_ASSET, cacheKey: 'failed', status: 'failed' },
      { cacheKey: 'old-report-without-metadata', status: 'succeeded' },
    ],
  });

  assert.deepEqual([...keys], ['success', 'skipped']);
});

test('검증 보고서에서 performanceId 순서의 결정적 clip_assets 번들을 만든다', () => {
  const report = {
    results: [
      {
        ...VERIFIED_ASSET,
        cacheKey: 'asset-b',
        performanceIds: [20, 10],
        status: 'succeeded',
      },
      {
        cacheKey: 'failed',
        performanceIds: [30],
        status: 'failed',
      },
    ],
  };

  const rows = createAssetBundleRows(report);
  assert.deepEqual(rows.map((row) => row.performanceId), [10, 20]);
  assert.equal(rows[0].storageKey, VERIFIED_ASSET.storageKey);
  assert.equal(
    serializeAssetBundle(report),
    `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`
  );
});

test('prewarm 실행은 보고서와 적재 번들을 원자적으로 만들고 resume에서 재사용한다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'classicmap-prewarm-test-'));
  const manifestPath = join(directory, 'clips.jsonl');
  const reportPath = join(directory, 'report.json');
  const bundlePath = join(directory, 'bundle.jsonl');
  await writeFile(
    manifestPath,
    `${JSON.stringify({ performanceId: 1, videoId: 'abcdefghijk', start: 10, end: 20 })}\n`
  );

  try {
    const options = parseArgs([
      '--manifest',
      manifestPath,
      '--report',
      reportPath,
      '--bundle',
      bundlePath,
    ]);
    const firstReport = await runPrewarm(options, async () => successfulRangeResponse());
    const bundle = await readFile(bundlePath, 'utf8');

    assert.equal(firstReport.counts.succeeded, 1);
    assert.equal(JSON.parse(bundle).performanceId, 1);
    assert.equal(JSON.parse(bundle).storageKey, VERIFIED_ASSET.storageKey);

    const resumedReport = await runPrewarm(
      { ...options, resume: true },
      async () => {
        throw new Error('resume 항목을 다시 요청하면 안 됩니다.');
      }
    );
    assert.equal(resumedReport.counts.skipped, 1);
    assert.equal(resumedReport.results[0].rangeVerifiedAt, firstReport.results[0].rangeVerifiedAt);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
