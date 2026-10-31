import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { ProfileSetupScreen } from './src/screens/ProfileSetupScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Colors } from './src/theme/colors';

// Reset focus outline and default border for HTML inputs on React Native Web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'expo-web-input-reset';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      * {
        -webkit-tap-highlight-color: transparent !important;
        -webkit-touch-callout: none;
      }
      input, textarea, select {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        border: none !important;
        box-shadow: none !important;
        touch-action: manipulation;
        user-select: text !important;
        -webkit-user-select: text !important;
        pointer-events: auto !important;
        cursor: text !important;
      }
      input:focus, textarea:focus, select:focus {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        border: none !important;
        box-shadow: none !important;
        user-select: text !important;
        -webkit-user-select: text !important;
        pointer-events: auto !important;
      }
      *:focus {
        outline: none !important;
      }
      button, a, [role="button"] {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }
}

import { AppSplashScreen } from './src/components/AppSplashScreen';
import { MFAChallengeModal } from './src/components/MFAChallengeModal';

const RootContent: React.FC = () => {
  const { 
    isAuthenticated, 
    isProfileComplete, 
    isMfaPending, 
    verifyMfaLogin, 
    cancelMfaLogin 
  } = useAuth();

  return (
    <>
      <NavigationContainer>
        {!isAuthenticated ? (
          <AuthNavigator />
        ) : !isProfileComplete ? (
          <ProfileSetupScreen />
        ) : (
          <BottomTabNavigator />
        )}
      </NavigationContainer>
      <MFAChallengeModal
        visible={isMfaPending}
        onVerify={verifyMfaLogin}
        onCancel={cancelMfaLogin}
      />
    </>
  );
};

export default function App() {
  const [isSplashFinished, setIsSplashFinished] = React.useState(false);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <StatusBar style={isSplashFinished ? "dark" : "light"} />
          <RootContent />
        </SafeAreaView>
        {!isSplashFinished && (
          <AppSplashScreen onFinish={() => setIsSplashFinished(true)} />
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
});
