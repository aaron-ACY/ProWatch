import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, G, Mask, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LOGO_WIDTH = 160;
const LOGO_HEIGHT = 172;
const TOTAL_ARC_LENGTH = 451;

// Centerline of ellipse.svg (tracing the arc from bottom-right -> bottom -> left -> top)
const ELLIPSE_CENTERLINE_D =
  "M 191.2 156.1 " +
  "C 181.3 171.7 167.5 184.4 153.7 191.6 " +
  "C 135.4 201.2 116.9 204.4 97.7 202.1 " +
  "C 77.2 199.7 58.7 190.8 45.3 179.6 " +
  "C 30.3 167.1 19.6 150.3 14.2 131.8 " +
  "C 8.9 113.3 9.0 93.3 14.9 74.8 " +
  "C 21.0 56.1 31.9 39.9 47.2 27.9 " +
  "C 61.3 16.8 79.5 9.1 100.1 6.7 " +
  "C 117.3 4.7 134.6 7.6 150.2 15.6";

// 21 equidistant lookup samples along the 451px centerline arc for high performance tip tracking
const ARC_LUT: [number, number][] = [
  [191.2, 156.1], [177.2, 173.7], [159.9, 188.0], [139.6, 197.7], [117.6, 202.5],
  [95.1, 201.8], [73.4, 196.0], [53.4, 185.7], [36.3, 171.1], [23.1, 152.9],
  [14.3, 132.2], [10.5, 110.0], [11.8, 87.6], [18.2, 66.0], [29.3, 46.5],
  [44.6, 30.0], [63.4, 17.6], [84.4, 9.7], [106.6, 6.2], [129.0, 8.0], [150.2, 15.6],
];

const getArcTip = (p: number): [number, number] => {
  const clamped = Math.max(0, Math.min(1, p));
  const idx = clamped * (ARC_LUT.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, ARC_LUT.length - 1);
  const frac = idx - i0;
  return [
    ARC_LUT[i0][0] + frac * (ARC_LUT[i1][0] - ARC_LUT[i0][0]),
    ARC_LUT[i0][1] + frac * (ARC_LUT[i1][1] - ARC_LUT[i0][1]),
  ];
};

// 1. Heart Silhouette + ECG Waveform Cutout (viewBox aligned with ellipse.svg: 0 0 202 217)
const HeartLogo: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Svg width={width} height={height} viewBox="0 0 202 217" fill="none">
    <Defs>
      <SvgGradient id="splashHeartGrad" x1="109.142" y1="46.7381" x2="109.142" y2="174.607" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#EE5B5D" />
        <Stop offset="1" stopColor="#C51013" />
      </SvgGradient>
    </Defs>
    {/* White base silhouette */}
    <Path
      d="M34.865 90.2071C34.865 126.327 64.7203 145.576 86.5749 162.804C94.2869 168.884 101.715 174.608 109.142 174.608C116.57 174.608 123.998 168.884 131.71 162.804C153.565 145.576 183.42 126.327 183.42 90.2071C183.42 54.0864 142.566 28.4704 109.142 63.1963C75.7188 28.4704 34.865 54.0864 34.865 90.2071Z"
      fill="#FFFFFF"
    />
    {/* Red ECG pulse cutout */}
    <Path
      d="M109.142 63.1963C142.566 28.4704 183.42 54.0864 183.42 90.207C183.42 126.327 153.565 145.576 131.711 162.805C123.998 168.884 116.57 174.607 109.142 174.607C101.715 174.607 94.2868 168.884 86.575 162.805C72.6161 151.801 55.3949 139.971 44.7722 123.449H73.2898C74.7992 123.449 76.1391 122.481 76.613 121.048L86.4636 91.2412L97.3074 144.306C97.6361 145.913 99.0372 147.077 100.677 147.104C102.317 147.132 103.757 146.016 104.139 144.421L112.39 109.998L116.406 121.136C116.907 122.523 118.224 123.449 119.699 123.449H149.639C151.572 123.449 153.139 121.882 153.139 119.949C153.139 118.016 151.572 116.449 149.639 116.449H122.157L115.007 96.6162C114.482 95.1615 113.064 94.2232 111.52 94.3086C110.073 94.389 108.835 95.3516 108.389 96.7109L108.311 96.9873L101.008 127.455L90.6921 76.9697C90.3745 75.4163 89.0513 74.2703 87.4685 74.1768C85.9841 74.0894 84.6186 74.9483 84.0437 76.2969L83.9392 76.5723L70.7605 116.449H40.8337C37.1163 108.769 34.865 100.124 34.865 90.207C34.865 54.0864 75.7187 28.4705 109.142 63.1963Z"
      fill="url(#splashHeartGrad)"
    />
  </Svg>
);

// 2. Outer Line Curved Gauge directly from ellipse.svg, revealed along the arc from bottom to top
const EllipseLogo: React.FC<{ width: number; height: number; strokeProgress: number }> = ({
  width,
  height,
  strokeProgress,
}) => {
  const dashOffset = TOTAL_ARC_LENGTH * (1 - Math.min(Math.max(strokeProgress, 0), 1));
  const [tipX, tipY] = getArcTip(strokeProgress);
  const showSpark = strokeProgress > 0.04 && strokeProgress < 0.98;

  return (
    <Svg width={width} height={height} viewBox="0 0 202 217" fill="none">
      <Defs>
        <SvgGradient id="splashEllipseGrad" x1="108.5" y1="0" x2="108.5" y2="209" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#FF5252" />
          <Stop offset="1" stopColor="#83E764" />
        </SvgGradient>
        {/* Dynamic mask tracing the centerline from bottom-right up to top-right */}
        <Mask id="curveDrawMask">
          <Path
            d={ELLIPSE_CENTERLINE_D}
            stroke="#FFFFFF"
            strokeWidth={24}
            strokeLinecap="round"
            strokeDasharray={`${TOTAL_ARC_LENGTH}`}
            strokeDashoffset={dashOffset}
          />
        </Mask>
      </Defs>
      <G mask="url(#curveDrawMask)">
        <Path
          d="M194.5 151.842C197.563 153.528 198.695 157.389 196.827 160.344C186.953 175.963 173.089 188.718 156.62 197.262C138.274 206.779 117.517 210.642 96.9748 208.363C76.4328 206.083 57.028 197.763 41.2143 184.455C25.4006 171.148 13.8882 153.449 8.13307 133.599C2.37791 113.748 2.63841 92.6364 8.88163 72.9337C15.1248 53.2311 27.0704 35.8222 43.2076 22.9086C59.3449 9.99499 78.9491 2.15663 99.5411 0.384733C118.026 -1.20587 136.562 2.15623 153.259 10.0709C156.419 11.5684 157.528 15.4369 155.842 18.4997V18.4997C154.156 21.5625 150.314 22.6569 147.142 21.1859C132.649 14.4638 116.616 11.623 100.627 12.9989C82.5293 14.5561 65.3003 21.4448 51.1182 32.7938C36.936 44.1429 26.4378 59.4426 20.9509 76.7581C15.4641 94.0737 15.2352 112.627 20.2931 130.073C25.351 147.519 35.4685 163.073 49.3663 174.768C63.2641 186.464 80.3179 193.776 98.3712 195.779C116.424 197.782 134.666 194.387 150.79 186.023C165.036 178.633 177.063 167.657 185.713 154.225C187.606 151.286 191.438 150.156 194.5 151.842V151.842Z"
          fill="url(#splashEllipseGrad)"
        />
      </G>
      {/* Leading Energy Spark traveling along the curve */}
      {showSpark && (
        <G>
          <Circle cx={tipX} cy={tipY} r={8} fill="#FFFFFF" opacity={0.35} />
          <Circle cx={tipX} cy={tipY} r={5} fill="#FFFFFF" opacity={0.75} />
          <Circle cx={tipX} cy={tipY} r={2.5} fill="#FFFFFF" />
        </G>
      )}
    </Svg>
  );
};

interface AppSplashScreenProps {
  onFinish: () => void;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ onFinish }) => {
  // State for outer curve progressive draw (0 -> 1)
  const [curveProgress, setCurveProgress] = useState(0);

  // Animated values
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;

  // Radar / Telemetry Pulse rings
  const ring1Scale = useRef(new Animated.Value(0.6)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.4)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;

  // Typography & Subtitles
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  // ECG Pulse indicator
  const ecgOpacity = useRef(new Animated.Value(0)).current;
  const ecgScale = useRef(new Animated.Value(0.9)).current;

  // Master Exit Animation (Iris / Zoom dissolve)
  const masterOpacity = useRef(new Animated.Value(1)).current;
  const masterScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo Entry: Spring bounce + Fade in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // 1b. Smooth curve progression driving curveProgress along the centerline arc from bottom to top
    let animFrame: number;
    const startDelay = 100;
    const drawDuration = 1050;
    const startTime = Date.now() + startDelay;

    const animateCurve = () => {
      const now = Date.now();
      if (now < startTime) {
        animFrame = requestAnimationFrame(animateCurve);
        return;
      }
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, elapsed / drawDuration);
      // Silky cubic ease-out
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
      setCurveProgress(easedProgress);

      if (rawProgress < 1) {
        animFrame = requestAnimationFrame(animateCurve);
      }
    };
    animFrame = requestAnimationFrame(animateCurve);

    // 2. Telemetry Radar Wave Loop (Concentric Rings)
    const runRingLoop = () => {
      ring1Scale.setValue(0.7);
      ring1Opacity.setValue(0.7);
      ring2Scale.setValue(0.5);
      ring2Opacity.setValue(0.5);

      Animated.parallel([
        Animated.timing(ring1Scale, {
          toValue: 2.2,
          duration: 1800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ring1Opacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(350),
          Animated.parallel([
            Animated.timing(ring2Scale, {
              toValue: 2.0,
              duration: 1600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(ring2Opacity, {
              toValue: 0,
              duration: 1600,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    };
    runRingLoop();

    // 3. Floating levitation for the 3D logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: -8,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();



    // 5. Typography Entrance after 400ms
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 6. ECG Status Pulse after 700ms
    Animated.sequence([
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(ecgOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(ecgScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 7. Master Exit after 2.3 seconds
    const exitTimer = setTimeout(() => {
      triggerExit();
    }, 2300);

    return () => {
      clearTimeout(exitTimer);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  const triggerExit = () => {
    Animated.parallel([
      Animated.timing(masterOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(masterScale, {
        toValue: 1.1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  };

  return (
    <Animated.View
      style={[
        styles.masterContainer,
        {
          opacity: masterOpacity,
          transform: [{ scale: masterScale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={triggerExit}
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={['#060913', '#0F172A', '#020617']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        >
          {/* Ambient Background Radial Glows */}
          <View style={styles.ambientGlowTop} />
          <View style={styles.ambientGlowCenter} />

          <View style={styles.centerStage}>
            {/* Telemetry Wave Radar Ring 1 */}
            <Animated.View
              style={[
                styles.radarRing,
                styles.radarRing1,
                {
                  opacity: ring1Opacity,
                  transform: [{ scale: ring1Scale }],
                },
              ]}
            />

            {/* Telemetry Wave Radar Ring 2 */}
            <Animated.View
              style={[
                styles.radarRing,
                styles.radarRing2,
                {
                  opacity: ring2Opacity,
                  transform: [{ scale: ring2Scale }],
                },
              ]}
            />

            {/* Central 3D Logo with Float Effect */}
            <Animated.View
              style={[
                styles.logoWrapper,
                {
                  opacity: logoOpacity,
                  transform: [
                    { scale: logoScale },
                    { translateY: logoFloat },
                  ],
                },
              ]}
            >
              {/* Logo Stage with Animated Outer Line curve + Heart Silhouette */}
              <View style={styles.logoStage}>
                {/* 1. Outer Line ellipse.svg: Tracing smoothly along the curved arc from bottom to top */}
                <View style={StyleSheet.absoluteFill}>
                  <EllipseLogo width={LOGO_WIDTH} height={LOGO_HEIGHT} strokeProgress={curveProgress} />
                </View>

                {/* 2. Heart Silhouette + ECG Waveform on top */}
                <View style={StyleSheet.absoluteFill}>
                  <HeartLogo width={LOGO_WIDTH} height={LOGO_HEIGHT} />
                </View>
              </View>
            </Animated.View>

            {/* Brand Typography */}
            <Animated.View
              style={[
                styles.brandContainer,
                {
                  opacity: textOpacity,
                  transform: [{ translateY: textTranslateY }],
                },
              ]}
            >
              <View style={styles.titleRow}>
                <Text style={styles.titlePro}>PROWATCH</Text>
                <Text style={styles.titleHealth}> HEALTH</Text>
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.badgeLine} />
                <Text style={styles.taglineText}>XIAO ESP32-S3 TELEMETRY</Text>
                <View style={styles.badgeLine} />
              </View>
            </Animated.View>

            {/* Bottom Skip hint */}
            <Animated.View
              style={[
                styles.statusContainer,
                {
                  opacity: ecgOpacity,
                  transform: [{ scale: ecgScale }],
                },
              ]}
            >
              <Text style={styles.skipHintText}>Chạm để tiếp tục</Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  masterContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 999999,
    elevation: 999999,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -SCREEN_WIDTH * 0.4,
    left: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  ambientGlowCenter: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.28,
    left: SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  radarRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  radarRing1: {
    width: 220,
    height: 220,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  radarRing2: {
    width: 280,
    height: 280,
    borderColor: 'rgba(129, 140, 248, 0.25)',
  },
  logoWrapper: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoStage: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    position: 'relative',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePro: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  titleHealth: {
    fontSize: 32,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  badgeLine: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 2.5,
    marginHorizontal: 10,
  },
  statusContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  skipHintText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
