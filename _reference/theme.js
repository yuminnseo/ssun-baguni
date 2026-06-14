// =================================================================
// theme.js — 가계부 앱 Design Tokens
// Source: newdesign.md (vibe-coding-v1)
// =================================================================

// ── 1. Color / Primitive ─────────────────────────────────────────

const _blackRgb = "17, 17, 17";
const _whiteRgb = "255, 255, 255";

export const colorPrimitive = {
  neutral: {
    100:  "#FAFAFA",
    200:  "#F4F4F5",
    300:  "#E4E4E7",
    400:  "#D4D4D8",
    500:  "#A1A1AA",
    600:  "#71717A",
    700:  "#52525B",
    800:  "#3F3F46",
    900:  "#27272A",
    1000: "#18181B",
  },
  black: {
    100:  `rgba(${_blackRgb}, 0.05)`,
    200:  `rgba(${_blackRgb}, 0.12)`,
    300:  `rgba(${_blackRgb}, 0.22)`,
    400:  `rgba(${_blackRgb}, 0.44)`,
    500:  `rgba(${_blackRgb}, 0.70)`,
    600:  `rgba(${_blackRgb}, 0.80)`,
    700:  `rgba(${_blackRgb}, 0.85)`,
    800:  `rgba(${_blackRgb}, 0.90)`,
    900:  `rgba(${_blackRgb}, 0.95)`,
    1000: `rgb(${_blackRgb})`,
  },
  white: {
    100:  `rgba(${_whiteRgb}, 0.05)`,
    200:  `rgba(${_whiteRgb}, 0.12)`,
    300:  `rgba(${_whiteRgb}, 0.22)`,
    400:  `rgba(${_whiteRgb}, 0.44)`,
    500:  `rgba(${_whiteRgb}, 0.70)`,
    600:  `rgba(${_whiteRgb}, 0.80)`,
    700:  `rgba(${_whiteRgb}, 0.85)`,
    800:  `rgba(${_whiteRgb}, 0.90)`,
    900:  `rgba(${_whiteRgb}, 0.95)`,
    1000: `rgb(${_whiteRgb})`,
  },
  red: {
    100:  "#FDE8E8",
    200:  "#FBC9C9",
    300:  "#F89D9D",
    400:  "#F47070",
    500:  "#F14545",
    600:  "#EE1C1C",
    700:  "#CA1818",
    800:  "#A91414",
    900:  "#881010",
    1000: "#6B0D0D",
  },
};

// ── 2. Color / Semantic ──────────────────────────────────────────

const p = colorPrimitive;

export const colorSemantic = {
  text: {
    primary:   p.neutral[1000],
    secondary: p.neutral[700],
    tertiary:  p.neutral[500],
    disabled:  p.neutral[400],
    inverse:   p.white[1000],
    danger:    p.red[600],
  },
  bg: {
    base:     p.neutral[100],
    elevated: p.white[1000],
    muted:    p.neutral[200],
    inverse:  p.neutral[1000],
  },
  surface: {
    default:  p.white[1000],
    subtle:   p.neutral[100],
    muted:    p.neutral[200],
    pressed:  p.neutral[300],
    selected: p.neutral[1000],
    danger:   p.red[100],
  },
  border: {
    default: p.neutral[300],
    strong:  p.neutral[400],
    inverse: p.neutral[1000],
    danger:  p.red[500],
  },
  icon: {
    primary:   p.neutral[1000],
    secondary: p.neutral[600],
    disabled:  p.neutral[400],
    inverse:   p.white[1000],
    danger:    p.red[600],
  },
  status: {
    danger:   p.red[600],
    dangerBg: p.red[100],
  },
};

// ── 3. Letter Spacing ────────────────────────────────────────────

export const letterSpacing = {
  normal: "0px",
  dense:  "-0.2px",
};

// ── 4. Typography ────────────────────────────────────────────────

export const fontFamily = {
  korean: '"Pretendard", sans-serif',
  latin:  '"Satoshi", sans-serif',
  // Satoshi handles Latin glyphs; Pretendard fills in Korean as fallback
  base:   '"Satoshi", "Pretendard", sans-serif',
};

const ls = letterSpacing;

export const typography = {
  title: {
    "2xl": { size: "36px", lineHeight: "40px", weight: 700, letterSpacing: ls.normal },
    xl:    { size: "34px", lineHeight: "36px", weight: 600, letterSpacing: ls.normal },
    lg:    { size: "28px", lineHeight: "32px", weight: 600, letterSpacing: ls.normal },
    md:    { size: "22px", lineHeight: "28px", weight: 600, letterSpacing: ls.normal },
    sm:    { size: "20px", lineHeight: "24px", weight: 600, letterSpacing: ls.normal },
  },
  headline: {
    md: { size: "17px", lineHeight: "20px", weight: 600, letterSpacing: ls.normal },
  },
  body: {
    lg: { size: "17px", lineHeight: "20px", weight: 400, letterSpacing: ls.normal },
    md: { size: "15px", lineHeight: "20px", weight: 400, letterSpacing: ls.normal },
    sm: { size: "14px", lineHeight: "20px", weight: 500, letterSpacing: ls.normal },
  },
  label: {
    lg: { size: "16px", lineHeight: "20px", weight: 600, letterSpacing: ls.normal },
    md: { size: "14px", lineHeight: "16px", weight: 600, letterSpacing: ls.normal },
    sm: { size: "13px", lineHeight: "16px", weight: 500, letterSpacing: ls.normal },
  },
  caption: {
    md: { size: "13px", lineHeight: "16px", weight: 400, letterSpacing: ls.normal },
    sm: { size: "12px", lineHeight: "12px", weight: 500, letterSpacing: ls.normal },
    xs: { size: "10px", lineHeight: "12px", weight: 400, letterSpacing: ls.normal },
  },
};

// ── 5. Spacing ───────────────────────────────────────────────────

export const space = {
  0:  "0px",
  2:  "2px",
  4:  "4px",
  6:  "6px",
  8:  "8px",
  12: "12px",
  16: "16px",
  20: "20px",
  24: "24px",
  28: "28px",
  32: "32px",
  36: "36px",
};

// ── 6. Radius ────────────────────────────────────────────────────

export const radius = {
  0:    "0px",
  4:    "4px",
  8:    "8px",
  12:   "12px",
  16:   "16px",
  20:   "20px",
  full: "9999px",
};

// ── 7. Shadow ────────────────────────────────────────────────────

const _shadowColor100 = `rgba(${_blackRgb}, 0.08)`;
const _shadowColor200 = `rgba(${_blackRgb}, 0.18)`;

export const shadow = {
  100: `0 1px 3px ${_shadowColor100}`,
  200: `0 1px 6px ${_shadowColor200}`,
};

// ── 8. Layout ────────────────────────────────────────────────────

export const layout = {
  framePadding: space[20],
};

// ── Default export ───────────────────────────────────────────────

const theme = {
  colorPrimitive,
  colorSemantic,
  fontFamily,
  letterSpacing,
  typography,
  space,
  radius,
  shadow,
  layout,
};

export default theme;
