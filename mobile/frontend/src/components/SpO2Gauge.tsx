import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
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
  const [barWidth, setBarWidth] = useState<number>(0);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isMeasuringRef = useRef(isMeasuring);

  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
  }, [isMeasuring]);

  useEffect(() => {
    if (!isMeasuring) {
      scanAnim.stopAnimation();
      pulseAnim.stopAnimation();
      scanAnim.setValue(0);
      pulseAnim.setValue(1);
      return;
    }

    // Animation 1: Con trỏ quét và vệt sáng quang phổ lướt qua lại liên tục dọc theo thanh đo
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Animation 2: Hiệu ứng nhịp xung mao mạch phát quang nhẹ theo chu kỳ
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    scanLoop.start();
    pulseLoop.start();

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
      scanAnim.stopAnimation();
      pulseAnim.stopAnimation();
      scanAnim.setValue(0);
      pulseAnim.setValue(1);
    };
  }, [isMeasuring]);

  const getStatus = (val: number) => {
    if (!val || val <= 0) return { label: 'Chưa đo', color: Colors.textMuted, bg: '#F1F5F9' };
    if (val >= 97) return { label: 'Tối ưu', color: Colors.spo2, bg: Colors.spo2Light };
    if (val >= 95) return { label: 'Bình thường', color: Colors.success, bg: Colors.successLight };
    if (val >= 90) return { label: 'Cần theo dõi', color: Colors.warning, bg: Colors.warningLight };
    return { label: 'Thiếu oxy máu', color: Colors.danger, bg: Colors.dangerLight };
  };

  const status = getStatus(percentage);
  const hasReading = percentage > 0;

  // Tính toán phạm vi quét của con trỏ scanner
  const maxTravel = Math.max(0, barWidth - 10);
  const scannerTranslateX = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxTravel],
  });

  const beamTranslateX = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, Math.max(0, barWidth - 40)],
  });

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
        {(isMeasuring || hasReading) && (
          <View style={[styles.statusBadge, { backgroundColor: isMeasuring ? Colors.warningLight : status.bg }]}>
            <Text style={[styles.statusText, { color: isMeasuring ? Colors.warning : status.color }]}>
              {isMeasuring ? `Đang đo: ${measurementProgress}%` : status.label}
            </Text>
          </View>
        )}
      </View>

      {/* Main Value Display */}
      <View style={styles.centerValue}>
        <Text style={styles.percentageText}>{hasReading ? percentage : '--'}</Text>
        <Text style={styles.percentSymbol}>%</Text>
      </View>

      {/* Visual Range Indicator Box - Đồng bộ kích thước chuẩn 56px với ecgBox của HeartRateVisualizer */}
      <View style={[styles.gaugeBox, isMeasuring && styles.gaugeBoxActive]}>
        <View 
          style={styles.scaleBar} 
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {/* Segment Danger <90% */}
          <View 
            style={[
              styles.segment, 
              { flex: 1, backgroundColor: isMeasuring ? '#FECDD3' : hasReading ? '#FEE2E2' : '#F1F5F9' }
            ]} 
          />
          {/* Segment Warning 90-94% */}
          <View 
            style={[
              styles.segment, 
              { flex: 1, backgroundColor: isMeasuring ? '#FDE68A' : hasReading ? '#FEF3C7' : '#F1F5F9' }
            ]} 
          />
          {/* Segment Normal 95-100% */}
          <View 
            style={[
              styles.segment, 
              { flex: 3, backgroundColor: isMeasuring ? '#7DD3FC' : hasReading ? '#BAE6FD' : '#F1F5F9' }
            ]} 
          />

          {/* Vệt sáng quang phổ hồng ngoại lướt quét trên thanh đo khi đang đo */}
          {isMeasuring && barWidth > 0 && (
            <Animated.View
              style={[
                styles.scanBeam,
                {
                  opacity: pulseAnim,
                  transform: [{ translateX: beamTranslateX }],
                },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Khi đang đo: Con trỏ quét mao mạch trượt qua lại và phát xung sáng */}
          {isMeasuring && barWidth > 0 ? (
            <Animated.View
              style={[
                styles.scannerMarkerWrap,
                { transform: [{ translateX: scannerTranslateX }] },
              ]}
            >
              <Animated.View style={[styles.scannerMarkerGlow, { opacity: pulseAnim }]} />
              <View style={styles.scannerMarkerCore} />
            </Animated.View>
          ) : (
            /* Khi không đo: Con trỏ hiển thị cố định tại kết quả đo vừa ghi nhận */
            hasReading && (
              <View 
                style={[
                  styles.marker, 
                  { 
                    left: `${Math.min(Math.max((percentage - 85) / 15 * 100, 0), 96)}%`,
                    backgroundColor: status.color,
                  }
                ]} 
              />
            )
          )}
        </View>

        {/* Thước tỉ lệ SpO2 chuẩn */}
        <View style={styles.scaleLabels}>
          <Text style={styles.scaleLabelText}>85%</Text>
          <Text style={styles.scaleLabelText}>90%</Text>
          <Text style={styles.scaleLabelText}>95%</Text>
          <Text style={[styles.scaleLabelText, { color: Colors.spo2, fontWeight: '700' }]}>100%</Text>
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
    height: 36,
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
    marginTop: 4,
    marginBottom: 16,
    height: 54,
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
  gaugeBox: {
    height: 56,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  gaugeBoxActive: {
    borderColor: '#7DD3FC',
    backgroundColor: '#F0F9FF',
  },
  scaleBar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'visible',
    position: 'relative',
    marginHorizontal: 2,
  },
  segment: {
    height: '100%',
    borderRadius: 3,
    marginHorizontal: 1,
  },
  scanBeam: {
    position: 'absolute',
    top: -2,
    width: 36,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(2, 132, 199, 0.4)',
  },
  scannerMarkerWrap: {
    position: 'absolute',
    top: -5,
    left: 0,
    width: 10,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerMarkerGlow: {
    position: 'absolute',
    width: 18,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.35)',
  },
  scannerMarkerCore: {
    width: 8,
    height: 18,
    borderRadius: 4,
    backgroundColor: Colors.spo2,
    borderWidth: 2,
    borderColor: Colors.white,
    ...Shadows.sm,
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
    paddingHorizontal: 2,
  },
  scaleLabelText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
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
    height: 48,
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
