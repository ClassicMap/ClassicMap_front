import { Period } from '../types/models';

// 시대별 색상 매핑
export const ERA_COLORS: Record<string, string> = {
  '바로크': '#9333ea',
  '고전주의': '#3b82f6',
  '고전주의/낭만주의': '#ec4899',
  '낭만주의': '#ec4899',
  '근현대': '#22c55e',
};

// 시대 정보 (타임라인 탭용)
export const PERIODS: Period[] = [
  {
    id: 'baroque',
    name: '바로크',
    period: '1600-1750',
    startYear: 1600,
    endYear: 1750,
    color: '#9333ea',
    description: '바로크 음악은 화려한 장식과 극적인 대비가 특징입니다. 대위법이 발달했으며, 협주곡과 푸가 등의 형식이 완성되었습니다.',
    characteristics: [
      '정교한 대위법과 푸가',
      '통주저음(Basso Continuo) 사용',
      '협주곡 형식의 발달',
      '극적 대비와 화려한 장식',
    ],
    keyComposers: ['바흐', '헨델', '비발디', '텔레만'],
  },
  {
    id: 'classical',
    name: '고전주의',
    period: '1730-1820',
    startYear: 1730,
    endYear: 1820,
    color: '#3b82f6',
    description: '고전주의 음악은 명료함과 균형미를 추구합니다. 소나타 형식이 확립되었으며, 교향곡과 현악 사중주가 발전했습니다.',
    characteristics: [
      '명료한 형식과 균형미',
      '소나타 형식의 확립',
      '교향곡의 발전',
      '호모포닉 텍스처 중심',
    ],
    keyComposers: ['하이든', '모차르트', '베토벤(초기)'],
  },
  {
    id: 'romantic',
    name: '낭만주의',
    period: '1800-1910',
    startYear: 1800,
    endYear: 1910,
    color: '#ec4899',
    description: '낭만주의 음악은 개인의 감정과 상상력을 중시합니다. 형식의 자유로움과 화성의 확장, 민족주의 음악이 나타났습니다.',
    characteristics: [
      '개인의 감정과 상상력 강조',
      '화성의 확장과 불협화음 사용',
      '민족주의 음악의 발전',
      '교향시, 가곡, 피아노 소품의 발달',
    ],
    keyComposers: ['쇼팽', '리스트', '브람스', '차이콥스키', '바그너'],
  },
  {
    id: 'modern',
    name: '근현대',
    period: '1890-현재',
    startYear: 1890,
    endYear: 2024,
    color: '#22c55e',
    description: '근현대 음악은 전통적 조성에서 벗어나 새로운 음악 언어를 탐구합니다. 인상주의, 표현주의, 신고전주의 등 다양한 사조가 나타났습니다.',
    characteristics: [
      '조성의 해체와 무조음악',
      '인상주의적 색채감',
      '민속음악의 현대적 재해석',
      '전자음악과 실험음악',
    ],
    keyComposers: ['드뷔시', '라벨', '스트라빈스키', '쇼스타코비치'],
  },
];
