// ── @ssi/ui — Calm Studio UI primitive library ─────────────────────────
// Superset barrel. Unions every export previously provided by the per-app
// barrels (E-mteja, E-office, E-research …) so any existing
// `@/components/ui` import keeps resolving after migration to this package.
//
// Note: components marked "use client" (Modal, Drawer, Toast, Menu, Tabs,
// Tooltip, Pagination, confirm, Field's Switch) must be used inside Client
// Components. Pure-presentational primitives (Button, Card, Pill, StatCard,
// DataTable, Avatar, Skeleton, EmptyState, Toolbar, Stepper, icons) are
// server-safe.

export { cn } from "./cn";
export type { ClassValue } from "./cn";

export * from "./icons";

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Card, Panel, Section, PageHeader } from "./Card";
export type { CardProps, PanelProps, SectionProps, PageHeaderProps } from "./Card";

export { Pill, Badge, StatusBadge } from "./Pill";
export type { PillProps, PillTone, PillSize, BadgeProps, StatusBadgeProps } from "./Pill";
export { STATUS_TONES, toneForStatus } from "./status";

export {
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  controlClass,
} from "./Field";
export type {
  FieldProps,
  InputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  SwitchProps,
} from "./Field";

export { DataTable } from "./DataTable";
export type { DataTableProps, Column, SortDirection } from "./DataTable";

export { Modal, Drawer } from "./Modal";
export type { ModalProps, DrawerProps } from "./Modal";
export { confirm } from "./confirm";
export type { ConfirmOptions } from "./confirm";

export { Toaster, toast } from "./Toast";
export type { ToastTone, ToastItem, ToastOptions } from "./Toast";

export { Tabs } from "./Tabs";
export type { TabsProps, TabItem } from "./Tabs";

export { Stepper } from "./Stepper";
export type { StepperProps, StepperStep } from "./Stepper";

export { Menu } from "./Menu";
export type { MenuProps, MenuItem } from "./Menu";

export { Tooltip } from "./Tooltip";
export type { TooltipProps } from "./Tooltip";

export { Avatar } from "./Avatar";
export type { AvatarProps } from "./Avatar";

export { Pagination } from "./Pagination";
export type { PaginationProps } from "./Pagination";

export { StatCard } from "./StatCard";
export type { StatCardProps } from "./StatCard";

export { Toolbar } from "./Toolbar";
export type { ToolbarProps } from "./Toolbar";

export { Skeleton, SkeletonText, SkeletonRows, SkeletonCards } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";

// Wave 1 — theme engine + motion helpers.
export {
  ThemeProvider,
  ThemeToggle,
  useTheme,
  accentPalette,
  THEME_INIT_SCRIPT,
} from "./theme";
export type { ThemeMode, ResolvedTheme, ThemeProviderProps, AccentPalette } from "./theme";
export { useOptimisticAction } from "./useOptimisticAction";
export type { OptimisticRun } from "./useOptimisticAction";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

// Link primitive — both the emteja `linkClass()` helper and the eresearch
// `textLinkClass` string constant are exported so every app's barrel resolves.
export { TextLink, linkClass, textLinkClass } from "./TextLink";
export type { TextLinkProps } from "./TextLink";
