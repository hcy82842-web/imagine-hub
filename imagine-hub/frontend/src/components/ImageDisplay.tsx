import { useState, useEffect } from "react";
import { useLang } from "../contexts/LanguageContext";

interface Props {
  imageBase64: string | null;
  mediaType: string;
  loading: boolean;
  error?: string | null;
  onClearError?: () => void;
  modelName?: string;
  prompt?: string;
}

export default function ImageDisplay({ imageBase64, mediaType, loading, error, onClearError, modelName, prompt }: Props) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (imageBase64) setCollapsed(false);
  }, [imageBase64]);

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleLightboxClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen]);

  const src = imageBase64 ? `data:${mediaType};base64,${imageBase64}` : "";

  const downloadFilename = prompt
    ? prompt.replace(/[^\w\s\u4e00-\u9fff-]/g, '_').trim().substring(0, 30).replace(/\s+/g, '_') + '.png'
    : 'imagine-hub.png';

  const handleLightboxClose = () => {
    setLightboxOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(5, z - e.deltaY * 0.01)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-72 dark:bg-gray-900/50 bg-white/80 rounded-xl border dark:border-gray-800 border-amber-200">
        <div className="spinner" />
        <div className="flex flex-col items-center gap-1">
          <div className="h-2 w-32 dark:bg-gray-800 bg-amber-100 rounded-full overflow-hidden">
            <div className="h-full w-full bg-blue-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs dark:text-gray-500 text-gray-400">
            {modelName
              ? t("image.generating_with").replace("{model}", modelName)
              : t("image.generating")}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-72 dark:bg-red-900/20 bg-red-50/80 rounded-xl border dark:border-red-800/50 border-red-300">
        <svg className="w-10 h-10 dark:text-red-400 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <div className="text-sm dark:text-red-300 text-red-600 text-center max-w-md px-4">{error}</div>
        {onClearError && (
          <button onClick={onClearError} className="text-xs dark:text-red-400 text-red-500 dark:hover:text-red-300 hover:text-red-400 underline transition-colors">
            {t("toast.dismiss")}
          </button>
        )}
      </div>
    );
  }

  if (!imageBase64) {
    return (
      <div className="flex items-center justify-center h-72 dark:bg-gray-900/30 bg-white/50 rounded-xl border border-dashed dark:border-gray-800 border-amber-200">
        <div className="text-center">
          <svg className="w-10 h-10 mx-auto dark:text-gray-600 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm dark:text-gray-600 text-gray-400">{t("image.placeholder")}</p>
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="dark:bg-gray-900/50 bg-white/80 rounded-xl border dark:border-gray-800 border-amber-200 p-3 flex items-center justify-between">
        <span className="text-xs dark:text-gray-400 text-gray-500">{t("image.title")}</span>
        <button onClick={() => setCollapsed(false)} className="text-xs text-blue-500 hover:text-blue-400 transition-colors">
          {t("image.show")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in flex flex-col items-center gap-3">
        <div className="w-full flex items-center justify-between">
          <span className="text-xs dark:text-gray-400 text-gray-500">{t("image.title")}</span>
          <button
            onClick={() => setCollapsed(true)}
            className="text-xs dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-500 transition-colors"
          >
            {t("image.hide")}
          </button>
        </div>
        <div
          className={`relative group rounded-xl overflow-hidden border dark:border-gray-800 border-amber-200 hover:dark:border-gray-700 hover:border-amber-300 transition-all ${
            expanded ? "" : "max-h-96"
          }`}
        >
          <img
            src={src}
            alt="Generated"
            className={`cursor-pointer max-w-full ${expanded ? "" : "max-h-96"}`}
            style={{ objectFit: "contain" }}
            onClick={() => setLightboxOpen(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
        </div>
        <div className="flex gap-3 text-xs">
          <a
            href={src}
            download={downloadFilename}
            className="text-blue-500 hover:text-blue-400 transition-colors"
          >
            {t("image.download")}
          </a>
          <button
            onClick={() => setExpanded(!expanded)}
            className="dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-500 transition-colors"
          >
            {expanded ? t("image.fit") : t("image.expand")}
          </button>
          <button
            onClick={() => setLightboxOpen(true)}
            className="text-blue-500 hover:text-blue-400 transition-colors"
          >
            {t("image.preview")}
          </button>
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center select-none"
          onClick={handleLightboxClose}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
              onClick={(e) => { e.stopPropagation(); handleLightboxClose(); }}
              className="dark:bg-gray-800 bg-white/20 hover:bg-white/30 rounded-lg w-8 h-8 flex items-center justify-center text-white text-sm transition-colors ml-2"
              title={t("image.close")}
            >✕</button>
          </div>
          <div
            className="max-w-[90vw] max-h-[90vh] overflow-hidden"
            style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
          >
            <img
              src={src}
              alt="Generated"
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
            href={src}
            download={downloadFilename}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 text-xs dark:bg-gray-800 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t("image.download")}
          </a>
        </div>
      )}
    </>
  );
}
