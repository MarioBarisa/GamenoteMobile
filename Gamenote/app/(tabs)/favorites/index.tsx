import {  ScrollView  } from "react-native";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import GameCard from "@/components/GameCard";


export default function FavoritesScreen() {

  const { theme } = useTheme();
  const t = colors[theme];


  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ padding: 16, gap: 0 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      { PLACEHOLDER_GAMES.map((game, i) => (
        <GameCard key={i} game={game} />
      ))}
    </ScrollView>
  );
}


