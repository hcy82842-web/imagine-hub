import { useEffect, useState } from "react";
import { listHistory, deleteHistory, HistoryItem } from "../api/client";
import { showToast } from "./Toast";
import { useLang } from "../contexts/LanguageContext";

export default function HistoryList({ onRefresh, onUsePrompt }: { onRefresh?: () => void; onUsePrompt?: (prompt: string) => void }) {
  const { t } = useLang();
  const [items, setItems] = useState<HistoryItem[]>([]);

  const load = async () => {
    try {
      setItems(await listHistory());
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteHistory(id);
      load();
      onRefresh?.();
    } catch {
      showToast(t("history.delete_failed"), "error");
    }
  };

  if (items.length === 0) {
    return <p className="dark:text-gray-500 text-gray-400 text-center py-12">{t("history.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="group dark:bg-gray-900/50 bg-white/80 border dark:border-gray-800 border-amber-200 hover:dark:border-gray-700 hover:border-amber-300 rounded-xl p-4 flex gap-4 transition-all"
        >
          {item.image_base64 && (
            <img
              src={`data:image/png;base64,${item.image_base64}`}
              alt=""
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0 transition-transform group-hover:scale-105"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm dark:text-gray-200 text-gray-700 truncate" title={item.prompt}>{item.prompt}</p>
            <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">
              {item.provider_name} &middot; {item.model_name}
            </p>
            <p className="text-xs dark:text-gray-600 text-gray-300">{new Date(item.created_at).toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-1.5 self-start">
            <button
              onClick={() => { navigator.clipboard.writeText(item.prompt); showToast(t("history.copied"), "success"); }}
              className="text-xs dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
              title={t("history.copy")}
            >
              {t("history.copy")}
            </button>
            {onUsePrompt && (
              <button
                onClick={() => onUsePrompt(item.prompt)}
                className="text-xs text-blue-500/60 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                title={t("history.use")}
              >
                {t("history.use")}
              </button>
            )}
            <button
              onClick={() => handleDelete(item.id)}
              className="text-red-400/60 hover:text-red-300 text-xs transition-colors opacity-0 group-hover:opacity-100"
            >
              {t("history.delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
