import { getHeroImageCandidates } from '@/lib/utils/image';
import * as React from 'react';

/**
 * 배너 그림 (웹). object-position 으로 위쪽(얼굴)을 맞추고, 다 받으면 짧게 나타난다.
 * 큰 그림이 실패하면 다음 후보(원래 크기)로 넘어간다.
 */
export function HeroImage({ uri }: { uri: string; width: number; height: number }) {
  const candidates = React.useMemo(() => getHeroImageCandidates(uri), [uri]);
  const [attempt, setAttempt] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const ref = React.useRef<HTMLImageElement | null>(null);
  const src = candidates[attempt];
  React.useLayoutEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth > 0) setLoaded(true);
  }, [src]);
  if (!src) return null;
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
      className="cm-img-fade"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: '50% 22%',
        opacity: loaded ? 1 : 0,
      }}
    />
  );
}
