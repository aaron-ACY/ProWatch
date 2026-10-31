export type HeartRateStatus = 'resting' | 'normal' | 'elevated' | 'high';
export type SpO2Status = 'optimal' | 'normal' | 'low' | 'critical';

export interface HeartRateReading {
  id: string;
  timestamp: string; // ISO or HH:mm format
  bpm: number;
  status: HeartRateStatus;
  activity?: string;
}

export interface SpO2Reading {
  id: string;
  timestamp: string;
  percentage: number;
  status: SpO2Status;
}

export type DeviceConnectionState = 'connected' | 'disconnected' | 'lost' | 'reconnecting';

export interface WatchStatus {
  connected: boolean;
  deviceName: string;
  battery: number;
  isCharging: boolean;
  lastSync: string;
  firmwareVersion: string;
  model: string;
  bleAddress: string;
  connectionState?: DeviceConnectionState;
  disconnectReason?: string;
}

export type WatchFaceType = 'minimal' | 'sport' | 'health' | 'cyber';

export interface WatchCustomization {
  watchFace: WatchFaceType;
  alwaysOnDisplay: boolean;
  raiseToWake: boolean;
  measurementIntervalMinutes: number; // 0 for continuous, 5, 15, 30
  hrAlertHigh: number; // e.g. 110 bpm
  hrAlertLow: number;  // e.g. 50 bpm
  spo2AlertLow: number; // e.g. 95%
  notificationsEnabled: boolean;
  hapticFeedback: boolean;
  apiServerUrl: string;
}

export interface HealthSummary {
  currentBpm: number;
  currentSpO2: number;
  steps: number;
  stepsGoal: number;
  calories: number;
  sleepHours: number;
  restingHr: number;
  maxHrToday: number;
  minHrToday: number;
  avgSpO2Today: number;
  currentActivity?: string; // "WALK" | "RUN" | "REST" | "SLEEP" từ MPU6050
  riskScore?: number;       // 0.0 - 1.0 từ mô hình AI TinyML
  riskLevel?: string;       // "Low" | "Medium" | "High"
}

export type RootTabParamList = {
  Dashboard: undefined;
  HeartRate: undefined;
  Sport: undefined;
  Statistics: undefined;
  Settings: undefined;
};

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  gender?: string;
  isProfileComplete?: boolean;
  createdAt: string;
}

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  Logout: undefined;
};
