import {Pressable, StyleSheet, View} from "react-native";
import {SymbolView} from "expo-symbols";
import * as Haptics from "expo-haptics";
import {useTranslation} from "react-i18next";
import {useTheme} from "@/context/theme";
import {ACCENT_PRESETS, colors, normalizeHexColor} from "@/constants/theme";
import {ColorPicker, Host} from "@expo/ui/swift-ui";
import {contentShape, labelsHidden, shapes} from "@expo/ui/swift-ui/modifiers";

export default function AccentColorPicker() {
  const {theme, accentChoice, setAccentChoice, themeColors} = useTheme();
  const {t: tr} = useTranslation();
  const c = themeColors;
  const defaultAccent = colors[theme].accent;

  const isCustom = accentChoice !== null && !ACCENT_PRESETS.includes(accentChoice);

  // Odaberi boju naglaska
  const pick = (value: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAccentChoice(value);
  };

  // Boja iz nativnog iOS pickera
  const pickNative = (value: string) => {
    const clean = normalizeHexColor(value);
    if (clean === null || clean === accentChoice) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAccentChoice(clean);
  };

  return (
    <View style={styles.wrap}>
      {/* Zadana + preset boje */}
      <View style={styles.grid}>
        <Pressable
          accessibilityLabel={tr("settings.accentDefault")}
          onPress={() => pick(null)}
          style={({pressed}) => [styles.circleOuter, {opacity: pressed ? 0.7 : 1}]}
        >
          <View style={[styles.circle, {backgroundColor: defaultAccent}]}>
            {accentChoice === null ? (
              <SymbolView name="checkmark" style={styles.check} tintColor="#FFFFFF" />
            ) : (
              <SymbolView name="arrow.counterclockwise" style={styles.check} tintColor="#FFFFFF" />
            )}
          </View>
        </Pressable>

        {ACCENT_PRESETS.map((preset) => {
          const selected = accentChoice === preset;
          return (
            <Pressable
              key={preset}
              accessibilityLabel={preset}
              onPress={() => pick(preset)}
              style={({pressed}) => [styles.circleOuter, {opacity: pressed ? 0.7 : 1}]}
            >
              <View
                style={[
                  styles.circle,
                  {backgroundColor: preset, borderColor: selected ? c.text : "transparent"},
                ]}
              >
                {selected ? (
                  <SymbolView name="checkmark" style={styles.check} tintColor="#FFFFFF" />
                ) : null}
              </View>
            </Pressable>
          );
        })}

        {/* Prilagođena boja, dodir otvara nativni iOS picker */}
        <View style={styles.circleOuter} accessible accessibilityLabel={tr("settings.accentCustom")}>
          <View
            style={[
              styles.circle,
              isCustom
                ? {backgroundColor: accentChoice, borderColor: c.text}
                : {backgroundColor: "transparent", borderColor: c.secondaryText},
            ]}
          >
            {isCustom ? (
              <SymbolView name="checkmark" style={styles.check} tintColor="#FFFFFF" />
            ) : (
              <SymbolView name="eyedropper" style={styles.check} tintColor={c.secondaryText} />
            )}
          </View>
          {/* Nevidljivi nativni picker hvata dodir */}
          <Host alignment="center" style={styles.nativeOverlay}>
            <ColorPicker
              label=""
              selection={accentChoice ?? defaultAccent}
              onSelectionChange={pickNative}
              modifiers={[
                contentShape(shapes.rectangle()),
                labelsHidden(),
              ]}
            />
          </Host>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
  },
  circleOuter: {
    flex: 1,
    maxWidth: 44,
    alignItems: "center",
    gap: 4,
  },
  circle: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  check: {
    width: 14,
    height: 14,
  },
  nativeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.02, // Alpha mora biti iznad 0.01
  },
});
