import {useState} from "react";
import {Alert, Keyboard, Pressable, StyleSheet, Text} from "react-native";
import {useTranslation} from "react-i18next";
import {useLocalMode} from "@/context/localMode";
import {useTheme} from "@/context/theme";

export default function LocalModeEntry({disabled}: {disabled: boolean}) {
    const {t} = useTranslation();
    const {themeColors} = useTheme();
    const {openLocalLibrary} = useLocalMode();
    const [opening, setOpening] = useState(false);

    async function open() {
        setOpening(true);
        Keyboard.dismiss();
        try {
            await openLocalLibrary();
        } catch {
            Alert.alert(t("screens.localMode.storageError"));
        } finally {
            setOpening(false);
        }
    }

    return (
        <Pressable accessibilityRole="button" accessibilityState={{busy: opening}}
                   disabled={disabled || opening} onPress={open}
                   style={({pressed}) => [styles.action, {opacity: pressed || disabled || opening ? 0.6 : 1}]}>
            <Text style={[styles.label, {color: themeColors.accent}]}>
                {t("screens.localMode.continueWithoutAccount")}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    action: {minHeight: 44, alignSelf: "center", justifyContent: "center", paddingHorizontal: 12},
    label: {fontSize: 15, fontWeight: "700", textAlign: "center"},
});
