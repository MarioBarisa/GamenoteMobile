import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";


interface Poke {
  name: string;
  url: string;
  imageFront: string;
  imageBack: string;
  types: PokeType[];
}

interface PokeType {
  type: {
    name: string;
    url: string;
  };
}

const colorByType = {
  grass: "lightgreen",
  water: "lightblue",
  fire: "#ff6666",
  bug: "lightgreen",
  normal: "gray",
  electric: "yellow",
  ground: "brown",
  poison: "purple",
  fairy: "pink",
};

// noinspection JSUnusedGlobalSymbols
export default function HomeIndex() {
  const [pokemons, setPokemons] = useState<Poke[]>([]);

  useEffect(() => {
    const fetchPokemon = async () => {
      try {
        const response = await fetch(
          "https://pokeapi.co/api/v2/pokemon/?limit=40",
        );
        const data = await response.json();

        const detailedPokemon = await Promise.all(
          data.results.map(async (pokemon: Poke) => {
            const res = await fetch(pokemon.url);
            const details = await res.json();
            return {
              name: pokemon.name,
              imageFront: details.sprites.front_default,
              imageBack: details.sprites.back_default,
              types: details.types,
            };
          }),
        );

        setPokemons(detailedPokemon);
      } catch (error) {
        console.log(error);
      }
    };

    fetchPokemon();
  }, []);

  const { theme } = useTheme();
  const t = colors[theme];

  return (
    <>
      <ScrollView
          style={{backgroundColor: t.background}}
        contentContainerStyle={{
          gap: 10,
          padding: 8,
        }}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets={true}
      >
        {pokemons.map((pokemon) => (
          <Link
            key={pokemon.name}
            href={{ pathname: "/details", params: { name: pokemon.name } }}
            style={{
              // @ts-ignore
              backgroundColor: colorByType[pokemon.types[0].type.name],
              padding: 20,
              borderRadius: 15,
            }}
          >
            <View
              style={{
                // @ts-ignore
                backgroundColor: colorByType[pokemon.types[0].type.name],
                padding: 20,
                borderRadius: 15,
                alignItems: "center",
              }}
            >
              <Text style={styles.name}>{pokemon.name}</Text>
              <Text style={styles.type}>{pokemon.types[0].type.name} type</Text>
              <View
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  marginLeft: 80,
                }}
              >
                <Image
                  source={{ uri: pokemon.imageFront }}
                  style={{
                    width: 125,
                    height: 125,
                  }}
                />
              </View>
            </View>
          </Link>
        ))}
      </ScrollView>
    </>
  );
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
