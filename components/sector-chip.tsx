// components/sector-chip.tsx
import * as React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
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
      onPress={onPress}
      style={[
        styles.chipBase,
        isSelected ? styles.chipSelected : styles.chipUnselected
      ]}>
      <Text style={[
        styles.chipText,
        isSelected ? styles.textSelected : styles.textUnselected
      ]}>
        {sector.sectorName}
      </Text>

      <View style={[
        styles.badge,
        isSelected ? styles.badgeSelected : styles.badgeUnselected
      ]}>
        <Text style={[
          styles.badgeText,
          isSelected ? styles.badgeTextSelected : styles.badgeTextUnselected
        ]}>
          {performanceCount}
        </Text>
      </View>

      {onEdit && isSelected && (
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            onEdit();
          }}
          style={styles.editButton}>
          <Icon as={EditIcon} size={12} color="#fff" />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  chipUnselected: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e5e5e5',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textSelected: {
    color: '#fff',
  },
  textUnselected: {
    color: '#171717',
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeUnselected: {
    backgroundColor: '#e5e5e5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeTextSelected: {
    color: '#fff',
  },
  badgeTextUnselected: {
    color: '#737373',
  },
  editButton: {
    marginLeft: 4,
  },
});

export function AddSectorChip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={addStyles.addChip}>
      <Icon as={PlusIcon} size={14} color="#000" />
      <Text style={addStyles.addChipText}>섹터</Text>
    </Pressable>
  );
}

const addStyles = StyleSheet.create({
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 0, 0, 0.4)',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  addChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
});
