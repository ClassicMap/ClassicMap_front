import React from 'react';
import { Image, ImageProps, ActivityIndicator, View } from 'react-native';
import { getImageUrl } from '@/lib/utils/image';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  fallbackUri?: string;
}

export function OptimizedImage({ uri, fallbackUri, style, ...props }: OptimizedImageProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const imageUrl = getImageUrl(uri) || fallbackUri || '';

  React.useEffect(() => {
    if (imageUrl) {
      setLoading(true);
      setError(false);
      Image.prefetch(imageUrl)
        .then(() => setLoading(false))
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    }
  }, [imageUrl]);

  if (!imageUrl) {
    return <View style={style} />;
  }

  return (
    <View style={style}>
      {loading && (
        <View style={[style, { position: 'absolute', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
          <ActivityIndicator size="small" />
        </View>
      )}
      <Image
        {...props}
        source={{ uri: imageUrl }}
        style={style}
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
