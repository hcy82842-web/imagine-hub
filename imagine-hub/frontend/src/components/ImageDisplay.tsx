import { useState } from "react";

interface Props {
  imageBase64: string | null;
  mediaType: string;
  loading: boolean;
}

export default function ImageDisplay({ imageBase64, mediaType, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-72 bg-gray-900/50 rounded-xl border border-gray-800">
        <div className="spinner" />
        <div className="flex flex-col items-center gap-1">
          <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full w-full bg-blue-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs text-gray-500">Generating...</span>
        </div>
      </div>
    );
  }

  if (!imageBase64) {
    return (
      <div className="flex items-center justify-center h-72 bg-gray-900/30 rounded-xl border border-dashed border-gray-800">
        <div className="text-center">
          <svg className="w-10 h-10 mx-auto text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-600">Your image will appear here</p>
        </div>
      </div>
    );
  }

  const src = `data:${mediaType};base64,${imageBase64}`;

  return (
    <div className="animate-fade-in flex flex-col items-center gap-3">
      <div
        className={`relative group rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all ${
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
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      </div>
      <div className="flex gap-3 text-xs">
        <a
          href={src}
          download="imagine-hub.png"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          Download
        </a>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? "Fit" : "Expand"}
        </button>
      </div>
    </div>
  );
}
