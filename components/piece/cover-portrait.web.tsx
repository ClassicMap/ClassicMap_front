import { getImageCandidates } from '@/lib/utils/image';
import * as React from 'react';

export interface CoverPortraitProps {
  uri: string;
  /** 커버 한 변 */
  size: number;
}

/**
 * 커버 오른쪽에 까는 작곡가 초상 (웹). 원래 색 그대로 두고 왼쪽만 마스크로 흐려
 * 장르 색 띠와 이어지게 한다. 카드 호버(group)에서 살짝 커진다.
 * 주소가 바뀌면 부모가 key 로 새로 만든다. 상태를 되돌리는 이펙트를 두면 캐시된 이미지의
 * load 가 그 이펙트보다 먼저 와서 투명한 채로 남을 수 있었다.
 */
export function CoverPortrait({ uri, size }: CoverPortraitProps) {
  const candidates = React.useMemo(() => getImageCandidates(uri), [uri]);
  const [attempt, setAttempt] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const ref = React.useRef<HTMLImageElement | null>(null);
  const src = candidates[attempt];

  // 캐시에 있어 붙기 전에 이미 다 받은 이미지는 load 를 놓칠 수 있어 붙은 직후 한 번 본다
  React.useLayoutEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth > 0) setLoaded(true);
  }, [src]);

  if (!src) return null;
  const width = Math.round(size * 0.74);
  return (
    <img
      ref={ref}
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        setAttempt((current) => current + 1);
      }}
      className="cm-cover-portrait"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width,
        height: size,
        objectFit: 'cover',
        objectPosition: '50% 18%',
        opacity: loaded ? 1 : 0,
      }}
    />
  );
}
