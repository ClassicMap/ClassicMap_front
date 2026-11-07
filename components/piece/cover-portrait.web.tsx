import { getImageCandidates } from '@/lib/utils/image';
import * as React from 'react';

export interface CoverPortraitProps {
  uri: string;
  /** 커버 한 변 */
  size: number;
}

/**
 * 커버 오른쪽에 까는 작곡가 초상 (웹). 흑백으로 바꿔 커버 색에 녹이고(luminosity),
 * 왼쪽은 마스크로 흐려 그라데이션과 이어지게 한다. 카드 호버(group)에서 살짝 커진다.
 */
export function CoverPortrait({ uri, size }: CoverPortraitProps) {
  const candidates = React.useMemo(() => getImageCandidates(uri), [uri]);
  const [attempt, setAttempt] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    setAttempt(0);
    setLoaded(false);
  }, [candidates]);
  const src = candidates[attempt];
  if (!src) return null;
  const width = Math.round(size * 0.74);
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => setAttempt((current) => current + 1)}
      className="cm-cover-portrait"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width,
        height: size,
        objectFit: 'cover',
        objectPosition: '50% 18%',
        opacity: loaded ? 0.92 : 0,
      }}
    />
  );
}
