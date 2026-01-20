/**
 * Reusable UI Components
 *
 * Provides consistent animations, transitions, hover effects, cards, and buttons
 * with section-specific theming for the application.
 */

import type { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from 'react';

// ============================================================================
// SECTION THEMES
// ============================================================================

export type SectionTheme = 'upload' | 'setup' | 'validate' | 'editor' | 'viewer' | 'results';

export const sectionThemeClasses: Record<SectionTheme, {
  background: string;
  card: string;
  cardHover: string;
  buttonPrimary: string;
  buttonSecondary: string;
  accent: string;
  accentLight: string;
}> = {
  upload: {
    background: 'bg-gradient-upload',
    card: 'card-upload',
    cardHover: 'card-upload-hover',
    buttonPrimary: 'btn-upload-primary',
    buttonSecondary: 'btn-upload-secondary',
    accent: 'text-amber-600',
    accentLight: 'bg-amber-100',
  },
  setup: {
    background: 'bg-gradient-setup',
    card: 'card-setup',
    cardHover: 'card-setup-hover',
    buttonPrimary: 'btn-setup-primary',
    buttonSecondary: 'btn-setup-secondary',
    accent: 'text-orange-700',
    accentLight: 'bg-orange-100',
  },
  validate: {
    background: 'bg-gradient-validate',
    card: 'card-validate',
    cardHover: 'card-validate-hover',
    buttonPrimary: 'btn-validate-primary',
    buttonSecondary: 'btn-validate-secondary',
    accent: 'text-emerald-600',
    accentLight: 'bg-emerald-100',
  },
  editor: {
    background: 'bg-gradient-editor',
    card: 'card-editor',
    cardHover: 'card-editor-hover',
    buttonPrimary: 'btn-editor-primary',
    buttonSecondary: 'btn-editor-secondary',
    accent: 'text-blue-600',
    accentLight: 'bg-blue-100',
  },
  viewer: {
    background: 'bg-gradient-viewer',
    card: 'card-viewer',
    cardHover: 'card-viewer-hover',
    buttonPrimary: 'btn-viewer-primary',
    buttonSecondary: 'btn-viewer-secondary',
    accent: 'text-sky-600',
    accentLight: 'bg-sky-100',
  },
  results: {
    background: 'bg-gradient-results',
    card: 'card-results',
    cardHover: 'card-results-hover',
    buttonPrimary: 'btn-results-primary',
    buttonSecondary: 'btn-results-secondary',
    accent: 'text-rose-600',
    accentLight: 'bg-rose-100',
  },
};

// ============================================================================
// ANIMATED CONTAINERS
// ============================================================================

interface AnimatedContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  animation?: 'fade-in' | 'slide-up' | 'scale-in' | 'none';
  delay?: 'none' | 'short' | 'medium' | 'long';
}

export function AnimatedContainer({
  children,
  animation = 'fade-in',
  delay = 'none',
  className = '',
  ...props
}: AnimatedContainerProps) {
  const animationClass = animation !== 'none' ? `animate-${animation}` : '';
  const delayClass = {
    none: '',
    short: 'animation-delay-100',
    medium: 'animation-delay-200',
    long: 'animation-delay-300',
  }[delay];

  return (
    <div className={`${animationClass} ${delayClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

// ============================================================================
// HOVER CARD
// ============================================================================

interface HoverCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  theme?: SectionTheme;
  variant?: 'default' | 'accent' | 'glass';
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'none';
}

export function HoverCard({
  children,
  theme,
  variant = 'default',
  hoverEffect = 'lift',
  className = '',
  ...props
}: HoverCardProps) {
  const baseClass = theme
    ? sectionThemeClasses[theme].cardHover
    : 'card-hover';

  const variantClass = {
    default: '',
    accent: 'card-accent',
    glass: 'card-glass',
  }[variant];

  const hoverClass = {
    lift: 'hover-lift',
    glow: 'hover-glow',
    scale: 'hover-scale',
    none: '',
  }[hoverEffect];

  return (
    <div
      className={`${baseClass} ${variantClass} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// THEMED BUTTON
// ============================================================================

interface ThemedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  theme?: SectionTheme;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function ThemedButton({
  children,
  theme,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: ThemedButtonProps) {
  const getButtonClass = () => {
    if (theme) {
      if (variant === 'primary') return sectionThemeClasses[theme].buttonPrimary;
      if (variant === 'secondary') return sectionThemeClasses[theme].buttonSecondary;
    }

    // Fallback to default button classes
    return {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
    }[variant];
  };

  const sizeClass = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }[size];

  return (
    <button
      className={`${getButtonClass()} ${sizeClass} active-press ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      )}
      {children}
    </button>
  );
}

// ============================================================================
// SECTION WRAPPER
// ============================================================================

interface SectionWrapperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  theme: SectionTheme;
  fullHeight?: boolean;
}

export function SectionWrapper({
  children,
  theme,
  fullHeight = false,
  className = '',
  ...props
}: SectionWrapperProps) {
  const bgClass = sectionThemeClasses[theme].background;
  const heightClass = fullHeight ? 'min-h-screen' : '';

  return (
    <div
      className={`${bgClass} ${heightClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// GRADIENT CARD
// ============================================================================

interface GradientCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  theme?: SectionTheme;
  intensity?: 'subtle' | 'medium' | 'strong';
}

export function GradientCard({
  children,
  theme = 'upload',
  intensity = 'subtle',
  className = '',
  ...props
}: GradientCardProps) {
  const cardClass = sectionThemeClasses[theme].cardHover;

  const intensityClass = {
    subtle: 'opacity-90',
    medium: '',
    strong: 'shadow-lg',
  }[intensity];

  return (
    <div
      className={`${cardClass} ${intensityClass} transition-all duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// ICON BADGE
// ============================================================================

interface IconBadgeProps {
  children: ReactNode;
  theme?: SectionTheme;
  size?: 'sm' | 'md' | 'lg';
}

export function IconBadge({
  children,
  theme = 'upload',
  size = 'md',
}: IconBadgeProps) {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size];

  const gradientClass = {
    upload: 'from-amber-400 to-amber-600',
    setup: 'from-orange-400 to-orange-600',
    validate: 'from-emerald-400 to-emerald-600',
    editor: 'from-blue-400 to-blue-600',
    viewer: 'from-sky-400 to-sky-600',
    results: 'from-rose-400 to-orange-500',
  }[theme];

  return (
    <div className={`${sizeClass} rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-sm`}>
      {children}
    </div>
  );
}

// ============================================================================
// PULSE DOT (for status indicators)
// ============================================================================

interface PulseDotProps {
  status: 'active' | 'warning' | 'error' | 'success' | 'idle';
  size?: 'sm' | 'md';
}

export function PulseDot({ status, size = 'sm' }: PulseDotProps) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  const colorClass = {
    active: 'bg-blue-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    success: 'bg-emerald-500',
    idle: 'bg-gray-400',
  }[status];

  const pulseClass = status !== 'idle' ? 'animate-pulse' : '';

  return (
    <span className={`${sizeClass} ${colorClass} ${pulseClass} rounded-full inline-block`} />
  );
}
