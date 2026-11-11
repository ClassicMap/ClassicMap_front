#!/usr/bin/env node
// 영어판 문구 검사.
// 1) t('…')·msg('…') 에 쓴 한국어 원문이 영어 사전(lib/i18n/en/*.ts)에 다 있는지 본다. 없으면 실패한다.
// 2) 아직 t()·msg() 로 감싸지 않은 한국어 줄을 파일마다 센다(참고용, 실패하지 않는다).
// 사용: node scripts/i18n-check.mjs [--list 파일경로…]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SOURCE_DIRS = ['app', 'components', 'features', 'hooks', 'lib'];
// 목업과 사전 자체는 뺀다
const SKIP = [
  'lib/i18n/',
  'lib/data/mockDatabase.ts',
  'lib/data/mockDTO.ts',
  'lib/api/mock-db.ts',
  // 쓰지 않는 목업 데이터
  'lib/data/composers.ts',
  'lib/data/artists.ts',
  'lib/data/pieces.ts',
  // 검색 낱말 묶음(화면 문구가 아니다)
  'lib/utils/search-terms.ts',
];
const HANGUL = /[가-힣]/;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function dictionaryKeys() {
  const keys = new Set();
  const dir = path.join(ROOT, 'lib/i18n/en');
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.ts') || name === 'index.ts') continue;
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    const key = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|([^\s:'"/*{}]+))\s*:/gm;
    for (const match of text.matchAll(key)) {
      const raw = match[1] ?? match[2] ?? match[3];
      keys.add(raw.replace(/\\(['"\\])/g, '$1'));
    }
  }
  return keys;
}

const CALL = /\b(?:t|msg)\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`([^`$]*)`)/g;

const keys = dictionaryKeys();
const missing = new Map();
const pending = [];
const only = process.argv.includes('--list')
  ? process.argv.slice(process.argv.indexOf('--list') + 1)
  : null;

for (const dir of SOURCE_DIRS) {
  for (const file of walk(path.join(ROOT, dir), [])) {
    const rel = path.relative(ROOT, file);
    if (SKIP.some((skip) => rel.startsWith(skip))) continue;
    if (only && !only.some((item) => rel.startsWith(item))) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(CALL)) {
      const source = (match[1] ?? match[2] ?? match[3]).replace(/\\(['"\\])/g, '$1');
      const korean = source.includes('::') ? source.slice(source.indexOf('::') + 2) : source;
      if (HANGUL.test(source) && !keys.has(source) && !keys.has(korean)) {
        if (!missing.has(source)) missing.set(source, rel);
      }
    }
    let count = 0;
    let inBlock = false;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (inBlock) {
        if (trimmed.includes('*/')) inBlock = false;
        continue;
      }
      if (trimmed.startsWith('/*')) {
        if (!trimmed.includes('*/')) inBlock = true;
        continue;
      }
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{/*'))
        continue;
      const code = line.replace(/\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, '');
      if (!HANGUL.test(code)) continue;
      // 한국어가 모두 t()/msg() 안에 있으면 센하지 않는다
      const rest = code.replace(CALL, '');
      if (HANGUL.test(rest)) count += 1;
    }
    if (count > 0) pending.push([rel, count]);
  }
}

pending.sort((a, b) => b[1] - a[1]);
const total = pending.reduce((sum, [, count]) => sum + count, 0);
console.log(`아직 감싸지 않은 한국어 줄: ${total} (${pending.length}개 파일)`);
for (const [rel, count] of pending.slice(0, process.argv.includes('--all') ? pending.length : 30)) {
  console.log(`  ${String(count).padStart(4)}  ${rel}`);
}
if (missing.size > 0) {
  console.log(`\n영어 사전에 없는 원문 ${missing.size}개:`);
  for (const [source, rel] of missing) console.log(`  ${rel}: ${source}`);
  process.exit(1);
}
console.log('\n사전에 없는 원문: 0');
