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
  metadataHeaders,
  parseClipRequest,
  parseProbeOutput,
} from './server.mjs';

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
