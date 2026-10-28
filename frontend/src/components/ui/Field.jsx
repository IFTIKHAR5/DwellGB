import { useId, useState, cloneElement, isValidElement } from 'react';
import { Eye, EyeOff } from '@/components/icons';

/** Label + control + hint/error. Pass the control as the only child. */
export function Field({ label, error, hint, required, children, className = '' }) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children, { id: children.props.id || id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': error || hint ? `${id}-help` : undefined })
    : children;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={children?.props?.id || id} className="label">
          {label} {required && <span className="text-brand">*</span>}
        </label>
      )}
      {control}
      {(error || hint) && (
        <p id={`${id}-help`} className={`mt-1.5 text-xs ${error ? 'text-danger font-medium' : 'text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

/** Text input with a small icon on the left, e.g. <IconInput icon={Mail} … /> */
export function IconInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted" />
      <input {...props} className={`input ps-10 ${className}`} />
    </div>
  );
}

export function PasswordInput({ icon: Icon, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted" />}
      <input {...props} type={show ? 'text' : 'password'} className={`input pe-11 ${Icon ? 'ps-10' : ''} ${props.className || ''}`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 end-0 w-11 flex items-center justify-center text-muted hover:text-ink"
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
      </button>
    </div>
  );
}

/** Segmented control / pill group for enum values. */
export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((o) => (
        <button key={o.value} type="button" className="chip" data-active={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon && <o.icon className="w-4 h-4" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** +/- counter input. */
export function Counter({ value, onChange, min = 0, max = 20 }) {
  const v = Number(value) || 0;
  return (
    <div className="inline-flex items-center gap-3">
      <button type="button" className="btn btn-secondary btn-icon w-9 h-9" onClick={() => onChange(Math.max(min, v - 1))} disabled={v <= min} aria-label="Decrease">−</button>
      <span className="w-6 text-center font-semibold ltr-nums">{v}</span>
      <button type="button" className="btn btn-secondary btn-icon w-9 h-9" onClick={() => onChange(Math.min(max, v + 1))} disabled={v >= max} aria-label="Increase">+</button>
    </div>
  );
}
