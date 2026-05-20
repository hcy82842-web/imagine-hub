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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className="animate-toast-in pointer-events-auto px-4 py-3 rounded-xl shadow-2xl text-sm max-w-sm backdrop-blur-md border"
          style={
            item.type === "error"
              ? { background: "rgba(127,29,29,0.9)", borderColor: "rgba(220,38,38,0.5)", color: "#fecaca" }
              : item.type === "success"
                ? { background: "rgba(22,101,52,0.9)", borderColor: "rgba(34,197,94,0.5)", color: "#bbf7d0" }
                : { background: "rgba(30,64,175,0.9)", borderColor: "rgba(59,130,246,0.5)", color: "#bfdbfe" }
          }
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
