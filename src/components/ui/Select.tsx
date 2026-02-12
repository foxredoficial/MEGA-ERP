import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type OptionItem = { value: string; label: string; disabled?: boolean };

export type SelectProps = {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  appearance?: "default" | "inline";
  children: ReactNode;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "value" | "defaultValue" | "children" | "type" | "disabled" | "id"
> &
  Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "onChange" | "value" | "defaultValue" | "children" | "disabled" | "name" | "id" | "className"
  >;

function parseOptions(children: ReactNode): OptionItem[] {
  const out: OptionItem[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<any>;
      const type = typeof el.type === "string" ? el.type : null;
      if (type === "option") {
        const value = el.props.value ?? "";
        const label = typeof el.props.children === "string" ? el.props.children : String(el.props.children ?? "");
        out.push({ value: String(value), label, disabled: Boolean(el.props.disabled) });
        return;
      }
      if (type === "optgroup") {
        walk(el.props.children);
        return;
      }
      walk(el.props.children);
    });
  };
  walk(children);
  return out;
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, children, value, defaultValue, onChange, disabled, name, id, appearance = "default", ...rest }, ref) => {
    const options = useMemo(() => parseOptions(children), [children]);
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string>(() => {
      const v = defaultValue ?? options[0]?.value ?? "";
      return String(v);
    });
    const currentValue = isControlled ? String(value) : internalValue;

    const selected = options.find((o) => o.value === currentValue) ?? options[0];
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [floatingStyle, setFloatingStyle] = useState<React.CSSProperties | null>(null);

    function setButtonNode(node: HTMLButtonElement | null) {
      buttonRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as any).current = node;
    }

    useEffect(() => {
      function onDocMouseDown(e: MouseEvent) {
        if (!open) return;
        const t = e.target as Node;
        if (wrapperRef.current && wrapperRef.current.contains(t)) return;
        if (listRef.current && listRef.current.contains(t)) return;
        setOpen(false);
      }
      document.addEventListener("mousedown", onDocMouseDown);
      return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [open]);

    useLayoutEffect(() => {
      if (!open) return;

      function compute() {
        const btn = buttonRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const gap = 8;
        const minWidth = appearance === "inline" ? 220 : rect.width;
        const width = Math.max(minWidth, rect.width);
        const padding = 8;

        let left = rect.left;
        if (left + width > window.innerWidth - padding) left = Math.max(padding, window.innerWidth - padding - width);

        const maxHeightBelow = Math.max(140, window.innerHeight - padding - (rect.bottom + gap));
        const maxHeightAbove = Math.max(140, rect.top - padding - gap);

        const preferBelow = maxHeightBelow >= 220;
        const placeAbove = !preferBelow && maxHeightAbove > maxHeightBelow;
        const maxHeight = Math.min(320, placeAbove ? maxHeightAbove : maxHeightBelow);
        const style: React.CSSProperties = {
          position: "fixed",
          left,
          width,
          maxHeight,
          zIndex: 100,
        };
        if (placeAbove) style.bottom = window.innerHeight - rect.top + gap;
        else style.top = rect.bottom + gap;

        setFloatingStyle(style);
      }

      compute();
      window.addEventListener("resize", compute);
      window.addEventListener("scroll", compute, true);
      return () => {
        window.removeEventListener("resize", compute);
        window.removeEventListener("scroll", compute, true);
      };
    }, [open, appearance]);

    useEffect(() => {
      if (!open) return;
      const idx = Math.max(
        0,
        options.findIndex((o) => o.value === currentValue)
      );
      setActiveIndex(idx);
      window.setTimeout(() => {
        const el = listRef.current?.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: "nearest" });
      }, 0);
    }, [open, currentValue, options]);

    function commit(next: string) {
      if (!isControlled) setInternalValue(next);
      onChange?.({ target: { value: next, name } });
      setOpen(false);
    }

    const triggerClass =
      appearance === "inline"
        ? cn(
            "inline-flex items-center gap-2 bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none",
            disabled && "opacity-60 cursor-not-allowed",
            className
          )
        : cn(
            "h-11 w-full rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
            className
          );

    return (
      <div ref={wrapperRef} className="relative">
        <button
          id={id}
          ref={setButtonNode}
          type="button"
          className={triggerClass}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          {...rest}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (!open && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setOpen(true);
              return;
            }
            if (!open) return;
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, options.length - 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              const item = options[activeIndex];
              if (item && !item.disabled) commit(item.value);
              return;
            }
          }}
        >
          <span className={cn("truncate", appearance === "default" && "block text-left")}>{selected?.label ?? ""}</span>
          <ChevronDown
            className={cn(
              appearance === "inline" ? "h-4 w-4 text-slate-500" : "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500",
              "pointer-events-none"
            )}
          />
        </button>

        {open && floatingStyle
          ? createPortal(
              <div
                ref={listRef}
                role="listbox"
                className={cn(
                  "overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950"
                )}
                style={floatingStyle}
              >
                {options.map((opt, idx) => (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={opt.value === currentValue}
                    data-idx={idx}
                    disabled={opt.disabled}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center justify-between",
                      opt.disabled
                        ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900",
                      idx === activeIndex && !opt.disabled && "bg-slate-50 dark:bg-slate-900",
                      opt.value === currentValue && "font-medium"
                    )}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      if (opt.disabled) return;
                      commit(opt.value);
                    }}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>,
              document.body
            )
          : null}

        <select
          tabIndex={-1}
          aria-hidden
          className="hidden"
          name={name}
          value={currentValue}
          onChange={(e) => {
            const next = e.target.value;
            if (!isControlled) setInternalValue(next);
          }}
        >
          {Children.map(children, (c) => (isValidElement(c) ? cloneElement(c as any) : c))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
