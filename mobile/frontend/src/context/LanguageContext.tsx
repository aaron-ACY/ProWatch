import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, StyleSheet, Text as RNText } from 'react-native';
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

function computeScaledFontProps(props: any): any {
  if (
    activeFontScale === 1.0 ||
    !props ||
    props.allowFontScaling === false ||
    props.__prowatch_scaled
  ) {
    return props;
  }

  const flat: any = StyleSheet.flatten(props.style);
  const baseFontSize = flat && typeof flat.fontSize === 'number' ? flat.fontSize : 14;

  // Không phóng đại các chữ số Hero quá lớn (>= 28px như số BPM trong vòng tròn) để tránh tràn khung
  if (baseFontSize >= 28) {
    return props;
  }

  // Các tiêu đề vừa (21px - 27px) co giãn nhẹ nhàng hơn để giữ bố cục cân đối
  const effectiveScale =
    baseFontSize > 20 ? 1 + (activeFontScale - 1) * 0.55 : activeFontScale;

  const extraStyle: Record<string, number> = {
    fontSize: Math.round(baseFontSize * effectiveScale * 10) / 10,
  };

  if (flat && typeof flat.lineHeight === 'number') {
    extraStyle.lineHeight = Math.round(flat.lineHeight * effectiveScale * 10) / 10;
  }

  return {
    ...props,
    __prowatch_scaled: true,
    style: props.style ? [props.style, extraStyle] : extraStyle,
  };
}

function isTextComponentType(type: any): boolean {
  if (!type) return false;
  if (type === RNText) return true;
  const name = type.displayName || type.name;
  return name === 'Text' || name === 'TextImpl';
}

// 1. Hook vào React 19 Automatic JSX Runtime (jsx / jsxs / jsxDEV) & React.createElement cho cả Android, iOS và Web
try {
  const jsxRuntime = require('react/jsx-runtime');
  if (jsxRuntime && !jsxRuntime.__prowatch_patched) {
    jsxRuntime.__prowatch_patched = true;
    if (typeof jsxRuntime.jsx === 'function') {
      const origJsx = jsxRuntime.jsx;
      jsxRuntime.jsx = function (type: any, config: any, maybeKey: any) {
        const nextConfig = isTextComponentType(type) ? computeScaledFontProps(config) : config;
        return origJsx.call(this, type, nextConfig, maybeKey);
      };
    }
    if (typeof jsxRuntime.jsxs === 'function') {
      const origJsxs = jsxRuntime.jsxs;
      jsxRuntime.jsxs = function (type: any, config: any, maybeKey: any) {
        const nextConfig = isTextComponentType(type) ? computeScaledFontProps(config) : config;
        return origJsxs.call(this, type, nextConfig, maybeKey);
      };
    }
  }
} catch {}

try {
  const jsxDevRuntime = require('react/jsx-dev-runtime');
  if (jsxDevRuntime && !jsxDevRuntime.__prowatch_patched && typeof jsxDevRuntime.jsxDEV === 'function') {
    jsxDevRuntime.__prowatch_patched = true;
    const origJsxDev = jsxDevRuntime.jsxDEV;
    jsxDevRuntime.jsxDEV = function (type: any, config: any, maybeKey: any, isStaticChildren: any, source: any, self: any) {
      const nextConfig = isTextComponentType(type) ? computeScaledFontProps(config) : config;
      return origJsxDev.call(this, type, nextConfig, maybeKey, isStaticChildren, source, self);
    };
  }
} catch {}

// 2. Fallback cho React Native Web Text.render nếu có
if (Platform.OS === 'web') {
  try {
    const rnw = require('react-native-web');
    if (rnw?.Text?.render && !(rnw.Text as any).__prowatch_scaled) {
      (rnw.Text as any).__prowatch_scaled = true;
      const origRender = rnw.Text.render;
      rnw.Text.render = function (props: any, ref: any) {
        return origRender.call(this, computeScaledFontProps(props), ref);
      };
    }
  } catch {}
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
