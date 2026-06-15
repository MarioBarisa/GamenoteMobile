import {ActionSheetIOS, Alert, View, Text, StyleSheet, Image, Pressable, useWindowDimensions} from 'react-native'
import { colors } from '@/constants/theme'
import { useTheme } from '@/context/theme'
import {Ionicons} from "@expo/vector-icons";
import {useRouter, useSegments} from "expo-router";
import {Game} from "@/common/Game"
import {STATUS_CONFIG, STATUS_PLATFORM} from "@/common/StatusCommons";
import {achievementPercent, progressColor} from "@/common/ProgressSources";
import * as Haptics from 'expo-haptics';

interface Props {
  game: Game
  onDelete?: (gameId: string) => void
}

export default function GameCard({ game, onDelete }: Props) {
  const { theme } = useTheme()
  const t = colors[theme]
    const router = useRouter();
    const segments = useSegments();
    const tab = segments[1] as 'home' | 'favorites' | 'search';
    const {width: SCREEN_WIDTH} = useWindowDimensions();
    const isLargeScreen = SCREEN_WIDTH >= 400;

  const handlePress = () => {
      router.push({
          pathname: `/${tab}/details`,
          params: {game: JSON.stringify(game)},
      })
  }

  const handleEdit = () => {
    router.push({
      pathname: '/(modals)/modalEdit',
      params: {game: JSON.stringify(game)},
    })
  }

  const handleDelete = () => {
    Alert.alert('Izbriši igru', `Jesi li siguran da želiš izbrisati "${game.title}"?`, [
      {text: 'Odustani', style: 'cancel'},
      {text: 'Izbriši', style: 'destructive', onPress: () => onDelete?.(game.game_id)},
    ])
  }

  const handleContextMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: game.title,
        options: ['Uredi', 'Izbriši', 'Odustani'],
        cancelButtonIndex: 2,
        destructiveButtonIndex: 1,
      },
      (index) => {
        if (index === 0) handleEdit()
        if (index === 1) handleDelete()
      },
    )
  }

  const imageUri = game.image_url || game.background_image || null;

  const pct = achievementPercent(game.progress_value, game.progress_total);
  const prColor = progressColor(game.progress_value, game.progress_total);

  return (
      <Pressable onPress={handlePress} onLongPress={handleContextMenu} accessibilityLabel={`Otvori detalje igre ${game.title}`} style={({pressed})=>[{opacity: pressed ? 0.8 : 1}]}>
            <View style={[
              styles.card,
              {
                backgroundColor: t.card,
                borderColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
              },
            ]}>

              {/* cover slika igre */}
              <View style={styles.imageContainer}>
                {imageUri ? (
                  <Image
                  source={{ uri: imageUri[0] }}
                  style={[styles.image, { resizeMode: 'cover' }]}
                />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: t.background }]}>
                    <Text style={{ color: t.secondaryText, fontSize: isLargeScreen ? 15 : 13 }}>Nema slike</Text>
                  </View>
                )}
              </View>

              {/* body igre */}
              <View style={[styles.cardBody, {padding: isLargeScreen ? 10 : 8}]}>
                <Text style={[styles.title, { color: t.text, fontSize: isLargeScreen ? 18 : 16 }]} numberOfLines={2}>
                  {game.title}
                </Text>

                    {/* stanje igre i ocjena */}
                    <View style={styles.infoRow}>
                        {game.status && STATUS_CONFIG[game.status] ? (
                            <View style={[
                                styles.badge,
                                {backgroundColor: STATUS_CONFIG[game.status].bg, marginRight: 8}
                            ]}>
                                <Text style={[styles.badgeText, {color: STATUS_CONFIG[game.status].text, fontSize: isLargeScreen ? 13 : 11}]}>
                                    {STATUS_CONFIG[game.status].label}
                                </Text>
                            </View>
                        ) : null}


                        {typeof game.rating === 'number' ? (
                            <View style={styles.ratingRow}>
                                {[1,2,3,4,5].map(star => (
                                    <Ionicons
                                        key={star}
                                        name={star <= game.rating! ? 'star' : 'star-outline'}
                                    size={isLargeScreen ? 16 : 14}
                                    color={star<=game.rating! ? '#FF9F0A' : t.secondaryText}
                                    style={{marginRight: 2}}/>
                                ))}
                            </View>
                        ) : null}
                    </View>


                  {/*Platforma i vrijeme igranja*/}
                  <View style={styles.infoRow}>
                        {game.platform && STATUS_PLATFORM[game.platform] ? (
                            <View style={[
                                styles.badge,
                                {
                                  marginRight: 8,
                                  backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                                }
                            ]}>
                                <Text style={[styles.badgePlaytime, {color: STATUS_PLATFORM[game.platform].text, fontSize: isLargeScreen ? 13 : 11}]}>
                                    {typeof game.play_time === 'number'
                                      ? `${game.play_time}h via ${STATUS_PLATFORM[game.platform].label}`
                                      : `via ${STATUS_PLATFORM[game.platform].label}`}
                                </Text>
                            </View>
                        ) : null}
                  </View>

                    {/*Progress bar*/}
                    {typeof game.progress_value === 'number' && typeof game.progress_total === 'number' && game.progress_total > 0 ? (
                        <View style={styles.progressSection}>
                            <View style={[styles.progressTrack, {backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA' }]}>
                                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: prColor }]} />
                            </View>
                            <View style={styles.progressLabels}>
                                <Text style={[styles.progressLabel, {color: t.text, fontSize: isLargeScreen ? 12 : 10}]}>
                                    {Math.min(game.progress_value, game.progress_total)}/{game.progress_total}
                                </Text>
                                <Text style={[styles.progressPercent, {color: t.secondaryText, fontSize: isLargeScreen ? 12 : 10}]}>
                                    {pct}%
                                </Text>

                            </View>
                        </View>
                    ) : null}
              </View>
            </View>
      </Pressable>
  )
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        aspectRatio: 16 / 9,
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
    cardBody: {
        padding: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        paddingHorizontal: 10,
        paddingTop: 6,
        paddingBottom: 4,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      padding: 4,
      marginBottom: 5,
    },
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 16,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
     badgePlaytime: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      fontSize: 12,
      marginLeft: 4,
    },
    progressSection: {
        marginTop: 4 },
    progressTrack: {
      height: 4,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 4,
      marginLeft: 10,
      marginRight: 10,
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 10,
    },
    progressPercent: {
        fontSize: 10,
        marginRight: 10,
    },
})