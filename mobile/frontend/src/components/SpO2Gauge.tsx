import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';

interface SpO2GaugeProps {
  percentage: number;
  isMeasuring?: boolean;
  measurementProgress?: number;
  onToggleMeasure?: () => void;
  showMeasureButton?: boolean;
  isConnected?: boolean;
}

export const SpO2Gauge: React.FC<SpO2GaugeProps> = ({
  percentage,
  isMeasuring = false,
  measurementProgress = 0,
  onToggleMeasure,
  showMeasureButton = true,
  isConnected = true,
}) => {
  const getStatus = (val: number) => {
    if (!isConnected || !val || val <= 0) return { label: 'Chưa đo', color: Colors.textMuted, bg: '#F1F5F9' };
    if (val >= 97) return { label: 'Tối ưu', color: Colors.spo2, bg: Colors.spo2Light };
    if (val >= 95) return { label: 'Bình thường', color: Colors.success, bg: Colors.successLight };
    if (val >= 90) return { label: 'Cần theo dõi', color: Colors.warning, bg: Colors.warningLight };
    return { label: 'Thiếu oxy máu', color: Colors.danger, bg: Colors.dangerLight };
  };

  const status = getStatus(percentage);

  return (
    <View style={[styles.container, Shadows.lg]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.iconBox, { backgroundColor: Colors.spo2Light }]}>
            <MaterialCommunityIcons name="water-percent" size={22} color={Colors.spo2} />
          </View>
          <Text style={styles.title}>Nồng độ Oxy trong máu (SpO2)</Text>
        </View>
        {(isMeasuring || (isConnected && percentage > 0)) && (
          <View style={[styles.statusBadge, { backgroundColor: isMeasuring ? Colors.warningLight : status.bg }]}>
            <Text style={[styles.statusText, { color: isMeasuring ? Colors.warning : status.color }]}>
              {isMeasuring ? `Đang đo: ${measurementProgress}%` : status.label}
            </Text>
          </View>
        )}
      </View>

      {/* Main Value Display */}
      <View style={styles.centerValue}>
        <Text style={styles.percentageText}>{isConnected && percentage > 0 ? percentage : '--'}</Text>
        <Text style={styles.percentSymbol}>%</Text>
      </View>

      {/* Visual Range Indicator Bar */}
      <View style={styles.scaleContainer}>
        <View style={styles.scaleBar}>
          {/* Segment Danger <90% */}
          <View style={[styles.segment, { flex: 1, backgroundColor: Colors.dangerLight }]} />
          {/* Segment Warning 90-94% */}
          <View style={[styles.segment, { flex: 1, backgroundColor: Colors.warningLight }]} />
          {/* Segment Normal 95-100% */}
          <View style={[styles.segment, { flex: 3, backgroundColor: Colors.spo2Light }]} />

          {/* Current Indicator Marker */}
          {isConnected && percentage > 0 && (
            <View 
              style={[
                styles.marker, 
                { 
                  left: `${Math.min(Math.max((percentage - 85) / 15 * 100, 0), 96)}%`,
                  backgroundColor: status.color,
                }
              ]} 
            />
          )}
        </View>
      </View>

      {/* Measuring Progress */}
      {isMeasuring && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { width: `${measurementProgress}%` }]} />
        </View>
      )}

      {/* Trigger button */}
      {showMeasureButton && onToggleMeasure && (
        <TouchableOpacity 
          style={[styles.measureBtn, { backgroundColor: isMeasuring ? Colors.textPrimary : Colors.spo2 }]}
          onPress={onToggleMeasure}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name={isMeasuring ? "stop" : "pulse"} 
            size={18} 
            color={Colors.white} 
          />
          <Text style={styles.measureBtnText}>
            {isMeasuring ? `Đang quét mao mạch (${measurementProgress}%)` : 'Bắt đầu kiểm tra SpO2'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  centerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  percentageText: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  percentSymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.spo2,
    includeFontPadding: false,
  },
  subLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  scaleContainer: {
    marginBottom: 16,
  },
  scaleBar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'visible',
    position: 'relative',
    marginHorizontal: 4,
  },
  segment: {
    height: '100%',
    borderRadius: 3,
    marginHorizontal: 1,
  },
  marker: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.white,
    ...Shadows.sm,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  scaleLabelText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  progressContainer: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressTrack: {
    height: '100%',
    backgroundColor: Colors.spo2,
  },
  measureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    ...Shadows.sm,
  },
  measureBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
