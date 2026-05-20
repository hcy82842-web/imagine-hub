import { useEffect, useState } from "react";
import api from "../api/client";

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

export default function ParamPanel({ providerType, params, onChange }: Props) {
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [open, setOpen] = useState(false);

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
    <div className="bg-gray-900 rounded-lg p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
      >
        <span className={open ? "rotate-90" : ""}>&#9654;</span>
        Parameters
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {schema.map((field) => (
            <div key={field.key}>
              <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
              {field.type === "select" && field.options ? (
                <select
                  className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-100 border border-gray-700"
                  value={String(params[field.key] ?? field.default)}
                  onChange={(e) => update(field.key, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === "number" ? (
                <input
                  type="number"
                  className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-100 border border-gray-700"
                  value={Number(params[field.key] ?? field.default)}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  onChange={(e) => update(field.key, Number(e.target.value))}
                />
              ) : (
                <input
                  className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-100 border border-gray-700"
                  value={String(params[field.key] ?? field.default)}
                  onChange={(e) => update(field.key, e.target.value)}
                  placeholder={field.label}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
