import * as React from "react";
import { cn } from "./cn";

let fieldSeq = 0;
function useFieldId(provided?: string) {
  const [generated] = React.useState(() => provided ?? `fld-${++fieldSeq}`);
  return provided ?? generated;
}

// Field — label + control + hint/error wrapper. Wires htmlFor/aria via a
// render-prop so the inner control gets the right id + aria-describedby.
export interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  /** Render-prop receiving wiring props for the control. */
  children: (controlProps: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => React.ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FieldProps) {
  const id = useFieldId(htmlFor);
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
        >
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </label>
      )}
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p id={`${id}-err`} className="text-[12px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ── Raw control styling shared by Input / Textarea / Select ──────────
export const controlClass =
  "w-full rounded-field border border-line bg-card px-3 text-sm text-ink " +
  "placeholder:text-muted transition focus:outline-none focus:border-blue " +
  "focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/30";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClass, "h-10", className)}
      {...props}
    />
  );
});

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(controlClass, "py-2", className)}
        {...props}
      />
    );
  },
);

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          controlClass,
          "h-10 appearance-none bg-[length:18px] bg-[right_10px_center] bg-no-repeat pr-9",
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%235c6470' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    );
  },
);

// Checkbox — native input, brand-styled.
export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, label, id, ...props }, ref) {
    const cbId = useFieldId(id);
    return (
      <label
        htmlFor={cbId}
        className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink"
      >
        <input
          ref={ref}
          id={cbId}
          type="checkbox"
          className={cn(
            "h-4 w-4 rounded border-line text-blue accent-blue focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            className,
          )}
          style={{ accentColor: "var(--blue)" }}
          {...props}
        />
        {label && <span>{label}</span>}
      </label>
    );
  },
);

// Switch — accessible toggle (role=switch), controlled or uncontrolled.
export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  className?: string;
}
export function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  label,
  id,
  className,
}: SwitchProps) {
  const swId = useFieldId(id);
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internal;
  function toggle() {
    if (disabled) return;
    if (!isControlled) setInternal((v) => !v);
    onCheckedChange?.(!on);
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <button
        id={swId}
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-pill border border-line transition",
          on ? "bg-blue" : "bg-canvas",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-card shadow-card transition",
            on ? "translate-x-[18px]" : "translate-x-1",
          )}
        />
      </button>
      {label && (
        <label htmlFor={swId} className="cursor-pointer text-sm text-ink">
          {label}
        </label>
      )}
    </span>
  );
}
