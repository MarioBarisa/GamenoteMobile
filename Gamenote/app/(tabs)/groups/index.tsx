import {Text, ScrollView, StyleSheet, TextInput, View, Button, Alert} from "react-native";
import { useState } from "react";
import { useFavorites } from "@/context/favorites";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";


export default function FavoritesScreen() {

  const { theme } = useTheme();
  const t = colors[theme];


  return (

      <ScrollView style={{backgroundColor: t.background}}>

      </ScrollView>
  );
}


const styles = StyleSheet.create({
  name: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center"
  },

  text:{
    fontSize: 20,
    paddingTop: 50,
    paddingBottom: 5,
    fontWeight: "bold",
    textAlign: "center"
  },
    textBody:{
    fontSize: 15,
    padding: 5,
    fontWeight: "600", //semibold == 600
    alignItems: "flex-start"
  },

  textMain:{
    fontSize: 35,
    padding: 15,
    fontWeight: "bold",
    textAlign: "center"
  },

    textBodyCenterHiglighted: {
      fontSize: 15,
      fontWeight: "bold",
      textAlign: "center"
    },

    systemInput: {
      backgroundColor: "rgba(118, 118, 128, 0.12)",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 7,
      fontSize: 17,
      marginHorizontal: 16,
    },

});
