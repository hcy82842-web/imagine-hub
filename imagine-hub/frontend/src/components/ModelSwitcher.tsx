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
  const [aliasMap, setAliasMap] = useState<AliasMap>({});

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

  const handleInputChange = (val: string) => {
    setModelInput(val);
    onSelectModel(val);
  };

  const allModelIds = Object.keys(aliasMap).length > 0 ? Object.keys(aliasMap) : models;

  const displayName = (modelId: string): string => {
    return aliasMap[modelId] || modelId;
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
            placeholder={t("model.placeholder")}
          />
        </div>
      </div>

      {allModelIds.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {allModelIds.slice(0, 12).map((m) => {
            const display = displayName(m);
            const hasAlias = display !== m;
            return (
              <button
                key={m}
                onClick={() => handleInputChange(m)}
                title={hasAlias ? m : undefined}
                className={`px-2.5 py-1 rounded text-xs border transition-all ${
                  selectedModel === m
                    ? "bg-blue-600/20 border-blue-500 text-blue-500"
                    : "dark:bg-gray-800 bg-amber-50 dark:border-gray-700 border-amber-200 dark:text-gray-400 text-gray-500 hover:dark:border-gray-500 hover:border-blue-300"
                }`}
              >
                {display.length > 30 ? display.slice(0, 30) + "..." : display}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
