import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { t, useLocale } from '@/lib/i18n';
import { shell, useShell } from '@/lib/layout/shell-state';
import { cn } from '@/lib/utils';
import { type Href, Link, router } from 'expo-router';
import { PanelLeftIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { SHELL } from '@/lib/layout/shell-layout';

/**
 * 사이드바 부품. shadcn(Base UI 판) Sidebar 의 파트와 동작을 따른다.
 * - Sidebar: 접힘·펼침 폭, 화살표 키 이동
 * - SidebarTooltip: 접힌 동안 마우스를 올리거나 포커스하면 오른쪽에 뜨는 이름표
 * - SidebarLink: 메뉴 한 줄(아이콘 + 이름). 지금 위치면 `isActive`
 * - SidebarAction: 접으면 사라지는 안내·링크
 * - SidebarRail: 오른쪽 가장자리 띠. 누르면 접고 편다
 * - SidebarTrigger: 상단바의 접기 단추
 * 메뉴 내용은 app-sidebar.tsx 가 조립한다.
 */

const SidebarContext = React.createContext<{ collapsed: boolean }>({ collapsed: false });

function useSidebar(): { collapsed: boolean } {
  return React.useContext(SidebarContext);
}

/**
 * 접힌 동안의 이름표 (shadcn SidebarMenuButton 의 tooltip). 펼쳐 있으면 뜨지 않는다.
 * 자식은 TooltipTrigger 를(또는 그것을 감싼 `<Link asChild>` 를) 하나 둔다
 */
function SidebarTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <Tooltip disabled={!collapsed}>
      {children}
      <TooltipContent side="right" align="center" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

const ARROW_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

/** 사이드바 안에서 ↑↓·Home·End 로 메뉴 사이를 옮긴다 (Tab 은 그대로 다음 요소로) */
function onSidebarKeyDown(event: React.KeyboardEvent<HTMLElement>) {
  if (!ARROW_KEYS.includes(event.key) || event.altKey || event.metaKey || event.ctrlKey) return;
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('a[href], [role="link"], [role="button"]')
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      element.getAttribute('aria-disabled') !== 'true' &&
      !element.closest('[aria-hidden="true"]')
  );
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement as HTMLElement);
  let next: number;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = items.length - 1;
  else if (index === -1) next = 0;
  else next = (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  event.preventDefault();
  items[next].focus();
}

function Sidebar({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean;
  /** 스크린리더가 읽는 영역 이름 */
  label: string;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ collapsed }), [collapsed]);
  const keyboard = Platform.OS === 'web' ? { onKeyDown: onSidebarKeyDown } : null;

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delay={0}>
        {/* 접고 펼 때 로고·아이콘·사진은 제자리(가운데 30px 선)에 그대로 있고 폭만 줄고 늘며, 글자는 서서히 사라진다 */}
        <View
          role="navigation"
          aria-label={label}
          {...(keyboard as object)}
          className="cm-side relative shrink-0 overflow-hidden bg-surface-1 px-2 py-4"
          style={{
            width: collapsed ? SHELL.sidebarCollapsedWidth : SHELL.sidebarWidth,
            borderRadius: SHELL.radius,
          }}>
          {children}
        </View>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

/** 접으면 서서히 사라지는 글자에 붙이는 클래스 */
function useSidebarFade(): string {
  const { collapsed } = useSidebar();
  return cn('cm-fade', collapsed && 'opacity-0');
}

interface SidebarIconProps {
  size: number;
  className: string;
}

function SidebarLink({
  href,
  label,
  isActive = false,
  renderIcon,
  handlers,
  children,
}: {
  href: Href;
  label: string;
  isActive?: boolean;
  renderIcon: (props: SidebarIconProps) => React.ReactNode;
  /** 호버하면 미리 받기 같은 추가 손잡이 */
  handlers?: object;
  /** 이름 뒤에 붙는 것(단축키 표시 등) */
  children?: React.ReactNode;
}) {
  const { collapsed } = useSidebar();
  return (
    <SidebarTooltip label={label}>
      <Link href={href} asChild>
        <TooltipTrigger
          render={
            <Pressable
              {...handlers}
              accessibilityRole="link"
              accessibilityLabel={label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'h-10 flex-row items-center gap-3.5 rounded-md px-3 transition-colors duration-instant',
                isActive ? 'bg-surface-3' : 'hover:bg-surface-2'
              )}
            />
          }>
          {/* 접힌 좁은 칸에서도 아이콘이 눌려 사라지지 않게 줄어들지 않는 칸에 넣는다 */}
          <View className="shrink-0">
            {renderIcon({
              size: 20,
              className: isActive ? 'text-foreground' : 'text-foreground-muted',
            })}
          </View>
          <Text
            numberOfLines={1}
            className={cn(
              'cm-fade flex-1 text-[13.5px] font-semibold',
              isActive ? 'text-foreground' : 'text-foreground-muted',
              collapsed && 'opacity-0'
            )}
            style={{ minWidth: 110 }}>
            {label}
          </Text>
          {children}
        </TooltipTrigger>
      </Link>
    </SidebarTooltip>
  );
}

/**
 * 접으면 투명해지는 안내·링크. 투명해도 좁은 칸 안에 남아 있어서, 접힌 동안은 눌리지도 포커스되지도 않게 막는다.
 * 웹 링크(<a>)는 눌림을 막아도 브라우저가 주소로 가 버려서, 링크 대신 눌렀을 때 이동한다
 */
function SidebarAction({
  href,
  onPress,
  className,
  children,
}: {
  href?: Href;
  onPress?: () => void;
  className: string;
  children: React.ReactNode;
}) {
  const { collapsed } = useSidebar();
  return (
    <Pressable
      disabled={collapsed}
      aria-hidden={collapsed}
      accessibilityRole={href ? 'link' : 'button'}
      onPress={() => (href ? router.push(href) : onPress?.())}
      className={cn('cm-fade rounded-md hover:bg-surface-2', className, collapsed && 'opacity-0')}>
      {children}
    </Pressable>
  );
}

/** 사이드바 오른쪽 가장자리의 얇은 띠. 올리면 선이 보이고 누르면 접고 편다 (shadcn SidebarRail) */
function SidebarRail() {
  useLocale();
  const { collapsed } = useSidebar();
  const [hovered, setHovered] = React.useState(false);
  return (
    <Pressable
      onPress={() => shell.toggleSidebar()}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={collapsed ? t('사이드바 펼치기') : t('사이드바 접기')}
      tabIndex={-1}
      className="absolute bottom-0 right-0 top-0 z-rail w-2 items-end"
      style={{ cursor: collapsed ? 'e-resize' : 'w-resize' } as object}>
      <View
        className={cn(
          'cm-fade h-full w-0.5 bg-border-strong',
          hovered ? 'opacity-100' : 'opacity-0'
        )}
      />
    </Pressable>
  );
}

/** 상단바 맨 왼쪽의 접기 단추 (shadcn SidebarTrigger) */
function SidebarTrigger({ className }: { className?: string }) {
  useLocale();
  const collapsed = useShell((state) => state.sidebarCollapsed);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={collapsed ? t('사이드바 펼치기') : t('사이드바 접기')}
      aria-expanded={!collapsed}
      onPress={() => shell.toggleSidebar()}
      className={cn('size-8 items-center justify-center rounded-md hover:bg-surface-3', className)}>
      <Icon as={PanelLeftIcon} size={18} className="text-foreground-muted" />
    </Pressable>
  );
}

/** ⌘B(Ctrl+B)로 사이드바를 접고 편다. 글을 쓰는 중에는 받지 않는다 */
function useSidebarShortcut(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'b' ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey
      )
        return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;
      event.preventDefault();
      shell.toggleSidebar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

export {
  Sidebar,
  SidebarAction,
  SidebarLink,
  SidebarRail,
  SidebarTooltip,
  SidebarTrigger,
  useSidebar,
  useSidebarFade,
  useSidebarShortcut,
};
export type { SidebarIconProps };
