import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { OptimizedImage } from '@/components/optimized-image';
import type {
  AutoCollection,
  FavoriteGroups,
  ProfileSummary,
  ProfileVisibility,
  RatedConcertListItem,
  UpdateProfileVisibilityInput,
} from '@/lib/api/client';
import { getImageUrl } from '@/lib/utils/image';
import {
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  HeartIcon,
  ListIcon,
  RefreshCwIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  StarIcon,
  UserIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

export type ProfileTabKey = 'ratings' | 'favorites' | 'collections' | 'profile';
export type RatingSortKey = 'recent' | 'highest' | 'lowest' | 'concertDate';
type FavoriteSegmentKey = keyof FavoriteGroups;

const PROFILE_TABS: { key: ProfileTabKey; label: string; icon: typeof StarIcon }[] = [
  { key: 'ratings', label: '평가', icon: StarIcon },
  { key: 'favorites', label: '보고싶어요', icon: HeartIcon },
  { key: 'collections', label: '컬렉션', icon: ListIcon },
  { key: 'profile', label: '프로필', icon: UserIcon },
];

const RATING_SORT_OPTIONS: { key: RatingSortKey; label: string; icon: typeof ClockIcon }[] = [
  { key: 'recent', label: '최근 평가순', icon: ClockIcon },
  { key: 'highest', label: '높은 별점순', icon: StarIcon },
  { key: 'lowest', label: '낮은 별점순', icon: SlidersHorizontalIcon },
  { key: 'concertDate', label: '공연일순', icon: CalendarIcon },
];

const FAVORITE_SEGMENTS: { key: FavoriteSegmentKey; label: string }[] = [
  { key: 'concerts', label: '공연' },
  { key: 'artists', label: '아티스트' },
  { key: 'composers', label: '작곡가' },
  { key: 'pieces', label: '곡' },
];

export const EMPTY_FAVORITES: FavoriteGroups = {
  concerts: [],
  artists: [],
  composers: [],
  pieces: [],
};

export function getFavoriteCount(favorites: FavoriteGroups): number {
  return (
    favorites.concerts.length +
    favorites.artists.length +
    favorites.composers.length +
    favorites.pieces.length
  );
}

export function buildAutoCollections(
  ratings: RatedConcertListItem[],
  favorites: FavoriteGroups
): AutoCollection[] {
  return [
    {
      id: 'five-star-concerts',
      title: '별점 5점 공연',
      count: ratings.filter((rating) => rating.myRating === 5).length,
    },
    {
      id: 'recent-ratings',
      title: '최근 평가',
      count: ratings.length,
    },
    {
      id: 'wanted-concerts',
      title: '보고싶은 공연',
      count: favorites.concerts.length,
    },
    {
      id: 'favorite-artists',
      title: '좋아하는 아티스트',
      count: favorites.artists.length,
    },
  ];
}

export function buildProfileSummary(
  ratings: RatedConcertListItem[],
  favorites: FavoriteGroups,
  collections: AutoCollection[]
): ProfileSummary {
  const averageRating =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((sum, rating) => sum + rating.myRating, 0) / ratings.length) * 10
        ) / 10
      : 0;

  return {
    ratingsCount: ratings.length,
    averageRating,
    favoritesCount: getFavoriteCount(favorites),
    collectionsCount: collections.filter((collection) => collection.count > 0).length,
  };
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateText: string): string {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function PosterFallback() {
  return (
    <View className="h-full w-full items-center justify-center bg-muted">
      <Icon as={CalendarIcon} className="text-muted-foreground" size={36} />
    </View>
  );
}

function PosterImage({ uri }: { uri?: string | null }) {
  if (!uri) {
    return <PosterFallback />;
  }

  return (
    <OptimizedImage
      uri={uri}
      style={{ width: '100%', height: '100%' }}
      resizeMode="cover"
      fallbackComponent={<PosterFallback />}
    />
  );
}

export function InlineState({
  title,
  description,
  actionLabel,
  onAction,
  loading,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <View className="items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8">
      {loading ? <ActivityIndicator size="small" /> : null}
      <Text className="text-center text-base font-semibold">{title}</Text>
      {description ? (
        <Text className="text-center text-sm leading-5 text-muted-foreground">{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" onPress={onAction}>
          <Icon as={RefreshCwIcon} className="size-4" />
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export function MyPageHeader({
  displayName,
  subtitle,
  bio,
  avatarUrl,
  onOpenPublicProfile,
}: {
  displayName: string;
  subtitle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  onOpenPublicProfile?: () => void;
}) {
  const imageSource = avatarUrl ? { uri: getImageUrl(avatarUrl) } : undefined;

  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-4">
        <Avatar alt={`${displayName} avatar`} className="size-20">
          <AvatarImage source={imageSource} />
          <AvatarFallback>
            <Text className="text-2xl font-bold">{getInitials(displayName)}</Text>
          </AvatarFallback>
        </Avatar>
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-bold leading-8">{displayName}</Text>
          {subtitle ? <Text className="text-sm text-muted-foreground">{subtitle}</Text> : null}
          {bio ? <Text className="text-sm leading-5">{bio}</Text> : null}
        </View>
      </View>
      {onOpenPublicProfile ? (
        <Button variant="outline" onPress={onOpenPublicProfile}>
          <Icon as={EyeIcon} className="size-4" />
          <Text>공개 프로필 보기</Text>
        </Button>
      ) : null}
    </View>
  );
}

export function ProfileStats({ summary }: { summary: ProfileSummary }) {
  const stats = [
    { label: '평가', value: summary.ratingsCount.toString() },
    {
      label: '평균 별점',
      value: summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '0.0',
    },
    { label: '보고싶어요', value: summary.favoritesCount.toString() },
    { label: '컬렉션', value: summary.collectionsCount.toString() },
  ];

  return (
    <View className="flex-row flex-wrap gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="min-w-[145px] flex-1 basis-[45%] gap-2 rounded-lg p-4">
          <Text className="text-sm text-muted-foreground">{stat.label}</Text>
          <Text className="text-2xl font-bold">{stat.value}</Text>
        </Card>
      ))}
    </View>
  );
}

export function ProfileTabs({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTabKey;
  onChange: (tab: ProfileTabKey) => void;
}) {
  return (
    <View className="flex-row rounded-lg border border-border bg-muted/30 p-1">
      {PROFILE_TABS.map((tab) => {
        const selected = activeTab === tab.key;
        return (
          <Button
            key={tab.key}
            variant={selected ? 'secondary' : 'ghost'}
            size="sm"
            className="flex-1"
            onPress={() => onChange(tab.key)}>
            <Icon as={tab.icon} className="size-4" />
            <Text>{tab.label}</Text>
          </Button>
        );
      })}
    </View>
  );
}

export function RatedConcertGrid({
  ratings,
  sortKey,
  onSortChange,
  onOpenConcert,
  emptyAction,
}: {
  ratings: RatedConcertListItem[];
  sortKey: RatingSortKey;
  onSortChange: (sortKey: RatingSortKey) => void;
  onOpenConcert?: (concertId: number) => void;
  emptyAction?: () => void;
}) {
  const sortedRatings = React.useMemo(() => {
    const copied = [...ratings];
    return copied.sort((a, b) => {
      switch (sortKey) {
        case 'highest':
          return b.myRating - a.myRating;
        case 'lowest':
          return a.myRating - b.myRating;
        case 'concertDate':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'recent':
        default:
          return new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime();
      }
    });
  }, [ratings, sortKey]);

  if (ratings.length === 0) {
    return (
      <InlineState
        title="공연에 별점을 남기면 여기 모여."
        actionLabel={emptyAction ? '공연 보러가기' : undefined}
        onAction={emptyAction}
      />
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-2">
        {RATING_SORT_OPTIONS.map((option) => {
          const selected = sortKey === option.key;
          return (
            <Button
              key={option.key}
              variant={selected ? 'secondary' : 'outline'}
              size="sm"
              onPress={() => onSortChange(option.key)}>
              <Icon as={option.icon} className="size-4" />
              <Text>{option.label}</Text>
            </Button>
          );
        })}
      </View>
      <View className="flex-row flex-wrap gap-3">
        {sortedRatings.map((rating) => (
          <Pressable
            key={rating.concertId}
            className="w-[47%] overflow-hidden rounded-lg border border-border bg-card web:w-[180px]"
            onPress={() => onOpenConcert?.(rating.concertId)}>
            <View className="aspect-[3/4] bg-muted">
              <PosterImage uri={rating.posterUrl} />
            </View>
            <View className="gap-1 p-3">
              <Text className="text-sm font-semibold leading-5" numberOfLines={2}>
                {rating.title}
              </Text>
              <View className="flex-row items-center gap-1">
                <Icon as={StarIcon} size={14} className="text-amber-500" />
                <Text className="text-sm font-semibold">{rating.myRating.toFixed(1)}</Text>
              </View>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {formatDate(rating.startDate)}
              </Text>
              {rating.facilityName ? (
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {rating.facilityName}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function FavoriteSegmentList({
  favorites,
  onOpenConcert,
  onOpenArtist,
  onOpenComposer,
}: {
  favorites: FavoriteGroups;
  onOpenConcert?: (concertId: number) => void;
  onOpenArtist?: (artistId: number) => void;
  onOpenComposer?: (composerId: number) => void;
}) {
  const [segment, setSegment] = React.useState<FavoriteSegmentKey>('concerts');
  const empty = favorites[segment].length === 0;

  return (
    <View className="gap-4">
      <View className="flex-row rounded-lg border border-border bg-muted/30 p-1">
        {FAVORITE_SEGMENTS.map((item) => {
          const selected = segment === item.key;
          return (
            <Button
              key={item.key}
              variant={selected ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1"
              onPress={() => setSegment(item.key)}>
              <Text>{item.label}</Text>
            </Button>
          );
        })}
      </View>
      {empty ? (
        <InlineState title="보고 싶은 공연과 좋아하는 음악가를 저장해봐." />
      ) : (
        <FavoriteSegmentContent
          segment={segment}
          favorites={favorites}
          onOpenConcert={onOpenConcert}
          onOpenArtist={onOpenArtist}
          onOpenComposer={onOpenComposer}
        />
      )}
    </View>
  );
}

function FavoriteSegmentContent({
  segment,
  favorites,
  onOpenConcert,
  onOpenArtist,
  onOpenComposer,
}: {
  segment: FavoriteSegmentKey;
  favorites: FavoriteGroups;
  onOpenConcert?: (concertId: number) => void;
  onOpenArtist?: (artistId: number) => void;
  onOpenComposer?: (composerId: number) => void;
}) {
  if (segment === 'concerts') {
    return (
      <View className="flex-row flex-wrap gap-3">
        {favorites.concerts.map((concert) => (
          <Pressable
            key={concert.concertId}
            className="w-[47%] overflow-hidden rounded-lg border border-border bg-card web:w-[180px]"
            onPress={() => onOpenConcert?.(concert.concertId)}>
            <View className="aspect-[3/4] bg-muted">
              <PosterImage uri={concert.posterUrl} />
            </View>
            <View className="gap-1 p-3">
              <Text className="text-sm font-semibold leading-5" numberOfLines={2}>
                {concert.title}
              </Text>
              <Text className="text-xs text-muted-foreground">{formatDate(concert.startDate)}</Text>
              {concert.facilityName ? (
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {concert.facilityName}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  if (segment === 'artists') {
    return (
      <View className="gap-2">
        {favorites.artists.map((artist) => (
          <FavoriteRow
            key={artist.artistId}
            title={artist.name}
            subtitle={`${artist.englishName} · ${artist.category}`}
            imageUrl={artist.imageUrl || undefined}
            onPress={() => onOpenArtist?.(artist.artistId)}
          />
        ))}
      </View>
    );
  }

  if (segment === 'composers') {
    return (
      <View className="gap-2">
        {favorites.composers.map((composer) => (
          <FavoriteRow
            key={composer.composerId}
            title={composer.name}
            subtitle={`${composer.englishName} · ${composer.period}`}
            imageUrl={composer.avatarUrl || undefined}
            onPress={() => onOpenComposer?.(composer.composerId)}
          />
        ))}
      </View>
    );
  }

  return (
    <View className="gap-2">
      {favorites.pieces.map((piece) => (
        <FavoriteRow
          key={piece.pieceId}
          title={piece.title}
          subtitle={piece.titleEn ? `${piece.titleEn} · ${piece.composerName}` : piece.composerName}
        />
      ))}
    </View>
  );
}

function FavoriteRow({
  title,
  subtitle,
  imageUrl,
  onPress,
}: {
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  onPress?: () => void;
}) {
  const imageSource = imageUrl ? { uri: getImageUrl(imageUrl) } : undefined;

  return (
    <Pressable
      className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-3"
      onPress={onPress}>
      <Avatar alt={`${title} image`} className="size-12">
        <AvatarImage source={imageSource} />
        <AvatarFallback>
          <Text>{getInitials(title)}</Text>
        </AvatarFallback>
      </Avatar>
      <View className="flex-1 gap-1">
        <Text className="font-semibold" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {onPress ? <Icon as={ChevronRightIcon} className="size-4 text-muted-foreground" /> : null}
    </Pressable>
  );
}

export function AutoCollections({ collections }: { collections: AutoCollection[] }) {
  if (collections.every((collection) => collection.count === 0)) {
    return <InlineState title="컬렉션은 평가와 보고싶어요가 쌓이면 자동으로 만들어져." />;
  }

  return (
    <View className="flex-row flex-wrap gap-3">
      {collections.map((collection) => (
        <Card key={collection.id} className="min-w-[220px] flex-1 basis-[45%] rounded-lg p-0">
          <CardHeader>
            <View className="flex-row items-center justify-between gap-3">
              <View className="gap-1">
                <CardTitle>{collection.title}</CardTitle>
                <Text className="text-sm text-muted-foreground">{collection.count}개 항목</Text>
              </View>
              <Icon as={ListIcon} className="size-5 text-muted-foreground" />
            </View>
          </CardHeader>
        </Card>
      ))}
    </View>
  );
}

export function ProfileVisibilitySettings({
  profile,
  defaultDisplayName,
  defaultAvatarUrl,
  onSave,
  isSaving,
  onOpenEditProfile,
  onOpenSettings,
}: {
  profile?: ProfileVisibility | null;
  defaultDisplayName: string;
  defaultAvatarUrl?: string | null;
  onSave: (input: UpdateProfileVisibilityInput) => void;
  isSaving: boolean;
  onOpenEditProfile: () => void;
  onOpenSettings: () => void;
}) {
  const [displayName, setDisplayName] = React.useState(defaultDisplayName);
  const [bio, setBio] = React.useState('');
  const [summaryPublic, setSummaryPublic] = React.useState(true);
  const [ratingsPublic, setRatingsPublic] = React.useState(false);
  const [favoritesPublic, setFavoritesPublic] = React.useState(false);
  const [collectionsPublic, setCollectionsPublic] = React.useState(false);

  React.useEffect(() => {
    setDisplayName(profile?.displayName || defaultDisplayName);
    setBio(profile?.bio || '');
    setSummaryPublic(profile?.summaryPublic ?? true);
    setRatingsPublic(profile?.ratingsPublic ?? false);
    setFavoritesPublic(profile?.favoritesPublic ?? false);
    setCollectionsPublic(profile?.collectionsPublic ?? false);
  }, [defaultDisplayName, profile]);

  const handleSave = () => {
    onSave({
      displayName: displayName.trim() || defaultDisplayName,
      bio: bio.trim(),
      avatarUrl: profile?.avatarUrl || defaultAvatarUrl || undefined,
      summaryPublic,
      ratingsPublic,
      favoritesPublic,
      collectionsPublic,
    });
  };

  return (
    <View className="gap-4">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>프로필 수정</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          <View className="gap-2">
            <Label nativeID="displayName">표시 이름</Label>
            <Input
              aria-labelledby="displayName"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="표시 이름"
            />
          </View>
          <View className="gap-2">
            <Label nativeID="bio">한줄 소개</Label>
            <Input
              aria-labelledby="bio"
              value={bio}
              onChangeText={setBio}
              placeholder="한줄 소개"
              maxLength={300}
            />
          </View>
          <Button onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" />
            ) : (
              <Icon as={UserIcon} className="size-4" />
            )}
            <Text>{isSaving ? '저장 중...' : '저장'}</Text>
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>공개 범위 설정</CardTitle>
        </CardHeader>
        <CardContent className="gap-1">
          <VisibilityRow label="요약 공개" value={summaryPublic} onChange={setSummaryPublic} />
          <Separator />
          <VisibilityRow label="평가 목록 공개" value={ratingsPublic} onChange={setRatingsPublic} />
          <Separator />
          <VisibilityRow
            label="보고싶어요 공개"
            value={favoritesPublic}
            onChange={setFavoritesPublic}
          />
          <Separator />
          <VisibilityRow
            label="컬렉션 공개"
            value={collectionsPublic}
            onChange={setCollectionsPublic}
          />
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardContent className="gap-2 pt-6">
          <Button variant="outline" className="justify-between" onPress={onOpenEditProfile}>
            <View className="flex-row items-center gap-2">
              <Icon as={UserIcon} className="size-4" />
              <Text>계정 프로필 수정</Text>
            </View>
            <Icon as={ChevronRightIcon} className="size-4 text-muted-foreground" />
          </Button>
          <Button variant="outline" className="justify-between" onPress={onOpenSettings}>
            <View className="flex-row items-center gap-2">
              <Icon as={SettingsIcon} className="size-4" />
              <Text>설정 화면으로 이동</Text>
            </View>
            <Icon as={ChevronRightIcon} className="size-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}

function VisibilityRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-row items-center gap-2">
        <Icon as={value ? EyeIcon : EyeOffIcon} className="size-4 text-muted-foreground" />
        <Text>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
