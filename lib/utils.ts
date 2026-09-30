import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind.config.js의 의미 기반 타입 스케일을 글자 크기로 알려 준다.
// 알려 주지 않으면 `text-caption`을 색으로 보고 `text-base`와 함께 남겨 버린다.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display',
        'title-1',
        'title-2',
        'title-3',
        'headline',
        'body',
        'body-sm',
        'label',
        'caption',
        'micro',
        'mono-sm',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
