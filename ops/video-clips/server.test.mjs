import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  DEFAULT_ENCODING_PROFILE_VERSION,
  createClipIdentity,
  describeClipAsset,
  ffmpegCutArgs,
  isBuildAuthorized,
  isSourceStale,
  metadataHeaders,
  parseClipRequest,
  parseProbeOutput,
  sourceFileName,
} from './server.mjs';

test('클립 생성은 32자 이상의 생성 전용 토큰으로만 허용한다', () => {
  const token = 'test-build-token-0123456789abcdef';

  assert.equal(isBuildAuthorized(`Bearer ${token}`, token), true);
  assert.equal(isBuildAuthorized('Bearer wrong-token', token), false);
  assert.equal(isBuildAuthorized(undefined, token), false);
  assert.equal(isBuildAuthorized('Bearer short', 'short'), false);
});

test('인코딩 프로필을 포함한 결정적 저장 키를 만든다', () => {
  const identity = createClipIdentity({
    duration: 40,
    start: 1335,
    videoId: 'abcdefghijk',
  });

  assert.equal(identity.storageKey, 'abcdefghijk-1335000-40000-v1-copy.mp4');
  assert.equal(identity.metadataKey, 'abcdefghijk-1335000-40000-v1-copy.metadata.json');
  assert.equal(identity.legacyStorageKey, 'abcdefghijk-1335000-40000.mp4');
  assert.equal(identity.encodingProfileVersion, DEFAULT_ENCODING_PROFILE_VERSION);
});

test('요청 프로필과 서버 프로필이 다르면 거부한다', () => {
  assert.throws(
    () => parseClipRequest('/abcdefghijk?start=0&end=10&profile=v2-reencode'),
    /제공할 수 없습니다/
  );
});

test('FFprobe에서 비디오 스트림과 실제 길이를 검증한다', () => {
  const parsed = parseProbeOutput(
    JSON.stringify({
      format: { duration: '40.010' },
      streams: [
        { codec_name: 'h264', codec_type: 'video' },
        { codec_name: 'aac', codec_type: 'audio' },
      ],
    }),
    40_000
  );

  assert.deepEqual(parsed, {
    audioCodec: 'aac',
    probedDurationMs: 40_010,
    videoCodec: 'h264',
  });
});

test('비디오 스트림이 없거나 길이가 다르면 검증을 실패한다', () => {
  assert.throws(
    () =>
      parseProbeOutput(
        JSON.stringify({
          format: { duration: '40' },
          streams: [{ codec_name: 'aac', codec_type: 'audio' }],
        }),
        40_000
      ),
    /비디오 스트림/
  );
  assert.throws(
    () =>
      parseProbeOutput(
        JSON.stringify({
          format: { duration: '50' },
          streams: [{ codec_name: 'h264', codec_type: 'video' }],
        }),
        40_000
      ),
    /실제 클립 길이/
  );
});

test('자산 메타데이터에 해시와 파일 크기를 기록하고 경로는 노출하지 않는다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'classicmap-clip-test-'));
  const clipPath = join(directory, 'private-path.mp4');
  const contents = Buffer.from('verified clip bytes');
  await writeFile(clipPath, contents);

  try {
    const identity = createClipIdentity({
      duration: 40,
      start: 1335,
      videoId: 'abcdefghijk',
    });
    const metadata = await describeClipAsset(
      clipPath,
      identity,
      async () =>
        JSON.stringify({
          format: { duration: '40' },
          streams: [{ codec_name: 'h264', codec_type: 'video' }],
        })
    );
    const headers = metadataHeaders(metadata);

    assert.equal(metadata.fileSize, contents.byteLength);
    assert.equal(
      metadata.sha256,
      createHash('sha256').update(contents).digest('hex')
    );
    assert.equal(headers['X-ClassicMap-Clip-Storage-Key'], identity.storageKey);
    assert.equal(headers['X-ClassicMap-Clip-File-Size'], String(contents.byteLength));
    assert.equal(JSON.stringify(headers).includes(directory), false);
    assert.equal(Object.hasOwn(headers, 'X-ClassicMap-Clip-Path'), false);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('영상 원본 파일 이름은 영상과 포맷이 같으면 같고 포맷이 다르면 다르다', () => {
  const format = 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]';
  assert.equal(sourceFileName('DPJL488cfRw', format), sourceFileName('DPJL488cfRw', format));
  assert.notEqual(sourceFileName('DPJL488cfRw', format), sourceFileName('DPJL488cfRw', 'best'));
  assert.notEqual(sourceFileName('DPJL488cfRw', format), sourceFileName('KUbi0nEnUi4', format));
  assert.match(sourceFileName('-Bxpm0EmOMU', format), /^-Bxpm0EmOMU-[0-9a-f]{12}\.mp4$/);
});

test('영상 원본은 보관 시간이 지나면 오래된 것으로 본다', () => {
  const hour = 60 * 60 * 1000;
  const now = Date.UTC(2026, 8, 22, 12);
  assert.equal(isSourceStale(now - 23 * hour, now, 24 * hour), false);
  assert.equal(isSourceStale(now - 24 * hour, now, 24 * hour), true);
  assert.equal(isSourceStale(now, now, 24 * hour), false);
});

test('로컬 원본에서 자를 때는 편집 목록을 남겨 요청한 길이로 나오게 한다', () => {
  const local = ffmpegCutArgs(['/cache/sources/a.mp4'], 1500, 30, '/tmp/out.mp4', { keepEditList: true });
  assert.equal(local.includes('-avoid_negative_ts'), false);
  assert.deepEqual(local.slice(local.indexOf('-ss'), local.indexOf('-ss') + 4), ['-ss', '1500', '-i', '/cache/sources/a.mp4']);
  assert.deepEqual(local.slice(local.indexOf('-t'), local.indexOf('-t') + 2), ['-t', '30']);

  const stream = ffmpegCutArgs(['https://v', 'https://a'], 10, 20, '/tmp/out.mp4');
  assert.deepEqual(stream.slice(stream.indexOf('-avoid_negative_ts'), stream.indexOf('-avoid_negative_ts') + 2), ['-avoid_negative_ts', 'make_zero']);
  assert.deepEqual(stream.slice(stream.indexOf('-map'), stream.indexOf('-map') + 4), ['-map', '0:v:0', '-map', '1:a:0']);
});
