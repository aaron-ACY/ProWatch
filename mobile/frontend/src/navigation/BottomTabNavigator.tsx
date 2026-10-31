import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { RootTabParamList } from '../types';

import { DashboardScreen } from '../screens/DashboardScreen';
import { HeartRateScreen } from '../screens/HeartRateScreen';
import { SportScreen } from '../screens/SportScreen';
import { StatisticsScreen } from '../screens/StatisticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
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
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <MaterialCommunityIcons 
                name={focused ? "view-dashboard" : "view-dashboard-outline"} 
                size={22} 
                color={focused ? Colors.primary : color} 
              />
            </View>
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
            <View style={[styles.iconWrapper, focused && { backgroundColor: Colors.heartRateLight }]}>
              <MaterialCommunityIcons 
                name={focused ? "heart-pulse" : "heart-outline"} 
                size={23} 
                color={focused ? Colors.heartRate : color} 
              />
            </View>
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
            <View style={[styles.iconWrapper, focused && { backgroundColor: '#FFEDD5' }]}>
              <MaterialCommunityIcons 
                name={focused ? "run-fast" : "run"} 
                size={23} 
                color={focused ? "#EA580C" : color} 
              />
            </View>
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
            <View style={[styles.iconWrapper, focused && { backgroundColor: Colors.spo2Light }]}>
              <MaterialCommunityIcons 
                name={focused ? "chart-timeline-variant" : "chart-timeline-variant-shimmer"} 
                size={22} 
                color={focused ? Colors.spo2 : color} 
              />
            </View>
          ),
        }}
      />

      {/* 4. Settings Tab */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Ionicons 
                name={focused ? "settings" : "settings-outline"} 
                size={22} 
                color={focused ? Colors.primary : color} 
              />
            </View>
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
  activeIconWrapper: {
    backgroundColor: Colors.primaryLight,
  },
});
