import React from 'react';
import Svg, { Path, Circle, Rect, Ellipse } from 'react-native-svg';

interface VaultBoyProps {
  size?: number;
  color?: string;
}

/**
 * Authentic Fallout Pip-Boy Vault Boy walking silhouette vector
 * Designed to accurately match the original Fallout Pip-Boy 3000 walking mascot
 */
export const VaultBoySvg: React.FC<VaultBoyProps> = ({
  size = 56,
  color = '#00FF41',
}) => {
  const height = size * 1.4;

  return (
    <Svg width={size} height={height} viewBox="0 0 100 140" fill="none">
      {/* ============================================================== */}
      {/* 1. VAULT BOY HAIR (Iconic blonde pompadour swirl & tuft)       */}
      {/* ============================================================== */}
      <Path
        d="M 38 18 
           C 34 8, 48 2, 62 3 
           C 74 4, 84 10, 82 22 
           C 87 23, 91 28, 90 35 
           C 89 42, 82 46, 75 44 
           C 72 38, 70 33, 67 31
           C 66 25, 60 21, 52 23
           C 44 25, 41 33, 44 38
           C 36 34, 32 26, 38 18 Z"
        fill={color}
      />
      {/* Pompadour front swirl tuft */}
      <Path
        d="M 44 24
           C 40 18, 46 12, 54 13
           C 59 13, 62 16, 61 20
           C 58 24, 49 26, 44 24 Z"
        fill={color}
      />
      {/* Hair shadow lines */}
      <Path
        d="M 58 8 C 68 10, 75 16, 74 24"
        stroke="#000000"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M 48 16 C 53 14, 57 16, 56 19"
        stroke="#000000"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* ============================================================== */}
      {/* 2. FACE & HEAD (Round happy face, wink/eyes, smiling mouth)     */}
      {/* ============================================================== */}
      <Path
        d="M 45 28 
           C 51 26, 62 26, 69 31
           C 73 34, 76 42, 72 49
           C 68 56, 56 60, 48 57
           C 42 54, 39 46, 41 39
           C 42 34, 44 30, 45 28 Z"
        fill={color}
      />
      {/* Ear */}
      <Path
        d="M 39 37 C 36 37, 34 41, 36 45 C 38 48, 41 47, 42 43"
        fill={color}
        stroke="#000000"
        strokeWidth="1.2"
      />

      {/* Right Eye (winking / arch) */}
      <Path
        d="M 64 34 Q 68 31 71 35"
        stroke="#000000"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Left Eye (oval pupil with shine) */}
      <Circle cx="54" cy="35" r="2.2" fill="#000000" />
      {/* Cute nose */}
      <Circle cx="63" cy="40" r="1.1" fill="#000000" />
      {/* Eyebrows */}
      <Path
        d="M 50 30 Q 54 28 58 31"
        stroke="#000000"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Big happy Vault-Tec grin */}
      <Path
        d="M 49 44 Q 58 53 68 44"
        stroke="#000000"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Smile dimple */}
      <Path
        d="M 67 42 Q 69 44 68 46"
        stroke="#000000"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* ============================================================== */}
      {/* 3. VAULT SUIT BODY & COLLAR                                     */}
      {/* ============================================================== */}
      {/* Neck & high collar */}
      <Path
        d="M 47 56 L 62 56 L 64 61 L 45 61 Z"
        fill={color}
      />
      {/* Collar fold line */}
      <Path
        d="M 47 57 L 54 62 L 62 57"
        stroke="#000000"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Main Torso */}
      <Path
        d="M 43 61 
           L 66 61 
           L 69 88 
           L 37 88 
           Z"
        fill={color}
      />
      {/* Vault Suit yellow center stripe & zipper cutouts */}
      <Path
        d="M 53 62 L 53 88"
        stroke="#000000"
        strokeWidth="2"
      />
      <Path
        d="M 46 66 L 46 88"
        stroke="#000000"
        strokeWidth="1.5"
      />
      <Path
        d="M 60 66 L 60 88"
        stroke="#000000"
        strokeWidth="1.5"
      />

      {/* Belt with buckle */}
      <Rect x="36" y="87" width="34" height="6" fill="#000000" rx="1" />
      <Rect x="49" y="88" width="7" height="4.5" fill={color} rx="1" />

      {/* ============================================================== */}
      {/* 4. LEFT ARM (Swinging forward with thumbs up)                  */}
      {/* ============================================================== */}
      <Path
        d="M 43 63
           C 35 66, 25 73, 22 81
           C 20 86, 23 89, 28 88
           C 33 85, 39 77, 44 71 Z"
        fill={color}
      />
      {/* Left hand (fist with thumb pointing up) */}
      <Circle cx="21" cy="84" r="5" fill={color} />
      {/* Thumbs up thumb */}
      <Path
        d="M 20 81 L 19 73 C 19 71, 23 71, 23 73 L 23 81"
        fill={color}
        stroke="#000000"
        strokeWidth="1.2"
      />
      {/* Hand finger creases */}
      <Path
        d="M 18 84 Q 21 86 24 84"
        stroke="#000000"
        strokeWidth="1.4"
      />

      {/* ============================================================== */}
      {/* 5. RIGHT ARM (Swinging naturally backward)                     */}
      {/* ============================================================== */}
      <Path
        d="M 66 63
           C 74 67, 83 75, 87 83
           C 89 87, 86 90, 82 89
           C 77 87, 72 79, 66 73 Z"
        fill={color}
      />
      {/* Right clenched fist */}
      <Circle cx="86" cy="86" r="4.5" fill={color} />
      <Path
        d="M 84 85 Q 86 88 89 86"
        stroke="#000000"
        strokeWidth="1.2"
      />

      {/* ============================================================== */}
      {/* 6. LEGS (Walking Stride Pose)                                  */}
      {/* ============================================================== */}
      {/* Left Leg (Striding forward to the left) */}
      <Path
        d="M 40 93 
           L 44 116 
           L 54 116 
           L 49 93 
           Z"
        fill={color}
      />
      {/* Trouser crease */}
      <Path d="M 45 98 L 47 114" stroke="#000000" strokeWidth="1.4" />
      {/* Left Boot (solid planted forward) */}
      <Path
        d="M 41 114 
           L 56 114 
           C 59 116, 60 123, 56 126 
           L 38 126 
           C 36 122, 38 116, 41 114 Z"
        fill={color}
      />
      {/* Boot sole */}
      <Path d="M 37 125 L 57 125" stroke="#000000" strokeWidth="1.8" />

      {/* Right Leg (Trailing back, knee bent in stride) */}
      <Path
        d="M 54 93 
           L 64 112 
           L 73 110 
           L 65 93 
           Z"
        fill={color}
      />
      {/* Trouser crease right */}
      <Path d="M 60 98 L 66 109" stroke="#000000" strokeWidth="1.4" />
      {/* Right Boot (heel raised in mid-stride) */}
      <Path
        d="M 63 109 
           L 76 112 
           C 78 115, 77 121, 72 123 
           L 61 121 
           C 59 117, 60 111, 63 109 Z"
        fill={color}
      />
      {/* Boot heel cutout */}
      <Path d="M 61 120 L 74 122" stroke="#000000" strokeWidth="1.8" />
    </Svg>
  );
};
