import React, { HTMLAttributes, ReactNode } from 'react';

// =================================================================
// Chip — 가계부 앱 Design System
// Figma: Chip/Chip (node 2012:7125)
// Tokens: theme.css
// =================================================================

export type ChipSize    = 'xsmall' | 'small' | 'medium' | 'large';
export type ChipVariant = 'solid' | 'outlined';

export interface ChipProps extends HTMLAttributes<HTMLButtonElement> {
  /** 칩 레이블 */
  label?: string;
  /** 앞쪽 아이콘 */
  icon?: ReactNode;
  /** 크기 — Large(40px) | Medium(36px) | Small(32px) | Xsmall(24px) */
  size?: ChipSize;
  /** 채움 방식 — Solid | Outlined */
  variant?: ChipVariant;
  /** 선택(활성) 상태 */
  active?: boolean;
  /** 비활성화 */
  disabled?: boolean;
  /** 클릭 콜백 */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

// ── Size tokens ─────────────────────────────────────────────────
const SIZE: Record<ChipSize, {
  height: string;
  px:     string;
  py:     string;
  font:   string;
  gap:    string;
}> = {
  large: {
    height: 'h-10',                            // 40px
    px:     'px-3',                            // 12px
    py:     'py-2',                            // 8px
    font:   'text-[length:var(--text-body-sm-size)] font-[number:var(--text-body-sm-weight)] leading-[var(--text-body-sm-line-height)]',
    gap:    'gap-1.5',
  },
  medium: {
    height: 'h-9',                             // 36px
    px:     'px-2',                            // 8px
    py:     'py-[6px]',                        // 6px
    font:   'text-[length:var(--text-body-sm-size)] font-[number:var(--text-body-sm-weight)] leading-[var(--text-body-sm-line-height)]',
    gap:    'gap-1.5',
  },
  small: {
    height: 'h-8',                             // 32px
    px:     'px-2',                            // 8px
    py:     'py-1',                            // 4px
    font:   'text-[length:var(--text-body-sm-size)] font-[number:var(--text-body-sm-weight)] leading-[var(--text-body-sm-line-height)]',
    gap:    'gap-1',
  },
  xsmall: {
    height: 'h-6',                             // 24px
    px:     'px-2',                            // 8px
    py:     'py-1',                            // 4px
    font:   'text-[length:var(--text-caption-md-size)] font-[number:var(--text-caption-md-weight)] leading-[var(--text-caption-md-line-height)]',
    gap:    'gap-1',
  },
};

// ── Color tokens ────────────────────────────────────────────────
interface ChipColorTokens {
  bg:     string;
  text:   string;
  border: string;
}

function resolveColors(
  variant: ChipVariant,
  active: boolean,
  disabled: boolean
): ChipColorTokens {
  if (disabled) {
    return {
      bg:     variant === 'solid'
                ? 'bg-[var(--color-surface-muted)]'
                : 'bg-transparent',
      text:   'text-[var(--color-text-disabled)]',
      border: variant === 'outlined'
                ? 'border-[var(--color-border-default)]'
                : 'border-transparent',
    };
  }

  if (variant === 'solid') {
    return active
      ? {
          bg:     'bg-[var(--color-bg-inverse)]',
          text:   'text-[var(--color-text-inverse)]',
          border: 'border-transparent',
        }
      : {
          bg:     'bg-[var(--color-surface-subtle)]',
          text:   'text-[var(--color-text-secondary)]',
          border: 'border-transparent',
        };
  }

  // outlined
  return active
    ? {
        bg:     'bg-transparent',
        text:   'text-[var(--color-text-primary)]',
        border: 'border-[var(--color-border-inverse)]',
      }
    : {
        bg:     'bg-transparent',
        text:   'text-[var(--color-text-secondary)]',
        border: 'border-[var(--color-border-default)]',
      };
}

// ── Component ────────────────────────────────────────────────────
export function Chip({
  label,
  icon,
  size     = 'medium',
  variant  = 'outlined',
  active   = false,
  disabled = false,
  className,
  children,
  ...props
}: ChipProps) {
  const sz     = SIZE[size];
  const colors = resolveColors(variant, active, disabled);

  const classes = [
    'inline-flex items-center justify-center',
    'font-["Pretendard",sans-serif]',
    'rounded-[var(--radius-full)]',           // pill shape
    'transition-colors duration-150',
    'select-none outline-none whitespace-nowrap',
    sz.height,
    sz.px,
    sz.py,
    sz.font,
    sz.gap,
    colors.bg,
    colors.text,
    'border border-solid',
    colors.border,
    disabled
      ? 'cursor-not-allowed pointer-events-none'
      : 'cursor-pointer active:opacity-80',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      role="checkbox"
      aria-checked={active}
      aria-disabled={disabled}
      disabled={disabled}
      className={classes}
      {...props}
    >
      {icon}
      <span>{label ?? children}</span>
    </button>
  );
}

export default Chip;
