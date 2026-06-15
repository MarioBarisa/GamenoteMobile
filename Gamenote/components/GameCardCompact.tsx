import {ActionSheetIOS, Alert, StyleSheet, View, Text, Image, Pressable, useWindowDimensions} from 'react-native'
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

export default function GameCardCompact({ game, onDelete }: Props) {
  const { theme } = useTheme()
  const t = colors[theme]
  const router = useRouter();
  const segments = useSegments();
  const tab = segments[1] as 'home' | 'favorites' | 'search'; // GDJE SE MOŽE KORISTIT?
  const {width: SCREEN_WIDTH} = useWindowDimensions();
  const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;

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
        options: ['Uredi', 'Izbriši', 'Odustani'], //ODUSTANI NEMA GUMB JER KLIK IZVAN ACTION SHEET-A GA DISSMISA, isto u GameCard.tsx!
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
              {width: CARD_WIDTH, backgroundColor: t.card, borderColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'},
            ]}>
              <View style={styles.imageContainer}>
                {imageUri ? (
                  <Image source={{ uri: imageUri[0] }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: t.background }]}>
                    <Text style={{ color: t.secondaryText, fontSize: 12 }}>Nema slike</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
                  {game.title}
                </Text>

                <View style={styles.infoRow}>
                  {game.status && STATUS_CONFIG[game.status] ? (
                    <View style={[styles.badge, {backgroundColor: STATUS_CONFIG[game.status].bg, marginRight: 6}]}>
                      <Text style={[styles.badgeText, {color: STATUS_CONFIG[game.status].text}]}>
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
                          size={12}
                          color={star<=game.rating! ? '#FF9F0A' : t.secondaryText}
                          style={{marginRight: 2}}/>
                      ))}
                    </View>
                  ) : null}
                </View>

                {game.platform && STATUS_PLATFORM[game.platform] ? (
                  <View style={[styles.platformBadge, {backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7'}]}>
                    <Text style={[styles.platformText, {color: STATUS_PLATFORM[game.platform].text}]} numberOfLines={1} ellipsizeMode="tail">
                      {typeof game.play_time === 'number'
                        ? `${game.play_time}h via ${STATUS_PLATFORM[game.platform].label}`
                        : `via ${STATUS_PLATFORM[game.platform].label}`}
                    </Text>
                  </View>
                ) : null}

                {typeof game.progress_value === 'number' && typeof game.progress_total === 'number' && game.progress_total > 0 ? (
                  <View style={styles.progressSection}>
                    <View style={[styles.progressTrack, {backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'}]}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: prColor }]} />
                    </View>
                    <View style={styles.progressLabels}>
                      <Text style={[styles.progressLabel, {color: t.text}]}>
                        {Math.min(game.progress_value, game.progress_total)}/{game.progress_total}
                      </Text>
                      <Text style={[styles.progressPercent, {color: t.secondaryText}]}>
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
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
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
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 16,
    marginLeft: 6,
    marginBottom: 6,
  },
  platformText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  progressSection: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 3,
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
    fontSize: 9,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 9,
  },
})
