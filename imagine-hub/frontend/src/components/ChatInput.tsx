import { useState } from "react";

interface Props {
  onSend: (prompt: string) => void;
  loading: boolean;
}

export default function ChatInput({ onSend, loading }: Props) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !loading) {
      onSend(prompt.trim());
      setPrompt("");
    }
  };

  const canSend = prompt.trim().length > 0 && !loading;

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        className="flex-1 bg-gray-800/80 rounded-xl px-5 py-3.5 text-sm text-gray-100 border border-gray-700 focus:border-blue-500/70 outline-none transition-all placeholder:text-gray-600"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image you want to generate..."
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!canSend}
        className={`relative px-8 py-3.5 rounded-xl font-medium text-sm transition-all ${
          canSend
            ? "bg-blue-600 hover:bg-blue-500 text-white animate-pulse-ring"
            : "bg-gray-800 text-gray-500 cursor-not-allowed"
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </span>
        ) : (
          "Generate"
        )}
      </button>
    </form>
  );
}
