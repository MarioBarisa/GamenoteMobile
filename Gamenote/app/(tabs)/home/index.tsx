import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";
import GameCard, { Game } from '@/components/GameCard'
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";

// noinspection JSUnusedGlobalSymbols
export default function HomeIndex() {
  const { theme } = useTheme()
  const t = colors[theme]
  const PLACEHOLDER_IGRE = PLACEHOLDER_GAMES;

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ padding: 16, gap: 0 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {PLACEHOLDER_IGRE.map((game, i) => (
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
