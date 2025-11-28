// components/sector-chip.tsx
import * as React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Edit as EditIcon, Plus as PlusIcon } from 'lucide-react-native';
import type { PerformanceSectorWithCount } from '@/lib/types/models';
import { cn } from '@/lib/utils';

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
    <TouchableOpacity
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-2 rounded-full px-4 py-2 border",
        isSelected
          ? "bg-primary border-primary shadow-sm"
          : "bg-secondary border-border"
      )}
      activeOpacity={0.7}>
      <Text className={cn(
        "text-sm font-medium",
        isSelected ? "text-primary-foreground" : "text-secondary-foreground"
      )}>
        {sector.sectorName}
      </Text>

      {/* Performance count badge */}
      <View className={cn(
        "rounded-full px-1.5 py-0.5",
        isSelected ? "bg-primary-foreground/20" : "bg-muted"
      )}>
        <Text className={cn(
          "text-xs font-medium",
          isSelected ? "text-primary-foreground" : "text-muted-foreground"
        )}>
          {performanceCount}
        </Text>
      </View>

      {/* Edit icon - show for admins when selected */}
      {onEdit && isSelected && (
        <TouchableOpacity
          onPress={(e) => {
            try {
              e?.stopPropagation?.();
              onEdit();
            } catch (error) {
              console.error('Error in edit handler:', error);
              onEdit();
            }
          }}
          className="ml-1">
          <Icon as={EditIcon} size={12} className="text-primary-foreground" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export function AddSectorChip({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-2"
      activeOpacity={0.7}>
      <Icon as={PlusIcon} size={14} className="text-primary" />
      <Text className="text-sm font-medium text-primary">섹터</Text>
    </TouchableOpacity>
  );
}
