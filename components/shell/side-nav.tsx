import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, PerformerKindIcon, TicketIcon } from '@/components/ui/icons';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Text } from '@/components/ui/text';
import { buildLibraryEntries, groupLibraryEntries, type LibraryEntry } from '@/lib/data/library';
import { useComposerAvatar } from '@/lib/query/hooks/useComposers';
import { createPrefetchHandlers, type PrefetchTarget, prefetchTargetFromHref } from '@/lib/navigation/prefetch';
import { useQueryClient } from '@tanstack/react-query';
import { useMyRepertoire } from '@/lib/query/hooks/useRecordings';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/clerk-expo';
import { type Href, Link, usePathname } from 'expo-router';
import { DiscIcon, HomeIcon, SearchIcon } from 'lucide-react-native';
import * as React from 'react';
import { msg, t, useLocale } from '@/lib/i18n';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { createPortal } from 'react-dom';

import { useCommandPalette } from './command-palette-context';
import { readSidebarCollapsed, setSidebarCollapsed } from './sidebar-state';
import { Kbd, modKeyLabel } from './kbd';

type NavIconProps = { size: number; className: string };

interface NavItem {
  label: string;
  href: Href;
  /** 이 경로들 중 하나로 시작하면 활성 */
  match: readonly string[];
  /** 호버하면 미리 받을 첫 화면 데이터 */
  prefetch?: PrefetchTarget;
  renderIcon: (props: NavIconProps) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: msg('홈'), href: '/home', match: ['/home'], renderIcon: (p) => <Icon as={HomeIcon} {...p} /> },
  { label: msg('검색'), href: '/search', match: ['/search'], renderIcon: (p) => <Icon as={SearchIcon} {...p} /> },
  {
    label: msg('비교'),
    href: '/compare',
    match: ['/compare'],
    prefetch: { kind: 'compare-catalog' },
    renderIcon: (p) => <CompareIcon {...p} />,
  },
  {
    label: msg('아티스트'),
    href: '/artists',
    match: ['/artists', '/timeline', '/composer', '/artist/'],
    renderIcon: (p) => <PerformerKindIcon {...p} />,
  },
  { label: msg('앨범'), href: '/albums', match: ['/albums'], renderIcon: (p) => <Icon as={DiscIcon} {...p} /> },
  { label: msg('공연'), href: '/concerts', match: ['/concert'], renderIcon: (p) => <TicketIcon {...p} /> },
];

/** 사이드바 레퍼토리는 종류마다 최근 몇 개만. 나머지는 레퍼토리 탭에서 */
const LIBRARY_PER_SECTION = 4;

/** 접힌 사이드바에서 아이콘에 마우스를 올리면 오른쪽에 뜨는 이름 (shadcn 사이드바와 같은 동작) */
interface HoverLabel {
  text: string;
  top: number;
  left: number;
}

const HoverLabelContext = React.createContext<(label: HoverLabel | null) => void>(() => undefined);

/** 접힌 상태에서만 이름을 띄우는 손잡이. 웹 DOM 요소의 자리를 읽어 화면 기준으로 띄운다 */
function useHoverLabel(text: string, enabled: boolean) {
  const show = React.useContext(HoverLabelContext);
  return enabled
    ? {
        onHoverIn: (event: { currentTarget: unknown }) => {
          const element = event.currentTarget as HTMLElement | null;
          const rect = element?.getBoundingClientRect?.();
          if (rect) show({ text, top: rect.top + rect.height / 2, left: rect.right + 10 });
        },
        onHoverOut: () => show(null),
      }
    : {};
}

/**
 * 데스크톱 사이드바. shadcn(Base UI) 사이드바와 같은 방식으로 접고 편다.
 * - 상단바 왼쪽 단추, 사이드바 오른쪽 가장자리 띠, ⌘B(Ctrl+B)로 접고 편다. 접은 상태는 이 브라우저에 남는다
 * - 접으면 아이콘만 남고(레퍼토리는 사진만), 마우스를 올리면 오른쪽에 이름이 뜬다
 * - 창이 좁으면 늘 접힌 모양(rail)이고 펼치기는 없다
 */
export function SideNav({ collapsed, canToggle = false }: { collapsed: boolean; canToggle?: boolean }) {
  useLocale();
  const pathname = usePathname();
  const { setOpen } = useCommandPalette();
  const queryClient = useQueryClient();
  const [hoverLabel, setHoverLabel] = React.useState<HoverLabel | null>(null);
  // 펼치면 떠 있던 이름을 지운다
  React.useEffect(() => {
    if (!collapsed) setHoverLabel(null);
  }, [collapsed]);

  return (
    <HoverLabelContext.Provider value={setHoverLabel}>
      {/* 접고 펼 때 로고·아이콘·사진은 제자리(가운데 30px 선)에 그대로 있고 폭만 줄고 늘며, 글자는 서서히 사라진다 */}
      <View
        className={cn(
          'cm-side relative shrink-0 overflow-hidden rounded-[9px] bg-surface-1 px-2 py-4',
          collapsed ? 'w-[60px]' : 'w-[232px]'
        )}>
        <View className="flex-row items-center gap-2.5 px-2 pb-5">
          <View className="shrink-0">
            <BrandLogo size={28} />
          </View>
          <Text
            numberOfLines={1}
            className={cn('cm-fade text-[15px] font-bold tracking-tight', collapsed && 'opacity-0')}
            style={{ minWidth: 120 }}>
            ClassicMap
          </Text>
        </View>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            active={item.match.some((prefix) => pathname.startsWith(prefix))}
            collapsed={collapsed}
            prefetch={createPrefetchHandlers(queryClient, item.prefetch ?? null)}
            onOpenPalette={() => setOpen(true)}
          />
        ))}

        <View className="min-h-0 flex-1">
          <Library collapsed={collapsed} />
        </View>

        {canToggle ? <SidebarRail collapsed={collapsed} /> : null}
      </View>
      {hoverLabel && collapsed ? <FloatingLabel label={hoverLabel} /> : null}
    </HoverLabelContext.Provider>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  prefetch,
  onOpenPalette,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  prefetch: object;
  onOpenPalette: () => void;
}) {
  const hover = useHoverLabel(t(item.label), collapsed);
  return (
    <Link href={item.href} asChild>
      <Pressable
        {...(active ? {} : prefetch)}
        {...hover}
        accessibilityRole="link"
        accessibilityLabel={t(item.label)}
        accessibilityState={{ selected: active }}
        className={cn(
          'h-10 flex-row items-center gap-3.5 rounded-md px-3 transition-colors duration-instant',
          active ? 'bg-surface-3' : 'hover:bg-surface-2'
        )}>
        {/* 접힌 좁은 칸에서도 아이콘이 눌려 사라지지 않게 줄어들지 않는 칸에 넣는다 */}
        <View className="shrink-0">
          {item.renderIcon({
            size: 20,
            className: active ? 'text-foreground' : 'text-foreground-muted',
          })}
        </View>
        <Text
          numberOfLines={1}
          className={cn(
            'cm-fade flex-1 text-[13.5px] font-semibold',
            active ? 'text-foreground' : 'text-foreground-muted',
            collapsed && 'opacity-0'
          )}
          style={{ minWidth: 110 }}>
          {t(item.label)}
        </Text>
        {item.href === '/search' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('빠른 검색 열기')}
            disabled={collapsed}
            className={cn('cm-fade', collapsed && 'pointer-events-none opacity-0')}
            onPress={(event) => {
              event.preventDefault();
              onOpenPalette();
            }}>
            <Kbd>{`${modKeyLabel()}K`}</Kbd>
          </Pressable>
        ) : null}
      </Pressable>
    </Link>
  );
}

/** 사이드바 오른쪽 가장자리의 얇은 띠. 올리면 선이 보이고 누르면 접고 편다 (shadcn SidebarRail) */
function SidebarRail({ collapsed }: { collapsed: boolean }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <Pressable
      onPress={() => setSidebarCollapsed(!collapsed)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={collapsed ? t('사이드바 펼치기') : t('사이드바 접기')}
      tabIndex={-1}
      className="absolute bottom-0 right-0 top-0 w-2 items-end"
      style={{ cursor: collapsed ? 'e-resize' : 'w-resize' } as object}>
      <View className={cn('cm-fade h-full w-0.5 bg-border-strong', hovered ? 'opacity-100' : 'opacity-0')} />
    </Pressable>
  );
}

/** 접힌 사이드바의 이름 말풍선. 사이드바가 잘라 내지 않게 화면 위에 띄운다 */
function FloatingLabel({ label }: { label: HoverLabel }) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="cm-backdrop-in"
      style={{
        position: 'fixed',
        top: label.top,
        left: label.left,
        transform: 'translateY(-50%)',
        zIndex: 60,
        pointerEvents: 'none',
        padding: '4px 8px',
        borderRadius: 6,
        background: 'hsl(var(--foreground))',
        color: 'hsl(var(--background))',
        font: '600 12px/16px Pretendard, system-ui, sans-serif',
        whiteSpace: 'nowrap',
      }}>
      {label.text}
    </div>,
    document.body
  );
}

/** ⌘B(Ctrl+B)로 사이드바를 접고 편다. 글을 쓰는 중에는 받지 않는다 */
export function useSidebarShortcut(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'b' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      event.preventDefault();
      setSidebarCollapsed(!readSidebarCollapsed());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

function Library({ collapsed }: { collapsed: boolean }) {
  const { locale } = useLocale();
  const { isSignedIn } = useAuth();
  const favorites = useMyRepertoire(isSignedIn === true);

  const sections = React.useMemo(
    () => (favorites.data ? groupLibraryEntries(buildLibraryEntries(favorites.data), LIBRARY_PER_SECTION) : []),
    [favorites.data, locale]
  );

  // 접어도 사진은 제자리에 남고(가운데 30px 선) 글자만 서서히 사라진다. 세로 자리도 그대로라 접고 펼 때 움직이지 않는다
  // 접히면 글자·안내 링크가 투명해도 좁은 칸 안에 남아 있어서, 눌리지 않게 막는다
  const fade = cn('cm-fade', collapsed && 'pointer-events-none opacity-0');
  return (
    <View className="mt-4 flex-1 border-t border-border pt-4">
      <Text variant="micro" numberOfLines={1} className={cn('px-2.5 pb-2.5 uppercase tracking-widest', fade)}>
        {t('레퍼토리')}
      </Text>
      {!isSignedIn ? (
        <Link href="/(auth)/sign-in" asChild>
          <Pressable disabled={collapsed} className={cn('rounded-md px-2.5 py-2 hover:bg-surface-2', fade)}>
            <Text variant="caption" className="text-foreground-muted" style={{ minWidth: 190 }}>
              {t('로그인하면 즐겨찾기한 작곡가·연주자가 여기에 모여요.')}
            </Text>
          </Pressable>
        </Link>
      ) : favorites.isError ? (
        <Pressable
          disabled={collapsed}
          className={cn('rounded-md px-2.5 py-2 hover:bg-surface-2', fade)}
          onPress={() => favorites.refetch()}>
          <Text variant="caption" className="text-foreground-muted" style={{ minWidth: 190 }}>
            {t('즐겨찾기를 못 불러왔어요. 눌러서 다시 시도해 주세요.')}
          </Text>
        </Pressable>
      ) : sections.length === 0 && !favorites.isLoading ? (
        <Text variant="caption" className={cn('px-2.5 py-2 text-foreground-muted', fade)} style={{ minWidth: 190 }}>
          {t('작곡가나 연주자를 즐겨찾기하면 여기에 모여요.')}
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {sections.map((section) => (
            <View key={section.kind} className="mb-2.5">
              {/* 사람·작품·공연이 섞이지 않게 종류별로 묶는다. 악기는 연주자 행 부제로 보인다 */}
              <View className={cn('flex-row items-baseline gap-1.5 px-2.5 pb-1 pt-1', fade)}>
                <Text numberOfLines={1} className="text-[11.5px] font-semibold text-foreground-subtle">
                  {t(section.label)}
                </Text>
                <Text className="text-[11px] text-foreground-subtle/70">{section.total}</Text>
              </View>
              {section.entries.map((entry) => (
                <LibraryLink key={entry.key} entry={entry} collapsed={collapsed} />
              ))}
              {section.total > section.entries.length ? (
                <Link href={`/library?kind=${section.kind}` as Href} asChild>
                  <Pressable disabled={collapsed} className={cn('rounded-md px-2.5 py-1.5 hover:bg-surface-2', fade)}>
                    <Text numberOfLines={1} className="text-[12px] text-foreground-muted" style={{ minWidth: 150 }}>
                      {t('{kind} {count}개 더 보기', { kind: t(section.label), count: section.total - section.entries.length })}
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** 레퍼토리 한 줄. 사진은 접어도 제자리, 글자는 접으면 사라지고 마우스를 올리면 이름이 뜬다 */
function LibraryLink({ entry, collapsed }: { entry: LibraryEntry; collapsed: boolean }) {
  const queryClient = useQueryClient();
  const hover = useHoverLabel(entry.title, collapsed);
  return (
    <Link href={entry.href as Href} asChild>
      <Pressable
        {...createPrefetchHandlers(queryClient, prefetchTargetFromHref(entry.href))}
        {...hover}
        accessibilityRole="link"
        accessibilityLabel={entry.title}
        className="flex-row items-center gap-3 rounded-md px-[3px] py-[7px] hover:bg-surface-2">
        <View className="shrink-0">
          <LibraryThumb entry={entry} />
        </View>
        <View className={cn('cm-fade min-w-0 flex-1', collapsed && 'opacity-0')} style={{ minWidth: 140 }}>
          <Text numberOfLines={1} className="text-[13px] font-semibold">
            {entry.title}
          </Text>
          <Text numberOfLines={1} className="text-[11.5px] text-foreground-muted">
            {entry.subtitle}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

function LibraryThumb({ entry, size = 38 }: { entry: LibraryEntry; size?: number }) {
  useLocale();
  const image = useComposerAvatar(entry.composerId, entry.image);
  return <EntityThumb name={entry.title} image={image} shape={entry.shape} size={size} aspect={entry.kind === 'concert' ? 4 / 3 : 1} />;
}
