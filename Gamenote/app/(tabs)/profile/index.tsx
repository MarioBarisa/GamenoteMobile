import {Text, ScrollView, StyleSheet, TextInput, View, Button, Alert} from "react-native";
import { useState } from "react";
import { useFavorites } from "@/context/favorites";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";


export default function FavoritesScreen() {

  const { favorites } = useFavorites();
  let [loggedIn, setLoggedIn] = useState(false);
  let [username, setUsername] = useState("");
  let [password, setPassword] = useState("");
  const { theme } = useTheme();
  const t = colors[theme];

  return (

      <ScrollView style={{backgroundColor: t.background}}>
        <Text style={[styles.textMain, {color: t.text}]}>{loggedIn ? "Pozdrav, " + username + "!" : "Niste prijavljeni."}</Text>
        {loggedIn && (
            <View>
               <Text style={[styles.textBody, {color: t.text}]}>Broj omiljenih igara: {favorites.length}</Text>
               <Button
                   title={"Odjavi se."}
                   color={t.destructive}
                   onPress={()=>{
                     setLoggedIn(false);
                     Alert.alert("Logged out", "You are logged out.")
                   }}/>
            </View>
        )}

        {!loggedIn && (
            <View>
              <Text style={[styles.textBodyCenterHiglighted, {color: t.accent}]}>Napravite profil ili se prijavite.</Text>
              <View style={{padding: 15, gap: 8, marginTop: 10}}>
                <TextInput
                    placeholder="Gamenote Username"
                    placeholderTextColor={t.secondaryText}
                    clearButtonMode="unless-editing"
                    style={[styles.systemInput, {color: t.text}]}
                    onChangeText={setUsername}
                />
                <TextInput
                    placeholder="Gamenote Password"
                    placeholderTextColor={t.secondaryText}
                    clearButtonMode="unless-editing"
                    style={[styles.systemInput, {color: t.text}]}
                    onChangeText={setPassword}
                />

                <Button
                    accessibilityLabel="Login button"
                    title={"Prijavi se."}
                    color={t.accent}
                    onPress={() => {
                      if(password === ""){
                        Alert.alert("Fali lozinka.", "Unesite ispravnu lozinku.")
                      }else{
                        setLoggedIn(true);
                      }
                    }}/>

              </View>
            </View>
        )}
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
