/**
 * 검색어 낱말을 다른 말로도 강조하는 다국어 낱말 묶음.
 * 서버 검색(ClassicMap_back src/search_terms.rs)과 같은 묶음이다. 한쪽을 고치면 다른 쪽도 고친다.
 * 「Etude」로 찾으면 「연습곡」도, 「교향곡」으로 찾으면 「Symphony」도 강조된다.
 */

/** 같은 뜻의 갈래·편성·조성 낱말. 첫 말이 데이터의 한국어 표기다. 라틴 낱말은 악센트 없이 적는다 */
const TERM_GROUPS: readonly (readonly string[])[] = [
  // 갈래
  [
    '연습곡',
    '에튀드',
    '에뛰드',
    '에튜드',
    'etude',
    'etudes',
    'study',
    'studies',
    'studie',
    'studien',
  ],
  ['교향곡', '심포니', 'symphony', 'symphonies', 'symphonie', 'sinfonie', 'sinfonien'],
  ['신포니아', 'sinfonia', 'sinfonias'],
  ['교향시', 'symphonic poem', 'tone poem', 'tondichtung', 'poeme symphonique'],
  ['협주곡', '콘체르토', 'concerto', 'concertos', 'concerti', 'konzert'],
  ['소나타', 'sonata', 'sonatas', 'sonate', 'sonaten'],
  ['소나티네', '소나티나', 'sonatina', 'sonatine'],
  ['녹턴', '야상곡', 'nocturne', 'nocturnes', 'notturno'],
  ['전주곡', '프렐류드', '프렐루드', 'prelude', 'preludes', 'praeludium', 'preludio'],
  ['환상곡', '판타지', '판타지아', 'fantasia', 'fantasy', 'fantaisie', 'fantasie'],
  ['광시곡', '랩소디', 'rhapsody', 'rhapsodie', 'rapsodia'],
  ['즉흥곡', 'impromptu', 'impromptus'],
  ['왈츠', 'waltz', 'waltzes', 'valse', 'valses', 'walzer'],
  ['마주르카', 'mazurka', 'mazurkas', 'mazurek'],
  ['폴로네즈', '폴로네이즈', 'polonaise', 'polonaises'],
  ['발라드', 'ballade', 'ballades'],
  ['스케르초', 'scherzo', 'scherzi'],
  ['변주곡', 'variations', 'variation', 'variationen', 'variazioni'],
  ['서곡', 'overture', 'ouverture'],
  ['모음곡', 'suite', 'suites'],
  ['행진곡', 'march', 'marche', 'marsch', 'marcia'],
  ['미사', 'mass', 'messe', 'missa'],
  ['레퀴엠', '진혼곡', 'requiem'],
  ['칸타타', 'cantata', 'cantatas', 'kantate'],
  ['오라토리오', 'oratorio'],
  ['오페라', 'opera'],
  ['발레', 'ballet'],
  ['가곡', 'song', 'songs', 'lied', 'lieder', 'melodie', 'melodies'],
  ['자장가', 'berceuse', 'lullaby', 'wiegenlied'],
  ['뱃노래', 'barcarolle', 'barcarola'],
  ['세레나데', 'serenade', 'serenata', 'standchen'],
  ['디베르티멘토', 'divertimento'],
  ['론도', 'rondo', 'rondeau'],
  ['푸가', 'fugue', 'fuga', 'fuge'],
  ['토카타', 'toccata'],
  ['파르티타', 'partita'],
  ['카논', 'canon', 'kanon'],
  ['샤콘', '샤콘느', 'chaconne', 'ciaccona'],
  ['파사칼리아', 'passacaglia'],
  ['미뉴에트', 'minuet', 'menuet', 'menuetto'],
  ['무언가', 'songs without words', 'lieder ohne worte'],
  // 편성
  ['2중주', '이중주', 'duo'],
  ['3중주', '삼중주', 'trio'],
  ['4중주', '사중주', 'quartet', 'quartett', 'quatuor'],
  ['5중주', '오중주', 'quintet', 'quintett', 'quintette'],
  ['6중주', '육중주', 'sextet', 'sextett'],
  ['8중주', '팔중주', 'octet', 'oktett'],
  ['현악', 'string', 'strings', 'streich'],
  ['피아노', 'piano', 'klavier', 'pianoforte'],
  ['바이올린', 'violin', 'violon', 'violine'],
  ['비올라', 'viola'],
  ['첼로', 'cello', 'violoncello', 'violoncelle'],
  ['플루트', 'flute', 'flote'],
  ['클라리넷', 'clarinet', 'klarinette', 'clarinette'],
  ['오보에', 'oboe', 'hautbois'],
  ['호른', 'horn'],
  ['트럼펫', 'trumpet', 'trompete', 'trompette'],
  ['하프', 'harp', 'harpe', 'harfe'],
  ['기타', 'guitar', 'guitare', 'gitarre'],
  ['오르간', 'organ', 'orgue', 'orgel'],
  ['합창', 'choir', 'chorus', 'chor', 'choeur'],
  ['관현악', 'orchestra', 'orchester', 'orchestre'],
  // 조성
  ['장조', 'major', 'dur'],
  ['단조', 'minor', 'moll'],
];

const ACCENTS: Record<string, string> = {
  a: 'aàáâäãå',
  c: 'cç',
  e: 'eèéêë',
  i: 'iìíîï',
  n: 'nñ',
  o: 'oòóôöõ',
  u: 'uùúûü',
};

/** 낱말을 묶음에서 찾을 꼴로: 소문자, 라틴 악센트는 뗀다 */
function fold(word: string): string {
  return word.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

/** 「5번」 ↔ 「No. 5」「Nr. 5」 */
function numberVariants(word: string): string[] {
  const match = /^(?:(\d+)번|n[or]\.?\s*(\d+))$/.exec(fold(word));
  const number = match?.[1] ?? match?.[2];
  return number ? [`${number}번`, `No. ${number}`, `Nr. ${number}`] : [];
}

/** 「E♭장조」「C#단조」 ↔ 「E-flat major」「E♭ major」「C-sharp minor」「C# minor」 */
function keyVariants(word: string): string[] {
  const match = /^([a-g])\s*(♭|b|♯|#)?\s*(장조|단조)$/.exec(fold(word));
  if (!match) return [];
  const letter = match[1].toUpperCase();
  const mode = match[3] === '장조' ? 'major' : 'minor';
  const accidental = match[2];
  if (!accidental) return [`${letter} ${mode}`];
  if (accidental === '♭' || accidental === 'b')
    return [`${letter}-flat ${mode}`, `${letter}♭ ${mode}`];
  return [`${letter}-sharp ${mode}`, `${letter}♯ ${mode}`, `${letter}# ${mode}`];
}

/** 검색어 낱말 하나와 같은 뜻으로 강조할 말들. 첫 값은 낱말 그대로다 */
export function wordVariants(word: string): string[] {
  const trimmed = word.trim();
  const folded = fold(trimmed);
  const found = [trimmed];
  for (const group of TERM_GROUPS) {
    if (group.some((term) => fold(term) === folded)) found.push(...group);
  }
  found.push(...numberVariants(trimmed), ...keyVariants(trimmed));
  const seen = new Set<string>();
  return found.filter((term) => {
    const key = fold(term);
    if (!term || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 검색어를 낱말로 나눈다. 작품번호·번호 머리(Op.·K.·BWV·No.)는 뒤 숫자와 붙여 한 낱말로 본다 */
export function searchWords(query: string): string[] {
  return query
    .replace(/(^|\s)(op\.?|k\.?|kv|bwv|hob\.|rv|no\.?|nr\.?)\s+(?=\d)/gi, '$1$2\u0001')
    .split(/\s+/)
    .map((word) => word.replace(/\u0001/g, ' ').trim())
    .filter(Boolean);
}

/** 강조할 낱말을 찾는 정규식 조각. 대소문자는 플래그로, 라틴 악센트는 글자 묶음으로 무시한다 */
export function termPattern(term: string): string {
  return [...fold(term)]
    .map((char) => {
      const accents = ACCENTS[char];
      if (accents) return `[${accents}]`;
      return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
}
