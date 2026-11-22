import {useEffect, useState} from "react";
import {useRouter} from "expo-router";
import {SymbolView} from "expo-symbols";
import {loadLocalData} from "@/services/localData";
import {Alert, Pressable, ScrollView, View, Text, StyleSheet, Switch} from "react-native";
import {useTheme} from "@/context/theme";
import {useSettings} from "@/context/settings";
import {useTranslation} from "react-i18next";
import AccentColorPicker from "@/components/AccentColorPicker";
import SelectMenu from "@/components/SelectMenu";

export default function SettingsScreen() {
    const {theme, preference, setPreference, themeColors} = useTheme();
    const {vibrationsEnabled, setVibrationsEnabled, compactCards, setCompactCards, tcgMode, setTCGMode, language, setLanguage, localModeEnabled, setLocalModeEnabled} = useSettings();
    const {t} = useTranslation();
    const c = themeColors;
    const router = useRouter();
    const [changingMode, setChangingMode] = useState(false);
    const [openOnboarding, setOpenOnboarding] = useState(false);

    useEffect(() => {
        if (!localModeEnabled || !openOnboarding) return;
        router.push("/(modals)/localModeOnboarding");
    }, [localModeEnabled, openOnboarding, router]);

    async function toggleLocalMode(value: boolean) {
        setChangingMode(true);
        try {
            if (value) await loadLocalData();
            const first = await setLocalModeEnabled(value);
            setOpenOnboarding(first);
        } catch {
            Alert.alert(t("screens.localMode.storageError"));
        } finally {
            setChangingMode(false);
        }
    }

    const isDarkForced = preference === "dark";
    const isSystem = preference === "system";

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
                        thumbColor={theme === "dark" ? "#FFFFFF" : "#000000"} //KAKO STAVTITI DA GUM IMA DRUGACIJU BOJU!!! thumbColor={theme === "dark" ? "#000" : "#FFF"}
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
                            true: c.accent,
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
                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 12}}>
                        <Text style={[styles.title, {color: c.text}]}>{t("settings.tcgFoil")}</Text>
                        <Text style={[styles.subtitle, {color: c.secondaryText}]}>{t("settings.tcgFoilDesc")}</Text>
                    </View>
                    <Switch
                        accessibilityLabel={t("settings.tcgFoil")}
                        value={tcgMode}
                        onValueChange={setTCGMode}
                        trackColor={{
                            false: "rgba(120,120,128,0.32)",
                            true: "#34C759",
                        }}
                    />
                </View>
                <View>
                    <Text style={[styles.title, {color: c.text}]}>{t("settings.accentColor")}</Text>
                    <Text style={[styles.subtitle, {color: c.secondaryText}]}>
                        {t("settings.accentColorDesc")}
                    </Text>
                </View>
                <AccentColorPicker />
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

                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 12}}>
                        <Text style={[styles.title, {color: c.text}]}>{t("settings.language")}</Text>
                        <Text style={[styles.subtitle, {color: c.secondaryText}]}>{t("settings.languageDesc")}</Text>
                    </View>
                    <SelectMenu
                        label={language === "en" ? "English" : "Hrvatski"}
                        options={[
                            {label: "Hrvatski", value: "hr"},
                            {label: "English", value: "en"},
                        ]}
                        selected={language}
                        onSelect={value => setLanguage(value)}
                    />
                </View>

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
            <View style={[styles.card, {marginTop: 24, backgroundColor: theme === "dark"
                ? "rgba(44,44,46,0.8)" : "rgba(255,255,255,0.9)"}]}>
                <Text style={[styles.sectionTitle, {color: c.secondaryText}]}>{t("settings.localMode.title")}</Text>
                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 12}}>
                        <Text style={[styles.title, {color: c.text}]}>{t("settings.localMode.enable")}</Text>
                        <Text style={[styles.subtitle, {color: c.secondaryText}]}>{t("settings.localMode.description")}</Text>
                    </View>
                    <Switch accessibilityLabel={t("settings.localMode.enable")} value={localModeEnabled}
                            disabled={changingMode} trackColor={{true: c.accent}} onValueChange={toggleLocalMode}/>
                </View>
                {localModeEnabled && <Pressable accessibilityRole="button" style={[styles.row, {minHeight: 44}]}
                                               onPress={() => router.push("/settings/local-mode")}>
                    <Text style={{fontSize: 15, color: c.accent, fontWeight: "600"}}>{t("settings.localMode.settings")}</Text>
                    <SymbolView name="chevron.right" size={14} tintColor={c.accent}/>
                </Pressable>}
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
