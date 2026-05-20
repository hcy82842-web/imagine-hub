import { useEffect, useState, useRef } from "react";
import { fetchModels, ProviderData } from "../api/client";

interface Props {
  providers: ProviderData[];
  selectedProvider: ProviderData | null;
  selectedModel: string;
  onSelectProvider: (p: ProviderData) => void;
  onSelectModel: (m: string) => void;
}

export default function ModelSwitcher({
  providers,
  selectedProvider,
  selectedModel,
  onSelectProvider,
  onSelectModel,
}: Props) {
  const [models, setModels] = useState<string[]>([]);
  const [modelInput, setModelInput] = useState(selectedModel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedProvider) {
      setModels([]);
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 items-center">
        <select
          className="bg-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-100 border border-gray-700 focus:border-blue-500 outline-none transition-colors"
          value={selectedProvider?.id ?? ""}
          onChange={(e) => {
            const p = providers.find((x) => x.id === Number(e.target.value));
            if (p) onSelectProvider(p);
          }}
        >
          <option value="" disabled>Select Provider</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-100 border border-gray-700 focus:border-blue-500 outline-none transition-colors"
            value={modelInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Enter model name (e.g. black-forest-labs/FLUX.1-schnell)"
          />
        </div>
      </div>

      {models.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {models.slice(0, 10).map((m) => (
            <button
              key={m}
              onClick={() => handleInputChange(m)}
              className={`px-2.5 py-1 rounded text-xs border transition-all ${
                selectedModel === m
                  ? "bg-blue-600/20 border-blue-500 text-blue-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {m.length > 30 ? m.slice(0, 30) + "..." : m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
