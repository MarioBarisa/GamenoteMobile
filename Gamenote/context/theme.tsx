import {createContext, ReactNode, useContext, useMemo, useState} from "react";
import {useColorScheme} from "react-native";



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
    const [preference, setPreference] = useState<ThemePreference>("system");

   const theme = useMemo<Theme>(() => {
    if (preference === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return preference;
  }, [preference, systemScheme]);

  const value = useMemo(
    () => ({ theme, preference, setPreference }),
    [theme, preference]
  );


    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>


}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if(!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}