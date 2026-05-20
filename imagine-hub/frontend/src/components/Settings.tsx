import { useEffect, useState } from "react";
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  fetchModels,
  ProviderData,
} from "../api/client";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { parseCurl, CurlParseResult } from "../utils/curlParser";
import { testConnection, TestResult } from "../api/client";
import { getFieldDescription } from "../i18n/fieldDescriptions";

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

interface CustomConfigFields {
  endpoint: string;
  method: string;
  headers: string;
  request_template: string;
  response_path: string;
  image_type: string;
  async_mode: boolean;
  task_id_path: string;
  poll_endpoint: string;
  poll_method: string;
  poll_field: string;
  poll_field_position: string;
  poll_status_path: string;
  poll_completed_values: string;
  poll_failed_values: string;
  poll_result_path: string;
  poll_result_type: string;
  poll_interval: number;
  max_polls: number;
}

const defaultCustomCustom: CustomConfigFields = {
  endpoint: "",
  method: "POST",
  headers: '{"Content-Type": "application/json"}',
  request_template: '{"prompt": "{{prompt}}"}',
  response_path: "data.0.url",
  image_type: "url",
  async_mode: false,
  task_id_path: "data.task_id",
  poll_endpoint: "",
  poll_method: "GET",
  poll_field: "task_id",
  poll_field_position: "query",
  poll_status_path: "data.status",
  poll_completed_values: '["completed","success","succeeded"]',
  poll_failed_values: '["failed","error"]',
  poll_result_path: "data.0.url",
  poll_result_type: "url",
  poll_interval: 2.0,
  max_polls: 150,
};

function parseCustomConfig(configStr: string): CustomConfigFields {
  try {
    const cfg = JSON.parse(configStr);
    const { model_aliases: _, ...rest } = cfg;
    return {
      endpoint: rest.endpoint || "",
      method: rest.method || "POST",
      headers: typeof rest.headers === "object" ? JSON.stringify(rest.headers, null, 2) : (rest.headers || defaultCustomCustom.headers),
      request_template: rest.request_template || defaultCustomCustom.request_template,
      response_path: rest.response_path || "data.0.url",
      image_type: rest.image_type || "url",
      async_mode: !!rest.async_mode,
      task_id_path: rest.task_id_path || "data.task_id",
      poll_endpoint: rest.poll_endpoint || "",
      poll_method: rest.poll_method || "GET",
      poll_field: rest.poll_field || "task_id",
      poll_field_position: rest.poll_field_position || "query",
      poll_status_path: rest.poll_status_path || "data.status",
      poll_completed_values: JSON.stringify(rest.poll_completed_values || ["completed", "success", "succeeded"]),
      poll_failed_values: JSON.stringify(rest.poll_failed_values || ["failed", "error"]),
      poll_result_path: rest.poll_result_path || "data.0.url",
      poll_result_type: rest.poll_result_type || "url",
      poll_interval: rest.poll_interval ?? 2.0,
      max_polls: rest.max_polls ?? 150,
    };
  } catch {
    return { ...defaultCustomCustom };
  }
}

function buildCustomConfig(fields: CustomConfigFields, aliasRows: AliasRow[]): string {
  const cfg: Record<string, unknown> = {};
  if (fields.endpoint) cfg.endpoint = fields.endpoint;
  cfg.method = fields.method;
  try { cfg.headers = JSON.parse(fields.headers); } catch { cfg.headers = fields.headers; }
  cfg.request_template = fields.request_template;
  cfg.response_path = fields.response_path;
  cfg.image_type = fields.image_type;
  if (fields.async_mode) {
    cfg.async_mode = true;
    cfg.task_id_path = fields.task_id_path;
    if (fields.poll_endpoint) cfg.poll_endpoint = fields.poll_endpoint;
    cfg.poll_method = fields.poll_method;
    cfg.poll_field = fields.poll_field;
    cfg.poll_field_position = fields.poll_field_position;
    cfg.poll_status_path = fields.poll_status_path;
    try { cfg.poll_completed_values = JSON.parse(fields.poll_completed_values); } catch { cfg.poll_completed_values = fields.poll_completed_values; }
    try { cfg.poll_failed_values = JSON.parse(fields.poll_failed_values); } catch { cfg.poll_failed_values = fields.poll_failed_values; }
    cfg.poll_result_path = fields.poll_result_path;
    cfg.poll_result_type = fields.poll_result_type;
    cfg.poll_interval = fields.poll_interval;
    cfg.max_polls = fields.max_polls;
  }
  const model_aliases: Record<string, string> = {};
  for (const r of aliasRows) {
    if (r.modelId.trim()) model_aliases[r.modelId.trim()] = r.displayName.trim() || r.modelId.trim();
  }
  if (Object.keys(model_aliases).length > 0) cfg.model_aliases = model_aliases;
  return JSON.stringify(cfg, null, 2);
}

function suggestPollEndpoint(endpoint: string): string {
  if (!endpoint) return "";
  const ep = endpoint.replace(/\/+$/, "");
  const parts = ep.split("/");
  if (parts.length <= 1) return "";
  parts.pop();
  return parts.join("/") + "/task-result";
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

function HelpTip({ fieldKey }: { fieldKey: string }) {
  const desc = getFieldDescription(fieldKey);
  if (!desc) return null;
  return (
    <span className="group relative inline-flex ml-1.5 cursor-help align-middle">
      <span className="dark:text-gray-500 text-gray-400 text-xs leading-none">&#9432;</span>
      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 rounded-lg text-xs leading-relaxed dark:bg-gray-700 bg-white dark:text-gray-200 text-gray-700 shadow-lg border dark:border-gray-600 border-amber-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none min-w-[220px] max-w-xs whitespace-normal">
        {desc}
      </div>
    </span>
  );
}

export default function Settings({ onProvidersChange }: Props) {
  const { t, lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [aliasRows, setAliasRows] = useState<AliasRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [curlInput, setCurlInput] = useState("");
  const [parseError, setParseError] = useState("");
  const [parseResult, setParseResult] = useState<CurlParseResult | null>(null);
  const [curlOpen, setCurlOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [customCfg, setCustomCfg] = useState<CustomConfigFields>(defaultCustomCustom);
  const [defaultPrompt, setDefaultPrompt] = useState(() => localStorage.getItem("imagine_default_prompt") || "");
  const [showPrefixInHistory, setShowPrefixInHistory] = useState(() => localStorage.getItem("imagine_show_prefix_in_history") !== "false");
  const [genStrategy, setGenStrategy] = useState(() => localStorage.getItem("imagine_gen_strategy") || "single_call");
  const [defaultSize, setDefaultSize] = useState(() => localStorage.getItem("imagine_default_size") || "1920x1080");
  const [defaultQuality, setDefaultQuality] = useState(() => localStorage.getItem("imagine_default_quality") || "hd");
  const [defaultN, setDefaultN] = useState(() => parseInt(localStorage.getItem("imagine_default_n") || "1"));

  const getProviderTypes = () => [
    { value: "openai_compat", label: t("type.openai_compat") },
    { value: "sd_webui", label: t("type.sd_webui") },
    { value: "replicate", label: t("type.replicate") },
    { value: "custom", label: t("type.custom") },
  ];

  const getQuickTemplates = () => [
    { label: "SiliconFlow", desc: t("quick.siliconflow"), fill: { name: "SiliconFlow", provider_type: "openai_compat" as const, base_url: "https://api.siliconflow.cn/v1" } },
    { label: "Together AI", desc: t("quick.togetherai"), fill: { name: "Together AI", provider_type: "openai_compat" as const, base_url: "https://api.together.xyz/v1" } },
    { label: "Fireworks AI", desc: t("quick.fireworks"), fill: { name: "Fireworks AI", provider_type: "openai_compat" as const, base_url: "https://api.fireworks.ai/inference/v1" } },
    { label: "DeepSeek", desc: t("quick.deepseek"), fill: { name: "DeepSeek", provider_type: "openai_compat" as const, base_url: "https://api.deepseek.com/v1" } },
  ];

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const cfg = form.provider_type === "custom" ? buildCustomConfig(customCfg, aliasRows) : form.config;
      const result = await testConnection({
        provider_type: form.provider_type,
        base_url: form.base_url,
        api_key: form.api_key,
        config: cfg,
      });
      setTestResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestResult({ success: false, steps: [{ name: "error", ok: false, detail: msg, ms: 0 }], total_ms: 0 });
    } finally {
      setTesting(false);
    }
  };

  const handleTestSaved = async (p: ProviderData) => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection({
        provider_type: p.provider_type,
        base_url: p.base_url,
        api_key: p.api_key,
        config: p.config,
      });
      setTestResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestResult({ success: false, steps: [{ name: "error", ok: false, detail: msg, ms: 0 }], total_ms: 0 });
    } finally {
      setTesting(false);
    }
  };

  const handleParseCurl = () => {
    setParseError("");
    setParseResult(null);
    const result = parseCurl(curlInput);
    if ("error" in result) {
      const key = result.error === "NO_URL" ? "curl.err_no_url" : "curl.err_bad_url";
      setParseError(t(key));
      return;
    }
    setParseResult(result);
    setForm({
      name: result.name,
      provider_type: result.provider_type,
      base_url: result.base_url,
      api_key: result.api_key,
      config: result.config,
    });
    if (result.provider_type === "custom") {
      setCustomCfg(parseCustomConfig(result.config));
    }
    setEditingId(null);
    setAliasRows([]);
  };

  const loadProviders = async () => {
    try {
      const data = await listProviders();
      setProviders(data);
      onProvidersChange?.();
    } catch {
      setError(t("settings.load_failed"));
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const updateCustomField = <K extends keyof CustomConfigFields>(key: K, value: CustomConfigFields[K]) => {
    const next = { ...customCfg, [key]: value };
    setCustomCfg(next);
    setForm((prev) => ({ ...prev, config: buildCustomConfig(next, aliasRows) }));
  };

  useEffect(() => {
    if (customCfg.async_mode && !customCfg.poll_endpoint && customCfg.endpoint) {
      const suggested = suggestPollEndpoint(customCfg.endpoint);
      if (suggested) {
        updateCustomField("poll_endpoint", suggested);
      }
    }
  }, [customCfg.endpoint, customCfg.async_mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    let finalConfig = form.config;
    if (form.provider_type === "custom") {
      finalConfig = buildCustomConfig(customCfg, aliasRows);
    } else if (editingId) {
      const cfg = JSON.parse(form.config);
      const model_aliases: Record<string, string> = {};
      for (const r of aliasRows) {
        if (r.modelId.trim()) model_aliases[r.modelId.trim()] = r.displayName.trim() || r.modelId.trim();
      }
      cfg.model_aliases = model_aliases;
      finalConfig = JSON.stringify(cfg);
    }
    try {
      if (editingId) {
        await updateProvider(editingId, { ...form, config: finalConfig });
      } else {
        await createProvider(form);
      }
      setForm(emptyForm);
      setCustomCfg(defaultCustomCustom);
      setAliasRows([]);
      setEditingId(null);
      loadProviders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setError(msg);
    }
  };

  const handleEdit = async (p: ProviderData) => {
    setForm({
      name: p.name,
      provider_type: p.provider_type,
      base_url: p.base_url,
      api_key: p.api_key,
      config: p.config,
    });
    if (p.provider_type === "custom") {
      setCustomCfg(parseCustomConfig(p.config));
    }
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
      setError(t("settings.delete_failed"));
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setCustomCfg(defaultCustomCustom);
    setAliasRows([]);
    setEditingId(null);
    setError("");
  };

  const applyTemplate = (tpl: ReturnType<typeof getQuickTemplates>[number]) => {
    setForm({ ...emptyForm, ...tpl.fill });
    setCustomCfg(defaultCustomCustom);
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
      const merged = new Map<string, AliasRow>();
      for (const r of aliasRows) merged.set(r.modelId, r);
      for (const m of filtered) {
        if (!merged.has(m)) merged.set(m, { modelId: m, displayName: m, fetched: true });
      }
      setAliasRows(Array.from(merged.values()));
    } catch {
      setError(t("settings.fetch_failed"));
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

  const inpCls = "w-full dark:bg-gray-800 bg-amber-50 rounded px-3 py-2 dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors";
  const selCls = "w-full dark:bg-gray-800 bg-amber-50 rounded px-3 py-2 dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors";
  const lblCls = "block text-sm dark:text-gray-400 text-gray-500 mb-1";

  const stepLabel = (name: string): string => {
    const key = `test.step_${name}`;
    const label = t(key);
    return label !== key ? label : name;
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 dark:text-gray-100 text-gray-800">{t("settings.title")}</h2>

      {error && (
        <div className="dark:bg-red-900/50 bg-red-100 border dark:border-red-700 border-red-300 rounded-lg p-3 mb-6 text-sm dark:text-red-200 text-red-700">{error}</div>
      )}

      <div className="dark:bg-gray-900/60 bg-amber-100/50 rounded-lg p-6 mb-6 border dark:border-gray-800 border-amber-200">
        <h3 className="text-lg font-semibold mb-4 dark:text-gray-100 text-gray-800">{t("preferences.title")}</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex items-center gap-3">
            <label className="text-sm dark:text-gray-400 text-gray-500 min-w-16">{t("preferences.language")}</label>
            <select value={lang} onChange={(e) => setLang(e.target.value as "zh" | "en")}
              className="dark:bg-gray-800 bg-white rounded-lg px-3 py-2 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors">
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm dark:text-gray-400 text-gray-500 min-w-16">{t("preferences.theme")}</label>
            <div className="flex gap-1 dark:bg-gray-800 bg-amber-50 rounded-lg p-1 border dark:border-gray-700 border-amber-200">
              {(["dark", "light", "system"] as const).map((tval) => (
                <button key={tval} onClick={() => setTheme(tval)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${theme === tval ? "bg-blue-600 text-white shadow-sm" : "dark:text-gray-400 text-gray-500 hover:dark:text-gray-200 hover:text-gray-700"}`}>
                  {tval === "dark" ? t("preferences.dark") : tval === "light" ? t("preferences.light") : t("preferences.system")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 space-y-4 border-t dark:border-gray-800 border-amber-200 pt-5">
          <div>
            <label className="text-sm dark:text-gray-400 text-gray-500 mb-1.5 flex items-center gap-1">
              {t("preferences.default_prompt")}
              <HelpTip fieldKey="default_prompt" />
            </label>
            <textarea
              className="w-full dark:bg-gray-800 bg-white rounded-lg px-3 py-2 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors font-mono"
              rows={3}
              value={defaultPrompt}
              onChange={(e) => { setDefaultPrompt(e.target.value); localStorage.setItem("imagine_default_prompt", e.target.value); }}
              placeholder={t("preferences.default_prompt_placeholder")}
            />
            <p className="text-[10px] dark:text-gray-500 text-gray-400 mt-1">{t("preferences.default_prompt_hint")}</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded dark:bg-gray-800 bg-amber-50 border dark:border-gray-700 border-amber-200"
              checked={showPrefixInHistory}
              onChange={(e) => { setShowPrefixInHistory(e.target.checked); localStorage.setItem("imagine_show_prefix_in_history", String(e.target.checked)); }}
            />
            <span className="text-sm dark:text-gray-300 text-gray-600">{t("preferences.show_prefix_in_history")}</span>
          </label>
          <div className="border-t dark:border-gray-800 border-amber-200 pt-4">
            <label className="text-sm dark:text-gray-400 text-gray-500 mb-3 block">{t("preferences.default_params")}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] dark:text-gray-500 text-gray-400 mb-1 block">{t("param_label_size")}</label>
                <select value={defaultSize} onChange={(e) => { setDefaultSize(e.target.value); localStorage.setItem("imagine_default_size", e.target.value); }}
                  className="w-full dark:bg-gray-800 bg-white rounded-lg px-3 py-2 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors">
                  {["256x256","512x512","768x768","1024x1024","1536x1536","768x1024","768x1360","1024x1360","1024x1792","1024x768","1360x768","1360x1024","1792x1024","1536x640","1920x1080"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] dark:text-gray-500 text-gray-400 mb-1 block">{t("param_label_quality")}</label>
                <select value={defaultQuality} onChange={(e) => { setDefaultQuality(e.target.value); localStorage.setItem("imagine_default_quality", e.target.value); }}
                  className="w-full dark:bg-gray-800 bg-white rounded-lg px-3 py-2 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors">
                  <option value="standard">standard</option>
                  <option value="hd">hd</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] dark:text-gray-500 text-gray-400 mb-1 block">{t("param_label_n")}</label>
                <input type="number" min={1} value={defaultN} onChange={(e) => { const v = parseInt(e.target.value) || 1; setDefaultN(v); localStorage.setItem("imagine_default_n", String(v)); }}
                  className="w-full dark:bg-gray-800 bg-white rounded-lg px-3 py-2 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors" />
              </div>
            </div>
            <p className="text-[10px] dark:text-gray-500 text-gray-400 mt-2">{t("preferences.default_params_hint")}</p>
          </div>
          <div>
            <label className="text-sm dark:text-gray-400 text-gray-500 mb-2 flex items-center gap-1">
              {t("preferences.gen_strategy")}
              <HelpTip fieldKey="gen_strategy" />
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${genStrategy === "single_call" ? "dark:bg-blue-900/20 bg-blue-100/50 border-blue-400/50" : "dark:bg-gray-800/50 bg-amber-50/50"} border dark:border-gray-700 border-amber-200 mb-2`}>
              <input type="radio" name="genStrategy" value="single_call" checked={genStrategy === "single_call"} onChange={() => { setGenStrategy("single_call"); localStorage.setItem("imagine_gen_strategy", "single_call"); }} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium dark:text-gray-200 text-gray-700">{t("preferences.gen_strategy_single")}</div>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${genStrategy === "multi_call" ? "dark:bg-blue-900/20 bg-blue-100/50 border-blue-400/50" : "dark:bg-gray-800/50 bg-amber-50/50"} border dark:border-gray-700 border-amber-200`}>
              <input type="radio" name="genStrategy" value="multi_call" checked={genStrategy === "multi_call"} onChange={() => { setGenStrategy("multi_call"); localStorage.setItem("imagine_gen_strategy", "multi_call"); }} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium dark:text-gray-200 text-gray-700">{t("preferences.gen_strategy_multi")}</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="dark:bg-gray-900/60 bg-amber-100/50 rounded-lg p-5 mb-6 border dark:border-gray-800 border-amber-200">
        <button onClick={() => setCurlOpen(!curlOpen)} className="flex items-center gap-2 w-full text-left">
          <svg className={`w-3 h-3 dark:text-gray-300 text-gray-600 transition-transform duration-200 ${curlOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h3 className="text-sm font-semibold dark:text-gray-300 text-gray-600">{t("curl.title")}</h3>
        </button>
        {curlOpen && (
          <div className="mt-3 space-y-3 animate-slide-up">
            <p className="text-xs dark:text-gray-500 text-gray-400">{t("curl.hint")}</p>
            <textarea
              className="w-full dark:bg-gray-800 bg-white rounded-lg px-3 py-2.5 dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none font-mono text-xs transition-colors"
              rows={6}
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder={'curl --request POST \\\n  --url https://api.example.com/v1/generate \\\n  --header \'Authorization: Bearer <token>\' \\\n  --header \'Content-Type: application/json\' \\\n  --data \'{"prompt": "<string>"}\''}
            />
            {parseError && <div className="text-xs dark:text-red-400 text-red-500">{parseError}</div>}
            <button type="button" onClick={handleParseCurl} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg transition-all">
              {t("curl.parse")}
            </button>
            {parseResult && (
              <div className="dark:bg-gray-800 bg-amber-50 rounded-lg p-3 text-xs space-y-1 border dark:border-gray-700 border-amber-200">
                <div className="font-semibold dark:text-gray-200 text-gray-700 mb-1">{t("curl.detected")}</div>
                <div className="dark:text-gray-400 text-gray-500">
                  {t("curl.provider_type")}: <span className="dark:text-gray-200 text-gray-700 font-mono">{t(`type.${parseResult.provider_type}`)}</span>
                </div>
                <div className="dark:text-gray-400 text-gray-500">
                  {t("curl.base_url")}: <span className="dark:text-gray-200 text-gray-700 font-mono">{parseResult.base_url}</span>
                </div>
                <div className="dark:text-gray-400 text-gray-500">
                  {t("curl.endpoint")}: <span className="dark:text-gray-200 text-gray-700 font-mono">{parseResult.detected.endpoint}</span>
                </div>
                <div className="dark:text-gray-400 text-gray-500">
                  {t("curl.method")}: <span className="dark:text-gray-200 text-gray-700">{parseResult.detected.method}</span>
                </div>
                <div className="dark:text-gray-400 text-gray-500">
                  {t("curl.auth")}: <span className={parseResult.detected.hasAuth ? "text-green-400" : "dark:text-gray-500 text-gray-400"}>
                    {parseResult.detected.hasAuth ? t("curl.auth_found") : t("curl.auth_missing")}
                  </span>
                </div>
                {parseResult.detected.promptField && (
                  <div className="dark:text-gray-400 text-gray-500">
                    {t("curl.prompt_field")}: <span className="dark:text-green-400 text-green-600 font-mono">"{parseResult.detected.promptField}"</span>
                  </div>
                )}
                {parseResult.detected.isAsync && (
                  <div className="dark:text-blue-400 text-blue-600">{t("curl.async_detected")}</div>
                )}
                <div className="dark:text-amber-400 text-amber-600 mt-1">{t("curl.defaults_warn")}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="dark:bg-gray-900/60 bg-amber-100/50 rounded-lg p-5 mb-8 border dark:border-gray-800 border-amber-200">
        <h3 className="text-sm font-semibold dark:text-gray-300 text-gray-600 mb-3">{t("settings.quick_add")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {getQuickTemplates().map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => applyTemplate(tpl)}
              className="dark:bg-gray-800 bg-white dark:hover:bg-gray-700 hover:bg-amber-50 border dark:border-gray-700 border-amber-200 dark:hover:border-blue-500/50 hover:border-blue-400/50 rounded-lg p-3 text-left transition-all"
            >
              <div className="font-medium text-sm dark:text-gray-200 text-gray-700">{tpl.label}</div>
              <div className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="dark:bg-gray-900 bg-white rounded-lg p-6 mb-8 space-y-4 border dark:border-gray-800 border-amber-200">
        <h3 className="text-lg font-semibold dark:text-gray-100 text-gray-800">{editingId ? t("settings.edit") : t("settings.add")}</h3>

        <div>
          <label className={lblCls}>{t("settings.name")}<HelpTip fieldKey="name" /></label>
          <input className={inpCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Provider" required />
        </div>

        <div>
          <label className={lblCls}>{t("settings.type")}</label>
          <select className={selCls} value={form.provider_type} onChange={(e) => {
            setForm({ ...form, provider_type: e.target.value });
            if (e.target.value === "custom") {
              setCustomCfg(parseCustomConfig(form.config));
            }
          }}>
            {getProviderTypes().map((pt) => (
              <option key={pt.value} value={pt.value}>{pt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={lblCls}>{t("settings.base_url")}<HelpTip fieldKey="base_url" /></label>
          <input className={inpCls} value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="http://localhost:7860" required />
        </div>

        <div>
          <label className={lblCls}>{t("settings.api_key")}<HelpTip fieldKey="api_key" /></label>
          <input className={inpCls} value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="sk-..." type="password" />
        </div>

        {form.provider_type === "custom" && (
          <div className="border-t dark:border-gray-800 border-amber-200 pt-4 mt-2 space-y-4">
            <h4 className="text-sm font-semibold dark:text-gray-300 text-gray-600">{t("settings.custom_config")}</h4>

            <div>
              <label className={lblCls}>{t("field.endpoint")}<HelpTip fieldKey="endpoint" /></label>
              <input className={inpCls} value={customCfg.endpoint} onChange={(e) => updateCustomField("endpoint", e.target.value)} placeholder="/v3/async/grok-imagine-image-t2i" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lblCls}>{t("field.method")}<HelpTip fieldKey="method" /></label>
                <select className={selCls} value={customCfg.method} onChange={(e) => updateCustomField("method", e.target.value)}>
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              <div>
                <label className={lblCls}>{t("field.image_type")}<HelpTip fieldKey="image_type" /></label>
                <select className={selCls} value={customCfg.image_type} onChange={(e) => updateCustomField("image_type", e.target.value)}>
                  <option value="url">url</option>
                  <option value="base64">base64</option>
                </select>
              </div>
            </div>

            <div>
              <label className={lblCls}>{t("field.headers")}<HelpTip fieldKey="headers" /></label>
              <textarea className={inpCls + " font-mono text-xs"} rows={2} value={customCfg.headers} onChange={(e) => updateCustomField("headers", e.target.value)} />
              <p className="text-[10px] dark:text-gray-500 text-gray-400 mt-0.5">{t("field.headers_json_tip")}</p>
            </div>

            <div>
              <label className={lblCls}>{t("field.request_template")}<HelpTip fieldKey="request_template" /></label>
              <textarea className={inpCls + " font-mono text-xs"} rows={3} value={customCfg.request_template} onChange={(e) => updateCustomField("request_template", e.target.value)} />
              <p className="text-[10px] dark:text-gray-500 text-gray-400 mt-0.5">{t("field.template_hint")}</p>
            </div>

            <div>
              <label className={lblCls}>{t("field.response_path")}<HelpTip fieldKey="response_path" /></label>
              <input className={inpCls} value={customCfg.response_path} onChange={(e) => updateCustomField("response_path", e.target.value)} placeholder="data.0.url" />
            </div>

            <div className="border-t dark:border-gray-800 border-amber-200 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded dark:bg-gray-800 bg-amber-50 border dark:border-gray-700 border-amber-200" checked={customCfg.async_mode} onChange={(e) => updateCustomField("async_mode", e.target.checked)} />
                <span className="text-sm dark:text-gray-300 text-gray-600">{t("field.async_mode")}<HelpTip fieldKey="async_mode" /></span>
              </label>
            </div>

            {customCfg.async_mode && (
              <div className="space-y-4 ml-2 pl-4 border-l-2 dark:border-blue-500/30 border-blue-300/50">
                <div>
                  <label className={lblCls}>{t("field.poll_endpoint")}<HelpTip fieldKey="poll_endpoint" /></label>
                  <input className={inpCls} value={customCfg.poll_endpoint} onChange={(e) => updateCustomField("poll_endpoint", e.target.value)} placeholder="/v3/async/task-result" />
                  {suggestPollEndpoint(customCfg.endpoint) && !customCfg.poll_endpoint && (
                    <p className="text-[10px] dark:text-blue-400 text-blue-500 mt-0.5">&#9889; {t("field.endpoint")} → {suggestPollEndpoint(customCfg.endpoint)}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lblCls}>{t("field.poll_method")}<HelpTip fieldKey="poll_method" /></label>
                    <select className={selCls} value={customCfg.poll_method} onChange={(e) => updateCustomField("poll_method", e.target.value)}>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </div>
                  <div>
                    <label className={lblCls}>{t("field.poll_field_position")}<HelpTip fieldKey="poll_field_position" /></label>
                    <select className={selCls} value={customCfg.poll_field_position} onChange={(e) => updateCustomField("poll_field_position", e.target.value)}>
                      <option value="query">query</option>
                      <option value="path">path</option>
                      <option value="body">body</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={lblCls}>{t("field.poll_field")}<HelpTip fieldKey="poll_field" /></label>
                  <input className={inpCls} value={customCfg.poll_field} onChange={(e) => updateCustomField("poll_field", e.target.value)} placeholder="task_id" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lblCls}>{t("field.poll_status_path")}<HelpTip fieldKey="poll_status_path" /></label>
                    <input className={inpCls} value={customCfg.poll_status_path} onChange={(e) => updateCustomField("poll_status_path", e.target.value)} placeholder="data.status" />
                  </div>
                  <div>
                    <label className={lblCls}>{t("field.task_id_path")}<HelpTip fieldKey="task_id_path" /></label>
                    <input className={inpCls} value={customCfg.task_id_path} onChange={(e) => updateCustomField("task_id_path", e.target.value)} placeholder="data.task_id" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lblCls}>{t("field.poll_result_path")}<HelpTip fieldKey="poll_result_path" /></label>
                    <input className={inpCls} value={customCfg.poll_result_path} onChange={(e) => updateCustomField("poll_result_path", e.target.value)} placeholder="data.0.url" />
                  </div>
                  <div>
                    <label className={lblCls}>{t("field.poll_result_type")}<HelpTip fieldKey="poll_result_type" /></label>
                    <select className={selCls} value={customCfg.poll_result_type} onChange={(e) => updateCustomField("poll_result_type", e.target.value)}>
                      <option value="url">url</option>
                      <option value="base64">base64</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lblCls}>{t("field.poll_interval")}<HelpTip fieldKey="poll_interval" /></label>
                    <input type="number" step={0.5} min={0.5} max={30} className={inpCls} value={customCfg.poll_interval} onChange={(e) => updateCustomField("poll_interval", parseFloat(e.target.value) || 2)} />
                  </div>
                  <div>
                    <label className={lblCls}>{t("field.max_polls")}<HelpTip fieldKey="max_polls" /></label>
                    <input type="number" min={1} max={600} className={inpCls} value={customCfg.max_polls} onChange={(e) => updateCustomField("max_polls", parseInt(e.target.value) || 150)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lblCls}>{t("field.poll_completed_values")}<HelpTip fieldKey="poll_completed_values" /></label>
                    <input className={inpCls + " font-mono text-xs"} value={customCfg.poll_completed_values} onChange={(e) => updateCustomField("poll_completed_values", e.target.value)} />
                  </div>
                  <div>
                    <label className={lblCls}>{t("field.poll_failed_values")}<HelpTip fieldKey="poll_failed_values" /></label>
                    <input className={inpCls + " font-mono text-xs"} value={customCfg.poll_failed_values} onChange={(e) => updateCustomField("poll_failed_values", e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(editingId || form.provider_type !== "custom") && (
          <div className="border-t dark:border-gray-800 border-amber-200 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold dark:text-gray-300 text-gray-600">{t("settings.model_aliases")}</label>
              {editingId && (
                <div className="flex gap-2">
                  <button type="button" onClick={handleFetchModels} disabled={fetching}
                    className="text-xs dark:bg-gray-700 bg-amber-100 dark:hover:bg-gray-600 hover:bg-amber-200 dark:text-gray-200 text-gray-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                    {fetching ? t("settings.fetching") : t("settings.fetch_models")}
                  </button>
                  <button type="button" onClick={addManualRow}
                    className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-500 px-3 py-1.5 rounded-lg transition-colors">
                    {t("settings.add_manual")}
                  </button>
                </div>
              )}
            </div>
            {aliasRows.length === 0 ? (
              <p className="text-xs dark:text-gray-500 text-gray-400">{t("settings.fetch_hint")}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 text-xs dark:text-gray-500 text-gray-400 px-2">
                  <span className="flex-1">{t("settings.model_id")}<HelpTip fieldKey="model_id" /></span>
                  <span className="flex-1">{t("settings.display_name")}<HelpTip fieldKey="display_name" /></span>
                  <span className="w-6" />
                </div>
                {aliasRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className="flex-1 dark:bg-gray-800 bg-amber-50 rounded px-2 py-1.5 text-xs dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 font-mono focus:border-blue-500 outline-none transition-colors"
                      value={row.modelId} onChange={(e) => updateAliasRow(i, "modelId", e.target.value)}
                      readOnly={row.fetched} placeholder="model-id" />
                    <input className="flex-1 dark:bg-gray-800 bg-amber-50 rounded px-2 py-1.5 text-xs dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors"
                      value={row.displayName} onChange={(e) => updateAliasRow(i, "displayName", e.target.value)} placeholder={t("settings.display_name")} />
                    <button type="button" onClick={() => removeAliasRow(i)}
                      className="text-red-400 hover:text-red-300 text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-red-900/30 transition-colors">&#10005;</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2 flex-wrap">
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-medium text-white transition-all">
            {editingId ? t("settings.save") : t("settings.add")}
          </button>
          <button type="button" onClick={handleTestConnection} disabled={testing || !form.base_url}
            className="dark:bg-gray-700 bg-amber-100 dark:hover:bg-gray-600 hover:bg-amber-200 dark:text-gray-200 text-gray-700 disabled:opacity-40 px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
            {testing ? <><span className="inline-block w-3.5 h-3.5 border-2 border-gray-400 border-t-gray-200 rounded-full animate-spin" /> {t("test.testing")}</> : t("test.button")}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancel} className="dark:bg-gray-700 bg-amber-200 dark:hover:bg-gray-600 hover:bg-amber-300 dark:text-gray-200 text-gray-700 px-5 py-2 rounded-lg font-medium transition-all">
              {t("settings.cancel")}
            </button>
          )}
        </div>

        {testResult && (
          <div className="dark:bg-gray-800 bg-amber-50 rounded-lg p-3 text-xs border dark:border-gray-700 border-amber-200 space-y-1.5 mt-2">
            <div className="flex items-center gap-2 font-semibold dark:text-gray-200 text-gray-700">
              {testResult.success
                ? <span className="text-green-400">&#10003; {t("test.ok")}</span>
                : <span className="text-red-400">&#10007; {t("test.fail")}</span>}
              <span className="dark:text-gray-500 text-gray-400 font-normal">({testResult.total_ms}ms)</span>
            </div>
            {testResult.steps.map((step) => (
              <div key={step.name} className="flex items-start gap-2">
                {step.ok === true && <span className="text-green-400 mt-0.5">&#10003;</span>}
                {step.ok === false && <span className="text-red-400 mt-0.5">&#10007;</span>}
                {step.ok === null && <span className="dark:text-gray-500 text-gray-400 mt-0.5">&mdash;</span>}
                <span className="dark:text-gray-300 text-gray-600 min-w-16 font-medium">{stepLabel(step.name)}</span>
                <span className={step.ok === false ? "dark:text-red-300 text-red-500" : "dark:text-gray-400 text-gray-500"}>{step.detail}</span>
                <span className="dark:text-gray-500 text-gray-400 ml-auto">{step.ms}ms</span>
              </div>
            ))}
          </div>
        )}
      </form>

      <div className="space-y-3 mb-10">
        {providers.length === 0 && <p className="dark:text-gray-500 text-gray-400 text-center py-8">{t("settings.no_providers")}</p>}
        {providers.map((p) => (
          <div key={p.id} className="dark:bg-gray-900 bg-white rounded-lg p-4 flex items-center justify-between dark:hover:border-blue-500/30 hover:border-blue-400/30 border dark:border-gray-800 border-amber-200 transition-all">
            <div>
              <div className="font-semibold dark:text-gray-100 text-gray-800">{p.name}</div>
              <div className="text-sm dark:text-gray-400 text-gray-500">{p.provider_type} &middot; {p.base_url}</div>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => handleTestSaved(p)} className="dark:text-gray-400 text-gray-500 hover:text-blue-400 text-xs transition-colors" title={t("test.button")}>{t("provider.test")}</button>
              <button onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-400 text-sm transition-colors">{t("settings.edit")}</button>
              <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors">{t("provider.delete")}</button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
