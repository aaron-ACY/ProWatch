import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';

interface HeartRateVisualizerProps {
  bpm: number;
  isMeasuring: boolean;
  measurementProgress?: number;
  onToggleMeasure: () => void;
  statusText?: string;
  isConnected?: boolean;
}

export const HeartRateVisualizer: React.FC<HeartRateVisualizerProps> = ({
  bpm,
  isMeasuring,
  measurementProgress = 0,
  onToggleMeasure,
  isConnected = true,
}) => {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const scaleYAnim = useRef(new Animated.Value(1)).current;
  const isMeasuringRef = useRef(isMeasuring);

  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
  }, [isMeasuring]);

  useEffect(() => {
    if (!isMeasuring) {
      scrollAnim.stopAnimation();
      scrollAnim.setValue(0);
      scaleYAnim.stopAnimation();
      scaleYAnim.setValue(1);
      return;
    }

    let isCancelled = false;

    // Cuộn ngang sóng ECG liên tục khi bắt đầu đo
    const runScroll = () => {
      if (isCancelled || !isMeasuringRef.current) return;
      scrollAnim.setValue(0);
      Animated.timing(scrollAnim, {
        toValue: -320,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !isCancelled && isMeasuringRef.current) {
          runScroll();
        }
      });
    };

    // Biên độ sóng nhảy lên xuống ngẫu nhiên mô phỏng nhịp đập sinh học thực tế
    const runRandomHeight = () => {
      if (isCancelled || !isMeasuringRef.current) return;
      const targetScales = [1.35, 0.7, 1.45, 0.85, 1.25, 0.65, 1.4, 0.9];
      const nextScale = targetScales[Math.floor(Math.random() * targetScales.length)];
      const nextDuration = 180 + Math.floor(Math.random() * 220);

      Animated.timing(scaleYAnim, {
        toValue: nextScale,
        duration: nextDuration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !isCancelled && isMeasuringRef.current) {
          runRandomHeight();
        }
      });
    };

    runScroll();
    runRandomHeight();

    return () => {
      isCancelled = true;
      scrollAnim.stopAnimation();
      scrollAnim.setValue(0);
      scaleYAnim.stopAnimation();
      scaleYAnim.setValue(1);
    };
  }, [isMeasuring]);

  const getStatus = (val: number) => {
    if (!isConnected || !val || val <= 0) return { label: 'Chưa đo', color: Colors.textMuted, bg: '#F1F5F9' };
    if (val < 60) return { label: 'Nghỉ ngơi', color: '#0284C7', bg: '#E0F2FE' };
    if (val <= 100) return { label: 'Bình thường', color: Colors.success, bg: Colors.successLight };
    if (val <= 130) return { label: 'Đốt mỡ', color: Colors.warning, bg: Colors.warningLight };
    return { label: 'Cardio đỉnh', color: Colors.danger, bg: Colors.dangerLight };
  };

  const status = getStatus(bpm);

  return (
    <View style={[styles.container, Shadows.lg]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.iconBox, { backgroundColor: Colors.heartRateLight }]}>
            <MaterialCommunityIcons name="heart-pulse" size={22} color={Colors.heartRate} />
          </View>
          <Text style={styles.title}>Nhịp tim (Heart Rate)</Text>
        </View>

        {/* Chỉ hiện badge khi đang đo hoặc khi có kết quả đo hợp lệ (lược bỏ chữ 'Chưa đo') */}
        {(isMeasuring || (isConnected && bpm > 0)) && (
          <View style={[styles.statusBadge, { backgroundColor: isMeasuring ? Colors.warningLight : status.bg }]}>
            <Text style={[styles.statusText, { color: isMeasuring ? Colors.warning : status.color }]}>
              {isMeasuring ? `Đang đo: ${measurementProgress}%` : status.label}
            </Text>
          </View>
        )}
      </View>

      {/* Main Value Display: Căn thẳng hàng 100% */}
      <View style={styles.centerValue}>
        <Text style={styles.percentageText}>{isConnected && bpm > 0 ? bpm : '--'}</Text>
        <Text style={styles.bpmSymbol}>BPM</Text>
      </View>

      {/* ECG Line Monitor: Đổi thanh đo thành đường sóng ECG chạy lên xuống ngẫu nhiên */}
      <View style={styles.ecgBox}>
        {/* Đường mờ tim chuẩn ở giữa */}
        <View style={styles.ecgCenterGuideLine} />

        {isMeasuring ? (
          /* Sóng ECG chạy và co giãn biên độ ngẫu nhiên khi đang đo */
          <Animated.View 
            style={[
              styles.ecgAnimatedTrack, 
              { 
                transform: [
                  { translateX: scrollAnim },
                  { scaleY: scaleYAnim },
                ],
              },
            ]}
          >
            <Svg height="56" width="1120" viewBox="0 0 1120 56">
              <Defs>
                <LinearGradient id="ecgActiveGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={Colors.heartRate} stopOpacity="0.4" />
                  <Stop offset="0.5" stopColor={Colors.heartRate} stopOpacity="1" />
                  <Stop offset="1" stopColor={Colors.heartRate} stopOpacity="0.4" />
                </LinearGradient>
              </Defs>
              <Path
                d="M 0 28 L 30 28 Q 38 20 46 28 L 56 28 L 62 33 L 70 6 L 78 48 L 84 28 L 94 28 Q 106 16 118 28 L 160 28 L 190 28 Q 198 20 206 28 L 216 28 L 222 33 L 230 6 L 238 48 L 244 28 L 254 28 Q 266 16 278 28 L 320 28 L 350 28 Q 358 20 366 28 L 376 28 L 382 33 L 390 6 L 398 48 L 404 28 L 414 28 Q 426 16 438 28 L 480 28 L 510 28 Q 518 20 526 28 L 536 28 L 542 33 L 550 6 L 558 48 L 564 28 L 574 28 Q 586 16 598 28 L 640 28 L 670 28 Q 678 20 686 28 L 696 28 L 702 33 L 710 6 L 718 48 L 724 28 L 734 28 Q 746 16 758 28 L 800 28 L 830 28 Q 838 20 846 28 L 856 28 L 862 33 L 870 6 L 878 48 L 884 28 L 894 28 Q 906 16 918 28 L 960 28 L 990 28 Q 998 20 1006 28 L 1016 28 L 1022 33 L 1030 6 L 1038 48 L 1044 28 L 1054 28 Q 1066 16 1078 28 L 1120 28"
                fill="none"
                stroke="url(#ecgActiveGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        ) : (
          /* Đường sóng ECG tĩnh khi chưa đo hoặc đã kết thúc đo */
          <View style={styles.ecgStaticTrack}>
            <Svg height="56" width="100%" viewBox="0 0 320 56">
              <Path
                d="M 0 28 L 120 28 Q 128 22 136 28 L 142 28 L 146 32 L 152 14 L 158 42 L 162 28 L 170 28 Q 180 20 190 28 L 320 28"
                fill="none"
                stroke={Colors.heartRate}
                strokeOpacity="0.45"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        )}
      </View>

      {/* Measuring Progress bar khi đang đo */}
      {isMeasuring && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { width: `${measurementProgress}%` }]} />
        </View>
      )}

      {/* Trigger button */}
      <TouchableOpacity 
        style={[styles.measureBtn, { backgroundColor: isMeasuring ? Colors.textPrimary : Colors.heartRate }]}
        onPress={onToggleMeasure}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons 
          name={isMeasuring ? "stop" : "heart-pulse"} 
          size={18} 
          color={Colors.white} 
        />
        <Text style={styles.measureBtnText}>
          {isMeasuring ? `Đang đo nhịp tim (${measurementProgress}%)` : 'Bắt đầu đo nhịp tim'}
        </Text>
      </TouchableOpacity>
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
    marginTop: 4,
    marginBottom: 16,
  },
  percentageText: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  bpmSymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.heartRate,
    includeFontPadding: false,
  },
  ecgBox: {
    height: 56,
    backgroundColor: '#FFF8F8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    overflow: 'hidden',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  ecgCenterGuideLine: {
    position: 'absolute',
    top: 27,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  ecgAnimatedTrack: {
    flexDirection: 'row',
    width: 1120,
    height: 56,
    alignItems: 'center',
  },
  ecgStaticTrack: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: Colors.heartRate,
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
