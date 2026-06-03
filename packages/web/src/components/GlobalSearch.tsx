import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { search, type SearchResultItem } from "../lib/api";

const TYPE_ICON: Record<SearchResultItem["type"], string> = {
  service: "🔧",
  feature: "📦",
  scenario: "🧪",
};

const TYPE_LABEL: Record<SearchResultItem["type"], string> = {
  service: "서비스",
  feature: "기능",
  scenario: "시나리오",
};

function resultHref(item: SearchResultItem): string {
  if (item.type === "service") return `/services/${item.id}`;
  if (item.type === "feature") return `/features/${item.id}`;
  return `/scenarios/${item.id}`;
}

function Breadcrumb({ item }: { item: SearchResultItem }) {
  if (item.type === "service") return null;
  if (item.type === "feature") {
    return (
      <span className="text-xs text-gray-400 ml-1">
        {item.serviceName}
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-400 ml-1">
      {item.serviceName} › {item.featureName}
    </span>
  );
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [] } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
    staleTime: 10_000,
  });

  useEffect(() => {
    setOpen(debouncedQuery.length >= 1);
    setActiveIndex(-1);
  }, [debouncedQuery, results]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      navigate(resultHref(item));
      setQuery("");
      setDebouncedQuery("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => debouncedQuery.length >= 1 && setOpen(true)}
          placeholder="서비스, 기능, 시나리오 검색..."
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setDebouncedQuery(""); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              결과 없음
            </div>
          ) : (
            <>
              {results.map((item, idx) => (
                <button
                  key={`${item.type}-${item.id}`}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${
                    idx === activeIndex ? "bg-blue-50" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(item)}
                >
                  <span className="text-base mt-0.5 shrink-0">{TYPE_ICON[item.type]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded shrink-0">
                        {TYPE_LABEL[item.type]}
                      </span>
                    </div>
                    <Breadcrumb item={item} />
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
