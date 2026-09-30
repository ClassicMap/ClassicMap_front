// components/sector-chip.tsx
import * as React from 'react';
import { Pressable } from 'react-native';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Edit2 as EditIcon, Plus as PlusIcon } from 'lucide-react-native';
import type { PerformanceSectorWithCount } from '@/lib/types/models';

interface SectorChipProps {
  sector: PerformanceSectorWithCount;
  isSelected: boolean;
  onPress: () => void;
  onEdit?: () => void;
}

export function SectorChip({ sector, isSelected, onPress, onEdit }: SectorChipProps) {
  if (!sector || !sector.sectorName) {
    return null;
  }

  return (
    <Chip
      label={sector.sectorName}
      count={sector.performanceCount ?? 0}
      selected={isSelected}
      onPress={onPress}
      trailing={
        onEdit && isSelected ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${sector.sectorName} 섹터 편집`}
            hitSlop={8}
            onPress={(e) => {
              e?.stopPropagation?.();
              onEdit();
            }}
            className="ml-0.5">
            <Icon as={EditIcon} size={12} className="text-primary" />
          </Pressable>
        ) : undefined
      }
    />
  );
}

export function AddSectorChip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="h-8 shrink-0 flex-row items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3"
      onPress={onPress}>
      <Icon as={PlusIcon} size={14} className="text-foreground-muted" />
      <Text className="text-label text-foreground-muted">섹터</Text>
    </Pressable>
  );
}
