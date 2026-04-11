import { useLocalSearchParams, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, Pressable, } from "react-native";
import { useFavorites } from "@/context/favorites";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";


    interface PokemonDetails{
        name: string;
        imageFront: string;
        imageBack: string;
        id: number,
        types: {
            type: {
                name: string
            }
        }[];
        height: number;
        weight: number;
        abilities: { ability: { name: string }}[];
        stats: {
            base_stat: number;
            stat: { name: string }
        }[];
    }

export default function Index() {

    const { name } = useLocalSearchParams<{ name: string }>();
    const [pokemon, setPokemons] = useState<PokemonDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toggleFavorite, isFavorite } = useFavorites();
    const favorite = pokemon ? isFavorite(pokemon.name) : false;
    
    useEffect(() => {
        if (!name) return;
        const fetchPokemonDetails = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch pokeon details");

                }
                const data = await response.json();
                const mapped: PokemonDetails = {
                    name: data.name,
                    imageFront: data.sprites.front_default,
                    imageBack: data.sprites.back_default,
                    id: data.id,
                    types: data.types,
                    height: data.height,
                    weight: data.weight,
                    abilities: data.abilities,
                    stats: data.stats,
                };

                setPokemons(mapped);

            }
            catch (err: any) {
                setError(err.message ?? "Unknown error");
            } finally {
                setLoading(false);
            }
        };
        fetchPokemonDetails();
    }, [name]);

    const colorByType: Record<string, string> = {
            grass: "lightgreen",
            water: "lightblue",
            fire: "#ff6666",
            bug: "lightgreen",
            normal: "gray",
            electric: "yellow",
            ground: "brown",
            poison: "purple",
            fairy: "pink"
            }


            const { theme } = useTheme();
            const t = colors[theme];

    return (
      <>
            <Stack.Screen
                options={{

                    headerRight: () => pokemon ? (
                        <Pressable
                            onPress={() =>
                                toggleFavorite({
                                    name: pokemon.name,
                                    imageFront: pokemon.imageFront,
                                    id: pokemon.id,
                                })
                            }
                        >
                            <Text style={{ fontSize: 17, fontWeight: "600", color: t.accent }}>
                                { favorite ? " Remove  " : " Add ⭐️ " }
                            </Text>

                        </Pressable>
                    ) : null,
                        }}
            />

    <ScrollView
    contentContainerStyle ={{
        gap: 10,
        padding: 8
      }}
    style={{backgroundColor: t.background}}
   contentInsetAdjustmentBehavior="automatic"
   automaticallyAdjustContentInsets={true}> 
          {loading && <Text style={{color: t.secondaryText, padding: 8}}>Loading Pokemon...</Text>}
          {error && <Text style={{color: t.destructive, padding: 8}}>{error}</Text>}
          {pokemon && ( //error ako jo nije fetch prošao da ne bude sve blank
              <View style={{ backgroundColor: colorByType[pokemon.types[0].type.name] ?? t.card, borderRadius: 25 }}>
                 <Text style={{ fontSize: 20, fontWeight: "700", textAlign: "left", padding: 12, color: "black" }}>#{pokemon.id}</Text>
                  <Text style={[styles.name, {color: "black"}]}>{pokemon.name}</Text>
                    <Text style={[styles.name, {color: "black"}]}>{pokemon.types.map((t, index) => (
                      <Text key={index}>
                          {t.type.name}
                          {index !== pokemon.types.length - 1 ? "," : ""}
                      </Text>
                  ))}</Text>
                  <View style={styles.info}>
                  <Image
                    source={{ uri: pokemon.imageFront }}
                    style={{ width: 210, height: 210 }}
                  />
                   <Image
                    source={{ uri: pokemon.imageBack}}
                    style={{ width: 210, height: 210 }}
                      />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent:"center", gap:12 }}>
                      <Text style={[styles.wh, {color: "black"}]}>Pokemon height: {pokemon.height}</Text>
                      <Text style={[styles.wh, {color: "black"}]}>Pokemon weight: {pokemon.weight}</Text>
                  </View>
                  <Text style={[styles.heding, {color: "black"}]}>Stats:</Text>
                  <View>
                      {pokemon.stats.map((s, index) => (
                          <Text style={[styles.stats, {color: "black"}]} key={index}>
                            <Text style={{fontWeight: "800", color: "black"}}>{s.stat.name}: </Text>   {s.base_stat}
                          </Text>
                      ))}
                  </View>
                   <Text style={[styles.heding, {color: "black"}]}>Abilites:</Text>
                  <View>
                      {pokemon.abilities.map((s, index) => (
                          <Text style={[styles.stats, {color: "black"}]} key={index}>
                             {index+1}. <Text style={{ fontWeight: "800", color: "black" }}> {s.ability.name}</Text>
                          </Text>
                      ))}
                  </View>
              </View>
              
          )}
    </ScrollView></>
  );
}


const styles = StyleSheet.create({
  name: {
        fontSize: 35,
        fontWeight: "bold",
        textAlign: "center",
        marginTop: 5
    },
      heding: {
        fontSize: 25,
        fontWeight: "bold",
        textAlign: "left",
        padding:8
  },

  info: {
        alignContent: "center",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    text: {
        fontSize: 20,
        fontWeight: "600",
        padding: 5,
        textAlign: "center",
        
    },
        wh: {
        fontSize: 15,
        fontWeight: "500",
        
    },
     stats: {
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 15,
        padding: 7,
        textAlign: "left"
        },
});
