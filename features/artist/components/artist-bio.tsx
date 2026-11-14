import { ExpandableText } from '@/components/ui/expandable-text';
import * as React from 'react';
import { View } from 'react-native';

type ArtistBioProps = {
  bio: string | null | undefined;
  style: string | null | undefined;
};

/** 아티스트 소개 + 연주 스타일을 한 글로 이어 접는다 */
function ArtistBio({ bio, style }: ArtistBioProps) {
  const text = [bio, style].filter(Boolean).join('\n');
  if (!text) return null;
  return (
    <View className="mt-6 max-w-[720px]">
      <ExpandableText
        text={text}
        lines={5}
        variant="bodySm"
        className="text-foreground-muted"
        toggleClassName="text-foreground"
      />
    </View>
  );
}

export { ArtistBio };
