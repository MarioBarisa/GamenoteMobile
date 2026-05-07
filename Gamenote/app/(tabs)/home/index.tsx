import { ScrollView, StyleSheet } from "react-native";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";
import GameCard from '@/components/GameCard';
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";

// noinspection JSUnusedGlobalSymbols
export default function HomeIndex() {
  const { theme } = useTheme()
  const t = colors[theme]

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ padding: 16, gap: 0 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      { PLACEHOLDER_GAMES.filter(g => g.status === 'playing').map((game, i) => (
        <GameCard key={i} game={game} />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  name: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    marginLeft: 80,
  },
  type: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginLeft: 80,
  },
});
