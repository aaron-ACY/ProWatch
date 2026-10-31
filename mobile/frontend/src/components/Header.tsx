import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { WatchStatus } from '../types';

interface HeaderProps {
  status: WatchStatus;
  onSync: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ status, onSync, isSyncing = false }) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.watchIconContainer}>
          <MaterialCommunityIcons 
            name="watch-variant" 
            size={24} 
            color={status.connected ? Colors.primary : Colors.textMuted} 
          />
        </View>
        <View style={styles.titleContainer}>
          <View style={styles.deviceRow}>
            <Text style={styles.deviceName}>{status.deviceName}</Text>
            <View style={[styles.statusDot, { backgroundColor: status.connected ? Colors.success : Colors.danger }]} />
          </View>
          <Text style={styles.subText}>
            {status.connected ? `Đã kết nối • Đồng bộ: ${status.lastSync}` : 'Mất kết nối đồng hồ'}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Battery Pill */}
        <View style={styles.batteryPill}>
          <Ionicons 
            name={status.battery > 20 ? "battery-charging" : "battery-dead"} 
            size={16} 
            color={status.battery > 20 ? Colors.success : Colors.danger} 
          />
          <Text style={styles.batteryText}>{status.battery}%</Text>
        </View>

        {/* Sync Button */}
        <TouchableOpacity 
          style={styles.syncButton} 
          onPress={onSync} 
          disabled={isSyncing}
          activeOpacity={0.7}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="sync" size={18} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  watchIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  batteryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  syncButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
