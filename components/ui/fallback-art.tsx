import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * 이미지 없는 작곡가·아티스트·작품의 폴백 타일 (설계 문서 8.2, C10).
 * 목록의 절반 이상이 이 상태라 예외가 아니라 기본 표현이다.
 * 같은 이름은 항상 같은 색이 나오게 이름에서 색상을 정한다.
 */
function hashName(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/** 한글 이름은 첫 글자(성), 라틴 이름은 마지막 단어의 첫 글자. */
export function fallbackInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (/^[ㄱ-힝]/.test(trimmed)) return trimmed[0];
  const words = trimmed.split(/\s+/);
  return words[words.length - 1][0].toUpperCase();
}

interface FallbackArtProps {
  name: string;
  /** 사람은 원, 콘텐츠(작품·음반)는 사각 (Encore 규칙) */
  shape?: 'circle' | 'square';
  size: number;
  className?: string;
}

function FallbackArt({ name, shape = 'circle', size, className }: FallbackArtProps) {
  const hash = hashName(name);
  // 채도를 낮게 두어 액센트(brass)나 시대 색과 겹쳐 보이지 않게 한다.
  const hue = hash % 360;
  const from = `hsl(${hue}, 22%, 34%)`;
  const to = `hsl(${(hue + 40) % 360}, 26%, 20%)`;
  const gradientId = `fallback-${hash}`;
  const radius = shape === 'circle' ? size / 2 : Math.max(4, size * 0.12);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('items-center justify-center overflow-hidden', className)}
      style={{ width: size, height: size, borderRadius: radius }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${gradientId})`} />
      </Svg>
      <Text
        style={{ fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.48) }}
        className="font-semibold text-white/85">
        {fallbackInitial(name)}
      </Text>
    </View>
  );
}

export { FallbackArt };
