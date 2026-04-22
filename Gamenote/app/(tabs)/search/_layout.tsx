import { Stack } from "expo-router";
import {useNavigationTheme} from "@/constants/navigationTheme";

// noinspection JSUnusedGlobalSymbols
export default function SearchLayout() {
    const navTheme = useNavigationTheme();
  return (
    <Stack screenOptions={navTheme}>
      <Stack.Screen
        name="index"
        options={{
          title: "Pretraži Gamenote",
        }}
      />
    </Stack>
  );
}
