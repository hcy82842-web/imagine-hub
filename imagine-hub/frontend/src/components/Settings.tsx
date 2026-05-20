import { useEffect, useState } from "react";
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  ProviderData,
} from "../api/client";

const PROVIDER_TYPES = [
  { value: "openai_compat", label: "OpenAI Compatible" },
  { value: "sd_webui", label: "Stable Diffusion WebUI" },
  { value: "custom", label: "Custom" },
];

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
    try {
      if (editingId) {
        await updateProvider(editingId, form);
      } else {
        await createProvider(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      loadProviders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setError(msg);
    }
  };

  const handleEdit = (p: ProviderData) => {
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
    setEditingId(null);
    setError("");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Provider Settings</h2>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-6 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-8 space-y-4">
        <h3 className="text-lg font-semibold mb-2">
          {editingId ? "Edit Provider" : "Add Provider"}
        </h3>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Name</label>
          <input
            className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="My Stable Diffusion"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <select
            className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none"
            value={form.provider_type}
            onChange={(e) => setForm({ ...form, provider_type: e.target.value })}
          >
            {PROVIDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Base URL</label>
          <input
            className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none"
            value={form.base_url}
            onChange={(e) => setForm({ ...form, base_url: e.target.value })}
            placeholder="http://localhost:7860"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">API Key (optional)</label>
          <input
            className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none"
            value={form.api_key}
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            placeholder="sk-..."
            type="password"
          />
        </div>

        {form.provider_type === "custom" && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Custom Config (JSON)
            </label>
            <textarea
              className="w-full bg-gray-800 rounded px-3 py-2 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none font-mono text-xs"
              rows={8}
              value={form.config}
              onChange={(e) => setForm({ ...form, config: e.target.value })}
              placeholder='{"endpoint": "...", "method": "POST", "headers": {}, "request_template": "{}", "response_path": "data.0.url", "image_type": "url"}'
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
          >
            {editingId ? "Save" : "Add"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {providers.length === 0 && (
          <p className="text-gray-500 text-center py-8">No providers configured yet.</p>
        )}
        {providers.map((p) => (
          <div
            key={p.id}
            className="bg-gray-900 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-gray-400">
                {p.provider_type} &middot; {p.base_url}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(p)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
