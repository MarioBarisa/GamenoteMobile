import {View, StyleSheet, useWindowDimensions} from 'react-native'
import {colors} from '@/constants/theme'
import {useTheme} from '@/context/theme'

// Kostur pune kartice
export function GameCardSkeleton() {
  const {theme} = useTheme()
  const t = colors[theme]
  const ghost = theme === 'dark' ? '#2C2C2E' : '#E5E5EA'

  return (
    <View style={[styles.card, {backgroundColor: t.card, borderColor: ghost}]}>
      <View style={[styles.image, {backgroundColor: ghost}]} />
      <View style={styles.body}>
        <View style={[styles.bar, {backgroundColor: ghost}]} />
        <View style={[styles.smallBar, {backgroundColor: ghost}]} />
        <View style={[styles.track, {backgroundColor: ghost}]} />
      </View>
    </View>
  )
}

// Kostur kompaktne kartice
export function GameCardCompactSkeleton() {
  const {theme} = useTheme()
  const t = colors[theme]
  const ghost = theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
  const {width} = useWindowDimensions()
  const cardWidth = (width - 32 - 12) / 2

  return (
    <View style={[styles.card, {width: cardWidth, backgroundColor: t.card, borderColor: ghost}]}>
      <View style={[styles.image, {backgroundColor: ghost}]} />
      <View style={styles.body}>
        <View style={[styles.bar, {backgroundColor: ghost}]} />
        <View style={[styles.smallBar, {backgroundColor: ghost}]} />
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
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    opacity: 0.6,
  },
  body: {
    padding: 10,
    gap: 8,
  },
  bar: {
    height: 16,
    borderRadius: 4,
    opacity: 0.6,
  },
  smallBar: {
    height: 12,
    width: '60%',
    borderRadius: 4,
    opacity: 0.6,
  },
  track: {
    height: 4,
    borderRadius: 3,
    opacity: 0.6,
  },
})
