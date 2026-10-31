export const Colors = {
  // Light Theme Primary Backgrounds
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  cardMuted: '#F1F5F9',
  
  // Text Colors
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textLight: '#CBD5E1',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#CBD5E1',

  // Health Accents
  heartRate: '#EF4444',       // Vibrant Ruby Red
  heartRateLight: '#FEE2E2',  // Light red tint
  heartRateDark: '#B91C1C',
  
  spo2: '#0284C7',            // Clear Sky Blue
  spo2Light: '#E0F2FE',       // Light sky tint
  spo2Dark: '#0369A1',

  // Status & Utility Colors
  success: '#10B981',         // Soft Emerald Green
  successLight: '#D1FAE5',
  warning: '#F59E0B',         // Amber
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  
  primary: '#2563EB',         // Royal Blue
  primaryLight: '#EFF6FF',
  
  // Shadows & Accents
  shadow: '#0F172A',
  white: '#FFFFFF',
  black: '#000000',
  tint: '#3B82F6',
};

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
};
