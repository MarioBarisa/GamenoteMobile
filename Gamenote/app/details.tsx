import { useLocalSearchParams, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, Pressable, } from "react-native";
import {Game} from "@/components/GameCard";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";


export default function Index() {
            const { theme } = useTheme();
            const t = colors[theme];
            const STATUS_CONFIG = {playing: {label: "Playing", bg: '#0A84FF', text: '#FFFFFF'},
                                    paused: {label: "Paused", bg: '#FF9F0A', text: '#FFFFFF'},
                                    completed: {label: "Completed", bg: '#30D158', text: '#FFFFFF'},
                                    dropped: {label: "Dropped", bg: '#FF453A', text: '#FFFFFF'},
                                    backlog: {label: "Backlog", bg: '#b364da', text: '#FFFFFF'},}

            const { game: gameParam } = useLocalSearchParams<{game: string}>()
            const game: Game | null = (()=>{
                try {
                    return gameParam ? JSON.parse(gameParam):null
                } catch  {
                    return null;
                }
            })();
            if(!game){
                return <Text style={{color: t.text, padding: 16}}>Igra nije pronađena</Text>
            }

    return (
      <>
            <Stack.Screen
                options={{ title: game.title, headerBackTitle: 'Natrag' }}
                   />
                 <ScrollView  contentContainerStyle ={{ gap: 10,  padding: 8}}
                                style={{backgroundColor: t.background}}
                               contentInsetAdjustmentBehavior="automatic"
                               automaticallyAdjustContentInsets={true}>

                     {/* Cover slika */}
                     {(game.image_url || game.background_image) && (
                         <Image
                             source={{uri: game.image_url || game.background_image}}
                             style={styles.coverImage}
                             resizeMode="cover" />
                     )}

                     {(game.status && (
                         <View style={[styles.badge, {backgroundColor: STATUS_CONFIG[game.status]?.bg}]}>
                             <Text style={{color: '#fff', fontWeight: '700'}}>
                                 {STATUS_CONFIG[game.status]?.label}
                             </Text>
                         </View>
                     ))}
                </ScrollView>
      </>
  );
}


const styles = StyleSheet.create({
    coverImage: {width: '100%', height: 220, borderRadius: 12, marginBottom: 16},
    title: {fontSize: 24, fontWeight: '800', marginBottom: 8},
    badge: {alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8},
    meta: {fontSize: 13, marginTop: 4},
    notesBox: {padding: 12, borderRadius: 10, marginTop: 12},
})
