import { useLocale } from '@/lib/i18n';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

/** 목록 아래 '더 보기'·'모두 보기'·'접기'. 목록마다 같은 모양을 쓴다 */
export function MoreLink({
  label,
  onPress,
  disabled,
  collapse,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** 접기면 위 화살표 */
  collapse?: boolean;
}) {
  useLocale();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={6}
      className="mt-1 flex-row items-center gap-1 self-start rounded-full py-1.5 pr-2 web:transition-opacity web:hover:opacity-80">
      <Text variant="label" className="text-foreground-muted">
        {label}
      </Text>
      <Icon
        as={collapse ? ChevronUpIcon : ChevronDownIcon}
        size={14}
        className="text-foreground-subtle"
      />
    </Pressable>
  );
}
