import { Text, ScrollView, Image, StyleSheet, View } from "react-native";
import { useFavorites } from "@/context/favorites";
import { Link } from "expo-router";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import GameCard from "@/components/GameCard";


export default function FavoritesScreen() {

  const { favorites } = useFavorites();

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


const styles = StyleSheet.create({
  name: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center"
  }
});
