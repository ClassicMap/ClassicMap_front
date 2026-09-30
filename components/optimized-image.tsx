import React from 'react';
import { Image, ImageProps, View } from 'react-native';
import { getImageCandidates } from '@/lib/utils/image';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  fallbackUri?: string;
  fallbackComponent?: React.ReactNode;
}

const OptimizedImageComponent = ({
  uri,
  fallbackUri,
  fallbackComponent,
  style,
  ...props
}: OptimizedImageProps) => {
  // 앞에서부터 시도하고 실패하면 다음 주소로 (위키미디어 썸네일 → 원본 → fallbackUri)
  const candidates = React.useMemo(() => {
    const urls = getImageCandidates(uri);
    return fallbackUri ? [...urls, fallbackUri] : urls;
  }, [uri, fallbackUri]);

  const [attempt, setAttempt] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadedUrl, setLoadedUrl] = React.useState<string>('');
  const imageUrl = candidates[attempt] ?? '';

  // 주소가 바뀌면 처음 후보부터 다시
  React.useEffect(() => {
    setAttempt(0);
  }, [candidates]);

  React.useEffect(() => {
    // 이미 불러온 주소면 로딩 표시를 건너뛴다
    setLoading(loadedUrl !== imageUrl);
  }, [imageUrl, loadedUrl]);

  if (!imageUrl) {
    if (fallbackComponent) {
      return <View style={style}>{fallbackComponent}</View>;
    }
    return <View style={style} />;
  }

  return (
    <View style={style}>
      {loading && (
        // 로딩 중에는 스피너 대신 표면색 자리만 둔다 (설계 문서 4.8)
        <View
          className="bg-surface-2"
          style={[style, { position: 'absolute', zIndex: 1 }]}
        />
      )}
      <Image
        {...props}
        source={{ uri: imageUrl }}
        style={[style, { opacity: loading ? 0 : 1 }]}
        onLoad={() => {
          setLoading(false);
          setLoadedUrl(imageUrl);
        }}
        onError={() => setAttempt((current) => current + 1)}
      />
    </View>
  );
};

// Memoize component to prevent re-renders when props haven't changed
export const OptimizedImage = React.memo(OptimizedImageComponent, (prevProps, nextProps) => {
  return (
    prevProps.uri === nextProps.uri &&
    prevProps.fallbackUri === nextProps.fallbackUri &&
    prevProps.style === nextProps.style
  );
});

export function prefetchImages(uris: (string | null | undefined)[]): Promise<void[]> {
  const validUris = uris.map((uri) => getImageCandidates(uri)[0]).filter((uri): uri is string => !!uri);

  return Promise.all(
    validUris.map((uri) =>
      Image.prefetch(uri).then(
        () => undefined,
        () => undefined
      )
    )
  );
}
