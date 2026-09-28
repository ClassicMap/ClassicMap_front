import { FormField } from '@/components/admin/form-field';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/utils/image';
import { ImageIcon, UploadIcon } from 'lucide-react-native';
import * as React from 'react';
import { Image, View } from 'react-native';

interface ImageUrlFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** 미리보기 모양. 인물 사진은 정사각, 커버는 가로로 긴 띠 */
  shape: 'square' | 'banner';
  help?: string;
}

/** 이미지 주소 입력 + 미리보기. 주소를 넣으면 바로 아래에 이미지를 띄운다. */
export function ImageUrlField({
  label,
  value,
  onChangeText,
  placeholder = 'https://…',
  shape,
  help,
}: ImageUrlFieldProps) {
  const labelId = React.useId();
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [value]);

  return (
    <FormField
      label={label}
      help={help}
      error={failed ? '이미지를 불러오지 못했어요. 주소가 맞는지 확인해 주세요.' : undefined}
      labelId={labelId}>
      <Input
        aria-labelledby={labelId}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        className={cn(failed && 'border-destructive')}
      />
      {value && !failed ? (
        <View
          className={cn(
            'mt-1 overflow-hidden rounded-lg border border-border bg-surface-2',
            shape === 'square' ? 'size-24' : 'h-28 w-full'
          )}>
          <Image
            source={{ uri: getImageUrl(value) }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setFailed(true)}
            accessibilityLabel={`${label} 미리보기`}
          />
        </View>
      ) : null}
    </FormField>
  );
}

interface ImageUploadFieldProps {
  label: string;
  /** 미리보기 경로. 서버 상대 경로와 방금 고른 로컬 uri를 모두 받는다 */
  uri: string | null;
  /** 폭 대비 높이 (정사각 1, 포스터 1.5) */
  heightRatio: number;
  onPick: () => void;
  help?: string;
}

/** 갤러리에서 이미지를 골라 올리는 필드. 업로드 자체는 호출하는 쪽이 맡는다. */
export function ImageUploadField({ label, uri, heightRatio, onPick, help }: ImageUploadFieldProps) {
  const width = 112;
  return (
    <FormField label={label}>
      <View className="flex-row items-end gap-4">
        <View
          className="overflow-hidden rounded-lg border border-border bg-surface-2"
          style={{ width, height: Math.round(width * heightRatio) }}>
          {uri ? (
            <Image
              source={{ uri: getImageUrl(uri) }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              accessibilityLabel={`${label} 미리보기`}
            />
          ) : (
            <View className="flex-1 items-center justify-center gap-1.5">
              <Icon as={ImageIcon} size={20} className="text-foreground-faint" />
              <Text variant="micro" className="text-foreground-faint">
                이미지 없음
              </Text>
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1 gap-2">
          <Button variant="outline" size="sm" onPress={onPick} className="self-start">
            <Icon as={UploadIcon} size={14} className="text-foreground" />
            <Text>{uri ? '다른 이미지로 바꾸기' : '이미지 고르기'}</Text>
          </Button>
          {help ? <Text variant="caption">{help}</Text> : null}
        </View>
      </View>
    </FormField>
  );
}
