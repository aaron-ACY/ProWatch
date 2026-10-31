import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { WatchStatus } from '../types';
import { WATCH_FIRMWARE_VERSION } from '../services/bleService';

interface BluetoothConnectionToggleProps {
  watchStatus: WatchStatus;
  isConnecting: boolean;
  isTestingDevice?: boolean;
  onOpenScan: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  onSyncSettings?: () => void;
  onTestData?: () => void;
  onSyncOffline?: () => void;
}

export const BluetoothConnectionToggle: React.FC<BluetoothConnectionToggleProps> = ({
  watchStatus,
  isConnecting,
  isTestingDevice = false,
  onOpenScan,
  onReconnect,
  onDisconnect,
  onSyncSettings,
  onTestData,
  onSyncOffline,
}) => {
  const isConnected = !!watchStatus.connected;

  const handleToggle = (value: boolean) => {
    if (value) {
      if (watchStatus.deviceName && watchStatus.deviceName !== 'Chưa kết nối đồng hồ') {
        onReconnect();
      } else {
        onOpenScan();
      }
    } else {
      if (isConnected) {
        onDisconnect();
      }
    }
  };

  return (
    <View style={[styles.card, Shadows.sm]}>
      {/* Main Toggle Row */}
      <View style={styles.toggleRow}>
        <View style={[
          styles.iconBox,
          isConnected ? styles.iconBoxConnected : styles.iconBoxDisconnected
        ]}>
          <MaterialCommunityIcons
            name={isConnected ? "bluetooth-connect" : "bluetooth-off"}
            size={22}
            color={isConnected ? Colors.primary : Colors.textMuted}
          />
        </View>

        <View style={styles.infoBox}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Kết nối đồng hồ</Text>
            {isConnected && (
              <View style={styles.connectedBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.connectedBadgeText}>Đã kết nối</Text>
              </View>
            )}
          </View>
          <Text style={styles.subText} numberOfLines={1}>
            {isConnected
              ? `${watchStatus.deviceName || 'XIAO ESP32-S3'} • Pin ${watchStatus.battery}%`
              : 'Gạt công tắc để dò tìm & ghép đôi đồng hồ'}
          </Text>
        </View>

        {isConnecting ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />
        ) : (
          <Switch
            value={isConnected}
            onValueChange={handleToggle}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        )}
      </View>

      {/* Connected Expanded Details & Actions */}
      {isConnected ? (
        <View style={styles.expandedSection}>
          <View style={styles.divider} />

          <View style={styles.deviceMetaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Địa chỉ MAC</Text>
              <Text style={styles.metaVal}>{watchStatus.bleAddress || 'Đang kết nối'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Phiên bản</Text>
              <Text style={styles.metaVal}>{watchStatus.firmwareVersion || WATCH_FIRMWARE_VERSION}</Text>
            </View>
          </View>

          <View style={styles.actionBtnRow}>
            {onSyncSettings && (
              <TouchableOpacity
                style={styles.syncBtn}
                onPress={onSyncSettings}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="sync" size={15} color={Colors.white} />
                <Text style={styles.syncBtnText}>Đồng bộ cấu hình</Text>
              </TouchableOpacity>
            )}

            {onTestData && (
              <TouchableOpacity
                style={styles.testBtn}
                onPress={onTestData}
                disabled={isTestingDevice}
                activeOpacity={0.8}
              >
                {isTestingDevice ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <MaterialCommunityIcons name="database-arrow-right" size={15} color="#0284C7" />
                )}
                <Text style={styles.testBtnText}>Test nhận tin</Text>
              </TouchableOpacity>
            )}

            {onSyncOffline && (
              <TouchableOpacity
                style={styles.offlineBtn}
                onPress={onSyncOffline}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="cloud-download-outline" size={15} color="#16A34A" />
                <Text style={styles.offlineBtnText}>Tải Offline</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.scanOtherBtn}
              onPress={onOpenScan}
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={14} color={Colors.primary} />
              <Text style={styles.scanOtherBtnText}>Đổi thiết bị</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Action helper when disconnected */
        <View style={styles.disconnectedActionRow}>
          <TouchableOpacity
            style={styles.manualScanBtn}
            onPress={onOpenScan}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="radar" size={16} color={Colors.primary} />
            <Text style={styles.manualScanBtnText}>Dò tìm danh sách Bluetooth</Text>
            <Feather name="chevron-right" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxConnected: {
    backgroundColor: Colors.primaryLight,
  },
  iconBoxDisconnected: {
    backgroundColor: Colors.cardMuted,
  },
  infoBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.success,
  },
  connectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  subText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  expandedSection: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 12,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 5,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  offlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 5,
  },
  offlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  scanOtherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 5,
  },
  scanOtherBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  disconnectedActionRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  manualScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  manualScanBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
});
