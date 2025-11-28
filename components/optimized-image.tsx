import React from 'react';
import { Image, ImageProps, ActivityIndicator, View } from 'react-native';
import { getImageUrl } from '@/lib/utils/image';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  fallbackUri?: string;
  fallbackComponent?: React.ReactNode;
}

const OptimizedImageComponent = ({ uri, fallbackUri, fallbackComponent, style, ...props }: OptimizedImageProps) => {
  // Memoize imageUrl to prevent recalculation on every render
  const imageUrl = React.useMemo(() => {
    return getImageUrl(uri) || fallbackUri || '';
  }, [uri, fallbackUri]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [loadedUrl, setLoadedUrl] = React.useState<string>('');

  // Reset states only when imageUrl changes
  React.useEffect(() => {
    // If image is already loaded (cached), don't show loading state
    if (loadedUrl === imageUrl) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
  }, [imageUrl, loadedUrl]);

  if (!imageUrl || error) {
    if (fallbackComponent) {
      return <View style={style}>{fallbackComponent}</View>;
    }
    return <View style={style} />;
  }

  return (
    <View style={style}>
      {loading && (
        <View style={[style, { position: 'absolute', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0', zIndex: 1 }]}>
          <ActivityIndicator size="small" />
        </View>
      )}
      <Image
        {...props}
        source={{ uri: imageUrl, cache: 'force-cache' }}
        style={[style, { opacity: loading ? 0 : 1 }]}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          setLoadedUrl(imageUrl);
        }}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </View>
  );
};

// Memoize component to prevent re-renders when props haven't changed
export const OptimizedImage = React.memo(OptimizedImageComponent, (prevProps, nextProps) => {
  return prevProps.uri === nextProps.uri &&
         prevProps.fallbackUri === nextProps.fallbackUri &&
         prevProps.style === nextProps.style;
});

export function prefetchImages(uris: (string | null | undefined)[]): Promise<void[]> {
  const validUris = uris
    .map(uri => getImageUrl(uri))
    .filter((uri): uri is string => !!uri);
  
  return Promise.all(validUris.map(uri => Image.prefetch(uri).catch(() => {})));
}
