import { useState, useRef, useEffect, useCallback } from "react";
import { LucideIcon } from "lucide-react";

interface Suggestion {
  label: string;
  value: string;
}

interface SmartAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  icon: LucideIcon;
  fetchSuggestions: (query: string) => Promise<Suggestion[]>;
  debounceMs?: number;
  required?: boolean;
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

const SmartAutocomplete = ({
  value,
  onChange,
  placeholder,
  icon: Icon,
  fetchSuggestions,
  debounceMs = 300,
  required,
}: SmartAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const doFetch = useCallback(
    (query: string) => {
      if (abortRef.current) abortRef.current.abort();
      if (!query || query.length < 1) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      fetchSuggestions(query).then((results) => {
        if (ctrl.signal.aborted) return;
        setSuggestions(results);
        setIsOpen(results.length > 0 && document.activeElement === inputRef.current);
        setActiveIndex(-1);
        setLoading(false);
      }).catch(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setSuggestions([]);
        }
      });
    },
    [fetchSuggestions]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doFetch(val), debounceMs);
  };

  const selectItem = (item: Suggestion) => {
    onChange(item.value);
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((p) => Math.min(p + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectItem(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full h-12 pl-10 pr-4 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        required={required}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto"
        >
          {suggestions.map((item, i) => (
            <li
              key={item.label + i}
              onMouseDown={() => selectItem(item)}
              className={`px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                i === activeIndex
                  ? "bg-primary/20 text-primary"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>{highlightMatch(item.label, value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SmartAutocomplete;
