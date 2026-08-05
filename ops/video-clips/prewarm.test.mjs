import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_CLIP_SECONDS,
  createClipUrl,
  parseArgs,
  parseManifest,
  prewarmClip,
  successfulCacheKeys,
} from './prewarm.mjs';

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

test('CLI 기본 동시성은 1이고 보고서 기본 경로를 만든다', () => {
  const options = parseArgs(['--manifest', './clips.jsonl']);

  assert.equal(options.concurrency, 1);
  assert.equal(options.reportPath, `${options.manifestPath}.prewarm-report.json`);
});

test('클립 URL에 원본 타임라인의 시작과 끝을 넣는다', () => {
  const url = createClipUrl('https://example.com/clips', {
    videoId: 'abcdefghijk',
    start: 10.5,
    end: 30.25,
  });

  assert.equal(url, 'https://example.com/clips/abcdefghijk?end=30.25&start=10.5');
});

test('Range 206과 1바이트 응답을 검증한다', async () => {
  const mockFetch = async (_url, options) => {
    assert.equal(options.headers.Range, 'bytes=0-0');
    return new Response(new Uint8Array([0]), {
      status: 206,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes 0-0/1024',
      },
    });
  };

  const result = await prewarmClip(
    'https://example.com/clips',
    {
      cacheKey: 'abcdefghijk:10:20',
      end: 20,
      lines: [1],
      performanceIds: [1],
      start: 10,
      videoId: 'abcdefghijk',
    },
    1000,
    mockFetch
  );

  assert.equal(result.status, 'succeeded');
  assert.equal(result.contentRange, 'bytes 0-0/1024');
});

test('resume은 이전 성공과 건너뛴 캐시키만 재사용한다', () => {
  const keys = successfulCacheKeys({
    results: [
      { cacheKey: 'success', status: 'succeeded' },
      { cacheKey: 'skipped', status: 'skipped' },
      { cacheKey: 'failed', status: 'failed' },
    ],
  });

  assert.deepEqual([...keys], ['success', 'skipped']);
});
