import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";
import GameCard, { Game } from '@/components/GameCard'



const PLACEHOLDER_GAMES: Game[] = [
      {
    title: 'Splatoon 2',
    platform: 'Nintendo Switch',
    genre: 'Shooter',
    status: 'playing',
    rating: 5,
    play_time: 10000,
    progress_value: 98,
    progress_total: 100,
    image_url: 'https://media.rawg.io/media/games/24b/24b68f500fd138c3146d8856f0dd55b4.jpg'
  },
  {
    title: 'The Legend of Zelda: Tears of the Kingdom',
    platform: 'Nintendo Switch 2',
    genre: 'Adventure',
    status: 'playing',
    rating: 4,
    play_time: 10,
    progress_value: 106,
    progress_total: 152,
    image_url: 'https://imgs.search.brave.com/2cSE4AyYrHjAAvueNp8XOOWOgsBWRCW-ZjnCKNcHXAI/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMwLnBvbHlnb25p/bWFnZXMuY29tL3dv/cmRwcmVzcy93cC1j/b250ZW50L3VwbG9h/ZHMvY2hvcnVzL3Vw/bG9hZHMvY2hvcnVz/X2Fzc2V0L2ZpbGUv/MjQ1ODI5MDQvemVs/ZGFfbWFzdGVyX3N3/b3JkX3RvdGsuanBn/P3E9NDkmZml0PWNy/b3Amdz02NDImaD0z/OTMmZHByPTI'
  },
  {
    title: 'Persona 5 Royal',
    platform: 'PlayStation 5',
    status: 'dropped',
    rating: 1,
    play_time: 102,
    progress_value: 0,
    progress_total: 100,
    image_url: 'https://imgs.search.brave.com/zJWaU601KmF-GXFWqrVQau3ilaFBFSmJ6T49xtUDBjo/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvZmVhdHVy/ZWQvcGVyc29uYS01/LXBpY3R1cmVzLXZ4/eTNodTV5bzVjZWxo/bWIuanBn'
  },
  {
    title: 'Hollow Knight',
    platform: 'Nintendo Switch',
    status: 'backlog',
    rating: 4,
    play_time: 102,
    image_url: 'https://imgs.search.brave.com/rGo8wNTrFG5myKCED8JEG-u_5X9FJ-L5JW9Pf_t5ENQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJjYXZlLmNv/bS93cC93cDcwOTc0/MDguanBn'
  },
]

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
      {PLACEHOLDER_GAMES.map((game, i) => (
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
