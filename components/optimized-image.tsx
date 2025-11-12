import React from 'react';
import { Image, ImageProps, ActivityIndicator, View } from 'react-native';
import { getImageUrl } from '@/lib/utils/image';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  fallbackUri?: string;
  fallbackComponent?: React.ReactNode;
}

export function OptimizedImage({ uri, fallbackUri, fallbackComponent, style, ...props }: OptimizedImageProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const imageUrl = getImageUrl(uri) || fallbackUri || '';

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
        source={{ uri: imageUrl }}
        style={[style, { opacity: loading ? 0 : 1 }]}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </View>
  );
}

export function prefetchImages(uris: (string | null | undefined)[]): Promise<void[]> {
  const validUris = uris
    .map(uri => getImageUrl(uri))
    .filter((uri): uri is string => !!uri);
  
  return Promise.all(validUris.map(uri => Image.prefetch(uri).catch(() => {})));
}
