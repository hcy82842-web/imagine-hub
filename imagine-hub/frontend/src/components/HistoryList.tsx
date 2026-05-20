import { useEffect, useState } from "react";
import { listHistory, deleteHistory, HistoryItem } from "../api/client";
import { showToast } from "./Toast";

export default function HistoryList({ onRefresh }: { onRefresh?: () => void }) {
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
      showToast("Failed to delete", "error");
    }
  };

  if (items.length === 0) {
    return <p className="text-gray-500 text-center py-12">No history yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="group bg-gray-900/50 border border-gray-800 hover:border-gray-700 rounded-xl p-4 flex gap-4 transition-all"
        >
          {item.image_base64 && (
            <img
              src={`data:image/png;base64,${item.image_base64}`}
              alt=""
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0 transition-transform group-hover:scale-105"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 truncate">{item.prompt}</p>
            <p className="text-xs text-gray-500 mt-1">
              {item.provider_name} &middot; {item.model_name}
            </p>
            <p className="text-xs text-gray-600">{new Date(item.created_at).toLocaleString()}</p>
          </div>
          <button
            onClick={() => handleDelete(item.id)}
            className="text-red-400/60 hover:text-red-300 text-sm self-start transition-colors opacity-0 group-hover:opacity-100"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
