import {View, Text, StyleSheet, Dimensions, Image} from 'react-native'
import { colors } from '@/constants/theme'
import { useTheme } from '@/context/theme'
import {Ionicons} from "@expo/vector-icons";

export interface Game {
  title: string
  platform?: string
  genre?: string
  status?: 'playing' | 'paused' | 'completed' | 'dropped' | 'backlog'
  rating?: number
  notes?: string
  image_url?: string
  background_image?: string
  play_time?: number
  start_date?: string
  end_date?: string
  progress_value?: number
  progress_total?: number
  progress_source?: string
  progress_mode?: string
}

const STATUS_CONFIG = {
    playing: {label: "Playing", bg: '#0A84FF', text: '#FFFFFF'},
    paused: {label: "Paused", bg: '#FF9F0A', text: '#FFFFFF'},
    completed: {label: "Completed", bg: '#30D158', text: '#FFFFFF'},
    dropped: {label: "Dropped", bg: '#FF453A', text: '#FFFFFF'},
    backlog: {label: "Backlog", bg: '#b364da', text: '#FFFFFF'},
}

const STATUS_PLATFORM: Record<string, { label: string; text: string }> = {
    PlayStation: {label: "PlayStation", text: '#2760f4'},
    'PlayStation 5': {label: "PlayStation 5", text: '#2760f4'},
    'PlayStation 4': {label: "PlayStation 4", text: '#2760f4'},

    Xbox: {label: "Xbox", text: '#27f427'},
    'Xbox Series X/S': {label: "Xbox Series X/S", text: '#27f427'},
    'Xbox One': {label: "Xbox One", text: '#27f427'},

    Nintendo: {label: "Nintendo",text: '#eb0e30'},
    'Nintendo Switch': {label: "Nintendo Switch", text: '#eb0e30'},
    'Nintendo Switch 2': {label: "Nintendo Switch 2", text: '#eb0e30'},

    PC: {label: "PC", text: '#0df9e1'},
    iOS: {label: "iOS", text: '#FFFFFF'},
    Android: {label: "Android", text: '#FFFFFF'},
    Other: {label: "Other", text: '#a3a3a3'},
}


const CARD_WIDTH = Dimensions.get('window').width-32;
const IMAGE_HEIGHT = Math.round(CARD_WIDTH * 8 / 16); //za 16:9 cover

interface Props {
  game: Game
}

export default function GameCard({ game }: Props) {
  const { theme } = useTheme()
  const t = colors[theme]

  const imageUri = game.image_url || game.background_image || null;

  const achievementPercent = (() => {
  if (!game.progress_value || !game.progress_total) return 0
  const v = Math.min(game.progress_value, game.progress_total)
  return Math.round((v / game.progress_total) * 100)
})()

    //BOJE PROGRESS BARA PREMA POSTOTKU PROLAZNOSTI
  const progressColor = (() => {
    const clamped = Math.max(0, Math.min(achievementPercent, 100))
    if (clamped >= 100) return '#0d36f9'
    if (clamped >= 98) return '#f90d74'
    if (clamped >= 95) return '#12f90d'
    if (clamped >= 90) return '#22C55E'
    if (clamped >= 70) return '#84CC16'
    if (clamped >= 45) return '#FACC15'
    if (clamped >= 20) return '#F97316'
    return '#EF4444'
  })()

  return (

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
          source={{ uri: imageUri }}
          style={[styles.image, { resizeMode: 'cover' }]}
        />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: t.background }]}>
            <Text style={{ color: t.secondaryText, fontSize: 13 }}>Nema slike</Text>
          </View>
        )}
      </View>

      {/* body igre */}
      <View style={styles.cardBody}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
          {game.title}
        </Text>

            {/* stanje igre i ocjena */}
            <View style={styles.infoRow}>
                {game.status && STATUS_CONFIG[game.status] ? (
                    <View style={[
                        styles.badge,
                        {backgroundColor: STATUS_CONFIG[game.status].bg, marginRight: 8}
                    ]}>
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
                            size={14}
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
                        <Text style={[styles.badgePlaytime, {color: STATUS_PLATFORM[game.platform].text}]}>
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
                        <View style={[styles.progressFill, { width: `${achievementPercent}%` as any, backgroundColor: progressColor }]} />
                    </View>
                    <View style={styles.progressLabels}>
                        <Text style={[styles.progressLabel, {color: t.text}]}>
                            {Math.min(game.progress_value, game.progress_total)}/{game.progress_total}
                        </Text>
                        <Text style={[styles.progressPercent, {color: t.secondaryText}]}>
                            {achievementPercent}%
                        </Text>

                    </View>
                </View>
            ) : null}
      </View>
    </View>
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
        height: IMAGE_HEIGHT,
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