import React from "react";

// Base component props that all design system components should extend
export interface BaseComponentProps {
  /** Additional CSS classes to apply */
  className?: string;
  /** Children elements */
  children?: React.ReactNode;
  /** Test ID for testing purposes */
  testId?: string;
  /** Component variant */
  variant?: string;
  /** Component size */
  size?: "sm" | "md" | "lg";
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether the component is in a loading state */
  loading?: boolean;
  /** Custom styles object */
  style?: React.CSSProperties;
  /** ARIA label for accessibility */
  "aria-label"?: string;
  /** ARIA described by for accessibility */
  "aria-describedby"?: string;
}

// Common variant types
export type CommonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "ghost"
  | "outline";

export type ComponentSize = "sm" | "md" | "lg";

// Button specific types
export type ButtonVariant = CommonVariant | "destructive" | "gradient";

export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
  fullWidth?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: "left" | "right";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  href?: string;
  target?: string;
  rel?: string;
}

// Input specific types
export type InputVariant = "default" | "error" | "success";

export interface InputProps extends BaseComponentProps {
  variant?: InputVariant;
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
  id: string;
  type?: React.HTMLInputTypeAttribute;
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  autoComplete?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
}

// Card specific types
export type CardVariant =
  | "default"
  | "elevated"
  | "outlined"
  | "gradient"
  | "interactive";

export interface CardProps extends BaseComponentProps {
  variant?: CardVariant;
  padding?: ComponentSize;
  hover?: boolean;
  clickable?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

// Modal specific types
export type ModalSize = ComponentSize | "xl" | "2xl" | "full";

export interface ModalProps extends Omit<BaseComponentProps, "size"> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscapeKey?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  finalFocus?: React.RefObject<HTMLElement>;
}

// Typography specific types
export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "body-large"
  | "body"
  | "body-small"
  | "caption"
  | "code";

export interface TypographyProps extends BaseComponentProps {
  variant?: TypographyVariant;
  component?: keyof React.JSX.IntrinsicElements;
  color?: string;
  align?: "left" | "center" | "right" | "justify";
  weight?: "normal" | "medium" | "semibold" | "bold";
  italic?: boolean;
  underline?: boolean;
  truncate?: boolean;
  noWrap?: boolean;
}

// Icon specific types
export interface IconProps extends Omit<BaseComponentProps, "size"> {
  size?: ComponentSize | number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  viewBox?: string;
}

// Animation types
export interface AnimationProps {
  initial?: object;
  animate?: object;
  exit?: object;
  transition?: object;
  whileHover?: object;
  whileTap?: object;
  whileFocus?: object;
  whileInView?: object;
}

// Responsive props
export interface ResponsiveProps {
  responsive?: {
    sm?: Partial<BaseComponentProps>;
    md?: Partial<BaseComponentProps>;
    lg?: Partial<BaseComponentProps>;
    xl?: Partial<BaseComponentProps>;
  };
}

// Component state types
export type ComponentState =
  | "default"
  | "hover"
  | "focus"
  | "active"
  | "disabled"
  | "loading";

// Theme context types
export interface ThemeContextValue {
  theme: "light" | "dark" | "auto";
  setTheme: (theme: "light" | "dark" | "auto") => void;
  colorScheme: "light" | "dark";
  reducedMotion: boolean;
  highContrast: boolean;
}

// Utility type for component ref forwarding
export type ComponentWithRef<T, P = object> = React.ForwardRefExoticComponent<
  P & React.RefAttributes<T>
>;

// Utility type for polymorphic components
export type PolymorphicProps<T extends React.ElementType, P = object> = P & {
  as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, keyof P>;

// Export utility functions for component creation
export const createComponentProps = <T extends BaseComponentProps>(
  props: T,
  defaultProps: Partial<T> = {}
): T => {
  return { ...defaultProps, ...props };
};

export const filterHTMLProps = <T extends Record<string, unknown>>(
  props: T,
  allowedProps: (keyof T)[]
): Partial<T> => {
  return Object.keys(props)
    .filter((key) => allowedProps.includes(key as keyof T))
    .reduce((obj, key) => {
      obj[key as keyof T] = props[key as keyof T];
      return obj;
    }, {} as Partial<T>);
};
