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

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        className="flex-1 bg-gray-800 rounded-lg px-4 py-3 text-gray-100 border border-gray-700 focus:border-blue-500 outline-none"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image you want to generate..."
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !prompt.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 px-6 py-3 rounded-lg font-medium"
      >
        {loading ? "..." : "Generate"}
      </button>
    </form>
  );
}
