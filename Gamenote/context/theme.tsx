import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {useColorScheme} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "themePreference";

type Theme = "light" | "dark";
type ThemePreference = "system" | Theme;

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue| undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {

    const systemScheme = useColorScheme();
    const [preference, setPreferenceState] = useState<ThemePreference>("system");

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then((value) => {
            if (value === "light" || value === "dark" || value === "system") {
                setPreferenceState(value);
            }
        });
    }, []);

    const setPreference = useCallback((value: ThemePreference) => {
        setPreferenceState(value);
        AsyncStorage.setItem(THEME_KEY, value);
    }, []);

   const theme = useMemo<Theme>(() => {
    if (preference === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return preference;
  }, [preference, systemScheme]);

  const value = useMemo(
    () => ({ theme, preference, setPreference }),
    [theme, preference, setPreference]
  );


    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>


}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if(!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
