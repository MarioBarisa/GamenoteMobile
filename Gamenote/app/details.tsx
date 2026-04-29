import { useLocalSearchParams, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {Image, ScrollView, StyleSheet, Text, View, Pressable, Dimensions,} from "react-native";
import {Game} from "@/components/GameCard";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

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
                      <View style={[styles.card,
                                      {
                                        backgroundColor: t.card,
                                        borderColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                                      },
                                    ]}>

                     {/* Cover slike */}
                     {Array.isArray(game.image_url) && game.image_url.length > 0 && (
                         <ScrollView
                             horizontal
                             decelerationRate="fast"
                             snapToInterval={(SCREEN_WIDTH - 32) + 8} // širina slike + gap
                             showsHorizontalScrollIndicator={false}
                             contentContainerStyle={{
                                gap: 8,
                                paddingHorizontal: 8,
                                paddingTop: 8,
                                paddingBottom: 16
                            }}>
                             {game.image_url.map((uri)=>(
                                 <Image
                                 key={uri}
                                 source={{uri}}
                                 style={styles.coverImage}
                                 resizeMode="cover" />
                             ))}
                         </ScrollView>

                     )}

                     {(game.status && (
                         <View style={[styles.badge, {backgroundColor: STATUS_CONFIG[game.status]?.bg}]}>
                             <Text style={{color: '#fff', fontWeight: '700'}}>
                                 {STATUS_CONFIG[game.status]?.label}
                             </Text>
                         </View>
                     ))}
               </View></ScrollView>
      </>
  );
}


const styles = StyleSheet.create({
    coverImage: {
        width: SCREEN_WIDTH - 32,
        height: 240,
        borderRadius: 12,
    },
    title: {
        fontSize: 24, fontWeight: '800', marginBottom: 8},
    badge: {
        alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8},
    meta: {
        fontSize: 13, marginTop: 4},
    notesBox: {
        padding: 12, borderRadius: 10, marginTop: 12},
    card: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
})
