import { useState, useMemo, useEffect, useRef } from "react";
import { useLang } from "../contexts/LanguageContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  models: string[];
  existingIds: string[];
  onAdd: (ids: string[]) => void;
}

export default function ModelPicker({ isOpen, onClose, models, existingIds, onAdd }: Props) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIds(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [models, search]);

  const visibleSelected = filtered.filter((m) => selectedIds.has(m));
  const allVisibleSelected = filtered.length > 0 && filtered.every((m) => selectedIds.has(m));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    for (const m of filtered) {
      if (existingSet.has(m)) continue;
      if (allVisibleSelected) next.delete(m);
      else next.add(m);
    }
    setSelectedIds(next);
  };

  const toggleModel = (m: string) => {
    const next = new Set(selectedIds);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setSelectedIds(next);
  };

  const handleAdd = () => {
    onAdd(Array.from(selectedIds));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="dark:bg-gray-900 bg-white rounded-xl shadow-2xl border dark:border-gray-700 border-amber-200 w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 border-amber-200">
          <h3 className="text-base font-semibold dark:text-gray-100 text-gray-800">{t("settings.browse_models")}</h3>
          <button onClick={onClose} className="dark:text-gray-500 text-gray-400 hover:dark:text-gray-200 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-5 py-3">
          <input
            ref={inputRef}
            className="w-full dark:bg-gray-800 bg-amber-50 rounded-lg px-3 py-2 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors dark:placeholder:text-gray-600 placeholder:text-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("settings.search_models")}
          />
        </div>

        <div className="px-5 pb-1 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-sm dark:text-gray-300 text-gray-600">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
              className="rounded dark:bg-gray-800 bg-amber-50 border dark:border-gray-700 border-amber-200" />
            {t("settings.select_all")}
          </label>
          {visibleSelected.length > 0 && (
            <span className="dark:text-gray-500 text-gray-400 text-xs">{visibleSelected.length}/{filtered.length}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-center dark:text-gray-500 text-gray-400 text-sm py-8">{t("settings.no_models_found")}</p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((m) => {
                const isExisting = existingSet.has(m);
                const isSelected = selectedIds.has(m);
                return (
                  <label
                    key={m}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                      isExisting
                        ? "dark:text-gray-500 text-gray-400 cursor-not-allowed opacity-50"
                        : isSelected
                          ? "dark:bg-blue-900/20 bg-blue-50 dark:text-gray-100 text-gray-800"
                          : "dark:hover:bg-gray-800 hover:bg-amber-50 dark:text-gray-300 text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected || isExisting}
                      disabled={isExisting}
                      onChange={() => !isExisting && toggleModel(m)}
                      className="rounded dark:bg-gray-800 bg-amber-50 border dark:border-gray-700 border-amber-200 disabled:opacity-40"
                    />
                    <span className="flex-1 truncate">{m}</span>
                    {isExisting && <span className="text-xs dark:text-gray-600 text-gray-400">{t("settings.already_added")}</span>}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t dark:border-gray-700 border-amber-200">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg dark:bg-gray-700 bg-amber-100 dark:hover:bg-gray-600 hover:bg-amber-200 dark:text-gray-200 text-gray-700 transition-colors">
            {t("settings.cancel")}
          </button>
          <button onClick={handleAdd} disabled={visibleSelected.length === 0}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-40 transition-colors">
            {t("settings.add_selected").replace("{0}", String(visibleSelected.length))}
          </button>
        </div>
      </div>
    </div>
  );
}
