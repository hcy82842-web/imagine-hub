import { useEffect, useState } from "react";
import Settings from "./components/Settings";
import HistoryList from "./components/HistoryList";
import ModelSwitcher from "./components/ModelSwitcher";
import ParamPanel from "./components/ParamPanel";
import ChatInput from "./components/ChatInput";
import ImageDisplay from "./components/ImageDisplay";
import ToastContainer, { showToast } from "./components/Toast";
import { listProviders, generateImage, getNetworkInfo, ProviderData, GenerateResult } from "./api/client";
import { useLang } from "./contexts/LanguageContext";

type Page = "home" | "history" | "settings";

interface DebugInfo {
  nRequested: number;
  nReceived: number;
  strategy: string;
  apiCalls: number;
  rateLimitInfo: Record<string, string>;
}

interface GenSlot {
  id: string;
  selectedProvider: ProviderData | null;
  selectedModel: string;
  genParams: Record<string, unknown>;
  imagesBase64: string[];
  mediaType: string;
  loading: boolean;
  errorMsg: string | null;
  lastPrompt: string;
  genDebug: DebugInfo | null;
  collapsed: boolean;
}

function getDefaultParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const size = localStorage.getItem("imagine_default_size");
  const quality = localStorage.getItem("imagine_default_quality");
  const n = localStorage.getItem("imagine_default_n");
  if (size) params.size = size;
  if (quality) params.quality = quality;
  if (n) params.n = parseInt(n);
  return params;
}

function App() {
  const { t } = useLang();
  const [page, setPage] = useState<Page>("home");
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [slots, setSlots] = useState<GenSlot[]>([]);
  const [nextSlotId, setNextSlotId] = useState(1);
  const [lanUrl, setLanUrl] = useState("");

  useEffect(() => {
    getNetworkInfo().then((info) => setLanUrl(info.lan_url)).catch(() => {});
  }, []);

  const loadProviders = async () => {
    try {
      const data = await listProviders();
      setProviders(data);
      if (data.length > 0 && slots.length === 0) {
        addSlot();
      }
    } catch {
      setProviders([]);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  function translateError(detail: string): string | null {
    const patterns: [RegExp, string][] = [
      [/not found on provider/i, "error.model_not_found"],
      [/Authentication failed/i, "error.auth_failed"],
      [/timed out/i, "error.timeout"],
      [/Rate limited/i, "error.rate_limited"],
      [/Connection error/i, "error.connection_failed"],
      [/Access denied/i, "error.access_denied"],
      [/endpoint is required|endpoint could not be determined/i, "error.invalid_params"],
    ];
    for (const [regex, key] of patterns) {
      if (regex.test(detail)) return t(key);
    }
    return null;
  }

  const addSlot = (initialPrompt?: string) => {
    const id = `slot_${nextSlotId}`;
    setNextSlotId((k) => k + 1);
    setSlots((prev) => [
      ...prev,
      {
        id,
        selectedProvider: providers.length > 0 ? providers[0] : null,
        selectedModel: "",
        genParams: getDefaultParams(),
        imagesBase64: [],
        mediaType: "image/png",
        loading: false,
        errorMsg: null,
        lastPrompt: "",
        genDebug: null,
        collapsed: false,
      },
    ]);
    if (page !== "home") setPage("home");
  };

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleCollapse = (id: string) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, collapsed: !s.collapsed } : s)));
  };

  const updateSlot = (id: string, partial: Partial<GenSlot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...partial } : s)));
  };

  const handleSend = async (slotId: string, prompt: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot || !slot.selectedProvider) return;

    const defaultPrompt = localStorage.getItem("imagine_default_prompt") || "";
    const showPrefix = localStorage.getItem("imagine_show_prefix_in_history") !== "false";
    const finalPrompt = defaultPrompt ? `${defaultPrompt}, ${prompt}` : prompt;
    const strategy = localStorage.getItem("imagine_gen_strategy") || "single_call";

    updateSlot(slotId, {
      loading: true,
      imagesBase64: [],
      errorMsg: null,
      genDebug: null,
      lastPrompt: showPrefix ? finalPrompt : prompt,
    });

    try {
      const result: GenerateResult = await generateImage({
        provider_id: slot.selectedProvider.id,
        model: slot.selectedModel,
        prompt: finalPrompt,
        params: { ...slot.genParams, strategy },
      });
      updateSlot(slotId, {
        imagesBase64: result.images_base64,
        mediaType: result.media_type,
        loading: false,
        genDebug: {
          nRequested: result.n_requested,
          nReceived: result.n_received,
          strategy: result.strategy,
          apiCalls: result.api_calls,
          rateLimitInfo: result.rate_limit_info,
        },
      });
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail?: string } } }).response?.data?.detail
          : null;
      let msg: string;
      if (detail) {
        const translated = translateError(detail);
        msg = translated
          ? `${t("toast.generate_failed")}：${translated}`
          : `${t("toast.generate_failed")}：${detail}`;
      } else {
        msg = t("toast.generate_failed");
      }
      updateSlot(slotId, { loading: false, errorMsg: msg });
      showToast(msg, "error");
    }
  };

  const navItems: { key: Page; labelKey: string }[] = [
    { key: "home", labelKey: "nav.home" },
    { key: "history", labelKey: "nav.history" },
    { key: "settings", labelKey: "nav.settings" },
  ];

  const renderSlot = (slot: GenSlot) => (
    <div
      key={slot.id}
      className="dark:bg-gray-900/40 bg-white/60 rounded-xl border dark:border-gray-800 border-amber-200 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3 dark:bg-gray-900/60 bg-amber-100/40 border-b dark:border-gray-800 border-amber-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium dark:text-gray-200 text-gray-700">
            {t("app.task_title")} {slots.indexOf(slot) + 1}
          </span>
          {slot.lastPrompt && (
            <span className="text-xs dark:text-gray-500 text-gray-400 truncate max-w-[200px] sm:max-w-[400px]">
              {slot.lastPrompt}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {slot.imagesBase64.length > 0 && (
            <span className="text-xs dark:text-gray-500 text-gray-400">{slot.imagesBase64.length} img</span>
          )}
          <button
            onClick={() => toggleCollapse(slot.id)}
            className="dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-500 text-sm transition-colors"
          >
            {slot.collapsed ? "▸" : "▾"}
          </button>
          <button
            onClick={() => removeSlot(slot.id)}
            className="text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {!slot.collapsed && (
        <div className="p-5 space-y-5">
          <ModelSwitcher
            providers={providers}
            selectedProvider={slot.selectedProvider}
            selectedModel={slot.selectedModel}
            onSelectProvider={(p) => updateSlot(slot.id, { selectedProvider: p, selectedModel: "" })}
            onSelectModel={(m) => updateSlot(slot.id, { selectedModel: m })}
          />

          {slot.selectedProvider && (
            <ParamPanel
              providerType={slot.selectedProvider.provider_type}
              params={slot.genParams}
              onChange={(p) => updateSlot(slot.id, { genParams: p })}
            />
          )}

          <ImageDisplay
            imagesBase64={slot.imagesBase64}
            mediaType={slot.mediaType}
            loading={slot.loading}
            error={slot.errorMsg}
            onClearError={() => updateSlot(slot.id, { errorMsg: null })}
            modelName={slot.selectedModel}
            prompt={slot.lastPrompt}
            nRequested={slot.genDebug?.nRequested}
            nReceived={slot.genDebug?.nReceived}
            strategy={slot.genDebug?.strategy}
            apiCalls={slot.genDebug?.apiCalls}
            rateLimitInfo={slot.genDebug?.rateLimitInfo}
          />

          <ChatInput onSend={(p) => handleSend(slot.id, p)} loading={slot.loading} />
        </div>
      )}

      {slot.collapsed && slot.imagesBase64.length > 0 && (
        <div className="px-5 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {slot.imagesBase64.slice(0, 6).map((b64, i) => (
              <img
                key={i}
                src={`data:${slot.mediaType};base64,${b64}`}
                alt=""
                className="h-16 w-16 object-cover rounded-lg border dark:border-gray-700 border-amber-200 flex-shrink-0"
              />
            ))}
            {slot.imagesBase64.length > 6 && (
              <div className="h-16 w-16 flex items-center justify-center dark:bg-gray-800 bg-amber-50 rounded-lg text-xs dark:text-gray-400 text-gray-500 flex-shrink-0">
                +{slot.imagesBase64.length - 6}
              </div>
            )}
          </div>
        </div>
      )}

      {slot.collapsed && slot.errorMsg && (
        <div className="px-5 pb-3">
          <div className="text-xs text-red-400 truncate">{slot.errorMsg}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="glass sticky top-0 z-40 border-b dark:border-gray-800/50 border-amber-200/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-blue-500">Imagine</span>{" "}
            <span className="dark:text-gray-100 text-gray-800">Hub</span>
          </h1>
          {lanUrl && (
            <button
              onClick={() => navigator.clipboard.writeText(lanUrl)}
              title="Click to copy LAN address"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] dark:bg-gray-800 bg-amber-100 dark:text-gray-400 text-gray-500 border dark:border-gray-700 border-amber-200 hover:dark:text-gray-200 hover:text-gray-700 transition-colors font-mono"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {lanUrl.replace("http://", "")}
            </button>
          )}
        </div>
        <div className="flex gap-1 items-center">
          {navItems.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                page === key
                  ? "bg-blue-600/20 text-blue-500"
                  : "dark:text-gray-400 text-gray-500 dark:hover:text-gray-200 hover:text-gray-700 dark:hover:bg-gray-800/50 hover:bg-amber-200/50"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </nav>

      {page === "home" && (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 sm:p-6 gap-5 animate-slide-up">
          {providers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">{t("app.welcome")}</h2>
                <p className="dark:text-gray-400 text-gray-500">
                  {t("app.welcome_hint")}{" "}
                  <button onClick={() => setPage("settings")} className="text-blue-500 underline hover:text-blue-400 transition-colors">
                    {t("nav.settings")}
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <>
              {slots.map(renderSlot)}

              <button
                onClick={() => addSlot()}
                className="w-full py-3 rounded-xl border-2 border-dashed dark:border-gray-700 border-amber-300 dark:text-gray-400 text-gray-500 dark:hover:border-gray-500 hover:border-blue-400 dark:hover:text-gray-200 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                + {t("app.add_task")}
              </button>
            </>
          )}
        </div>
      )}

      {page === "history" && (
        <div className="flex-1 max-w-3xl mx-auto w-full p-6 animate-slide-up">
          <h2 className="text-2xl font-bold mb-6 dark:text-gray-100 text-gray-800">{t("history.title")}</h2>
          <HistoryList
            onUsePrompt={(p) => {
              addSlot(p);
            }}
          />
        </div>
      )}

      {page === "settings" && (
        <div className="animate-slide-up">
          <Settings onProvidersChange={loadProviders} />
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

export default App;