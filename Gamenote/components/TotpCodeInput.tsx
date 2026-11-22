import {useState, type ComponentRef, type Ref} from "react";
import {ClipboardPasteButton, isPasteButtonAvailable} from "expo-clipboard";
import {StyleSheet, Text, TextInput, View} from "react-native";
import {useTranslation} from "react-i18next";
import {useTheme} from "@/context/theme";
import {normalizeTotpCode} from "@/utils/totpCode";

export default function TotpCodeInput({value, onChange, disabled, autoFocus, fieldRef, onFocusChange}: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    fieldRef?: Ref<ComponentRef<typeof View>>;
    onFocusChange?: (focused: boolean) => void;
}) {
    const {t} = useTranslation();
    const {themeColors} = useTheme();
    const [focused, setFocused] = useState(false);
    const updateFocus = (nextFocus: boolean) => {
        setFocused(nextFocus);
        onFocusChange?.(nextFocus);
    };

    return (
        <View ref={fieldRef} collapsable={false} style={styles.row}>
            <View style={styles.field}>
                <View style={styles.cells} pointerEvents="none" accessibilityElementsHidden>
                    {Array.from({length: 6}, (_, index) => (
                        <View key={index} style={[styles.cell, {
                            backgroundColor: themeColors.background,
                            borderColor: focused && index === Math.min(value.length, 5)
                                ? themeColors.accent : themeColors.secondaryText,
                        }]}>
                            <Text style={[styles.digit, {color: themeColors.text}]}>{value[index] ?? "–"}</Text>
                        </View>
                    ))}
                </View>
                <TextInput
                    accessibilityLabel={t("mfa.code")}
                    accessibilityHint={t("mfa.codeHint")}
                    style={styles.input}
                    textContentType="oneTimeCode"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    contextMenuHidden={false}
                    selectTextOnFocus
                    autoFocus={autoFocus}
                    editable={!disabled}
                    value={value}
                    onChangeText={text => onChange(normalizeTotpCode(text))}
                    onFocus={() => updateFocus(true)}
                    onBlur={() => updateFocus(false)}
                />
            </View>
            {isPasteButtonAvailable && (
                <ClipboardPasteButton
                    accessibilityLabel={t("mfa.pasteCode")}
                    acceptedContentTypes={["plain-text"]}
                    displayMode="iconOnly"
                    style={styles.paste}
                    pointerEvents={disabled ? "none" : "auto"}
                    accessibilityState={{disabled: Boolean(disabled)}}
                    onPress={data => {
                        if (disabled || data.type !== "text") return;
                        const pasted = normalizeTotpCode(data.text);
                        if (pasted) onChange(pasted);
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {alignSelf: "center", width: "100%", maxWidth: 372, flexDirection: "row", alignItems: "center", gap: 8},
    field: {flex: 1},
    paste: {width: 44, height: 44},
    cells: {flexDirection: "row", gap: 6},
    cell: {flex: 1, minHeight: 50, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center"},
    digit: {fontSize: 23, fontVariant: ["tabular-nums"]},
    input: {...StyleSheet.absoluteFill, color: "transparent", fontSize: 23, textAlign: "center"},
});
