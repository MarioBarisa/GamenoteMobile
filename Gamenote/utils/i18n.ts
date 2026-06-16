import i18next from "i18next";
import {I18nManager} from "react-native";
import {initReactI18next} from "react-i18next";
import hr from "@/translations/hr.json";
import en from "@/translations/en.json";

const SUPPORTED_LANGS = ["hr", "en"] as const;

i18next.use(initReactI18next).init({
    resources: {
        hr: {translation: hr},
        en: {translation: en},
    },
    fallbackLng: "hr",
    interpolation: {
        escapeValue: false,
    },
    compatibilityJSON: "v4",
});

function detectLanguage(): string {
    const locale = (I18nManager as any).localeIdentifier ?? "";
    if (String(locale).startsWith("hr")) return "hr";
    return "en";
}

export function changeLanguage(lang: string) {
    if (SUPPORTED_LANGS.includes(lang as any)) {
        i18next.changeLanguage(lang);
    }
}

export function getCurrentLanguage(): string {
    return i18next.language;
}

const initialLang = detectLanguage();
if (initialLang !== i18next.language) {
    i18next.changeLanguage(initialLang);
}

const i18n = i18next;

export {SUPPORTED_LANGS};
export default i18n;
