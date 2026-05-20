import { useEffect, useState } from "react";
import Settings from "./components/Settings";
import HistoryList from "./components/HistoryList";
import ModelSwitcher from "./components/ModelSwitcher";
import ParamPanel from "./components/ParamPanel";
import ChatInput from "./components/ChatInput";
import ImageDisplay from "./components/ImageDisplay";
import ToastContainer, { showToast } from "./components/Toast";
import { listProviders, generateImage, ProviderData } from "./api/client";

type Page = "home" | "history" | "settings";

function App() {
  const [page, setPage] = useState<Page>("home");
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [genParams, setGenParams] = useState<Record<string, unknown>>({});
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState("image/png");
  const [loading, setLoading] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

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

  const handleSend = async (prompt: string) => {
    if (!selectedProvider) return;
    setLoading(true);
    setImageBase64(null);
    try {
      const result = await generateImage({
        provider_id: selectedProvider.id,
        model: selectedModel,
        prompt,
        params: genParams,
      });
      setImageBase64(result.image_base64);
      setMediaType(result.media_type);
      setHistoryKey((k) => k + 1);
    } catch (err: unknown) {
      setImageBase64(null);
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail?: string } } }).response?.data?.detail ||
            "Generation failed"
          : "Generation failed";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Imagine Hub</h1>
        <div className="flex gap-4 text-sm">
          <button
            onClick={() => setPage("home")}
            className={page === "home" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"}
          >
            Home
          </button>
          <button
            onClick={() => setPage("history")}
            className={page === "history" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"}
          >
            History
          </button>
          <button
            onClick={() => setPage("settings")}
            className={page === "settings" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"}
          >
            Settings
          </button>
        </div>
      </nav>

      {page === "home" && (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6 gap-6">
          {providers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Welcome to Imagine Hub</h2>
                <p className="text-gray-400">
                  Go to <button onClick={() => setPage("settings")} className="text-blue-400 underline">Settings</button> to add your first provider.
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

              <ImageDisplay imageBase64={imageBase64} mediaType={mediaType} loading={loading} />

              <ParamPanel
                providerType={selectedProvider?.provider_type ?? ""}
                params={genParams}
                onChange={setGenParams}
              />

              <ChatInput onSend={handleSend} loading={loading} />
            </>
          )}
        </div>
      )}

      {page === "history" && (
        <div className="flex-1 max-w-3xl mx-auto w-full p-6">
          <h2 className="text-2xl font-bold mb-6">Generation History</h2>
          <HistoryList key={historyKey} />
        </div>
      )}

      {page === "settings" && (
        <Settings onProvidersChange={loadProviders} />
      )}

      <ToastContainer />
    </div>
  );
}

export default App;
