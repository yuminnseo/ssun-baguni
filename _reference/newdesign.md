---
name: design-system
source_file: 가계부 앱
source_page: Design System
generated_at: 2026-06-06T05:48:34.629Z
naming_version: vibe-coding-v1
---

# 가계부 앱 Design Guidelines

## Source
- Figma file: 가계부 앱
- Figma page: Design System
- Extracted at: 2026-06-06T05:48:34.629Z
- Naming rule: Figma token names use `/` path structure. Code token names use lowercase kebab-case.

---

## Token Naming Rules

### 1. Figma Token Naming
Figma variable names should use lowercase path-style names.

```txt
category/group/name/scale
```

Examples:

```txt
color/primitive/neutral/1000
color/semantic/text/primary
typography/body/md
size/space/16
size/radius/12
layout/frame/padding
effect/shadow/100
```

### 2. Code Token Naming
In code, convert Figma token names into kebab-case CSS variables or Tailwind aliases.

```txt
color/primitive/neutral/1000 -> --color-neutral-1000
color/semantic/text/primary -> --color-text-primary
typography/body/md -> text-body-md
size/space/16 -> --space-16
size/radius/12 -> --radius-12
layout/frame/padding -> --layout-frame-padding
effect/shadow/100 -> --shadow-100
```

### 3. Usage Priority
Use semantic tokens first when building UI.

```txt
Preferred: color/semantic/text/primary
Avoid: color/primitive/neutral/1000
```

Primitive tokens define raw values. Semantic tokens define UI roles.

### 4. Hardcoding Rule
Do not use raw hex colors, arbitrary px values, or default Tailwind colors unless a matching token does not exist.

```tsx
// Preferred
<div className="text-text-primary bg-bg-base rounded-16 p-20" />

// Avoid
<div className="text-zinc-950 bg-white rounded-2xl p-5" />
```

---

## Variable Collections

Use the following normalized collection names.

```txt
color/primitive
color/semantic
typography
size/space
size/radius
layout
effect/shadow
number/letter-spacing
```

Original extracted collections:

```txt
Number Primitives
Typography Semantic
Color Primitives
Color Semantic
Size
Frame
Effect Styles
```

---

# Color Tokens

## Color / Primitive

Primitive color tokens are raw color values. They should be referenced by semantic color tokens whenever possible.

### Neutral

```txt
color/primitive/neutral/100: #FAFAFA
color/primitive/neutral/200: #F4F4F5
color/primitive/neutral/300: #E4E4E7
color/primitive/neutral/400: #D4D4D8
color/primitive/neutral/500: #A1A1AA
color/primitive/neutral/600: #71717A
color/primitive/neutral/700: #52525B
color/primitive/neutral/800: #3F3F46
color/primitive/neutral/900: #27272A
color/primitive/neutral/1000: #18181B
```

Code variables:

```css
--color-neutral-100: #FAFAFA;
--color-neutral-200: #F4F4F5;
--color-neutral-300: #E4E4E7;
--color-neutral-400: #D4D4D8;
--color-neutral-500: #A1A1AA;
--color-neutral-600: #71717A;
--color-neutral-700: #52525B;
--color-neutral-800: #3F3F46;
--color-neutral-900: #27272A;
--color-neutral-1000: #18181B;
```

### Black

```txt
color/primitive/black/100: #1111110D
color/primitive/black/200: #1111111F
color/primitive/black/300: #11111138
color/primitive/black/400: #11111170
color/primitive/black/500: #111111B2
color/primitive/black/600: #111111CC
color/primitive/black/700: #111111D9
color/primitive/black/800: #111111E5
color/primitive/black/900: #111111F2
color/primitive/black/1000: #111111
```

Code variables:

```css
--color-black-100: #1111110D;
--color-black-200: #1111111F;
--color-black-300: #11111138;
--color-black-400: #11111170;
--color-black-500: #111111B2;
--color-black-600: #111111CC;
--color-black-700: #111111D9;
--color-black-800: #111111E5;
--color-black-900: #111111F2;
--color-black-1000: #111111;
```

### White

```txt
color/primitive/white/100: #FFFFFF0D
color/primitive/white/200: #FFFFFF1F
color/primitive/white/300: #FFFFFF38
color/primitive/white/400: #FFFFFF70
color/primitive/white/500: #FFFFFFB2
color/primitive/white/600: #FFFFFFCC
color/primitive/white/700: #FFFFFFD9
color/primitive/white/800: #FFFFFFE5
color/primitive/white/900: #FFFFFFF2
color/primitive/white/1000: #FFFFFF
```

Code variables:

```css
--color-white-100: #FFFFFF0D;
--color-white-200: #FFFFFF1F;
--color-white-300: #FFFFFF38;
--color-white-400: #FFFFFF70;
--color-white-500: #FFFFFFB2;
--color-white-600: #FFFFFFCC;
--color-white-700: #FFFFFFD9;
--color-white-800: #FFFFFFE5;
--color-white-900: #FFFFFFF2;
--color-white-1000: #FFFFFF;
```

### Red

```txt
color/primitive/red/100: #FDE8E8
color/primitive/red/200: #FBC9C9
color/primitive/red/300: #F89D9D
color/primitive/red/400: #F47070
color/primitive/red/500: #F14545
color/primitive/red/600: #EE1C1C
color/primitive/red/700: #CA1818
color/primitive/red/800: #A91414
color/primitive/red/900: #881010
color/primitive/red/1000: #6B0D0D
```

Code variables:

```css
--color-red-100: #FDE8E8;
--color-red-200: #FBC9C9;
--color-red-300: #F89D9D;
--color-red-400: #F47070;
--color-red-500: #F14545;
--color-red-600: #EE1C1C;
--color-red-700: #CA1818;
--color-red-800: #A91414;
--color-red-900: #881010;
--color-red-1000: #6B0D0D;
```

---

## Color / Semantic

The extracted file includes a `Color Semantic` collection, but the semantic token values were not included in the extraction. Use the following semantic aliases as the recommended implementation layer.

If Figma already has different semantic values, keep the names below and replace only the aliases.

### Text

```txt
color/semantic/text/primary: alias(color/primitive/neutral/1000)
color/semantic/text/secondary: alias(color/primitive/neutral/700)
color/semantic/text/tertiary: alias(color/primitive/neutral/500)
color/semantic/text/disabled: alias(color/primitive/neutral/400)
color/semantic/text/inverse: alias(color/primitive/white/1000)
color/semantic/text/danger: alias(color/primitive/red/600)
```

Code variables:

```css
--color-text-primary: var(--color-neutral-1000);
--color-text-secondary: var(--color-neutral-700);
--color-text-tertiary: var(--color-neutral-500);
--color-text-disabled: var(--color-neutral-400);
--color-text-inverse: var(--color-white-1000);
--color-text-danger: var(--color-red-600);
```

### Background

```txt
color/semantic/bg/base: alias(color/primitive/neutral/100)
color/semantic/bg/elevated: alias(color/primitive/white/1000)
color/semantic/bg/muted: alias(color/primitive/neutral/200)
color/semantic/bg/inverse: alias(color/primitive/neutral/1000)
```

Code variables:

```css
--color-bg-base: var(--color-neutral-100);
--color-bg-elevated: var(--color-white-1000);
--color-bg-muted: var(--color-neutral-200);
--color-bg-inverse: var(--color-neutral-1000);
```

### Surface

```txt
color/semantic/surface/default: alias(color/primitive/white/1000)
color/semantic/surface/subtle: alias(color/primitive/neutral/100)
color/semantic/surface/muted: alias(color/primitive/neutral/200)
color/semantic/surface/pressed: alias(color/primitive/neutral/300)
color/semantic/surface/selected: alias(color/primitive/neutral/1000)
color/semantic/surface/danger: alias(color/primitive/red/100)
```

Code variables:

```css
--color-surface-default: var(--color-white-1000);
--color-surface-subtle: var(--color-neutral-100);
--color-surface-muted: var(--color-neutral-200);
--color-surface-pressed: var(--color-neutral-300);
--color-surface-selected: var(--color-neutral-1000);
--color-surface-danger: var(--color-red-100);
```

### Border

```txt
color/semantic/border/default: alias(color/primitive/neutral/300)
color/semantic/border/strong: alias(color/primitive/neutral/400)
color/semantic/border/inverse: alias(color/primitive/neutral/1000)
color/semantic/border/danger: alias(color/primitive/red/500)
```

Code variables:

```css
--color-border-default: var(--color-neutral-300);
--color-border-strong: var(--color-neutral-400);
--color-border-inverse: var(--color-neutral-1000);
--color-border-danger: var(--color-red-500);
```

### Icon

```txt
color/semantic/icon/primary: alias(color/primitive/neutral/1000)
color/semantic/icon/secondary: alias(color/primitive/neutral/600)
color/semantic/icon/disabled: alias(color/primitive/neutral/400)
color/semantic/icon/inverse: alias(color/primitive/white/1000)
color/semantic/icon/danger: alias(color/primitive/red/600)
```

Code variables:

```css
--color-icon-primary: var(--color-neutral-1000);
--color-icon-secondary: var(--color-neutral-600);
--color-icon-disabled: var(--color-neutral-400);
--color-icon-inverse: var(--color-white-1000);
--color-icon-danger: var(--color-red-600);
```

### Status

```txt
color/semantic/status/danger: alias(color/primitive/red/600)
color/semantic/status/danger-bg: alias(color/primitive/red/100)
```

Code variables:

```css
--color-status-danger: var(--color-red-600);
--color-status-danger-bg: var(--color-red-100);
```

---

# Typography Tokens

Use typography tokens instead of default Tailwind text sizes.

## Font Family

Two typefaces are used, split by script:

| Script | Font | Usage |
|--------|------|-------|
| Korean (한글) | **Pretendard** | All Korean text |
| Latin / English | **Satoshi** | All English text, UI labels, numbers |

For mixed text (Korean + English in one element), use the `base` stack — the browser picks each glyph from the first font that covers it.

```css
--font-family-korean: "Pretendard", sans-serif;
--font-family-latin:  "Satoshi", sans-serif;
--font-family-base:   "Satoshi", "Pretendard", sans-serif;
```

Usage:

```tsx
// Mixed or default — use base (most UI elements)
<p className="font-base">카테고리별 지출 · Category</p>

// Korean-only text
<h1 className="font-korean">이번 달 지출</h1>

// English/number-only text (labels, badges, amounts)
<span className="font-latin">₩ 128,000</span>
```

## Typography Naming

```txt
typography/title/2xl
typography/title/xl
typography/title/lg
typography/title/md
typography/title/sm
typography/headline/md
typography/body/lg
typography/body/md
typography/body/sm
typography/label/lg
typography/label/md
typography/label/sm
typography/caption/md
typography/caption/sm
typography/caption/xs
```

## Typography Values

Font weights listed use the active font for the script in context:
- Korean glyphs → Pretendard (Regular/Medium/SemiBold/Bold)
- Latin glyphs → Satoshi (Regular/Medium/Bold — no SemiBold; use Bold as SemiBold equivalent)

```txt
typography/title/2xl: Bold, 36px / 40px, tracking 0px
typography/title/xl: SemiBold, 34px / 36px, tracking 0px
typography/title/lg: SemiBold, 28px / 32px, tracking 0px
typography/title/md: SemiBold, 22px / 28px, tracking 0px
typography/title/sm: SemiBold, 20px / 24px, tracking 0px
typography/headline/md: SemiBold, 17px / 20px, tracking 0px
typography/body/lg: Regular, 17px / 20px, tracking 0px
typography/body/md: Regular, 15px / 20px, tracking 0px
typography/body/sm: Medium, 14px / 20px, tracking 0px
typography/label/lg: SemiBold, 16px / 20px, tracking 0px
typography/label/md: SemiBold, 14px / 16px, tracking 0px
typography/label/sm: Medium, 13px / 16px, tracking 0px
typography/caption/md: Regular, 13px / 16px, tracking 0px
typography/caption/sm: Medium, 12px / 12px, tracking 0px
typography/caption/xs: Regular, 10px / 12px, tracking 0px
```

## Code Class Names

```txt
text-title-2xl
text-title-xl
text-title-lg
text-title-md
text-title-sm
text-headline-md
text-body-lg
text-body-md
text-body-sm
text-label-lg
text-label-md
text-label-sm
text-caption-md
text-caption-sm
text-caption-xs
```

## CSS Variable Reference

```css
--font-family-korean: "Pretendard", sans-serif;
--font-family-latin:  "Satoshi", sans-serif;
--font-family-base:   "Satoshi", "Pretendard", sans-serif;

--text-title-2xl-size: 36px;
--text-title-2xl-line-height: 40px;
--text-title-2xl-weight: 700;
--text-title-2xl-letter-spacing: 0px;

--text-title-xl-size: 34px;
--text-title-xl-line-height: 36px;
--text-title-xl-weight: 600;
--text-title-xl-letter-spacing: 0px;

--text-title-lg-size: 28px;
--text-title-lg-line-height: 32px;
--text-title-lg-weight: 600;
--text-title-lg-letter-spacing: 0px;

--text-title-md-size: 22px;
--text-title-md-line-height: 28px;
--text-title-md-weight: 600;
--text-title-md-letter-spacing: 0px;

--text-title-sm-size: 20px;
--text-title-sm-line-height: 24px;
--text-title-sm-weight: 600;
--text-title-sm-letter-spacing: 0px;

--text-headline-md-size: 17px;
--text-headline-md-line-height: 20px;
--text-headline-md-weight: 600;
--text-headline-md-letter-spacing: 0px;

--text-body-lg-size: 17px;
--text-body-lg-line-height: 20px;
--text-body-lg-weight: 400;
--text-body-lg-letter-spacing: 0px;

--text-body-md-size: 15px;
--text-body-md-line-height: 20px;
--text-body-md-weight: 400;
--text-body-md-letter-spacing: 0px;

--text-body-sm-size: 14px;
--text-body-sm-line-height: 20px;
--text-body-sm-weight: 500;
--text-body-sm-letter-spacing: 0px;

--text-label-lg-size: 16px;
--text-label-lg-line-height: 20px;
--text-label-lg-weight: 600;
--text-label-lg-letter-spacing: 0px;

--text-label-md-size: 14px;
--text-label-md-line-height: 16px;
--text-label-md-weight: 600;
--text-label-md-letter-spacing: 0px;

--text-label-sm-size: 13px;
--text-label-sm-line-height: 16px;
--text-label-sm-weight: 500;
--text-label-sm-letter-spacing: 0px;

--text-caption-md-size: 13px;
--text-caption-md-line-height: 16px;
--text-caption-md-weight: 400;
--text-caption-md-letter-spacing: 0px;

--text-caption-sm-size: 12px;
--text-caption-sm-line-height: 12px;
--text-caption-sm-weight: 500;
--text-caption-sm-letter-spacing: 0px;

--text-caption-xs-size: 10px;
--text-caption-xs-line-height: 12px;
--text-caption-xs-weight: 400;
--text-caption-xs-letter-spacing: 0px;
```

---

# Number Tokens

## Letter Spacing

```txt
number/letter-spacing/normal: 0px
number/letter-spacing/dense: -0.2px
```

Code variables:

```css
--letter-spacing-normal: 0px;
--letter-spacing-dense: -0.2px;
```

---

# Spacing Tokens

Use a single spacing scale for padding, margin, gap, and layout spacing.

Do not keep separate `Gap` and `Padding` token names in code. Use `size/space/*` instead.

## Space Scale

```txt
size/space/0: 0px
size/space/2: 2px
size/space/4: 4px
size/space/6: 6px
size/space/8: 8px
size/space/12: 12px
size/space/16: 16px
size/space/20: 20px
size/space/24: 24px
size/space/28: 28px
size/space/32: 32px
size/space/36: 36px
```

Code variables:

```css
--space-0: 0px;
--space-2: 2px;
--space-4: 4px;
--space-6: 6px;
--space-8: 8px;
--space-12: 12px;
--space-16: 16px;
--space-20: 20px;
--space-24: 24px;
--space-28: 28px;
--space-32: 32px;
--space-36: 36px;
```

## Original Token Mapping

```txt
Size/Spacing/Gap/0 -> size/space/0
Size/Spacing/Gap/2 -> size/space/2
Size/Spacing/Gap/4 -> size/space/4
Size/Spacing/Gap/6 -> size/space/6
Size/Spacing/Gap/8 -> size/space/8
Size/Spacing/Gap/12 -> size/space/12
Size/Spacing/Gap/16 -> size/space/16
Size/Spacing/Gap/20 -> size/space/20

Size/Spacing/Padding/0 -> size/space/0
Size/Spacing/Padding/2 -> size/space/2
Size/Spacing/Padding/4 -> size/space/4
Size/Spacing/Padding/6 -> size/space/6
Size/Spacing/Padding/8 -> size/space/8
Size/Spacing/Padding/12 -> size/space/12
Size/Spacing/Padding/16 -> size/space/16
Size/Spacing/Padding/20 -> size/space/20
Size/Spacing/Padding/24 -> size/space/24
Size/Spacing/Padding/28 -> size/space/28
Size/Spacing/Padding/32 -> size/space/32
Size/Spacing/Padding/36 -> size/space/36
```

---

# Layout Tokens

Layout tokens define repeated screen-level layout rules.

```txt
layout/frame/padding: alias(size/space/20)
```

Code variable:

```css
--layout-frame-padding: var(--space-20);
```

Recommended usage:

```tsx
<main className="px-frame">
  ...
</main>
```

---

# Radius Tokens

## Radius Scale

```txt
size/radius/0: 0px
size/radius/4: 4px
size/radius/8: 8px
size/radius/12: 12px
size/radius/16: 16px
size/radius/20: 20px
size/radius/full: 9999px
```

Code variables:

```css
--radius-0: 0px;
--radius-4: 4px;
--radius-8: 8px;
--radius-12: 12px;
--radius-16: 16px;
--radius-20: 20px;
--radius-full: 9999px;
```

Original token mapping:

```txt
Size/Radius/0 -> size/radius/0
Size/Radius/4 -> size/radius/4
Size/Radius/8 -> size/radius/8
Size/Radius/12 -> size/radius/12
Size/Radius/16 -> size/radius/16
Size/Radius/20 -> size/radius/20
Size/Radius/Full -> size/radius/full
```

---

# Effect Tokens

## Shadow

Original Figma effect styles:

```txt
Shadow/100: drop_shadow 3px offset 0 1 #11111114
Shadow/200: drop_shadow 6px offset 0 1 #1111112E
```

Normalized tokens:

```txt
effect/shadow/100: 0 1px 3px #11111114
effect/shadow/200: 0 1px 6px #1111112E
```

Code variables:

```css
--shadow-100: 0 1px 3px #11111114;
--shadow-200: 0 1px 6px #1111112E;
```

Original style mapping:

```txt
Shadow/100 -> effect/shadow/100
Shadow/200 -> effect/shadow/200
```

Recommended usage:

```txt
effect/shadow/100: small cards, input fields, subtle elevated UI
effect/shadow/200: emphasized cards, floating areas, bottom sheets
```

---

# Motion Tokens

No motion variables were found in the extracted design file.

If motion is added later, use this naming structure:

```txt
motion/duration/fast
motion/duration/normal
motion/duration/slow
motion/easing/default
motion/easing/decelerate
motion/easing/accelerate
```

---

# Grid Styles

No local grid styles were found in the extracted design file.

---

# Component Families

No components were found on the current page.

When components are added, use this structure:

```txt
component/button/primary
component/button/secondary
component/input/default
component/card/default
component/bottom-sheet/default
component/chip/default
```

---

# Implementation Rules for AI Coding

Use these rules when generating React, Next.js, CSS, or Tailwind code from this design system.

## 1. Color

Use semantic colors first.

```tsx
// Preferred
<div className="text-text-primary bg-bg-base border-border-default" />

// Avoid
<div className="text-neutral-1000 bg-white border-neutral-300" />
```

Use primitive colors only when creating or updating semantic tokens.

## 2. Typography

Use project typography classes. Apply the correct font family based on script.

```tsx
// Korean text → Pretendard (or base stack)
<h1 className="text-title-lg font-korean">이번 달 소비</h1>
<p  className="text-body-md  font-base">카테고리별 지출을 확인하세요.</p>

// English-only labels, amounts, badges → Satoshi
<span className="text-label-sm font-latin">Category</span>
<span className="text-label-md font-latin">₩ 128,000</span>

// Avoid: hardcoded fonts, raw Tailwind type sizes
<h1 className="text-3xl font-semibold font-['Pretendard']">이번 달 소비</h1>
<p  className="text-sm">카테고리별 지출을 확인하세요.</p>
```

## 3. Spacing

Use the shared spacing scale.

```tsx
// Preferred
<div className="p-20 gap-12" />

// Avoid
<div className="p-[21px] gap-[13px]" />
```

## 4. Radius

Use radius tokens.

```tsx
// Preferred
<div className="rounded-16" />
<button className="rounded-full" />

// Avoid
<div className="rounded-2xl" />
<button className="rounded-[999px]" />
```

## 5. Shadow

Use shadow tokens.

```tsx
// Preferred
<div className="shadow-100" />

// Avoid
<div className="shadow-md" />
```

---

# Token Conversion Summary

```txt
Color Primitives/Neutral/1000 -> color/primitive/neutral/1000 -> --color-neutral-1000
Color Primitives/Black/600 -> color/primitive/black/600 -> --color-black-600
Color Primitives/White/1000 -> color/primitive/white/1000 -> --color-white-1000
Color Primitives/Red/600 -> color/primitive/red/600 -> --color-red-600

Color Semantic/Text/Primary -> color/semantic/text/primary -> --color-text-primary
Color Semantic/Bg/Base -> color/semantic/bg/base -> --color-bg-base
Color Semantic/Border/Default -> color/semantic/border/default -> --color-border-default

Title-XXlarge -> typography/title/2xl -> text-title-2xl
Title-Xlarge -> typography/title/xl -> text-title-xl
Title-Large -> typography/title/lg -> text-title-lg
Title-Medium -> typography/title/md -> text-title-md
Title-Small -> typography/title/sm -> text-title-sm
Headline -> typography/headline/md -> text-headline-md
Body-Large -> typography/body/lg -> text-body-lg
Body-Medium -> typography/body/md -> text-body-md
Body-Small -> typography/body/sm -> text-body-sm
Label-Large -> typography/label/lg -> text-label-lg
Label-Medium -> typography/label/md -> text-label-md
Label-Small -> typography/label/sm -> text-label-sm
Caption-Medium -> typography/caption/md -> text-caption-md
Caption-Small -> typography/caption/sm -> text-caption-sm
Caption-Xsmall -> typography/caption/xs -> text-caption-xs

Size/Spacing/Gap/16 -> size/space/16 -> --space-16
Size/Spacing/Padding/20 -> size/space/20 -> --space-20
Frame/Padding -> layout/frame/padding -> --layout-frame-padding

Size/Radius/12 -> size/radius/12 -> --radius-12
Size/Radius/Full -> size/radius/full -> --radius-full

Shadow/100 -> effect/shadow/100 -> --shadow-100
Shadow/200 -> effect/shadow/200 -> --shadow-200
```

---

# Editing Notes

- Keep Figma token names and code token names synchronized.
- Use semantic tokens in components whenever possible.
- Do not write hard-coded hex colors or arbitrary pixel values in implementation code.
- If new colors are added, add them first to `color/primitive`, then create a matching `color/semantic` role.
- If new typography styles are added, follow the `typography/category/scale` structure.
- If components are added later, document their token usage and anti-patterns.
