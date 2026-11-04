import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { RootTabParamList } from '../types';

import { DashboardScreen } from '../screens/DashboardScreen';
import { HeartRateScreen } from '../screens/HeartRateScreen';
import { SportScreen } from '../screens/SportScreen';
import { StatisticsScreen } from '../screens/StatisticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<RootTabParamList>();

// Custom Button với hiệu ứng chạm nảy (tactile spring press effect)
const CustomTabBarButton: React.FC<BottomTabBarButtonProps> = (props) => {
  const { onPress, onLongPress, children, style } = props;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 7,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { flex: 1 }]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%', alignItems: 'center' }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Custom Icon với hiệu ứng phóng to nảy nhẹ khi được chọn (focused bounce)
interface TabIconProps {
  focused: boolean;
  color: string;
  name: string;
  activeName: string;
  iconFamily?: 'material' | 'ionicons';
  focusedBg: string;
  activeColor: string;
}

const TabIcon: React.FC<TabIconProps> = ({
  focused,
  color,
  name,
  activeName,
  iconFamily = 'material',
  focusedBg,
  activeColor,
}) => {
  const bounceAnim = useRef(new Animated.Value(focused ? 1 : 0.95)).current;

  useEffect(() => {
    if (focused) {
      bounceAnim.setValue(0.85);
      Animated.spring(bounceAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 9,
      }).start();
    } else {
      bounceAnim.setValue(1);
    }
  }, [focused]);

  const IconComp = iconFamily === 'ionicons' ? Ionicons : MaterialCommunityIcons;

  return (
    <Animated.View
      style={[
        styles.iconWrapper,
        focused && { backgroundColor: focusedBg },
        { transform: [{ scale: bounceAnim }] },
      ]}
    >
      <IconComp
        name={(focused ? activeName : name) as any}
        size={22}
        color={focused ? activeColor : color}
      />
    </Animated.View>
  );
};

export const BottomTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarButton: (props) => <CustomTabBarButton {...props} />,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          }
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* 1. Dashboard Tab */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Tổng quan',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              name="view-dashboard-outline"
              activeName="view-dashboard"
              focusedBg={Colors.primaryLight}
              activeColor={Colors.primary}
            />
          ),
        }}
      />

      {/* 2. Heart Rate Tab */}
      <Tab.Screen
        name="HeartRate"
        component={HeartRateScreen}
        options={{
          tabBarLabel: 'Tim',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              name="heart-outline"
              activeName="heart-pulse"
              focusedBg={Colors.heartRateLight}
              activeColor={Colors.heartRate}
            />
          ),
        }}
      />

      {/* 3. Sport Tab */}
      <Tab.Screen
        name="Sport"
        component={SportScreen}
        options={{
          tabBarLabel: 'Thể thao',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              name="run"
              activeName="run-fast"
              focusedBg="#FFEDD5"
              activeColor="#EA580C"
            />
          ),
        }}
      />

      {/* 4. Statistics Tab */}
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          tabBarLabel: 'Thống kê',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              name="chart-timeline-variant-shimmer"
              activeName="chart-timeline-variant"
              focusedBg={Colors.spo2Light}
              activeColor={Colors.spo2}
            />
          ),
        }}
      />

      {/* 5. Settings Tab */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              name="settings-outline"
              activeName="settings"
              iconFamily="ionicons"
              focusedBg={Colors.primaryLight}
              activeColor={Colors.primary}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 65,
    paddingBottom: 8,
    paddingTop: 6,
    ...Shadows.md,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
