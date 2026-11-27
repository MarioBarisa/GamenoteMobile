import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {changeLanguage, getCurrentLanguage} from "@/utils/i18n";
import {preloadFoilTextures} from "@/services/foilTextures";

const VIBRATIONS_KEY = "vibrationsEnabled";
const COMPACT_KEY = "compactCards";
const LANGUAGE_KEY = "appLanguage";
const TCG_KEY = "tcgMode";
const LOCAL_MODE_KEY = "localModeEnabled";
const SOURCE_KEY = "activeSource";
const LOCAL_ONBOARDING_KEY = "localModeOnboardingSeen";

export type AccountSource = "cloud" | "local";
type SourceSettings = {enabled: boolean; source: AccountSource; onboardingSeen: boolean};
let cloudAvailable = false;

export function isCloudSourceAvailable() {
    return cloudAvailable;
}

type SettingsContextValue = {
    vibrationsEnabled: boolean;
    setVibrationsEnabled: (value: boolean) => void;
    compactCards: boolean;
    setCompactCards: (value: boolean) => void;
    tcgMode: boolean;
    tcgSettingsLoaded: boolean;
    setTCGMode: (value: boolean) => void;
    localModeEnabled: boolean;
    localSettingsLoaded: boolean;
    activeSource: AccountSource;
    setLocalModeEnabled: (value: boolean) => Promise<boolean>;
    activateLocalMode: () => Promise<void>;
    claimLocalModeOnboarding: () => boolean;
    setActiveSource: (source: AccountSource) => Promise<void>;
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
    const [sourceSettings, setSourceSettings] = useState<SourceSettings | null>(null);
    const currentSource = useRef<SourceSettings | null>(null);
    const [language, setLanguageState] = useState(getCurrentLanguage());

    useEffect(() => {
        let cancelled = false;
        AsyncStorage.getItem(TCG_KEY).then(value => {
            if (!cancelled && !tcgChanged.current && value !== null) {
                if (value === "true") void preloadFoilTextures();
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

    const applySourceSettings = useCallback((next: SourceSettings) => {
        currentSource.current = next;
        cloudAvailable = next.source === "cloud";
        setSourceSettings(next);
    }, []);

    useEffect(() => {
        let active = true;
        AsyncStorage.multiGet([LOCAL_MODE_KEY, SOURCE_KEY, LOCAL_ONBOARDING_KEY]).then(rows => {
            if (!active) return;
            const settings = Object.fromEntries(rows);
            const enabled = settings[LOCAL_MODE_KEY] === "true";
            applySourceSettings({
                enabled,
                source: enabled && settings[SOURCE_KEY] === "local" ? "local" : "cloud",
                onboardingSeen: settings[LOCAL_ONBOARDING_KEY] === "true",
            });
        }).catch(() => {
            if (active) applySourceSettings({enabled: false, source: "cloud", onboardingSeen: false});
        });
        return () => { active = false; };
    }, [applySourceSettings]);

    const setLocalModeEnabled = useCallback(async (enabled: boolean) => {
        const previous = currentSource.current;
        if (!previous || previous.enabled === enabled) return false;
        const next: SourceSettings = {
            enabled, source: enabled ? previous.source : "cloud", onboardingSeen: previous.onboardingSeen || enabled,
        };
        await AsyncStorage.multiSet([
            [LOCAL_MODE_KEY, String(next.enabled)], [SOURCE_KEY, next.source],
            [LOCAL_ONBOARDING_KEY, String(next.onboardingSeen)],
        ]);
        applySourceSettings(next);
        return enabled && !previous.onboardingSeen;
    }, [applySourceSettings]);

    const activateLocalMode = useCallback(async () => {
        const previous = currentSource.current;
        if (!previous || previous.source === "local") return;
        await AsyncStorage.multiSet([[LOCAL_MODE_KEY, "true"], [SOURCE_KEY, "local"]]);
        applySourceSettings({...previous, enabled: true, source: "local"});
    }, [applySourceSettings]);

    const claimLocalModeOnboarding = useCallback(() => {
        const previous = currentSource.current;
        if (!previous || previous.source !== "local" || previous.onboardingSeen) return false;
        applySourceSettings({...previous, onboardingSeen: true});
        void AsyncStorage.setItem(LOCAL_ONBOARDING_KEY, "true").catch(() => {});
        return true;
    }, [applySourceSettings]);

    const setActiveSource = useCallback(async (source: AccountSource) => {
        const previous = currentSource.current;
        if (!previous?.enabled || previous.source === source) return;
        await AsyncStorage.setItem(SOURCE_KEY, source);
        applySourceSettings({...previous, source});
    }, [applySourceSettings]);

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
        if (value) void preloadFoilTextures();
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
            localModeEnabled: sourceSettings?.enabled ?? false,
            localSettingsLoaded: sourceSettings !== null,
            activeSource: sourceSettings?.source ?? "cloud",
            setLocalModeEnabled,
            activateLocalMode,
            claimLocalModeOnboarding,
            setActiveSource,
            language,
            setLanguage: setAndPersistLanguage,
        }),
        [vibrationsEnabled, compactCards, tcgMode, tcgSettingsLoaded, setAndPersistTCG, sourceSettings, setLocalModeEnabled, activateLocalMode, claimLocalModeOnboarding, setActiveSource, language, setAndPersistLanguage]
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be inside a SettingsProvider");
    return ctx;
}
