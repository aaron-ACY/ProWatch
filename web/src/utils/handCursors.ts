// Bộ con trỏ chuột Vector SVG Studio Tông Cam (#f97316 / #ea580c) chuẩn Figma / CAD / n8n Studio
// Sử dụng Inline SVG Data-URI sắc nét 100% trên mọi màn hình (1x, 2x Retina, 4K) không bị mờ hay răng cưa.
// Kèm viền trắng (#ffffff) và bóng đổ (drop-shadow) giúp nổi bật trên cả nền sáng (#ffffff) lẫn nền tối (#18181b).

const encodeSvgCursor = (svg: string, hotspotX: number, hotspotY: number, fallback: string): string => {
  const compact = svg
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/#/g, '%23')
    .replace(/"/g, "'");
  return `url("data:image/svg+xml;utf8,${compact}") ${hotspotX} ${hotspotY}, ${fallback}`;
};

const STUDIO_SHADOW_DEF = `<defs><filter id='s' x='-25%' y='-25%' width='150%' height='150%'><feDropShadow dx='0' dy='1.1' stdDeviation='1.05' flood-color='#09090b' flood-opacity='0.32'/></filter></defs>`;

/** 0. MẶC ĐỊNH (Studio Arrow Default) - Con trỏ mũi tên vát cạnh chuẩn Figma/Studio trên toàn trang */
export const ORANGE_DEFAULT_CURSOR = encodeSvgCursor(
  `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    ${STUDIO_SHADOW_DEF}
    <g filter='url(#s)'>
      <path d='M4.5 2.8L4.5 21.2L9.1 16.7L12.5 23.9C12.8 24.5 13.5 24.8 14.2 24.5L15.7 23.8C16.3 23.5 16.6 22.8 16.3 22.1L12.9 15.0L19.3 15.0L4.5 2.8Z' fill='#f97316' stroke='#ffffff' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
      <path d='M6.1 6.2L6.1 17.5L8.9 14.8L12.8 22.8L14.3 22.1L10.5 14.0L15.6 14.0L6.1 6.2Z' fill='#fb923c' opacity='0.35'/>
    </g>
  </svg>`,
  4,
  3,
  'default'
);

/** 1. THẢ (Open Hand / Grab) - Khi di chuột tự do trên vùng Canvas n8n hoặc vùng kéo 3D */
export const ORANGE_GRAB_CURSOR = encodeSvgCursor(
  `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    ${STUDIO_SHADOW_DEF}
    <g filter='url(#s)'>
      <path d='M9.2 13.5V6.8C9.2 5.7 10.1 4.8 11.1 4.8C12.2 4.8 13.0 5.7 13.0 6.8V12.2V5.3C13.0 4.2 13.9 3.3 14.9 3.3C16.0 3.3 16.8 4.2 16.8 5.3V12.2V6.6C16.8 5.5 17.7 4.7 18.7 4.7C19.8 4.7 20.6 5.5 20.6 6.6V13.4V9.2C20.6 8.2 21.4 7.4 22.4 7.4C23.4 7.4 24.2 8.2 24.2 9.2V16.8C24.2 21.1 20.8 24.5 16.5 24.5H13.6C10.5 24.5 8.0 22.7 6.6 19.9L4.5 15.8C3.9 14.7 4.4 13.3 5.5 12.8C6.6 12.3 7.8 12.8 8.4 13.8L9.2 15.2V13.5Z' fill='#f97316' stroke='#ffffff' stroke-width='1.75' stroke-linejoin='round' stroke-linecap='round'/>
      <path d='M13.0 6.8V13.8M16.8 6.8V13.8M20.6 8.8V14.5' stroke='#c2410c' stroke-width='1.15' stroke-linecap='round'/>
      <path d='M10.8 18.8C12.4 20.1 15.2 20.3 17.8 19.2' fill='none' stroke='#c2410c' stroke-width='1.15' stroke-linecap='round'/>
    </g>
  </svg>`,
  14,
  14,
  'grab'
);

/** 2. NẮM & KÉO (Closed Fist / Grabbing) - Khi nhấn giữ chuột để kéo / pan Canvas hoặc xoay 3D */
export const ORANGE_GRABBING_CURSOR = encodeSvgCursor(
  `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    ${STUDIO_SHADOW_DEF}
    <g filter='url(#s)'>
      <path d='M7.8 12.2C7.8 10.6 9.0 9.4 10.5 9.4C11.1 9.4 11.7 9.6 12.1 10.0C12.6 9.2 13.4 8.7 14.4 8.7C15.3 8.7 16.1 9.1 16.6 9.8C17.1 9.3 17.8 9.0 18.6 9.0C20.1 9.0 21.3 10.2 21.3 11.7C22.5 12.0 23.4 13.1 23.4 14.5V17.4C23.4 21.2 20.3 24.2 16.5 24.2H13.2C9.8 24.2 7.1 21.8 6.5 18.5L5.8 15.2C5.5 13.7 6.4 12.4 7.8 12.2Z' fill='#ea580c' stroke='#ffffff' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
      <path d='M12.1 10.0V14.6M16.6 9.8V14.6M20.2 11.2V15.0' stroke='#9a3412' stroke-width='1.25' stroke-linecap='round'/>
      <path d='M7.8 15.4H19.2C20.2 15.4 21.0 16.2 21.0 17.1C21.0 18.1 20.2 18.8 19.2 18.8H12.2' fill='#f97316' stroke='#9a3412' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/>
    </g>
  </svg>`,
  14,
  14,
  'grabbing'
);

/** 3. CLICK / HOVER (Pointing Hand) - Khi di chuột vào Node Card, Nút bấm, Tab, Link, Linh kiện 3D */
export const ORANGE_POINTER_CURSOR = encodeSvgCursor(
  `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    ${STUDIO_SHADOW_DEF}
    <g filter='url(#s)'>
      <path d='M8.6 14.2V4.8C8.6 3.5 9.6 2.5 10.9 2.5C12.2 2.5 13.2 3.5 13.2 4.8V11.2H14.5C15.6 11.2 16.5 12.0 16.6 13.0H17.6C18.7 13.0 19.6 13.8 19.7 14.8H20.5C21.6 14.8 22.5 15.7 22.5 16.8V18.4C22.5 22.0 19.6 24.8 16.0 24.8H12.8C10.0 24.8 7.6 23.1 6.4 20.5L4.3 16.3C3.7 15.1 4.2 13.7 5.3 13.1C6.4 12.6 7.7 13.0 8.3 14.0L8.6 14.6V14.2Z' fill='#f97316' stroke='#ffffff' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
      <path d='M13.2 11.2V16.0M16.5 12.8V16.5M19.6 14.6V17.2' stroke='#c2410c' stroke-width='1.2' stroke-linecap='round'/>
    </g>
  </svg>`,
  10,
  3,
  'pointer'
);

/** 4. NHẤN CLICK (:active) - Khi bấm chuột xuống vào nút hoặc Node Card (có sóng ripple ở đầu ngón tay) */
export const ORANGE_CLICK_CURSOR = encodeSvgCursor(
  `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    ${STUDIO_SHADOW_DEF}
    <g filter='url(#s)'>
      <path d='M5.6 6.2C7.0 3.7 9.5 2.2 12.2 2.2C14.9 2.2 17.4 3.7 18.8 6.2' fill='none' stroke='#ffffff' stroke-width='3.2' stroke-linecap='round'/>
      <path d='M5.6 6.2C7.0 3.7 9.5 2.2 12.2 2.2C14.9 2.2 17.4 3.7 18.8 6.2' fill='none' stroke='#ea580c' stroke-width='1.6' stroke-linecap='round'/>
      <path d='M9.8 15.2V6.2C9.8 5.0 10.8 4.0 12.0 4.0C13.2 4.0 14.2 5.0 14.2 6.2V12.2H15.4C16.4 12.2 17.3 13.0 17.4 13.9H18.3C19.3 13.9 20.2 14.7 20.3 15.6H21.0C22.1 15.6 22.9 16.5 22.9 17.5V19.0C22.9 22.3 20.2 25.0 16.9 25.0H13.8C11.1 25.0 8.9 23.4 7.7 21.0L5.7 17.0C5.1 15.9 5.6 14.6 6.7 14.1C7.7 13.6 8.9 14.0 9.5 14.9L9.8 15.5V15.2Z' fill='#ea580c' stroke='#ffffff' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
      <circle cx='12.0' cy='6.3' r='1.2' fill='#ffffff'/>
      <path d='M14.2 12.2V16.6M17.3 13.7V17.1M20.2 15.4V17.8' stroke='#9a3412' stroke-width='1.2' stroke-linecap='round'/>
    </g>
  </svg>`,
  12,
  5,
  'pointer'
);

/** 5. TRƯỢT (Slide / Scroll / Zoom / Range Hand) - Khi lăn chuột zoom, trượt thanh kéo hoặc lướt Canvas */
export const ORANGE_SLIDE_CURSOR = encodeSvgCursor(
  `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    ${STUDIO_SHADOW_DEF}
    <g filter='url(#s)'>
      <path d='M6.5 10.2L2.5 14.0L6.5 17.8V15.3H21.5V17.8L25.5 14.0L21.5 10.2V12.7H6.5V10.2Z' fill='#f97316' stroke='#ffffff' stroke-width='1.75' stroke-linejoin='round' stroke-linecap='round'/>
      <circle cx='14' cy='14' r='4.2' fill='#ea580c' stroke='#ffffff' stroke-width='1.75'/>
      <circle cx='14' cy='14' r='1.5' fill='#ffffff'/>
    </g>
  </svg>`,
  14,
  14,
  'ew-resize'
);

/** 6. CỔNG PIN (Precision Pin Crosshair) - Khi di chuột vào cổng kết nối Input / Output của Node */
export const ORANGE_CROSSHAIR_CURSOR = encodeSvgCursor(
  `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    ${STUDIO_SHADOW_DEF}
    <g filter='url(#s)'>
      <circle cx='14' cy='14' r='6.5' fill='none' stroke='#ffffff' stroke-width='3.4'/>
      <path d='M14 3.2V8.2M14 19.8V24.8M3.2 14H8.2M19.8 14H24.8' stroke='#ffffff' stroke-width='3.4' stroke-linecap='round'/>
      <circle cx='14' cy='14' r='6.5' fill='none' stroke='#f97316' stroke-width='1.8'/>
      <path d='M14 3.2V8.2M14 19.8V24.8M3.2 14H8.2M19.8 14H24.8' stroke='#f97316' stroke-width='1.8' stroke-linecap='round'/>
      <circle cx='14' cy='14' r='2.4' fill='#ea580c' stroke='#ffffff' stroke-width='1.2'/>
    </g>
  </svg>`,
  14,
  14,
  'crosshair'
);

/** 7. VÔ HIỆU HÓA (Not Allowed / Disabled Studio Cursor) - Khi nút bấm bị khóa hoặc đang thực thi */
export const ORANGE_NOT_ALLOWED_CURSOR = encodeSvgCursor(
  `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    ${STUDIO_SHADOW_DEF}
    <g filter='url(#s)'>
      <circle cx='14' cy='14' r='8.5' fill='#fff7ed' stroke='#ffffff' stroke-width='3.2'/>
      <circle cx='14' cy='14' r='8.5' fill='none' stroke='#ea580c' stroke-width='2.2'/>
      <path d='M8.3 8.3L19.7 19.7' stroke='#ea580c' stroke-width='2.4' stroke-linecap='round'/>
    </g>
  </svg>`,
  14,
  14,
  'not-allowed'
);

/** Tham chiếu biến CSS đồng bộ toàn cục */
export const CURSOR_VARS = {
  default: 'var(--cursor-default)',
  pointer: 'var(--cursor-pointer)',
  click: 'var(--cursor-click)',
  grab: 'var(--cursor-grab)',
  grabbing: 'var(--cursor-grabbing)',
  slide: 'var(--cursor-slide)',
  crosshair: 'var(--cursor-crosshair)',
  notAllowed: 'var(--cursor-not-allowed)',
} as const;
