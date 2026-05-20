import { useEffect, useState } from "react";
import { listHistory, deleteHistory, HistoryItem } from "../api/client";
import { showToast } from "./Toast";
import { useLang } from "../contexts/LanguageContext";

export default function HistoryList({ onRefresh }: { onRefresh?: () => void }) {
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
            <p className="text-sm dark:text-gray-200 text-gray-700 truncate">{item.prompt}</p>
            <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">
              {item.provider_name} &middot; {item.model_name}
            </p>
            <p className="text-xs dark:text-gray-600 text-gray-300">{new Date(item.created_at).toLocaleString()}</p>
          </div>
          <button
            onClick={() => handleDelete(item.id)}
            className="text-red-400/60 hover:text-red-300 text-sm self-start transition-colors opacity-0 group-hover:opacity-100"
          >
            {t("history.delete")}
          </button>
        </div>
      ))}
    </div>
  );
}
