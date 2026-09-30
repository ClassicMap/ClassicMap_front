/**
 * 공연 지역. `/concerts/areas`는 정식 명칭(`서울특별시`)을 주고, 박스오피스는 KOPIS 지역 코드를 쓴다.
 * 이전 화면은 짧은 이름(`서울`)을 키로 코드를 찾아 항상 전국 순위가 나왔다 (버그 D1).
 */
export interface AreaOption {
  /** 칩에 보이는 짧은 이름 */
  label: string;
  /** 공연 검색 API에 넘기는 정식 명칭 */
  value: string;
  /** KOPIS 박스오피스 지역 코드. 모르면 없음 */
  kopisCode?: string;
}

const KNOWN_AREAS: { label: string; value: string; kopisCode: string }[] = [
  { label: '서울', value: '서울특별시', kopisCode: '11' },
  { label: '경기', value: '경기도', kopisCode: '41' },
  { label: '부산', value: '부산광역시', kopisCode: '26' },
  { label: '대구', value: '대구광역시', kopisCode: '27' },
  { label: '인천', value: '인천광역시', kopisCode: '28' },
  { label: '대전', value: '대전광역시', kopisCode: '30' },
  { label: '광주', value: '광주광역시', kopisCode: '29' },
  { label: '울산', value: '울산광역시', kopisCode: '31' },
  { label: '세종', value: '세종특별자치시', kopisCode: '36' },
  { label: '강원', value: '강원특별자치도', kopisCode: '42' },
  { label: '충북', value: '충청북도', kopisCode: '43' },
  { label: '충남', value: '충청남도', kopisCode: '44' },
  { label: '전북', value: '전북특별자치도', kopisCode: '45' },
  { label: '전남', value: '전라남도', kopisCode: '46' },
  { label: '경북', value: '경상북도', kopisCode: '47' },
  { label: '경남', value: '경상남도', kopisCode: '48' },
  { label: '제주', value: '제주특별자치도', kopisCode: '50' },
];

/** 표에 없어 KOPIS 코드는 모르지만 칩에는 짧게 보일 이름 (행정구역 통합으로 새로 생긴 값) */
const SHORT_LABELS: Record<string, string> = {
  전남광주통합특별시: '전남광주',
};

/**
 * 지역 API 응답을 칩 목록으로. `"대구광역시, 대구광역시"` 같은 중복 문자열은 쪼개서 합치고,
 * 표에 없는 값은 원문 그대로 둔다(박스오피스 코드는 없음). 순서는 표 순서, 모르는 값은 뒤.
 */
export function normalizeAreas(raw: string[]): AreaOption[] {
  const values = new Set(
    raw
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const known = KNOWN_AREAS.filter((area) => values.has(area.value));
  const knownValues = new Set(known.map((area) => area.value));
  const unknown = [...values]
    .filter((value) => !knownValues.has(value))
    .map((value) => ({ label: SHORT_LABELS[value] ?? value, value }));
  return [...known, ...unknown];
}
