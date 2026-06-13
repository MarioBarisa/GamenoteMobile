import {ScrollView, View} from "react-native";
import { useTheme } from "@/context/theme";
import { useSettings } from "@/context/settings";
import { colors } from "@/constants/theme";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import GameCard from "@/components/GameCard";
import GameCardCompact from "@/components/GameCardCompact";


export default function FavoritesScreen() {

  const { theme } = useTheme();
  const t = colors[theme];
  const {compactCards} = useSettings();


  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ padding: 16, gap: 0 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {compactCards ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
          {PLACEHOLDER_GAMES.map((game, i) => (
            <GameCardCompact key={i} game={game} />
          ))}
        </View>
      ) : (
        PLACEHOLDER_GAMES.map((game, i) => (
          <GameCard key={i} game={game} />
        ))
      )}
    </ScrollView>
  );
}


