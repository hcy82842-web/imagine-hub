import { useEffect, useState, useRef } from "react";
import api from "../api/client";
import { useLang } from "../contexts/LanguageContext";

interface SchemaField {
  key: string;
  label: string;
  type: "number" | "text" | "select";
  default: unknown;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface Props {
  providerType: string;
  params: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
}

function optionLabel(fieldKey: string, value: string, t: (key: string) => string): string {
  const key = `param_option_${fieldKey}_${value}`;
  const label = t(key);
  return label !== key ? label : value;
}

function fieldLabel(fieldKey: string, defaultLabel: string, t: (key: string) => string): string {
  const key = `param_label_${fieldKey}`;
  const label = t(key);
  return label !== key ? label : defaultLabel;
}

function HelpTip({ descKey }: { descKey: string }) {
  const { t } = useLang();
  const desc = t(descKey);
  if (!desc || desc === descKey) return null;
  return (
    <span className="group relative inline-flex ml-1.5 cursor-help align-middle">
      <span className="dark:text-gray-500 text-gray-400 text-xs leading-none">&#9432;</span>
      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 rounded-lg text-xs leading-relaxed dark:bg-gray-700 bg-white dark:text-gray-200 text-gray-700 shadow-lg border dark:border-gray-600 border-amber-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none min-w-[200px] max-w-xs whitespace-normal">
        {desc}
      </div>
    </span>
  );
}

export default function ParamPanel({ providerType, params, onChange }: Props) {
  const { t } = useLang();
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!providerType) return;
    api
      .get(`/providers/schema/${providerType}`)
      .then((res) => {
        const fields: SchemaField[] = res.data.schema;
        setSchema(fields);
        const defaults: Record<string, unknown> = {};
        for (const f of fields) {
          defaults[f.key] = f.default;
        }
        onChange(defaults);
      })
      .catch(() => setSchema([]));
  }, [providerType]);

  const update = (key: string, value: unknown) => {
    onChange({ ...params, [key]: value });
  };

  if (schema.length === 0) return null;

  return (
    <div className="dark:bg-gray-900/50 bg-white/80 rounded-xl border dark:border-gray-800 border-amber-200 p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-500 hover:dark:text-gray-200 hover:text-gray-700 transition-colors w-full"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {t("param.parameters")}
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: open ? contentRef.current?.scrollHeight ?? 400 : 0,
          opacity: open ? 1 : 0,
        }}
      >
        <div className="mt-4 grid grid-cols-2 gap-4">
          {schema.map((field) => (
            <div key={field.key}>
              <label className="block text-xs dark:text-gray-400 text-gray-500 mb-1">
                {fieldLabel(field.key, field.label, t)}
                {field.key === "quality" && <HelpTip descKey="param_desc_quality" />}
              </label>
              {field.type === "select" && field.options ? (
                <select
                  className="w-full dark:bg-gray-800 bg-white rounded-lg px-3 py-2 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors"
                  value={String(params[field.key] ?? field.default)}
                  onChange={(e) => update(field.key, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{optionLabel(field.key, opt, t)}</option>
                  ))}
                </select>
              ) : field.type === "number" ? (
                <input
                  type="number"
                  className="w-full dark:bg-gray-800 bg-white rounded-lg px-3 py-2 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors"
                  value={Number(params[field.key] ?? field.default)}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  onChange={(e) => update(field.key, Number(e.target.value))}
                />
              ) : (
                <input
                  className="w-full dark:bg-gray-800 bg-white rounded-lg px-3 py-2 text-sm dark:text-gray-100 text-gray-800 border dark:border-gray-700 border-amber-200 focus:border-blue-500 outline-none transition-colors"
                  value={String(params[field.key] ?? field.default)}
                  onChange={(e) => update(field.key, e.target.value)}
                  placeholder={field.label}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
