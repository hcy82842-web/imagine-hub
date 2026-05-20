import { useState } from "react";
import { useLang } from "../contexts/LanguageContext";

interface Props {
  imageBase64: string | null;
  mediaType: string;
  loading: boolean;
}

export default function ImageDisplay({ imageBase64, mediaType, loading }: Props) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-72 dark:bg-gray-900/50 bg-white/80 rounded-xl border dark:border-gray-800 border-amber-200">
        <div className="spinner" />
        <div className="flex flex-col items-center gap-1">
          <div className="h-2 w-32 dark:bg-gray-800 bg-amber-100 rounded-full overflow-hidden">
            <div className="h-full w-full bg-blue-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs dark:text-gray-500 text-gray-400">{t("image.generating")}</span>
        </div>
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

  const src = `data:${mediaType};base64,${imageBase64}`;

  return (
    <div className="animate-fade-in flex flex-col items-center gap-3">
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
          onClick={() => setExpanded(!expanded)}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
      </div>
      <div className="flex gap-3 text-xs">
        <a
          href={src}
          download="imagine-hub.png"
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
      </div>
    </div>
  );
}
