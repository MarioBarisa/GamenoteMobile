import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {useColorScheme} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {colors, isValidHexColor} from "@/constants/theme";

const THEME_KEY = "themePreference";
const ACCENT_KEY = "accentColor";

type Theme = "light" | "dark";
type ThemePreference = "system" | Theme;

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  accentChoice: string | null;
  setAccentChoice: (value: string | null) => void;
  accent: string;
  themeColors: typeof colors.light;
};

const ThemeContext = createContext<ThemeContextValue| undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {

    const systemScheme = useColorScheme();
    const [preference, setPreferenceState] = useState<ThemePreference>("system");
    const [accentChoice, setAccentChoiceState] = useState<string | null>(null);

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then((value) => {
            if (value === "light" || value === "dark" || value === "system") {
                setPreferenceState(value);
            }
        });
        // Učitaj spremljeni accent
        AsyncStorage.getItem(ACCENT_KEY).then((value) => {
            if (value && isValidHexColor(value)) {
                setAccentChoiceState(value.toUpperCase());
            }
        });
    }, []);

    const setPreference = useCallback((value: ThemePreference) => {
        setPreferenceState(value);
        AsyncStorage.setItem(THEME_KEY, value);
    }, []);

    const setAccentChoice = useCallback((value: string | null) => {
        if (value === null) {
            setAccentChoiceState(null);
            AsyncStorage.removeItem(ACCENT_KEY);
            return;
        }
        // Spremi samo ispravan hex
        const clean = value.trim().toUpperCase();
        if (!isValidHexColor(clean)) return;
        setAccentChoiceState(clean);
        AsyncStorage.setItem(ACCENT_KEY, clean);
    }, []);

   const theme = useMemo<Theme>(() => {
    if (preference === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return preference;
  }, [preference, systemScheme]);

  // Boje s odabranim accentom
  const themeColors = useMemo(() => ({
    ...colors[theme],
    accent: accentChoice ?? colors[theme].accent,
  }), [theme, accentChoice]);

  const value = useMemo(
    () => ({
      theme,
      preference,
      setPreference,
      accentChoice,
      setAccentChoice,
      accent: themeColors.accent,
      themeColors,
    }),
    [theme, preference, setPreference, accentChoice, setAccentChoice, themeColors]
  );


    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>


}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if(!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
