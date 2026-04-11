import { ScrollView, Text } from "react-native";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";

// noinspection JSUnusedGlobalSymbols
export default function GroupsIndex() {
  const { theme } = useTheme();
  const t = colors[theme];

  return (
    <ScrollView style={{ backgroundColor: t.background }}>
      <Text style={{ color: t.text, padding: 20, textAlign: "center", fontSize: 18 }}>
        Tvoje grupe
      </Text>
    </ScrollView>
  );
}
