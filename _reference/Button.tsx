import React, { ButtonHTMLAttributes, ReactNode } from 'react';

// =================================================================
// Button — 가계부 앱 Design System
// Figma: Button/Button (node 2006:10538)
// Tokens: theme.css
// =================================================================

export type ButtonSize    = 'large' | 'medium' | 'small';
export type ButtonVariant = 'solid' | 'outlined';
export type ButtonColor   = 'primary' | 'assistive';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** 버튼 텍스트 레이블 */
  label?: string;
  /** 앞쪽 아이콘 */
  icon?: ReactNode;
  /** 뒤쪽 아이콘 */
  trailingIcon?: ReactNode;
  /** 아이콘만 표시 (label 숨김, 정사각형) */
  iconOnly?: boolean;
  /** 크기 — Large(48px) | Medium(40px) | Small(32px) */
  size?: ButtonSize;
  /** 채움 방식 — Solid | Outlined */
  variant?: ButtonVariant;
  /** 색상 역할 — Primary(강조) | Assistive(보조) */
  color?: ButtonColor;
}

// ── Size tokens ────────────────────────────────────────────────
const SIZE: Record<ButtonSize, {
  height:     string;
  px:         string;
  py:         string;
  iconSquare: string;
  iconPx:     string;
  radius:     string;
  iconRadius: string;
  font:       string;
  gap:        string;
}> = {
  large: {
    height:     'h-12',                        // 48px
    px:         'px-6',                        // 24px
    py:         'py-3',                        // 12px
    iconSquare: 'w-12 h-12',                   // 48×48px
    iconPx:     'px-3',                        // 12px
    radius:     'rounded-[var(--radius-12)]',
    iconRadius: 'rounded-[var(--radius-12)]',
    font:       'text-[length:var(--text-label-lg-size)] font-[number:var(--text-label-lg-weight)] leading-[var(--text-label-lg-line-height)]',
    gap:        'gap-2',
  },
  medium: {
    height:     'h-10',                        // 40px
    px:         'px-5',                        // 20px
    py:         'py-3',                        // 12px
    iconSquare: 'w-10 h-10',                   // 40×40px
    iconPx:     'px-2',                        // 8px
    radius:     'rounded-[var(--radius-12)]',
    iconRadius: 'rounded-[var(--radius-8)]',   // icon-only uses smaller radius
    font:       'text-[length:var(--text-label-md-size)] font-[number:var(--text-label-md-weight)] leading-[var(--text-label-md-line-height)]',
    gap:        'gap-1.5',
  },
  small: {
    height:     'h-8',                         // 32px
    px:         'px-4',                        // 16px
    py:         'py-2',                        // 8px
    iconSquare: 'w-8 h-8',                     // 32×32px
    iconPx:     'px-2',                        // 8px
    radius:     'rounded-[var(--radius-8)]',
    iconRadius: 'rounded-[var(--radius-8)]',
    font:       'text-[length:var(--text-label-sm-size)] font-[number:var(--text-label-sm-weight)] leading-[var(--text-label-sm-line-height)]',
    gap:        'gap-1',
  },
};

// ── Color tokens ───────────────────────────────────────────────
interface ColorTokens {
  bg:     string;
  text:   string;
  border: string;
}

function resolveColors(
  variant: ButtonVariant,
  color: ButtonColor,
  disabled: boolean
): ColorTokens {
  if (disabled) {
    return {
      bg:     'bg-[var(--color-surface-muted)]',
      text:   'text-[var(--color-text-disabled)]',
      border: 'border-transparent',
    };
  }

  if (variant === 'solid') {
    return color === 'primary'
      ? {
          bg:     'bg-[var(--color-bg-inverse)]',
          text:   'text-[var(--color-text-inverse)]',
          border: 'border-transparent',
        }
      : {
          bg:     'bg-[var(--color-bg-muted)]',
          text:   'text-[var(--color-text-primary)]',
          border: 'border-transparent',
        };
  }

  // outlined
  return color === 'primary'
    ? {
        bg:     'bg-transparent',
        text:   'text-[var(--color-text-primary)]',
        border: 'border-[var(--color-border-inverse)]',
      }
    : {
        bg:     'bg-transparent',
        text:   'text-[var(--color-text-primary)]',
        border: 'border-[var(--color-neutral-500)]',  // #71717A
      };
}

// ── Component ─────────────────────────────────────────────────
export function Button({
  label,
  icon,
  trailingIcon,
  iconOnly   = false,
  size       = 'large',
  variant    = 'solid',
  color      = 'primary',
  disabled   = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const sz     = SIZE[size];
  const colors = resolveColors(variant, color, disabled);
  const radius = iconOnly ? sz.iconRadius : sz.radius;

  const classes = [
    'inline-flex items-center justify-center',
    'font-["Pretendard",sans-serif]',
    'transition-colors duration-150',
    'select-none outline-none whitespace-nowrap',
    sz.font,
    sz.gap,
    radius,
    colors.bg,
    colors.text,
    ...(iconOnly
      ? [sz.iconSquare, sz.iconPx]
      : [sz.height, sz.px, sz.py]),
    ...(variant === 'outlined' ? ['border border-solid', colors.border] : []),
    disabled
      ? 'cursor-not-allowed pointer-events-none'
      : 'cursor-pointer active:opacity-80',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    >
      {iconOnly ? (
        icon
      ) : (
        <>
          {icon}
          {(label || children) && (
            <span>{label ?? children}</span>
          )}
          {trailingIcon}
        </>
      )}
    </button>
  );
}

export default Button;
