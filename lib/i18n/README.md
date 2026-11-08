# 영어판 문구 규칙

화면 언어는 한국어(ko)와 영어(en)다. `lib/i18n/index.tsx` 를 본다.

## 문구 옮기기

- 한국어 원문을 그대로 `t('…')` 로 감싼다. 영어는 `lib/i18n/en/<영역>.ts` 사전에 원문을 키로 넣는다.
  - 사전에 없으면 한국어가 그대로 나온다. `npm run i18n:check` 가 빠진 키를 알려 준다.
- 바뀌는 값은 `{이름}` 자리로: `t('{title} 비교하기', { title })` → 사전 `'{title} 비교하기': 'Compare {title}'`.
  - 템플릿 문자열(`${…}`)을 t() 안에 넣지 않는다. 검사기가 읽지 못한다.
- 수: `count` 를 넘기면 영어 값의 「단수|복수」 중 하나를 고른다: `'{count}명': '{count} person|{count} people'`.
  - 천 단위 쉼표가 필요하면 `formatNumber(n)` 을 다른 자리(`{n}`)로 넘긴다: `t('작품 {n}곡', { count, n: formatNumber(count) })`.
- 한국어가 같아도 영어가 다르면 문맥을 붙인다: `t('part::{count}곡')` (세트 안 곡 = pieces), `t('{count}곡')` (작품 = works).
  한국어 화면에는 `part::` 가 보이지 않는다.
- 모듈 맨 위 상수의 문구는 `msg('홈')` 으로 표시만 하고, 그릴 때 `t(item.label)` 로 옮긴다. 모듈 맨 위에서 `t()` 를 부르지 않는다.
- 조건에 따라 다른 문구는 `cond ? t('가') : t('나')` 로 쓴다(`t(cond ? '가' : '나')` 는 검사기가 못 읽는다).
- 조사(을/를)는 한국어 원문에 그대로 두고, 영어는 자연스럽게 옮긴다.
- 주석·console 로그·개발자용 오류(throw new Error)는 옮기지 않는다.

## 데이터 이름

- 두 언어가 다 있는 값은 `pick(한국어, 영어)` 로 고른다(예: `pick(artist.name, artist.englishName)`).
- API 응답 → 화면 모델 변환(lib/api/\*.ts)에서 이미 고른 값은 다시 고르지 않는다.
- 국적·시대·악기처럼 정해진 목록이 한국어 값으로 오면 `t(value)` 로 감싸고 사전에 넣는다(COMMON 의 나라 이름 참고).

## 영어 문체

- 짧고 자연스러운 제품 영어. 문장 첫 글자만 대문자(sentence case). 버튼은 동사로 시작.
- 오류 문구는 다음 행동을 말한다: "Couldn't load the works. Try again."
- 한국어 해요체 존댓말을 그대로 옮기지 않는다("~해 주세요" → 명령형이나 "Please …" 한 번).
- 클래식 용어는 영어 관례: Étude, Nocturne, Op., No., Mvt., movement, work, piece, performer, recording.
