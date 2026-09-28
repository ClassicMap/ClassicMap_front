import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

/** 필드 이름별 검증 문구. 값이 없으면 통과한 필드다. */
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function hasErrors(errors: Partial<Record<string, string>>): boolean {
  return Object.values(errors).some((message) => Boolean(message));
}

/**
 * 저장을 한 번 눌러 본 뒤부터 검증 문구를 보여 준다.
 * 입력하는 동안에는 다그치지 않고, 모달을 다시 열면 처음 상태로 돌린다.
 */
export function useSubmitAttempt(visible: boolean): {
  attempted: boolean;
  setAttempted: (attempted: boolean) => void;
} {
  const [attempted, setAttempted] = React.useState(false);
  React.useEffect(() => {
    if (visible) setAttempted(false);
  }, [visible]);
  return { attempted, setAttempted };
}

/** 라벨·도움말·오류처럼 필드를 둘러싼 공통 속성 */
export interface FieldChromeProps {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  /** 라벨 줄 오른쪽 보조 정보 (글자 수 등) */
  aside?: React.ReactNode;
  className?: string;
}

interface FormFieldProps extends FieldChromeProps {
  /** 라벨 Text의 nativeID. 컨트롤의 aria-labelledby와 짝을 맞춘다 */
  labelId?: string;
  children: React.ReactNode;
}

/** 라벨 + 컨트롤 + 오류/도움말. 컨트롤은 children으로 받는다. */
export function FormField({
  label,
  required = false,
  help,
  error,
  aside,
  labelId,
  className,
  children,
}: FormFieldProps) {
  return (
    <View className={cn('gap-1.5', className)}>
      <View className="flex-row items-end justify-between gap-3">
        <Text variant="label" nativeID={labelId} className="shrink text-foreground">
          {label}
          {required ? (
            <Text variant="label" className="text-destructive">
              {' *'}
            </Text>
          ) : null}
        </Text>
        {aside}
      </View>
      {children}
      {error ? (
        <Text variant="caption" role="alert" className="text-destructive">
          {error}
        </Text>
      ) : null}
      {help ? <Text variant="caption">{help}</Text> : null}
    </View>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

/** 필드 묶음. 제목 옆 가는 선으로 구획을 나눈다. */
export function FormSection({ title, description, className, children }: FormSectionProps) {
  return (
    <View className={cn('gap-4', className)}>
      <View className="gap-1">
        <View className="flex-row items-center gap-3">
          <Text variant="micro" role="heading" className="text-foreground-subtle">
            {title}
          </Text>
          <View className="h-px flex-1 bg-border" />
        </View>
        {description ? <Text variant="caption">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** 짧은 필드 두 개를 한 줄에 나란히 둔다 (연도, 수치 등) */
export function FormRow({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row gap-3">
      {React.Children.map(children, (child) =>
        child ? <View className="min-w-0 flex-1">{child}</View> : null
      )}
    </View>
  );
}

type TextFieldProps = FieldChromeProps &
  Omit<React.ComponentProps<typeof Input>, 'className'> & {
    inputClassName?: string;
  };

export function TextField({
  label,
  required,
  help,
  error,
  aside,
  className,
  inputClassName,
  ...inputProps
}: TextFieldProps) {
  const labelId = React.useId();
  return (
    <FormField
      label={label}
      required={required}
      help={help}
      error={error}
      aside={aside}
      labelId={labelId}
      className={className}>
      <Input
        aria-labelledby={labelId}
        className={cn(error && 'border-destructive', inputClassName)}
        {...inputProps}
      />
    </FormField>
  );
}

/** 여러 줄 입력. 높이는 줄 수에 맞춘다 (3줄 80, 4줄 100). */
export function TextAreaField({
  numberOfLines = 4,
  inputClassName,
  style,
  ...props
}: TextFieldProps) {
  return (
    <TextField
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      inputClassName={cn('h-auto py-2.5 sm:h-auto', inputClassName)}
      style={[{ minHeight: numberOfLines * 20 + 20 }, style]}
      {...props}
    />
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceFieldProps<T extends string> extends FieldChromeProps {
  options: ReadonlyArray<ChoiceOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

/** 몇 개 안 되는 선택지 중 하나를 고르는 칩 묶음 */
export function ChoiceField<T extends string>({
  options,
  value,
  onChange,
  ...chrome
}: ChoiceFieldProps<T>) {
  const labelId = React.useId();
  return (
    <FormField {...chrome} labelId={labelId}>
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup" aria-labelledby={labelId}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={option.value === value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </FormField>
  );
}
