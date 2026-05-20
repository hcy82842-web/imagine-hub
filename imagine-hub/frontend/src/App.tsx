import { useEffect, useState } from "react";
import Settings from "./components/Settings";
import HistoryList from "./components/HistoryList";
import ModelSwitcher from "./components/ModelSwitcher";
import ParamPanel from "./components/ParamPanel";
import ChatInput from "./components/ChatInput";
import ImageDisplay from "./components/ImageDisplay";
import ToastContainer, { showToast } from "./components/Toast";
import { listProviders, generateImage, getNetworkInfo, ProviderData } from "./api/client";
import { useLang } from "./contexts/LanguageContext";

type Page = "home" | "history" | "settings";

function App() {
  const { t } = useLang();
  const [page, setPage] = useState<Page>("home");
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [genParams, setGenParams] = useState<Record<string, unknown>>({});
  const [imagesBase64, setImagesBase64] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState("image/png");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [restorePrompt, setRestorePrompt] = useState("");
  const [restoreKey, setRestoreKey] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);
  const [lanUrl, setLanUrl] = useState("");

  useEffect(() => {
    getNetworkInfo().then((info) => setLanUrl(info.lan_url)).catch(() => {});
  }, []);

  const loadProviders = async () => {
    try {
      const data = await listProviders();
      setProviders(data);
      if (data.length > 0 && !selectedProvider) {
        setSelectedProvider(data[0]);
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

  const handleSend = async (prompt: string) => {
    if (!selectedProvider) return;
    const defaultPrompt = localStorage.getItem("imagine_default_prompt") || "";
    const showPrefix = localStorage.getItem("imagine_show_prefix_in_history") !== "false";
    const finalPrompt = defaultPrompt ? `${defaultPrompt}, ${prompt}` : prompt;
    setLastPrompt(showPrefix ? finalPrompt : prompt);
    setLoading(true);
    setImagesBase64([]);
    setErrorMsg(null);
    try {
      const result = await generateImage({
        provider_id: selectedProvider.id,
        model: selectedModel,
        prompt: finalPrompt,
        params: genParams,
      });
      setImagesBase64(result.images_base64);
      setMediaType(result.media_type);
      setHistoryKey((k) => k + 1);
    } catch (err: unknown) {
      setImagesBase64([]);
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
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const navItems: { key: Page; labelKey: string }[] = [
    { key: "home", labelKey: "nav.home" },
    { key: "history", labelKey: "nav.history" },
    { key: "settings", labelKey: "nav.settings" },
  ];

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
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6 gap-6 animate-slide-up">
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
              <ModelSwitcher
                providers={providers}
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onSelectProvider={setSelectedProvider}
                onSelectModel={setSelectedModel}
              />

              <ImageDisplay imagesBase64={imagesBase64} mediaType={mediaType} loading={loading} error={errorMsg} onClearError={() => setErrorMsg(null)} modelName={selectedModel} prompt={lastPrompt} />

              <ParamPanel
                providerType={selectedProvider?.provider_type ?? ""}
                params={genParams}
                onChange={setGenParams}
              />

              <ChatInput key={restoreKey} onSend={handleSend} loading={loading} initialPrompt={restorePrompt} />
            </>
          )}
        </div>
      )}

      {page === "history" && (
        <div className="flex-1 max-w-3xl mx-auto w-full p-6 animate-slide-up">
          <h2 className="text-2xl font-bold mb-6 dark:text-gray-100 text-gray-800">{t("history.title")}</h2>
          <HistoryList key={historyKey} onUsePrompt={(p) => { setRestorePrompt(p); setRestoreKey((k) => k + 1); setPage("home"); }} />
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
