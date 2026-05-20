import { useEffect, useState } from "react";
import { listHistory, deleteHistory, HistoryItem } from "../api/client";

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
    await deleteHistory(id);
    load();
    onRefresh?.();
  };

  if (items.length === 0) {
    return <p className="text-gray-500 text-center py-8">No history yet.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="bg-gray-900 rounded-lg p-4 flex gap-4">
          {item.image_base64 && (
            <img
              src={`data:image/png;base64,${item.image_base64}`}
              alt=""
              className="w-24 h-24 object-cover rounded flex-shrink-0"
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
            className="text-red-400 hover:text-red-300 text-sm self-start"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
