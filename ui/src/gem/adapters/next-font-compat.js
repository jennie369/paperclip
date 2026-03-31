// ============================================================================
// next/font/google Mock
// Content Center uses next/font/google for Cormorant Garamond & Montserrat
// We load these via CSS @import in gem/tailwind.css instead
// ============================================================================

// Mock font loader - returns empty className since fonts are loaded via CSS
export function Cormorant_Garamond() {
  return { className: '' };
}

export function Montserrat() {
  return { className: '' };
}

// Generic mock for any font import
export default function GoogleFont() {
  return { className: '' };
}
