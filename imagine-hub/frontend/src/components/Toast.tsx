import { useEffect, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

let toastId = 0;
const listeners: Array<(t: ToastItem) => void> = [];

export function showToast(message: string, type: "error" | "success" | "info" = "error") {
  const item: ToastItem = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(item));
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm max-w-sm ${
            item.type === "error"
              ? "bg-red-900/90 text-red-100 border border-red-700"
              : item.type === "success"
                ? "bg-green-900/90 text-green-100 border border-green-700"
                : "bg-blue-900/90 text-blue-100 border border-blue-700"
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
