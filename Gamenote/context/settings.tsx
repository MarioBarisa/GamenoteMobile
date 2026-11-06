import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {changeLanguage, getCurrentLanguage} from "@/utils/i18n";

const VIBRATIONS_KEY = "vibrationsEnabled";
const COMPACT_KEY = "compactCards";
const LANGUAGE_KEY = "appLanguage";
const TCG_KEY = "tcgMode";

type SettingsContextValue = {
    vibrationsEnabled: boolean;
    setVibrationsEnabled: (value: boolean) => void;
    compactCards: boolean;
    setCompactCards: (value: boolean) => void;
    tcgMode: boolean;
    tcgSettingsLoaded: boolean;
    setTCGMode: (value: boolean) => void;
    language: string;
    setLanguage: (value: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({children}: { children: ReactNode }) {
    const [vibrationsEnabled, setVibrationsEnabled] = useState(true);
    const [compactCards, setCompactCards] = useState(true);
    const [tcgMode, setTCGMode] = useState(false);
    const [tcgSettingsLoaded, setTCGSettingsLoaded] = useState(false);
    const tcgChanged = useRef(false);
    const [language, setLanguageState] = useState(getCurrentLanguage());

    useEffect(() => {
        let cancelled = false;
        AsyncStorage.getItem(TCG_KEY).then(value => {
            if (!cancelled && !tcgChanged.current && value !== null) {
                setTCGMode(value === "true");
            }
        }).catch(() => {
            // Zadrži zadanu postavku bez spremljene vrijednosti
        }).finally(() => {
            if (!cancelled) setTCGSettingsLoaded(true);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        AsyncStorage.getItem(VIBRATIONS_KEY).then((value) => {
            if (value !== null) {
                setVibrationsEnabled(value === "true"); // Haptic feedback ZA TAB SWITCHING
            }
        });
        AsyncStorage.getItem(COMPACT_KEY).then((value) => {
            if (value !== null) {
                setCompactCards(value === "true");
            }
        });
        AsyncStorage.getItem(LANGUAGE_KEY).then((value) => {
            if (value !== null) {
                setLanguageState(value);
                changeLanguage(value);
            }
        });
    }, []);

    const setAndPersistVibrations = (value: boolean) => {
        setVibrationsEnabled(value);
        AsyncStorage.setItem(VIBRATIONS_KEY, String(value));
    };

    const setAndPersistCompact = (value: boolean) => {
        setCompactCards(value);
        AsyncStorage.setItem(COMPACT_KEY, String(value));
    };

    const setAndPersistTCG = useCallback((value: boolean) => {
        tcgChanged.current = true;
        setTCGMode(value);
        AsyncStorage.setItem(TCG_KEY, String(value));
    }, []);

    const setAndPersistLanguage = useCallback((value: string) => {
        setLanguageState(value);
        changeLanguage(value);
        AsyncStorage.setItem(LANGUAGE_KEY, value);
    }, []);

    const value = useMemo(
        () => ({
            vibrationsEnabled,
            setVibrationsEnabled: setAndPersistVibrations,
            compactCards,
            setCompactCards: setAndPersistCompact,
            tcgMode,
            tcgSettingsLoaded,
            setTCGMode: setAndPersistTCG,
            language,
            setLanguage: setAndPersistLanguage,
        }),
        [vibrationsEnabled, compactCards, tcgMode, tcgSettingsLoaded, setAndPersistTCG, language, setAndPersistLanguage]
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be inside a SettingsProvider");
    return ctx;
}
