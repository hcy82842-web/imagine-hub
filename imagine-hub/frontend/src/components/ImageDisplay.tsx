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
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="animate-pulse text-gray-500">Generating...</div>
      </div>
    );
  }

  if (!imageBase64) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <p className="text-gray-500">Your image will appear here</p>
      </div>
    );
  }

  const src = `data:${mediaType};base64,${imageBase64}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={src}
        alt="Generated"
        className={`rounded-lg cursor-pointer max-w-full ${expanded ? "" : "max-h-96"}`}
        onClick={() => setExpanded(!expanded)}
        style={{ objectFit: "contain" }}
      />
      <a
        href={src}
        download="imagine-hub.png"
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        Download
      </a>
    </div>
  );
}
