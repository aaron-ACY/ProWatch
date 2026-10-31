export type WatchFaceTheme = 'PIPBOY';

export type StrapColor = 'OBSIDIAN' | 'TITANIUM' | 'NAVY' | 'CRIMSON';

export type CameraPreset = 'FRONT' | 'PERSPECTIVE' | 'BACK_SENSOR' | 'SIDE';

export interface StrapColorConfig {
  name: string;
  hex: number;
  css: string;
  metalHex: number;
}

export const STRAP_COLORS: Record<StrapColor, StrapColorConfig> = {
  OBSIDIAN: {
    name: 'Đen Obsidian',
    hex: 0x18181b,
    css: '#18181b',
    metalHex: 0x27272a,
  },
  TITANIUM: {
    name: 'Xám Titan',
    hex: 0x52525b,
    css: '#52525b',
    metalHex: 0x71717a,
  },
  NAVY: {
    name: 'Xanh Navy',
    hex: 0x1e293b,
    css: '#1e293b',
    metalHex: 0x334155,
  },
  CRIMSON: {
    name: 'Đỏ Thể Thao',
    hex: 0x991b1b,
    css: '#991b1b',
    metalHex: 0x3f3f46,
  },
};

export interface Watch3DState {
  strapColor: StrapColor;
  watchFaceTheme: WatchFaceTheme;
  autoRotate: boolean;
  motionSync: boolean;
  explodedProgress: number; // 0 (assembled) to 1 (fully exploded)
  cameraPreset: CameraPreset;
}

