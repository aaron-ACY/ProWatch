/**
 * Utility to format and fix TOTP QR Code SVG from Supabase Auth
 * 
 * Supabase returns an SVG string with:
 * 1. 'data:image/svg+xml;utf-8,' prefix
 * 2. Explicit width and height (e.g. 219, 231) but MISSING viewBox attribute.
 * Without viewBox, react-native-svg clips the SVG when scaled to custom dimensions,
 * which truncates finder patterns and makes scanning impossible!
 */

export function cleanAndFormatQrSvg(rawSvg: string): string {
  if (!rawSvg) return '';

  let svg = rawSvg.trim();

  // 1. Remove data URL prefix if present
  if (svg.startsWith('data:image/svg+xml;utf-8,')) {
    svg = svg.slice('data:image/svg+xml;utf-8,'.length);
  } else if (svg.startsWith('data:image/svg+xml;utf8,')) {
    svg = svg.slice('data:image/svg+xml;utf8,'.length);
  }

  // 2. Decode URI components if URL-encoded
  if (svg.includes('%3C') || svg.includes('%20')) {
    try {
      svg = decodeURIComponent(svg);
    } catch {
      // ignore
    }
  }

  // 3. Extract width and height and ensure viewBox exists so it scales responsively
  const widthMatch = svg.match(/width=["'](\d+)["']/i);
  const heightMatch = svg.match(/height=["'](\d+)["']/i);

  if (widthMatch && heightMatch && !svg.includes('viewBox')) {
    const w = widthMatch[1];
    const h = heightMatch[2];
    svg = svg.replace(/<svg\b/i, `<svg viewBox="0 0 ${w} ${h}" `);
  }

  return svg;
}
