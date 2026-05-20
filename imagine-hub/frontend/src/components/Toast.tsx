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

  const colors: Record<string, string> = {
    error: "bg-red-800/90 border-red-600/50 text-red-200",
    success: "bg-green-800/90 border-green-500/50 text-green-200",
    info: "bg-blue-800/90 border-blue-500/50 text-blue-200",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className={`animate-toast-in pointer-events-auto px-4 py-3 rounded-xl shadow-2xl text-sm max-w-sm backdrop-blur-md border ${colors[item.type]}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
