import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'vi' | 'en';
export type FontSizeScale = 'small' | 'normal' | 'large' | 'xlarge';

export const FONT_SCALE_VALUES: Record<FontSizeScale, number> = {
  small: 0.9,
  normal: 1.0,
  large: 1.1,
  xlarge: 1.2,
};

const LANGUAGE_STORAGE_KEY = '@prowatch_app_language';
const FONT_SCALE_STORAGE_KEY = '@prowatch_app_font_scale';

let activeFontScale = 1.0;

// Setup text scaling hook for React Native Web
if (Platform.OS === 'web') {
  try {
    const rnw = require('react-native-web');
    if (rnw?.Text?.render && !(rnw.Text as any).__prowatch_scaled) {
      (rnw.Text as any).__prowatch_scaled = true;
      const origRender = rnw.Text.render;
      rnw.Text.render = function (props: any, ref: any) {
        if (activeFontScale === 1.0) {
          return origRender.call(this, props, ref);
        }
        let extraStyle: any = null;
        const flat = rnw.StyleSheet ? rnw.StyleSheet.flatten(props.style) : null;
        if (flat && typeof flat.fontSize === 'number') {
          extraStyle = {
            fontSize: Math.round(flat.fontSize * activeFontScale),
            ...(typeof flat.lineHeight === 'number'
              ? { lineHeight: Math.round(flat.lineHeight * activeFontScale) }
              : {}),
          };
        }
        const newProps = extraStyle ? { ...props, style: [props.style, extraStyle] } : props;
        return origRender.call(this, newProps, ref);
      };
    }
  } catch (e) {
    console.warn('Failed to setup font scaling on web', e);
  }
}

// Setup text scaling hook for React Native Native
if (Platform.OS !== 'web') {
  try {
    const RN = require('react-native');
    if (RN?.Text && (RN.Text as any).render && !(RN.Text as any).__prowatch_scaled) {
      (RN.Text as any).__prowatch_scaled = true;
      const origNativeRender = (RN.Text as any).render;
      (RN.Text as any).render = function (props: any, ref: any) {
        if (activeFontScale === 1.0) {
          return origNativeRender.call(this, props, ref);
        }
        let extraStyle: any = null;
        const flat = RN.StyleSheet ? RN.StyleSheet.flatten(props.style) : null;
        if (flat && typeof flat.fontSize === 'number') {
          extraStyle = {
            fontSize: Math.round(flat.fontSize * activeFontScale),
            ...(typeof flat.lineHeight === 'number'
              ? { lineHeight: Math.round(flat.lineHeight * activeFontScale) }
              : {}),
          };
        }
        const newProps = extraStyle ? { ...props, style: [props.style, extraStyle] } : props;
        return origNativeRender.call(this, newProps, ref);
      };
    }
  } catch (e) {}
}

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  fontSizeScale: FontSizeScale;
  fontScaleMultiplier: number;
  setFontSizeScale: (scale: FontSizeScale) => Promise<void>;
  t: (vi: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: async () => {},
  fontSizeScale: 'normal',
  fontScaleMultiplier: 1.0,
  setFontSizeScale: async () => {},
  t: (vi: string) => vi,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('vi');
  const [fontSizeScale, setFontScaleState] = useState<FontSizeScale>('normal');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
      AsyncStorage.getItem(FONT_SCALE_STORAGE_KEY),
    ])
      .then(([savedLang, savedFontScale]) => {
        if (savedLang === 'vi' || savedLang === 'en') {
          setLanguageState(savedLang);
        }
        if (
          savedFontScale &&
          (savedFontScale === 'small' ||
            savedFontScale === 'normal' ||
            savedFontScale === 'large' ||
            savedFontScale === 'xlarge')
        ) {
          activeFontScale = FONT_SCALE_VALUES[savedFontScale];
          setFontScaleState(savedFontScale as FontSizeScale);
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback(async (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {}
  }, []);

  const setFontSizeScale = useCallback(async (scale: FontSizeScale) => {
    activeFontScale = FONT_SCALE_VALUES[scale] || 1.0;
    setFontScaleState(scale);
    try {
      await AsyncStorage.setItem(FONT_SCALE_STORAGE_KEY, scale);
    } catch {}
  }, []);

  const t = useCallback(
    (vi: string, en: string) => {
      return language === 'en' ? en : vi;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        fontSizeScale,
        fontScaleMultiplier: FONT_SCALE_VALUES[fontSizeScale] || 1.0,
        setFontSizeScale,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
