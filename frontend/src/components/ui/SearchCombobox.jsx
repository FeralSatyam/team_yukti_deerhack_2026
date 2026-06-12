import { useEffect, useId, useRef, useState } from "react";

export function SearchCombobox({
  label,
  placeholder,
  options: excludeOptions,
  onSearch,
  onSelect,
  disabled = false,
}) {
  const id = useId();
  const listId = `${id}-listbox`;
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHighlightIndex(-1);
      return;
    }
    const filtered = onSearch(query).filter(
      (item) => !excludeOptions.includes(item)
    );
    setResults(filtered);
    setHighlightIndex(filtered.length > 0 ? 0 : -1);
  }, [query, excludeOptions, onSearch]);

  function selectItem(value) {
    onSelect(value);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHighlightIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (!isOpen || results.length === 0) {
      if (e.key === "ArrowDown" && query.trim()) setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectItem(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlightIndex >= 0 ? `${id}-option-${highlightIndex}` : undefined
          }
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.trim() && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-white pl-11 pr-4 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition-shadow focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
        />
      </div>

      {isOpen && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--border)] bg-white py-1 shadow-lg"
        >
          {results.map((item, index) => (
            <li
              key={item}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === highlightIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(item)}
              onMouseEnter={() => setHighlightIndex(index)}
              className={`cursor-pointer px-4 py-2.5 text-[15px] ${
                index === highlightIndex
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-[var(--foreground)] hover:bg-gray-50"
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--muted)] shadow-lg">
          No results found
        </div>
      )}
    </div>
  );
}
