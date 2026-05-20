import { useEffect, useState, useRef } from "react";
import { fetchModels, ProviderData } from "../api/client";
import { useLang } from "../contexts/LanguageContext";

interface Props {
  providers: ProviderData[];
  selectedProvider: ProviderData | null;
  selectedModel: string;
  onSelectProvider: (p: ProviderData) => void;
  onSelectModel: (m: string) => void;
}

interface AliasMap {
  [modelId: string]: string;
}

function parseAliases(configStr: string): AliasMap {
  try {
    const cfg = JSON.parse(configStr);
    return cfg.model_aliases || {};
  } catch {
    return {};
  }
}

export default function ModelSwitcher({
  providers,
  selectedProvider,
  selectedModel,
  onSelectProvider,
  onSelectModel,
}: Props) {
  const { t } = useLang();
  const [models, setModels] = useState<string[]>([]);
  const [modelInput, setModelInput] = useState(selectedModel);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [aliasMap, setAliasMap] = useState<AliasMap>({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    if (selectedProvider) {
      setModels([]);
      setAliasMap(parseAliases(selectedProvider.config));
      fetchModels(selectedProvider.id).then(setModels).catch(() => setModels([]));
    }
  }, [selectedProvider]);

  useEffect(() => {
    setModelInput(selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        inputRef.current && !inputRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allModelIds = Object.keys(aliasMap).length > 0 ? Object.keys(aliasMap) : models;

  const displayName = (modelId: string): string => {
    return aliasMap[modelId] || modelId;
  };

  const q = modelInput.toLowerCase();
  const filtered = allModelIds.filter((m) => {
    const display = displayName(m);
    return m.toLowerCase().includes(q) || display.toLowerCase().includes(q);
  });

  const handleInputChange = (val: string) => {
    setModelInput(val);
    onSelectModel(val);
    setShowDropdown(true);
    setHighlightIndex(-1);
  };

  const handleSelect = (m: string) => {
    setModelInput(m);
    onSelectModel(m);
    setShowDropdown(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setShowDropdown(true);
        setHighlightIndex(e.key === "ArrowDown" ? 0 : filtered.length - 1);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      e.preventDefault();
    } else if (e.key === "Enter" && highlightIndex >= 0 && highlightIndex < filtered.length) {
      handleSelect(filtered[highlightIndex]);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    }
  };

  const handleFocus = () => {
    if (filtered.length > 0) setShowDropdown(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 items-center">
        <select
          className="dark:bg-gray-800 bg-white rounded-lg px-3 py-2.5 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors"
          value={selectedProvider?.id ?? ""}
          onChange={(e) => {
            const p = providers.find((x) => x.id === Number(e.target.value));
            if (p) onSelectProvider(p);
          }}
        >
          <option value="" disabled>{t("model.select_provider")}</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            className="w-full dark:bg-gray-800 bg-white rounded-lg px-3 py-2.5 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors dark:placeholder:text-gray-600 placeholder:text-gray-400"
            value={modelInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={t("model.placeholder")}
          />
          {showDropdown && filtered.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 top-full mt-1 left-0 right-0 max-h-60 overflow-y-auto dark:bg-gray-800 bg-white border dark:border-gray-700 border-amber-200 rounded-lg shadow-lg"
            >
              {filtered.map((m, i) => {
                const display = displayName(m);
                const hasAlias = display !== m;
                return (
                  <button
                    key={m}
                    type="button"
                    onMouseDown={() => handleSelect(m)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      i === highlightIndex
                        ? "dark:bg-gray-700 bg-amber-100 dark:text-white text-gray-900"
                        : "dark:text-gray-300 text-gray-700 hover:dark:bg-gray-700 hover:bg-amber-50"
                    }`}
                  >
                    <span className={selectedModel === m ? "text-blue-500 font-medium" : ""}>
                      {display.length > 60 ? display.slice(0, 60) + "..." : display}
                    </span>
                    {hasAlias && (
                      <span className="ml-2 dark:text-gray-500 text-gray-400 text-xs">{m}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
