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
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const beatPulseAnim = useRef(new Animated.Value(0)).current;

  const bpmRef = useRef(bpm);
  const isMeasuringRef = useRef(isMeasuring);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
  }, [isMeasuring]);

  useEffect(() => {
    if (!isMeasuring) {
      scrollAnim.stopAnimation();
      scaleYAnim.stopAnimation();
      translateYAnim.stopAnimation();
      beatPulseAnim.stopAnimation();
      scrollAnim.setValue(0);
      scaleYAnim.setValue(1);
      translateYAnim.setValue(0);
      beatPulseAnim.setValue(0);
      return;
    }

    let isCancelled = false;

    // 1. Cuộn ngang liên tục theo tần số nhịp tim thực tế (1 nhịp = 160px chu kỳ sóng)
    const runContinuousScroll = () => {
      if (isCancelled || !isMeasuringRef.current) return;
      const currentBpm = bpmRef.current > 0 ? bpmRef.current : 75;
      const cycleDuration = Math.round((60 / currentBpm) * 1000);

      scrollAnim.setValue(0);
      Animated.timing(scrollAnim, {
        toValue: -160,
        duration: Math.max(320, cycleDuration),
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !isCancelled && isMeasuringRef.current) {
          runContinuousScroll();
        }
      });
    };

    // 2. Nhịp co bóp sinh học: Sóng R giật nảy lên cao dựa trực tiếp theo thông số BPM đo được
    const runBiologicalHeartbeat = () => {
      if (isCancelled || !isMeasuringRef.current) return;
      const currentBpm = bpmRef.current > 0 ? bpmRef.current : 75;
      const beatInterval = Math.round((60 / currentBpm) * 1000);

      // BPM càng cao thì nhịp co bóp tâm thất càng mạnh và dồn dập
      const normBpm = Math.min(150, Math.max(50, currentBpm));
      const spikeScale = 1.18 + ((normBpm - 50) / 100) * 0.45; // Biên độ nảy từ 1.18 -> 1.63
      const dipScale = Math.max(0.68, 0.9 - ((normBpm - 50) / 100) * 0.22); // Đáy tụt từ 0.90 -> 0.68
      const jumpY = -2 - Math.round(((normBpm - 50) / 100) * 4); // Độ nhún trục Y từ -2px đến -6px

      const spikeTime = Math.round(beatInterval * 0.14); // Pha co bóp đạt đỉnh (~100ms)
      const dipTime = Math.round(beatInterval * 0.12);   // Pha giãn thất sâu (~85ms)
      const recoverTime = Math.round(beatInterval * 0.16); // Pha hồi phục tái cực (~115ms)
      const restTime = Math.max(100, beatInterval - (spikeTime + dipTime + recoverTime)); // Pha nghỉ đẳng điện

      // Xung phát quang nhấp nháy theo đúng nhịp đập tim
      Animated.sequence([
        Animated.timing(beatPulseAnim, {
          toValue: 1,
          duration: spikeTime,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(beatPulseAnim, {
          toValue: 0,
          duration: dipTime + recoverTime,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Đỉnh sóng giật nảy thật sự theo nhịp đập tim
      Animated.sequence([
        // Pha 1: Tâm thất co bóp mạnh, đỉnh sóng R phóng lên cao!
        Animated.parallel([
          Animated.timing(scaleYAnim, {
            toValue: spikeScale,
            duration: spikeTime,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: jumpY,
            duration: spikeTime,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Pha 2: Đáy sóng S tụt xuống
        Animated.parallel([
          Animated.timing(scaleYAnim, {
            toValue: dipScale,
            duration: dipTime,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: Math.abs(jumpY) * 0.5,
            duration: dipTime,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Pha 3: Sóng T hồi phục
        Animated.parallel([
          Animated.timing(scaleYAnim, {
            toValue: 1.05,
            duration: recoverTime,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: recoverTime,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Pha 4: Đường đẳng điện nghỉ ngơi nhịp tim
        Animated.timing(scaleYAnim, {
          toValue: 1.0,
          duration: restTime,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && !isCancelled && isMeasuringRef.current) {
          runBiologicalHeartbeat();
        }
      });
    };

    runContinuousScroll();
    runBiologicalHeartbeat();

    return () => {
      isCancelled = true;
      scrollAnim.stopAnimation();
      scaleYAnim.stopAnimation();
      translateYAnim.stopAnimation();
      beatPulseAnim.stopAnimation();
      scrollAnim.setValue(0);
      scaleYAnim.setValue(1);
      translateYAnim.setValue(0);
      beatPulseAnim.setValue(0);
    };
  }, [isMeasuring]);

  const getStatus = (val: number) => {
    if (!val || val <= 0) return { label: 'Chưa đo', color: Colors.textMuted, bg: '#F1F5F9' };
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
        {(isMeasuring || bpm > 0) && (
          <View style={[styles.statusBadge, { backgroundColor: isMeasuring ? Colors.warningLight : status.bg }]}>
            <Text style={[styles.statusText, { color: isMeasuring ? Colors.warning : status.color }]}>
              {isMeasuring ? `Đang đo: ${measurementProgress}%` : status.label}
            </Text>
          </View>
        )}
      </View>

      {/* Main Value Display: Căn thẳng hàng 100% */}
      <View style={styles.centerValue}>
        <Text style={styles.percentageText}>{bpm > 0 ? bpm : '--'}</Text>
        <Text style={styles.bpmSymbol}>BPM</Text>
      </View>

      {/* ECG Line Monitor: Sóng điện tim sinh học đập và nảy theo nhịp tim đo được */}
      <View style={styles.ecgBox}>
        {/* Đường mờ tim chuẩn ở giữa */}
        <View style={styles.ecgCenterGuideLine} />

        {/* Lớp nền phát quang nhịp đập sinh học theo BPM thật */}
        {isMeasuring && (
          <Animated.View
            style={[
              styles.ecgPulseBg,
              {
                opacity: beatPulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.4],
                }),
              },
            ]}
            pointerEvents="none"
          />
        )}

        {isMeasuring ? (
          /* Sóng ECG chạy và co bóp nảy nhịp theo BPM đo được */
          <Animated.View 
            style={[
              styles.ecgAnimatedTrack, 
              { 
                transform: [
                  { translateX: scrollAnim },
                  { translateY: translateYAnim },
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
  ecgPulseBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EF4444',
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
