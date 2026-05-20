import { useEffect, useState } from "react";
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  fetchModels,
  ProviderData,
} from "../api/client";

const PROVIDER_TYPES = [
  { value: "openai_compat", label: "OpenAI Compatible" },
  { value: "sd_webui", label: "Stable Diffusion WebUI" },
  { value: "replicate", label: "Replicate" },
  { value: "custom", label: "Custom" },
];

const QUICK_TEMPLATES = [
  {
    label: "SiliconFlow", desc: "硅基流动 - 支持 FLUX / Kolors / SD 系列",
    fill: { name: "SiliconFlow", provider_type: "openai_compat" as const, base_url: "https://api.siliconflow.cn/v1" },
  },
  {
    label: "Together AI", desc: "Together AI - FLUX / SD / Playground 等",
    fill: { name: "Together AI", provider_type: "openai_compat" as const, base_url: "https://api.together.xyz/v1" },
  },
  {
    label: "Fireworks AI", desc: "Fireworks AI - FLUX / SD / 开源模型",
    fill: { name: "Fireworks AI", provider_type: "openai_compat" as const, base_url: "https://api.fireworks.ai/inference/v1" },
  },
  {
    label: "DeepSeek", desc: "DeepSeek - Janus-Pro 文生图",
    fill: { name: "DeepSeek", provider_type: "openai_compat" as const, base_url: "https://api.deepseek.com/v1" },
  },
];

const IMAGE_MODEL_KEYWORDS = [
  "flux", "sd", "stable-diffusion", "kolors", "dall-e", "dalle",
  "playground", "recraft", "pixart", "latent", "deepfloyd",
  "wukong", "cogview", "image", "sdxl", "turbo",
];

function isImageModel(id: string): boolean {
  const lower = id.toLowerCase();
  return IMAGE_MODEL_KEYWORDS.some((kw) => lower.includes(kw));
}

interface AliasRow {
  modelId: string;
  displayName: string;
  fetched: boolean;
}

function parseAliases(configStr: string): AliasRow[] {
  try {
    const cfg = JSON.parse(configStr);
    const aliases = cfg.model_aliases || {};
    return Object.entries(aliases).map(([modelId, displayName]) => ({
      modelId,
      displayName: displayName as string,
      fetched: false,
    }));
  } catch {
    return [];
  }
}

function buildConfigWithAliases(configStr: string, rows: AliasRow[]): string {
  try {
    const cfg = JSON.parse(configStr);
  } catch {
    const cfg: Record<string, unknown> = {};
  }
  const cfg = JSON.parse(configStr);
  const model_aliases: Record<string, string> = {};
  for (const r of rows) {
    if (r.modelId.trim()) {
      model_aliases[r.modelId.trim()] = r.displayName.trim() || r.modelId.trim();
    }
  }
  cfg.model_aliases = model_aliases;
  return JSON.stringify(cfg);
}

interface FormState {
  name: string;
  provider_type: string;
  base_url: string;
  api_key: string;
  config: string;
}

const emptyForm: FormState = {
  name: "",
  provider_type: "openai_compat",
  base_url: "",
  api_key: "",
  config: "{}",
};

interface Props {
  onProvidersChange?: () => void;
}

export default function Settings({ onProvidersChange }: Props) {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [aliasRows, setAliasRows] = useState<AliasRow[]>([]);
  const [fetching, setFetching] = useState(false);

  const loadProviders = async () => {
    try {
      const data = await listProviders();
      setProviders(data);
      onProvidersChange?.();
    } catch {
      setError("Failed to load providers");
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const finalConfig = editingId ? buildConfigWithAliases(form.config, aliasRows) : form.config;
    try {
      if (editingId) {
        await updateProvider(editingId, { ...form, config: finalConfig });
      } else {
        await createProvider(form);
      }
      setForm(emptyForm);
      setAliasRows([]);
      setEditingId(null);
      loadProviders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setError(msg);
    }
  };

  const handleEdit = async (p: ProviderData) => {
    let cfg = p.config;
    try {
      cfg = JSON.stringify(JSON.parse(cfg), null, 2);
    } catch {
      cfg = p.config;
    }
    setForm({
      name: p.name,
      provider_type: p.provider_type,
      base_url: p.base_url,
      api_key: p.api_key,
      config: cfg,
    });
    setEditingId(p.id);
    setAliasRows(parseAliases(p.config));
    setError("");
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await deleteProvider(id);
      loadProviders();
    } catch {
      setError("Failed to delete provider");
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setAliasRows([]);
    setEditingId(null);
    setError("");
  };

  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[number]) => {
    setForm({ ...emptyForm, ...tpl.fill });
    setAliasRows([]);
    setEditingId(null);
    setError("");
  };

  const handleFetchModels = async () => {
    if (!editingId) return;
    setFetching(true);
    try {
      const models = await fetchModels(editingId);
      const filtered = models.filter(isImageModel);
      const existingMap = new Map(aliasRows.map((r) => [r.modelId, r]));
      const merged = new Map<string, AliasRow>();
      for (const r of aliasRows) merged.set(r.modelId, r);
      for (const m of filtered) {
        if (!merged.has(m)) {
          merged.set(m, { modelId: m, displayName: m, fetched: true });
        }
      }
      setAliasRows(Array.from(merged.values()));
    } catch {
      setError("Failed to fetch models from API");
    } finally {
      setFetching(false);
    }
  };

  const addManualRow = () => {
    setAliasRows((prev) => [...prev, { modelId: "", displayName: "", fetched: false }]);
  };

  const updateAliasRow = (index: number, field: keyof AliasRow, value: string) => {
    setAliasRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeAliasRow = (index: number) => {
    setAliasRows((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Provider Settings</h2>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-6 text-sm text-red-200">{error}</div>
      )}

      <div className="bg-gray-900/60 rounded-lg p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Add</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => applyTemplate(tpl)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500/50 rounded-lg p-3 text-left transition-all"
            >
              <div className="font-medium text-sm text-gray-200">{tpl.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-8 space-y-4">
        <h3 className="text-lg font-semibold mb-2">{editingId ? "Edit Provider" : "Add Provider"}</h3>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Name</label>
          <input className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none transition-colors" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Stable Diffusion" required />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <select className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none transition-colors" value={form.provider_type} onChange={(e) => setForm({ ...form, provider_type: e.target.value })}>
            {PROVIDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Base URL</label>
          <input className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none transition-colors" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="http://localhost:7860" required />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">API Key (optional)</label>
          <input className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none transition-colors" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="sk-..." type="password" />
        </div>

        {editingId && (
          <div className="border-t border-gray-800 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-300">Model Aliases</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={fetching}
                  className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {fetching ? "Fetching..." : "Fetch from API"}
                </button>
                <button
                  type="button"
                  onClick={addManualRow}
                  className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Add Manual
                </button>
              </div>
            </div>

            {aliasRows.length === 0 ? (
              <p className="text-xs text-gray-500">Click "Fetch from API" to load image models, or add manually.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 text-xs text-gray-500 px-2">
                  <span className="flex-1">Model ID (sent to API)</span>
                  <span className="flex-1">Display Name (shown in UI)</span>
                  <span className="w-6" />
                </div>
                {aliasRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="flex-1 bg-gray-800 rounded px-2 py-1.5 text-xs text-gray-100 border border-gray-700 font-mono focus:border-blue-500 outline-none transition-colors"
                      value={row.modelId}
                      onChange={(e) => updateAliasRow(i, "modelId", e.target.value)}
                      readOnly={row.fetched}
                      placeholder="model-id"
                    />
                    <input
                      className="flex-1 bg-gray-800 rounded px-2 py-1.5 text-xs text-gray-100 border border-gray-700 focus:border-blue-500 outline-none transition-colors"
                      value={row.displayName}
                      onChange={(e) => updateAliasRow(i, "displayName", e.target.value)}
                      placeholder="My Model"
                    />
                    <button
                      type="button"
                      onClick={() => removeAliasRow(i)}
                      className="text-red-400 hover:text-red-300 text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-red-900/30 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!editingId && form.provider_type === "custom" && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Custom Config (JSON)</label>
            <textarea className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none font-mono text-xs transition-colors" rows={8} value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-medium transition-all">
            {editingId ? "Save" : "Add"}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancel} className="bg-gray-700 hover:bg-gray-600 px-5 py-2 rounded-lg font-medium transition-all">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {providers.length === 0 && <p className="text-gray-500 text-center py-8">No providers configured yet.</p>}
        {providers.map((p) => (
          <div key={p.id} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between hover:border-blue-500/30 border border-transparent transition-all">
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-gray-400">{p.provider_type} &middot; {p.base_url}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(p)} className="text-blue-400 hover:text-blue-300 text-sm transition-colors">Edit</button>
              <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
