/**
 * SMuFL(Standard Music Font Layout) 글리프와 오선 배치 계산.
 *
 * 악보 글리프는 직접 그리지 않고 Bravura를 씁니다. Steinberg가 만든 SMuFL 레퍼런스
 * 폰트이고 SIL OFL이라 재배포가 가능합니다. 직접 그린 음자리표는 작은 크기에서
 * 반드시 무너집니다.
 *
 * SMuFL 규약: **오선 한 칸(staff space) = 0.25em.** 줄 간격이 10px이면
 * `fontSize`는 40px이 정확히 맞습니다. `staffFontSize()`가 이 계산입니다.
 */

export const SMUFL = {
  gClef: '',
  fClef: '',
  cClef: '',
  accidentalFlat: '',
  accidentalNatural: '',
  accidentalSharp: '',
  timeSigCommon: '',
  timeSigCutCommon: '',
  barlineSingle: '',
  barlineDouble: '',
  barlineFinal: '',
} as const;

export type SmuflGlyph = keyof typeof SMUFL;

/** 줄 간격(px)에서 Bravura fontSize를 구합니다. 오선 한 칸 = 0.25em. */
export function staffFontSize(lineSpacing: number): number {
  return lineSpacing * 4;
}

export type Mode = 'major' | 'minor';
export type KeySignature = { accidental: 'sharp' | 'flat'; count: number };

// 으뜸음 → 조표 개수. 장조/단조 각각 표준 값입니다.
const MAJOR: Record<string, KeySignature> = {
  C: { accidental: 'sharp', count: 0 },
  G: { accidental: 'sharp', count: 1 },
  D: { accidental: 'sharp', count: 2 },
  A: { accidental: 'sharp', count: 3 },
  E: { accidental: 'sharp', count: 4 },
  B: { accidental: 'sharp', count: 5 },
  'F#': { accidental: 'sharp', count: 6 },
  F: { accidental: 'flat', count: 1 },
  Bb: { accidental: 'flat', count: 2 },
  Eb: { accidental: 'flat', count: 3 },
  Ab: { accidental: 'flat', count: 4 },
  Db: { accidental: 'flat', count: 5 },
  Gb: { accidental: 'flat', count: 6 },
};

const MINOR: Record<string, KeySignature> = {
  A: { accidental: 'sharp', count: 0 },
  E: { accidental: 'sharp', count: 1 },
  B: { accidental: 'sharp', count: 2 },
  'F#': { accidental: 'sharp', count: 3 },
  'C#': { accidental: 'sharp', count: 4 },
  'G#': { accidental: 'sharp', count: 5 },
  D: { accidental: 'flat', count: 1 },
  G: { accidental: 'flat', count: 2 },
  C: { accidental: 'flat', count: 3 },
  F: { accidental: 'flat', count: 4 },
  Bb: { accidental: 'flat', count: 5 },
  Eb: { accidental: 'flat', count: 6 },
};

/** 으뜸음과 조성에서 조표를 구합니다. 모르는 값이면 `null`을 돌려주고 조표를 그리지 않습니다. */
export function keySignature(tonic: string, mode: Mode): KeySignature | null {
  const table = mode === 'major' ? MAJOR : MINOR;
  return table[tonic] ?? null;
}

// 높은음자리표에서 조표가 앉는 자리. 맨 아래 줄(E4)을 0으로 두고 반음자리 단위로 셉니다.
const FLAT_STEPS = [2, 3.5, 1.5, 3, 1, 2.5, 0.5];
const SHARP_STEPS = [4, 2.5, 4.5, 3, 1.5, 3.5, 2];

/**
 * 조표 글리프의 y 좌표(px)를 순서대로 돌려줍니다.
 * 원점은 오선 맨 위 줄이고 아래로 갈수록 커지는 화면 좌표계입니다.
 */
export function keySignatureOffsets(key: KeySignature, lineSpacing: number): number[] {
  const steps = key.accidental === 'flat' ? FLAT_STEPS : SHARP_STEPS;
  const staffHeight = lineSpacing * 4;
  return steps.slice(0, key.count).map((step) => staffHeight - step * lineSpacing);
}
