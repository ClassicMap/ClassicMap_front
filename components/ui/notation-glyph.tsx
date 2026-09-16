import { cssInterop } from 'nativewind';
import Svg, { type SvgProps, Text as SvgText } from 'react-native-svg';
import { SMUFL, type SmuflGlyph, staffFontSize } from '@/lib/design/smufl';

/**
 * SMuFL 악보 글리프 하나를 그립니다.
 *
 * 음자리표·조표·박자표는 직접 그리지 않습니다. 작은 크기에서 반드시 무너지고,
 * 악보를 읽는 사람에게는 형태가 조금만 달라도 틀린 기호로 보입니다.
 * Bravura(SIL OFL)를 그대로 씁니다.
 *
 * **폰트가 먼저 로드되어 있어야 합니다.** 네이티브는 `expo-font`로,
 * 웹은 `@font-face`로 `Bravura`를 등록합니다. 로드 전에는 빈 칸으로 보입니다.
 */
export type NotationGlyphProps = Omit<SvgProps, 'viewBox'> & {
  glyph: SmuflGlyph;
  /** 오선 한 칸의 px. SMuFL 규약대로 fontSize = lineSpacing * 4로 환산됩니다. */
  lineSpacing?: number;
  color?: string;
};

const DEFAULT_LINE_SPACING = 10;

function NotationGlyphImpl({
  glyph,
  lineSpacing = DEFAULT_LINE_SPACING,
  color = 'currentColor',
  ...rest
}: NotationGlyphProps) {
  const fontSize = staffFontSize(lineSpacing);
  // 글리프가 오선 위아래로 크게 벗어나므로(특히 높은음자리표) 캔버스를 넉넉히 잡습니다.
  const height = fontSize * 2;
  const width = fontSize;
  return (
    <Svg width={width} height={height} viewBox={`0 ${-fontSize} ${width} ${height}`} {...rest}>
      <SvgText x={0} y={0} fontFamily="Bravura" fontSize={fontSize} fill={color}>
        {SMUFL[glyph]}
      </SvgText>
    </Svg>
  );
}

cssInterop(NotationGlyphImpl, {
  className: { target: 'style' },
});

export { NotationGlyphImpl as NotationGlyph };
