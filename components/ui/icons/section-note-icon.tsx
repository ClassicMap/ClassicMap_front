import { Ellipse, Path } from 'react-native-svg';
import { CLASSIC_ICON_STROKE, createClassicIcon, type ClassicIconProps } from './icon-base';

/**
 * 구간 배지의 음표 값. 구간이 길수록 긴 음표를 씁니다.
 * A/B/C/D 같은 임의 라벨과 달리 기호 자체가 길이를 알려 줍니다.
 */
export type SectionNoteValue = 'eighth' | 'quarter' | 'half' | 'whole';

/** 구간 길이(초) → 음표 값. 백엔드 필드가 아니라 화면에서만 쓰는 파생값입니다. */
export function sectionNoteValue(durationSeconds: number): SectionNoteValue {
  if (durationSeconds < 180) return 'eighth';
  if (durationSeconds < 360) return 'quarter';
  if (durationSeconds < 600) return 'half';
  return 'whole';
}

/**
 * 구간 목록의 `startMs` / `endMs`로 음표 값을 구합니다.
 * 한 구간에 연주가 여러 개면 길이가 조금씩 다르므로 중앙값을 씁니다.
 */
export function sectionNoteValueFromClips(
  clips: readonly { startMs: number; endMs: number }[]
): SectionNoteValue | null {
  const lengths = clips
    .map((clip) => (clip.endMs - clip.startMs) / 1000)
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0)
    .sort((a, b) => a - b);
  if (lengths.length === 0) return null;
  return sectionNoteValue(lengths[Math.floor(lengths.length / 2)]);
}

const HEAD_FILLED = { cx: 9.2, cy: 16.8, rx: 4.9, ry: 3.5, rotation: -18, originX: 9.2, originY: 16.8 } as const;

// 빈 머리는 작은 크기에서 구멍이 메워져 채운 머리와 같아 보인다.
// 머리를 키우고 선을 얇게 해서 구멍을 남긴다. 기둥(x=13.9)에는 그대로 닿는다.
const HEAD_OPEN = { cx: 9, cy: 16.8, rx: 5.5, ry: 3.9, rotation: -18, originX: 9, originY: 16.8 } as const;

const EighthNote = createClassicIcon('EighthNoteIcon', ({ color, strokeWidth }) => (
  <>
    <Ellipse {...HEAD_FILLED} fill={color} stroke="none" />
    <Path d="M13.9 15.4V4.4" />
    <Path
      d="M13.9 4.6c4.3 2 6.1 4.9 4.1 8.7"
      strokeWidth={(strokeWidth / CLASSIC_ICON_STROKE) * 2.2}
    />
  </>
));

const QuarterNote = createClassicIcon('QuarterNoteIcon', ({ color }) => (
  <>
    <Ellipse {...HEAD_FILLED} fill={color} stroke="none" />
    <Path d="M13.9 15.4V4.4" />
  </>
));

const HalfNote = createClassicIcon('HalfNoteIcon', ({ strokeWidth }) => (
  <>
    <Ellipse {...HEAD_OPEN} strokeWidth={(strokeWidth / CLASSIC_ICON_STROKE) * 1.5} />
    <Path d="M13.9 15.4V4.4" />
  </>
));

// 온음표는 기둥이 없어 같은 스트로크로 그리면 가늘어 보이므로 굵기를 올립니다.
const WholeNote = createClassicIcon('WholeNoteIcon', ({ strokeWidth }) => (
  <Ellipse
    cx="12"
    cy="13"
    rx="6.2"
    ry="4.3"
    rotation={-18}
    originX={12}
    originY={13}
    strokeWidth={(strokeWidth / CLASSIC_ICON_STROKE) * 2.3}
  />
));

const BY_VALUE = {
  eighth: EighthNote,
  quarter: QuarterNote,
  half: HalfNote,
  whole: WholeNote,
} as const;

/** 구간 길이를 음표 값으로 보여 주는 배지 아이콘입니다. */
export function SectionNoteIcon({ value, ...props }: ClassicIconProps & { value: SectionNoteValue }) {
  const Note = BY_VALUE[value];
  return <Note {...props} />;
}
