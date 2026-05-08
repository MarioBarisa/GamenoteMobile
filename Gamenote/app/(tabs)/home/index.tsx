import {ScrollView, StyleSheet, Text, View} from "react-native";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";
import GameCard from '@/components/GameCard';
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";

// noinspection JSUnusedGlobalSymbols
export default function HomeIndex() {
  const { theme } = useTheme()
  const t = colors[theme]

  let playtime = 0;
  for( const game of PLACEHOLDER_GAMES){
    // @ts-ignore
    playtime = playtime + game.play_time;
  }

  let gameNumber = PLACEHOLDER_GAMES.length;

  let finishedGames = 0;
  for( const game of PLACEHOLDER_GAMES){
    if(game.status==='completed'){
      finishedGames += 1;
    }
  }

  return (
      <ScrollView
          style={{backgroundColor: t.background}}
          contentContainerStyle={{padding: 16, gap: 0}}
          contentInsetAdjustmentBehavior="automatic"
      >
        <View style={{flexDirection: "row", gap: 12, marginBottom:12, padding: 16, justifyContent: "center", backgroundColor: t.backgroundModal, borderRadius: 12,}}>
          <View>
            <Text style={[styles.name, {color: t.text}]}>Ukupno igara</Text>
            <Text style={{textAlign: "center", color: "#F43098", fontSize: 16, fontWeight: "bold"}}>{gameNumber}</Text>
          </View>
          <View>
            <Text style={[styles.name, {color: t.text}]}>Vrijeme igranja</Text>
            <Text style={{textAlign: "center", color: "#00D3BC", fontSize: 16, fontWeight: "bold"}}>{playtime}</Text>
          </View>
          <View>
            <Text style={[styles.name, {color: t.text}]}>Završene igre</Text>
            <Text style={{textAlign: "center", color: "#00D391", fontSize: 16, fontWeight: "bold"}}>{finishedGames}</Text>
          </View>
        </View>
        {PLACEHOLDER_GAMES.filter(g => g.status === 'playing').map((game, i) => (
            <GameCard key={i} game={game}/>
        ))}
      </ScrollView>
  )
}

const styles = StyleSheet.create({
  name: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  type: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginLeft: 80,
  },
});
