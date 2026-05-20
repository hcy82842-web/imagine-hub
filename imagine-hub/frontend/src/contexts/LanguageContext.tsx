import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { t as translate } from "../i18n";

type Lang = "zh" | "en";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangCtx>({ lang: "zh", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("imagine_lang");
    if (stored === "en" || stored === "zh") return stored;
    return "zh";
  });

  useEffect(() => {
    localStorage.setItem("imagine_lang", lang);
  }, [lang]);

  const t = (key: string) => translate(key, lang);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
