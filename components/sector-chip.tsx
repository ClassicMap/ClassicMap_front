// components/sector-chip.tsx
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Edit2 as EditIcon, Plus as PlusIcon } from 'lucide-react-native';
import type { PerformanceSectorWithCount } from '@/lib/types/models';

interface SectorChipProps {
  sector: PerformanceSectorWithCount;
  isSelected: boolean;
  onPress: () => void;
  onEdit?: () => void;
}

export function SectorChip({ sector, isSelected, onPress, onEdit }: SectorChipProps) {
  // Validate sector has required properties
  if (!sector || !sector.sectorName) {
    return null;
  }

  const performanceCount = sector.performanceCount ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
        isSelected ? 'border-primary bg-primary' : 'border-border bg-secondary'
      }`}
      onPress={onPress}>
      <Text
        className={`text-sm font-medium ${
          isSelected ? 'text-primary-foreground' : 'text-secondary-foreground'
        }`}>
        {sector.sectorName}
      </Text>

      <View
        className={`rounded-full px-1.5 py-0.5 ${
          isSelected ? 'bg-primary-foreground/20' : 'bg-background/70'
        }`}>
        <Text
          className={`text-xs font-medium ${
            isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
          }`}>
          {performanceCount}
        </Text>
      </View>

      {onEdit && isSelected && (
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            onEdit();
          }}
          className="ml-1">
          <Icon as={EditIcon} size={12} className="text-primary-foreground" />
        </Pressable>
      )}
    </Pressable>
  );
}

export function AddSectorChip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-2 rounded-full border-2 border-dashed border-foreground/40 bg-foreground/5 px-4 py-2"
      onPress={onPress}>
      <Icon as={PlusIcon} size={14} className="text-foreground" />
      <Text className="text-sm font-medium text-foreground">섹터</Text>
    </Pressable>
  );
}
