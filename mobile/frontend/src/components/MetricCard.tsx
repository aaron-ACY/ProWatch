import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accentColor: string;
  badgeText: string;
  badgeColor?: string;
  subInfo?: string;
  onPress?: () => void;
  progressPercent?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  accentColor,
  badgeText,
  badgeColor,
  subInfo,
  onPress,
  progressPercent,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      style={[styles.card, Shadows.md]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
            <MaterialCommunityIcons name={icon} size={20} color={accentColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: badgeColor ? `${badgeColor}18` : `${accentColor}18` }]}>
          <Text style={[styles.badgeText, { color: badgeColor || accentColor }]}>{badgeText}</Text>
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>

      {progressPercent !== undefined && (
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${Math.min(Math.max(progressPercent, 0), 100)}%`,
                backgroundColor: accentColor,
              }
            ]} 
          />
        </View>
      )}

      {subInfo ? (
        <Text style={styles.subInfo}>{subInfo}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  subInfo: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
});
