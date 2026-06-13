import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const VIBRATIONS_KEY = "vibrationsEnabled";
const COMPACT_KEY = "compactCards";

type SettingsContextValue = {
    vibrationsEnabled: boolean;
    setVibrationsEnabled: (value: boolean) => void;
    compactCards: boolean;
    setCompactCards: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({children}: { children: ReactNode }) {
    const [vibrationsEnabled, setVibrationsEnabled] = useState(true);
    const [compactCards, setCompactCards] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(VIBRATIONS_KEY).then((value) => {
            if (value !== null) {
                setVibrationsEnabled(value === "true"); // VIBRACIJE ZA TAB SWITCHING
            }
        });
        AsyncStorage.getItem(COMPACT_KEY).then((value) => {
            if (value !== null) {
                setCompactCards(value === "true");
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

    const value = useMemo(
        () => ({vibrationsEnabled, setVibrationsEnabled: setAndPersistVibrations, compactCards, setCompactCards: setAndPersistCompact}),
        [vibrationsEnabled, compactCards]
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings moraju biti u context provideru!!");
    return ctx;
}
