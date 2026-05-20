import zh from "./zh";
import en from "./en";

const locales: Record<string, Record<string, string>> = { zh, en };

export function t(key: string, lang: string = "zh"): string {
  return locales[lang]?.[key] ?? locales["zh"]?.[key] ?? key;
}
