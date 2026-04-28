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
            const { theme } = useTheme();
            const t = colors[theme];

    return (
      <>
            <Stack.Screen
                options={{}}
                   />

    <ScrollView
    contentContainerStyle ={{
        gap: 10,
        padding: 8
      }}
    style={{backgroundColor: t.background}}
   contentInsetAdjustmentBehavior="automatic"
   automaticallyAdjustContentInsets={true}>
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
