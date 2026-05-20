import { useState } from "react";
import { useLang } from "../contexts/LanguageContext";

interface Props {
  onSend: (prompt: string) => void;
  loading: boolean;
  initialPrompt?: string;
}

export default function ChatInput({ onSend, loading, initialPrompt = "" }: Props) {
  const { t } = useLang();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [hasDefaultPrompt] = useState(() => !!localStorage.getItem("imagine_default_prompt"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !loading) {
      onSend(prompt.trim());
      setPrompt("");
    }
  };

  const canSend = prompt.trim().length > 0 && !loading;

  return (
    <>
      {hasDefaultPrompt && (
        <div className="text-xs dark:text-gray-500 text-gray-400 mb-1">{t("chat.default_prompt_active")}</div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        className="flex-1 dark:bg-gray-800/80 bg-white/80 rounded-xl px-5 py-3.5 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500/70 outline-none transition-all dark:placeholder:text-gray-600 placeholder:text-gray-400"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("chat.placeholder")}
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!canSend}
        className={`relative px-8 py-3.5 rounded-xl font-medium text-sm transition-all ${
          canSend
            ? "bg-blue-600 hover:bg-blue-500 text-white animate-pulse-ring"
            : "dark:bg-gray-800 bg-amber-100 dark:text-gray-500 text-gray-400 cursor-not-allowed"
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </span>
        ) : (
          t("chat.generate")
        )}
      </button>
    </form>
    </>
  );
}
