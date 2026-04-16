import {View, Text, StyleSheet, Dimensions, Image} from 'react-native'
import { colors } from '@/constants/theme'
import { useTheme } from '@/context/theme'

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

const CARD_WIDTH = Dimensions.get('window').width-32;
const IMAGE_HEIGHT =Math.round(CARD_WIDTH*9/16); //za 16:9 cover

interface Props {
  game: Game
}

export default function GameCard({ game }: Props) {
  const { theme } = useTheme()
  const t = colors[theme]

  const imageUri = game.image_url || game.background_image || null;

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>

      {/* cover slika igre*/}
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
        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
          {game.title}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 12,
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
        padding: 12,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        padding: 12,
    },
})