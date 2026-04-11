import { Text, ScrollView, Image, StyleSheet, View } from "react-native";
import { useFavorites } from "@/context/favorites";
import { Link } from "expo-router";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";


export default function FavoritesScreen() {

  const { favorites } = useFavorites();

  const { theme } = useTheme();
  const t = colors[theme];


  return (
    <ScrollView
      contentContainerStyle={{
        gap: 10,
        padding: 8,
      }}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets={true}
      style={{backgroundColor: t.background}}
    >
      {favorites.length === 0 ? (
        <Text style={{color: t.text}}>You dont have any favorites yet.</Text>
      ) : (
          favorites.map((pokemon) => (
            <Link
              key={pokemon.name}
              href={{pathname: "/details", params: {name: pokemon.name}}}
            >
              <View style={{ alignItems: "center" , width: "100%", backgroundColor: t.card, borderRadius: 20, padding:20}}>
              <Image source={{ uri: pokemon.imageFront }} style={{ width: 100, height: 100 }}></Image>
              <Text style={[styles.name, {color: t.text}]}>#{ pokemon.id} - {pokemon.name}</Text>
              </View>
            </Link>
          ))
      )}
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
