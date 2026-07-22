import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import cn from '../../utils/cn';

/*
 * A custom, fully-stylable dropdown that looks modern (rounded popup + rounded,
 * highlighted option items) while staying a drop-in replacement for a native
 * <select>.
 *
 * The trick: a real (visually hidden) <select> remains the source of truth so
 * react-hook-form's `register()` (ref + name + onChange/onBlur) and controlled
 * `value`/`onChange` usage keep working unchanged. Picking an option in the
 * custom popup writes to that native element and dispatches a real `change`
 * event, so React/RHF are notified exactly as if the user used the native list.
 */

function useMergedRef(...refs) {
  const refsRef = useRef(refs);
  refsRef.current = refs;
  // Stable callback so React only runs it on mount/unmount (keeps RHF's ref happy).
  return useCallback((node) => {
    refsRef.current.forEach((r) => {
      if (!r) return;
      if (typeof r === 'function') r(node);
      else r.current = node;
    });
  }, []);
}

// Set a native <select>'s value in a way React's value tracker respects, then
// fire a bubbling change event so onChange handlers (incl. RHF) run.
function commitNativeValue(select, value) {
  if (!select) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, value);
  else select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

// Flatten <option> children (incl. mapped arrays) into plain descriptors.
function readOptions(children) {
  const out = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return;
    const { value, children: label, disabled } = child.props;
    out.push({
      value: value ?? '',
      label: typeof label === 'string' ? label : String(label ?? ''),
      disabled: Boolean(disabled),
    });
  });
  return out;
}

const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    id,
    className,
    children,
    containerClassName,
    value,
    defaultValue,
    onChange,
    onBlur,
    disabled = false,
    placeholder,
    ...props
  },
  ref
) {
  const autoId = useId();
  const triggerId = id || autoId;
  const listboxId = `${triggerId}-listbox`;

  const { 'aria-label': ariaLabel, ...nativeProps } = props;

  const nativeRef = useRef(null);
  const mergedRef = useMergedRef(ref, nativeRef);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const options = readOptions(children);
  const isControlled = value !== undefined;

  const [innerValue, setInnerValue] = useState(value ?? defaultValue ?? '');
  const currentValue = isControlled ? value : innerValue;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = options.find((o) => String(o.value) === String(currentValue));
  const selectedIndex = options.findIndex((o) => String(o.value) === String(currentValue));

  // Keep the display in sync with the native element's value (covers RHF setting
  // the default value imperatively via the ref after mount).
  useLayoutEffect(() => {
    if (isControlled) return;
    const el = nativeRef.current;
    if (el && String(el.value) !== String(innerValue)) setInnerValue(el.value);
  });

  const handleNativeChange = (e) => {
    if (!isControlled) setInnerValue(e.target.value);
    onChange?.(e);
  };

  const closeAndFocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const choose = (opt) => {
    if (!opt || opt.disabled) return;
    if (!isControlled) setInnerValue(opt.value);
    if (nativeRef.current && String(nativeRef.current.value) !== String(opt.value)) {
      commitNativeValue(nativeRef.current, opt.value);
    }
    closeAndFocus();
  };

  const nextEnabled = (from, dir) => {
    const n = options.length;
    for (let step = 1; step <= n; step += 1) {
      const i = (from + dir * step + n * step) % n;
      if (!options[i]?.disabled) return i;
    }
    return from;
  };

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // When opening, highlight the current selection and scroll it into view.
  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextEnabled(-1, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = listRef.current?.children?.[activeIndex];
    node?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex]);

  const onTriggerKeyDown = (e) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else setActiveIndex((i) => nextEnabled(i < 0 ? -1 : i, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) setOpen(true);
        else setActiveIndex((i) => nextEnabled(i < 0 ? 0 : i, -1));
        break;
      case 'Home':
        if (open) {
          e.preventDefault();
          setActiveIndex(nextEnabled(-1, 1));
        }
        break;
      case 'End':
        if (open) {
          e.preventDefault();
          setActiveIndex(nextEnabled(0, -1));
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) setOpen(true);
        else choose(options[activeIndex]);
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          closeAndFocus();
        }
        break;
      case 'Tab':
        if (open) setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={triggerId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}

      <div className="relative" ref={wrapRef}>
        {/* Source-of-truth native control (hidden, but real) */}
        <select
          ref={mergedRef}
          aria-hidden="true"
          tabIndex={-1}
          disabled={disabled}
          onChange={handleNativeChange}
          onBlur={onBlur}
          {...(isControlled ? { value } : { defaultValue })}
          {...nativeProps}
          className="sr-only"
        >
          {children}
        </select>

        {/* Custom trigger */}
        <button
          type="button"
          id={triggerId}
          ref={triggerRef}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onTriggerKeyDown}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm text-ink shadow-sm transition-colors',
            'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
            'disabled:cursor-not-allowed disabled:opacity-60',
            error && 'border-danger focus:border-danger focus:ring-danger/30',
            className
          )}
        >
          <span className={cn('block truncate', !selected && 'text-muted')}>
            {selected ? selected.label : placeholder || 'Select…'}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
          />
        </button>

        {/* Rounded popup with rounded option items */}
        {open && (
          <ul
            id={listboxId}
            role="listbox"
            ref={listRef}
            tabIndex={-1}
            className="absolute z-dropdown mt-1.5 max-h-60 w-full origin-top overflow-auto rounded-xl border border-line bg-surface p-1.5 shadow-pop animate-scale-in"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">No options</li>
            ) : (
              options.map((opt, i) => {
                const isSel = String(opt.value) === String(currentValue);
                const isActive = i === activeIndex;
                return (
                  <li
                    key={`${opt.value}-${i}`}
                    id={`${listboxId}-opt-${i}`}
                    role="option"
                    aria-selected={isSel}
                    aria-disabled={opt.disabled || undefined}
                    onClick={() => choose(opt)}
                    onMouseEnter={() => !opt.disabled && setActiveIndex(i)}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      opt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                      !opt.disabled && isActive && !isSel && 'bg-surface-2',
                      isSel ? 'bg-brand/10 font-medium text-brand' : 'text-ink'
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSel && <Check className="h-4 w-4 shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export default Select;
