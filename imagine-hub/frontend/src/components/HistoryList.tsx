import { useEffect, useState } from "react";
import { listHistory, deleteHistory, HistoryItem } from "../api/client";
import { showToast } from "./Toast";
import { useLang } from "../contexts/LanguageContext";

function displayPrompt(fullPrompt: string): string {
  const showPrefix = localStorage.getItem("imagine_show_prefix_in_history") !== "false";
  if (showPrefix) return fullPrompt;
  const prefix = localStorage.getItem("imagine_default_prompt") || "";
  if (!prefix) return fullPrompt;
  const expected = prefix + ", ";
  return fullPrompt.startsWith(expected) ? fullPrompt.slice(expected.length) : fullPrompt;
}

export default function HistoryList({ onRefresh, onUsePrompt }: { onRefresh?: () => void; onUsePrompt?: (prompt: string) => void }) {
  const { t } = useLang();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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
    } catch {
      showToast(t("history.delete_failed"), "error");
    }
    load();
    onRefresh?.();
  };

  useEffect(() => {
    if (!lightboxSrc) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightboxSrc(null); setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener("keydown", handler);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handler); };
  }, [lightboxSrc]);

  const closeLightbox = () => { setLightboxSrc(null); setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(5, z - e.deltaY * 0.01)));
  };

  const handleMD = (e: React.MouseEvent) => {
    if (zoom > 1) { setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }
  };

  const handleMM = (e: React.MouseEvent) => {
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMU = () => setIsPanning(false);

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
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0 cursor-pointer transition-transform group-hover:scale-105"
              onClick={() => setLightboxSrc(`data:image/png;base64,${item.image_base64}`)}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm dark:text-gray-200 text-gray-700 truncate" title={displayPrompt(item.prompt)}>{displayPrompt(item.prompt)}</p>
            <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">
              {item.provider_name} &middot; {item.model_name}
            </p>
            <p className="text-xs dark:text-gray-600 text-gray-300">{new Date(item.created_at).toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-1.5 self-start">
            <button
              onClick={() => { navigator.clipboard.writeText(displayPrompt(item.prompt)); showToast(t("history.copied"), "success"); }}
              className="text-xs dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
              title={t("history.copy")}
            >
              {t("history.copy")}
            </button>
            {onUsePrompt && (
              <button
                onClick={() => onUsePrompt(displayPrompt(item.prompt))}
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

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center select-none"
          onClick={closeLightbox}
          onMouseMove={handleMM}
          onMouseUp={handleMU}
          onMouseLeave={handleMU}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(5, z + 0.5)); }}
              className="dark:bg-gray-800 bg-white/20 hover:bg-white/30 rounded-lg w-8 h-8 flex items-center justify-center text-white text-sm transition-colors"
              title={t("image.zoom_in")}
            >+</button>
            <span className="dark:bg-gray-800 bg-white/20 rounded-lg w-14 h-8 flex items-center justify-center text-white text-xs font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.5, z - 0.5)); }}
              className="dark:bg-gray-800 bg-white/20 hover:bg-white/30 rounded-lg w-8 h-8 flex items-center justify-center text-white text-sm transition-colors"
              title={t("image.zoom_out")}
            >−</button>
            <button
              onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
              className="dark:bg-gray-800 bg-white/20 hover:bg-white/30 rounded-lg w-8 h-8 flex items-center justify-center text-white text-sm transition-colors ml-2"
              title={t("image.close")}
            >✕</button>
          </div>
          <div
            className="max-w-[90vw] max-h-[90vh] overflow-hidden"
            style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMD}
          >
            <img
              src={lightboxSrc}
              alt=""
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
              }}
              draggable={false}
            />
          </div>
          <a
            href={lightboxSrc}
            download="imagine-hub.png"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 text-xs dark:bg-gray-800 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t("image.download")}
          </a>
        </div>
      )}
    </div>
  );
}
