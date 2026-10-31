import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AppSplashScreenProps {
  onFinish: () => void;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ onFinish }) => {
  // Animated values
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;

  // Radar / Telemetry Pulse rings
  const ring1Scale = useRef(new Animated.Value(0.6)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.4)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;

  // Satellite Orb glowing beacon
  const orbGlow = useRef(new Animated.Value(0)).current;

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

    // 4. Satellite Orb Beacon pulsing
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlow, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbGlow, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
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

    return () => clearTimeout(exitTimer);
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
              {/* Backlight halo behind the 3D logo */}
              <View style={styles.logoHalo} />

              <Image
                source={require('../../assets/expo-go-app-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />

              {/* Pulsing beacon on the satellite orb */}
              <Animated.View
                style={[
                  styles.orbBeacon,
                  {
                    opacity: orbGlow,
                    transform: [{ scale: orbGlow.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.3],
                    }) }],
                  },
                ]}
              />
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
  logoHalo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 15,
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  orbBeacon: {
    position: 'absolute',
    right: 20,
    top: 58,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
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
