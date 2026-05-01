/**
 * GEM Content Control Center — Design Tokens (Desktop v1.0)
 *
 * Adapted from GEM Liquid Glass Design System for Desktop/Web
 * Source: DESIGN_TOKENS.md v3.0 (Liquid Glass Reference)
 *
 * USAGE RULES:
 * - NEVER hardcode colors/spacing/fonts — use these tokens
 * - ALL glassmorphism effects must use EXACT values
 * - Cyan (#00F0FF) is for numbers/stats ONLY
 * - Vietnamese UI text with full diacritics
 */

// ═══════════════════════════════════════════════════════════
// COLORS (EXACT FROM LIQUID GLASS REFERENCE)
// ═══════════════════════════════════════════════════════════

export const COLORS = {
  // === BACKGROUND GRADIENT ===
  background: {
    gradient: 'linear-gradient(135deg, #05040B 0%, #0F1030 50%, #1a0b2e 100%)',
    darkest: '#05040B',
    mid: '#0F1030',
    light: '#1a0b2e',
    // Desktop sidebar/surface levels
    surface1: '#07070c',   // Deepest surface (sidebar bg)
    surface2: '#0e0e16',   // Card background alternative
    surface3: '#161622',   // Elevated surface
    surface4: '#1e1e30',   // Hover states
    surface5: '#282840',   // Active states
  },

  // === PRIMARY BRAND ===
  brand: {
    burgundy: '#9C0612',
    burgundyDark: '#6B0F1A',
    burgundyLight: '#C41E2A',
    gold: '#FFBD59',
    goldBright: '#FFD700',
    goldMuted: '#D4A84B',
    // Content Control Center gold accents (from master plan)
    goldPrimary: '#d4a853',
    goldLight: '#e8c97a',
    goldDark: '#a08030',
    goldGlow: 'rgba(212, 168, 83, 0.12)',
  },

  // === ACCENT COLORS (EXACT) ===
  purple: '#6A5BFF',
  purpleGlow: '#8C64FF',
  purpleGlowRgba: 'rgba(140, 100, 255, 0.22)',
  purpleSubtle: 'rgba(106, 91, 255, 0.15)',
  // Master plan purple
  purpleMaster: '#9b6dff',

  cyan: '#00F0FF',  // Numbers/stats ONLY
  cyanSubtle: 'rgba(0, 240, 255, 0.1)',
  cyanBorder: 'rgba(0, 240, 255, 0.2)',

  blue: '#5b9cf5',
  emerald: '#34d399',
  rose: '#f472b6',
  amber: '#fbbf24',

  // === FUNCTIONAL COLORS (EXACT) ===
  success: '#3AF7A6',
  successBg: 'rgba(58, 247, 166, 0.2)',
  successBorder: 'rgba(58, 247, 166, 0.4)',

  danger: '#FF6B6B',
  dangerBg: 'rgba(255, 107, 107, 0.2)',
  dangerBorder: 'rgba(255, 107, 107, 0.4)',

  warning: '#FFB800',
  warningBg: 'rgba(255, 184, 0, 0.1)',

  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.1)',

  red: '#ef4444', // Destructive actions

  // === TEXT COLORS ===
  text: {
    primary: '#f0ece4',       // Warm white (master plan)
    secondary: 'rgba(255, 255, 255, 0.8)',
    muted: '#a0a0b0',        // Labels (master plan --text2)
    subtle: '#606070',        // Disabled text (master plan --text3)
    disabled: 'rgba(255, 255, 255, 0.4)',
    white: '#FFFFFF',
    accent: '#00F0FF',        // Cyan for numbers ONLY
    gold: '#d4a853',          // Gold accent text
  },

  // === BORDER COLORS ===
  border: {
    default: '#1e1e32',       // Master plan --border
    secondary: '#2a2a3e',     // Master plan --border2
    purple: 'rgba(106, 91, 255, 0.3)',
    purpleFocus: '#6A5BFF',
  },

  // === GLASS EFFECTS (EXACT FROM REFERENCE) ===
  glass: {
    background: 'rgba(15, 16, 48, 0.55)',
    backgroundLight: 'rgba(15, 16, 48, 0.5)',
    backgroundHeavy: 'rgba(15, 16, 48, 0.6)',
    blur: 18,
    saturate: 180,
    backdropFilter: 'blur(18px) saturate(180%)',
    borderWidth: 1.2,
    borderRadius: 18,
    borderGradient: 'linear-gradient(135deg, #6A5BFF, #00F0FF)',
    shadow: '0 10px 20px rgba(0, 0, 0, 0.7), 0 6px 30px rgba(140, 100, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
    shadowHover: '0 15px 30px rgba(0, 0, 0, 0.8), 0 10px 40px rgba(140, 100, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    glowColor: '#8C64FF',
    glowOpacity: 0.22,
    glowBlur: 40,
  },

  // === INPUT COLORS (EXACT) ===
  input: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: 'rgba(106, 91, 255, 0.3)',
    borderFocus: '#6A5BFF',
    focusGlow: 'rgba(106, 91, 255, 0.3)',
  },

  // === TRACK COLORS (Content pillars) ===
  track: {
    wealth: '#d4a853',      // Gold
    wellness: '#9b6dff',    // Purple
    integration: '#34d399', // Emerald
  },
} as const;

// ═══════════════════════════════════════════════════════════
// SPACING (8-POINT GRID — STRICT)
// ═══════════════════════════════════════════════════════════

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
} as const;

// ═══════════════════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════════════════

export const TYPOGRAPHY = {
  fontFamily: {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'SF Mono', 'Courier New', Courier, monospace",
  },

  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  fontSize: {
    xs: '0.6875rem',     // 11px - Micro labels
    sm: '0.75rem',       // 12px - Small text
    base: '0.8125rem',   // 13px - Body (base from master plan)
    md: '0.875rem',      // 14px - Body text
    lg: '1rem',          // 16px - Large body
    xl: '1.125rem',      // 18px - Card titles
    '2xl': '1.25rem',    // 20px - Section headers
    '3xl': '1.5rem',     // 24px - Page titles
    '4xl': '2rem',       // 32px - Hero/Display
    '5xl': '2.625rem',   // 42px - Large display
  },

  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.6,       // Base from master plan
    loose: 1.8,
  },
} as const;

// ═══════════════════════════════════════════════════════════
// LAYOUT (Desktop)
// ═══════════════════════════════════════════════════════════

export const LAYOUT = {
  sidebar: {
    width: 250,
    collapsedWidth: 64,
    zIndex: 40,
  },
  header: {
    height: 56,
    zIndex: 50,
  },
  content: {
    paddingX: 24,
    paddingY: 20,
    maxWidth: 1400,
  },
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
} as const;

// ═══════════════════════════════════════════════════════════
// GLASSMORPHISM (Desktop Card System)
// ═══════════════════════════════════════════════════════════

export const GLASSMORPHISM = {
  card: {
    background: 'rgba(15, 16, 48, 0.55)',
    backdropFilter: 'blur(18px) saturate(180%)',
    borderRadius: 18,
    borderWidth: 1.2,
    borderGradient: 'linear-gradient(135deg, #6A5BFF, #00F0FF)',
    padding: 20,
    shadow: '0 10px 20px rgba(0, 0, 0, 0.7), 0 6px 30px rgba(140, 100, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    hover: {
      transform: 'none',
      shadow: '0 15px 30px rgba(0, 0, 0, 0.8), 0 10px 40px rgba(140, 100, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    },
  },
  purpleGlow: {
    gradient: 'radial-gradient(circle, #8C64FF 0%, rgba(140, 100, 255, 0) 70%)',
    opacity: 0.22,
    blur: 40,
  },
} as const;

// ═══════════════════════════════════════════════════════════
// BUTTON VARIANTS
// ═══════════════════════════════════════════════════════════

export const BUTTONS = {
  primary: {
    background: 'linear-gradient(135deg, #9C0612, #6B0F1A)',
    border: '1px solid #FFBD59',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: '0.9375rem', // 15px
    fontWeight: '600',
    padding: '12px 24px',
    shadow: '0 4px 15px rgba(156, 6, 18, 0.4)',
    hoverShadow: '0 6px 20px rgba(156, 6, 18, 0.6), 0 0 20px rgba(255, 189, 89, 0.3)',
  },
  gold: {
    background: 'linear-gradient(135deg, #d4a853, #a08030)',
    border: 'none',
    borderRadius: 12,
    color: '#07070c',
    fontSize: '0.9375rem',
    fontWeight: '600',
    padding: '12px 24px',
  },
  outline: {
    background: 'transparent',
    border: '1px solid #2a2a3e',
    borderRadius: 12,
    color: '#f0ece4',
    fontSize: '0.875rem',
    fontWeight: '500',
    padding: '10px 20px',
  },
  ghost: {
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#a0a0b0',
    fontSize: '0.875rem',
    fontWeight: '500',
    padding: '8px 16px',
  },
  control: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: '12px 16px',
    backdropFilter: 'blur(10px)',
  },
} as const;

// ═══════════════════════════════════════════════════════════
// SHADOWS
// ═══════════════════════════════════════════════════════════

export const SHADOWS = {
  glass: {
    normal: '0 10px 20px rgba(0, 0, 0, 0.7), 0 6px 30px rgba(140, 100, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
    hover: '0 15px 30px rgba(0, 0, 0, 0.8), 0 10px 40px rgba(140, 100, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  button: {
    normal: '0 4px 15px rgba(156, 6, 18, 0.4)',
    hover: '0 6px 20px rgba(156, 6, 18, 0.6), 0 0 20px rgba(255, 189, 89, 0.3)',
  },
  card: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  inputFocus: '0 0 20px rgba(106, 91, 255, 0.3)',
  goldGlow: '0 0 20px rgba(212, 168, 83, 0.3)',
} as const;

// ═══════════════════════════════════════════════════════════
// ANIMATION
// ═══════════════════════════════════════════════════════════

export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 400,
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  transitions: {
    glassCard: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    button: 'all 0.3s ease',
    input: 'all 0.3s ease',
    sidebar: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fade: 'opacity 0.2s ease',
  },
} as const;

// ═══════════════════════════════════════════════════════════
// Z-INDEX SCALE
// ═══════════════════════════════════════════════════════════

export const Z_INDEX = {
  base: 0,
  glowEffect: -1,
  content: 1,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  sidebar: 1035,
  header: 1040,
  modalBackdrop: 1050,
  modal: 1060,
  popover: 1070,
  tooltip: 1080,
  toast: 1090,
  commandPalette: 1100,
} as const;

// ═══════════════════════════════════════════════════════════
// STAT CARD VARIANTS (Dashboard KPI cards)
// ═══════════════════════════════════════════════════════════

export const STAT_CARD_VARIANTS = {
  gold: {
    gradient: 'linear-gradient(135deg, rgba(212, 168, 83, 0.15), rgba(212, 168, 83, 0.05))',
    border: 'rgba(212, 168, 83, 0.3)',
    iconColor: '#d4a853',
    textColor: '#d4a853',
  },
  purple: {
    gradient: 'linear-gradient(135deg, rgba(155, 109, 255, 0.15), rgba(155, 109, 255, 0.05))',
    border: 'rgba(155, 109, 255, 0.3)',
    iconColor: '#9b6dff',
    textColor: '#9b6dff',
  },
  blue: {
    gradient: 'linear-gradient(135deg, rgba(91, 156, 245, 0.15), rgba(91, 156, 245, 0.05))',
    border: 'rgba(91, 156, 245, 0.3)',
    iconColor: '#5b9cf5',
    textColor: '#5b9cf5',
  },
  emerald: {
    gradient: 'linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(52, 211, 153, 0.05))',
    border: 'rgba(52, 211, 153, 0.3)',
    iconColor: '#34d399',
    textColor: '#34d399',
  },
} as const;

// ═══════════════════════════════════════════════════════════
// TAG VARIANTS (Content type badges)
// ═══════════════════════════════════════════════════════════

export const TAG_VARIANTS = {
  wealth: {
    background: 'rgba(212, 168, 83, 0.15)',
    border: 'rgba(212, 168, 83, 0.3)',
    color: '#d4a853',
  },
  wellness: {
    background: 'rgba(155, 109, 255, 0.15)',
    border: 'rgba(155, 109, 255, 0.3)',
    color: '#9b6dff',
  },
  integration: {
    background: 'rgba(52, 211, 153, 0.15)',
    border: 'rgba(52, 211, 153, 0.3)',
    color: '#34d399',
  },
  latc: {
    background: 'rgba(91, 156, 245, 0.15)',
    border: 'rgba(91, 156, 245, 0.3)',
    color: '#5b9cf5',
  },
  tmt: {
    background: 'rgba(244, 114, 182, 0.15)',
    border: 'rgba(244, 114, 182, 0.3)',
    color: '#f472b6',
  },
  default: {
    background: 'rgba(160, 160, 176, 0.15)',
    border: 'rgba(160, 160, 176, 0.3)',
    color: '#a0a0b0',
  },
} as const;

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

export const designTokens = {
  colors: COLORS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  layout: LAYOUT,
  glassmorphism: GLASSMORPHISM,
  buttons: BUTTONS,
  shadows: SHADOWS,
  animation: ANIMATION,
  zIndex: Z_INDEX,
  statCardVariants: STAT_CARD_VARIANTS,
  tagVariants: TAG_VARIANTS,
} as const;

export type DesignTokens = typeof designTokens;
