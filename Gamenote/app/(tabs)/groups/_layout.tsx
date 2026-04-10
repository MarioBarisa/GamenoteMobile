import { Stack } from "expo-router";
import {useNavigationTheme} from "@/constants/navigationTheme";

export default function FavoritesLayout() {
    const navTheme = useNavigationTheme();
  return (
    <Stack screenOptions={navTheme}>
      <Stack.Screen
        name="index"
        options={{
         // headerLargeTitle: true,
          title: "Tvoje grupe: ",
        }}
      />
    </Stack>
  );
}
