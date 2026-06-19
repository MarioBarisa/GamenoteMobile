import {ScrollView, View, Text, StyleSheet, Switch, ActionSheetIOS, Pressable} from "react-native";
import {useTheme} from "@/context/theme";
import {useSettings} from "@/context/settings";
import {colors} from "@/constants/theme";
import {useTranslation} from "react-i18next";
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
    const {theme, preference, setPreference} = useTheme();
    const {vibrationsEnabled, setVibrationsEnabled, compactCards, setCompactCards, language, setLanguage} = useSettings();
    const {t} = useTranslation();
    const c = colors[theme];

    const isDarkForced = preference === "dark";
    const isSystem = preference === "system";

    const showLanguagePicker = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        ActionSheetIOS.showActionSheetWithOptions(
            {
                title: t("settings.language"),
                options: ["Hrvatski", "English", t("common.cancel")],
                cancelButtonIndex: 2,
            },
            (index) => {
                if (index === 0) setLanguage("hr");
                if (index === 1) setLanguage("en");
            }
        );
    };

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{backgroundColor: c.background}}
            contentContainerStyle={styles.container}
        >
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor:
                            theme === "dark"
                                ? "rgba(44,44,46,0.8)"
                                : "rgba(255,255,255,0.9)",
                    },
                ]}
            >
                <Text style={[styles.sectionTitle, {color: c.secondaryText}]}>
                    {t("settings.appearance")}
                </Text>

                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 12}}>
                        <Text style={[styles.title, {color: c.text}]}>{t("settings.darkMode")}</Text>
                        <Text style={[styles.subtitle, {color: c.secondaryText}]}>
                            {t("settings.darkModeDesc")}
                        </Text>
                    </View>
                    <Switch
                        value={isDarkForced}
                        onValueChange={(value) =>
                            setPreference(value ? "dark" : "light")
                        }
                        trackColor={{
                            false: "rgba(120,120,128,0.32)",
                            true: "#34C759",
                        }}
                        thumbColor={theme === "dark" ? "#FFFFFF" : "#000000"} //KAKO STAVVTITI DA GUM IMA DRUGACIJU BOJU!!! thumbColor={theme === "dark" ? "#000" : "#FFF"}
                    />
                </View>

                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 12}}>
                        <Text style={[styles.title, {color: c.text}]}>{t("settings.iosDefault")}</Text>
                        <Text style={[styles.subtitle, {color: c.secondaryText}]}>
                            {t("settings.iosDefaultDesc")}
                        </Text>
                    </View>
                    <Switch
                        value={isSystem}
                        onValueChange={(value) =>
                            setPreference(value ? "system" : theme)
                        }
                        trackColor={{
                            false: "rgba(120,120,128,0.32)",
                            true: "#0a58ff",
                        }}
                        thumbColor={theme === "dark" ? "#FFFFFF" : "#000000"}
                    />
                </View>
                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 12}}>
                        <Text style={[styles.title, {color: c.text}]}>{t("settings.compactCards")}</Text>
                        <Text style={[styles.subtitle, {color: c.secondaryText}]}>{t("settings.compactCardsDesc")}</Text>
                    </View>
                    <Switch
                        value={compactCards}
                        onValueChange={setCompactCards}
                        trackColor={{
                            false: "rgba(120,120,128,0.32)",
                            true: "#34C759",
                        }}
                    />
                </View>
            </View>

            <View
                style={[
                    styles.card,
                    {
                        marginTop: 24,
                        backgroundColor:
                            theme === "dark"
                                ? "rgba(44,44,46,0.8)"
                                : "rgba(255,255,255,0.9)",
                    },
                ]}
            >
                <Text style={[styles.sectionTitle, {color: c.secondaryText}]}>
                    {t("settings.other")}
                </Text>

                <Pressable style={styles.row} onPress={showLanguagePicker}>
                    <View style={{flex: 1, marginRight: 12}}>
                        <Text style={[styles.title, {color: c.text}]}>{t("settings.language")}</Text>
                        <Text style={[styles.subtitle, {color: c.secondaryText}]}>{t("settings.languageDesc")}</Text>
                    </View>
                    <Text style={{color: c.accent, fontSize: 17, fontWeight: "500"}}>
                        {language === "en" ? "English" : "Hrvatski"}
                    </Text>
                </Pressable>

                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 12}}>
                    <Text style={[styles.title, {color: c.text}]}>{t("settings.vibration")}</Text>
                    <Text style={[styles.subtitle, { color: c.secondaryText}]}>{t("settings.vibrationDesc")}</Text>
                    </View>
                    <Switch
                        value={vibrationsEnabled}
                        onValueChange={setVibrationsEnabled}
                        trackColor={{
                            false: "rgba(120,120,128,0.32)",
                            true: "#34C759",
                        }}
                    />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    card: {
        borderRadius: 24,
        padding: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(120,120,128,0.2)",
        gap: 16,
    },
    sectionTitle: {
        fontSize: 13,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 4,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        fontSize: 17,
        fontWeight: "500",
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
});
