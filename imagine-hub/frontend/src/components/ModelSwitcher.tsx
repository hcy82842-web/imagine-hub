import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (selectedProvider) {
      setModels([]);
      fetchModels(selectedProvider.id).then(setModels).catch(() => setModels([]));
    }
  }, [selectedProvider]);

  return (
    <div className="flex gap-4 items-center">
      <select
        className="bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 text-sm"
        value={selectedProvider?.id ?? ""}
        onChange={(e) => {
          const p = providers.find((x) => x.id === Number(e.target.value));
          if (p) onSelectProvider(p);
        }}
      >
        <option value="" disabled>
          Select Provider
        </option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        className="bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 text-sm"
        value={selectedModel}
        onChange={(e) => onSelectModel(e.target.value)}
        disabled={models.length === 0}
      >
        <option value="" disabled>
          {models.length === 0 ? "No models" : "Select Model"}
        </option>
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
