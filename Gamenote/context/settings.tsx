import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const VIBRATIONS_KEY = "vibrationsEnabled";

type SettingsContextValue = {
    vibrationsEnabled: boolean;
    setVibrationsEnabled: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({children}: { children: ReactNode }) {
    const [vibrationsEnabled, setVibrationsEnabled] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(VIBRATIONS_KEY).then((value) => {
            if (value !== null) {
                setVibrationsEnabled(value === "true"); // VIBRACIJE ZA TAB SWITCHING
            }
        });
    }, []);

    const setAndPersist = (value: boolean) => {
        setVibrationsEnabled(value);
        AsyncStorage.setItem(VIBRATIONS_KEY, String(value));
    };

    const value = useMemo(
        () => ({vibrationsEnabled, setVibrationsEnabled: setAndPersist}),
        [vibrationsEnabled]
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings moraju biti u context provideru!!");
    return ctx;
}
