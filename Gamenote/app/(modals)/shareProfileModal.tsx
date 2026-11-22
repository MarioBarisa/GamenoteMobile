import {useEffect, useState} from "react";
import {AccessibilityInfo, ActivityIndicator, Keyboard, Pressable, Share, StyleSheet, Text, View} from "react-native";
import {Stack, useRouter} from "expo-router";
import {SymbolView} from "expo-symbols";
import * as Haptics from "expo-haptics";
import {setUrlAsync} from "expo-clipboard";
import {useTranslation} from "react-i18next";
import {useTheme} from "@/context/theme";
import {STATUS_CONFIG} from "@/common/StatusCommons";
import {useAuth} from "@/context/auth";
import {useSettings} from "@/context/settings";
import {AccountModal, ModalButton, ModalInput, ModalText} from "@/components/AccountModal";
import {loadShareSettings, publicProfileUrl, saveShareSettings, SHARE_SCOPES, type ShareScope, type ShareSettings} from "@/services/libraryShare";

const categories = [
    {key: "games", icon: "gamecontroller.fill", label: "libraryShare.gamesCategory"},
    {key: "groups", icon: "rectangle.stack.fill", label: "tabs.groups"},
    {key: "stats", icon: "chart.bar.fill", label: "libraryShare.statsCategory"},
] as const;

const scopeColors = {
    none: {
        light: {accent: "#526071", background: "#F2F4F7", selected: "#E6EBF1"},
        dark: {accent: "#BAC3D0", background: "#222730", selected: "#303846"},
    },
    library: {
        light: {accent: "#0B5EAA", background: "#EDF5FF", selected: "#DBECFF"},
        dark: {accent: "#82BDFF", background: "#152639", selected: "#1B3857"},
    },
    all: {
        light: {accent: "#176343", background: "#EDF6F0", selected: "#DCEEE3"},
        dark: {accent: "#7CCBA1", background: "#182A23", selected: "#1D3E2E"},
    },
} as const;

export default function ShareProfileModal() {
    const {t} = useTranslation();
    const {theme, themeColors} = useTheme();
    const completedGreen = STATUS_CONFIG.completed.bg;
    const categoryGreen = theme === "dark" ? completedGreen : "#217640";
    const {session, user} = useAuth();
    const {vibrationsEnabled} = useSettings();
    const userId = user?.id;
    const router = useRouter();
    const [saved, setSaved] = useState<ShareSettings | null>(null);
    const [scope, setScope] = useState<ShareScope>("none");
    const [username, setUsername] = useState("");
    const [saving, setSaving] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState("");
    const [error, setError] = useState("");
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);

    useEffect(() => {
        if (!userId) return;
        const controller = new AbortController();
        loadShareSettings(userId, controller.signal).then(settings => {
            if (controller.signal.aborted) return;
            setSaved(settings);
            setScope(settings.share_scope);
        }).catch(() => {
            if (!controller.signal.aborted) setLoadFailed(true);
        });
        return () => controller.abort();
    }, [userId, loadAttempt]);

    const lightHaptic = () => {
        if (vibrationsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const save = async () => {
        if (!session || !saved || saving || scope === saved.share_scope) return;
        Keyboard.dismiss();
        setSaving(true);
        setError("");
        setCopiedUrl("");
        try {
            const settings = await saveShareSettings(session, saved, username, scope);
            setSaved(settings);
            setScope(settings.share_scope);
            setUsername("");
            lightHaptic();
        } catch (failure) {
            setError(failure instanceof Error && failure.message.startsWith("libraryShare.")
                ? failure.message : "libraryShare.saveError");
        } finally {
            setSaving(false);
        }
    };

    const url = saving ? "" : publicProfileUrl(saved, scope);
    const copied = Boolean(url && copiedUrl === url);
    const copyLink = async () => {
        if (!url) return;
        try {
            await setUrlAsync(url);
            setCopiedUrl(url);
            setError("");
            lightHaptic();
            AccessibilityInfo.announceForAccessibility(t("libraryShare.copiedLink"));
        } catch {
            setError("libraryShare.copyError");
        }
    };

    const shareLink = async () => {
        if (!url) return;
        try {
            await Share.share({url});
        } catch {
            setError("libraryShare.shareError");
        }
    };

    return (
        <AccountModal adjustForKeyboard={false}>
            <Stack.Screen options={{gestureEnabled: !saving}}/>
            <View style={styles.heading}>
                <Text accessibilityRole="header" style={[styles.title, {color: themeColors.text}]}>
                    {t("libraryShare.title")}
                </Text>
                <Text style={[styles.hint, {color: themeColors.secondaryText}]}>{t("libraryShare.scopeHint")}</Text>
            </View>
            {!saved && (loadFailed ? <>
                <ModalText error>{t("libraryShare.loadError")}</ModalText>
                <ModalButton label={t("mfa.retry")} onPress={() => {
                    setLoadFailed(false);
                    setLoadAttempt(attempt => attempt + 1);
                }}/>
            </> : <ActivityIndicator color={themeColors.accent}/>)}
            {saved && <>
                <View style={styles.options} accessibilityRole="radiogroup">
                    {SHARE_SCOPES.map(option => {
                        const selected = option === scope;
                        const palette = scopeColors[option][theme === "dark" ? "dark" : "light"];
                        return (
                            <Pressable key={option} accessibilityRole="radio" accessibilityState={{checked: selected}}
                                       accessibilityLabel={t(`libraryShare.${option}`)}
                                       disabled={saving} style={[styles.option, {
                                           backgroundColor: selected ? palette.selected : palette.background,
                                           borderColor: selected ? palette.accent : palette.accent + "40",
                                       }]}
                                       onPress={() => {
                                           setScope(option);
                                           setError("");
                                           setCopiedUrl("");
                                           if (option === "none") Keyboard.dismiss();
                                       }}>
                                <View style={styles.optionTitle}>
                                    <SymbolView name={selected ? "largecircle.fill.circle" : "circle"} size={19}
                                                tintColor={palette.accent}/>
                                    <Text style={[styles.label, {color: palette.accent}]}>{t(`libraryShare.${option}`)}</Text>
                                </View>
                                <View style={styles.categories} accessibilityElementsHidden>
                                    {categories.map(category => {
                                        const included = option === "all" || (option === "library" && category.key !== "stats");
                                        const tint = included ? categoryGreen : themeColors.secondaryText;
                                        return (
                                            <View key={category.key} style={styles.category}>
                                                <View style={styles.categoryIcons}>
                                                    <SymbolView name={category.icon} size={18} tintColor={tint}/>
                                                    <SymbolView name={included ? "checkmark" : "minus"} size={10}
                                                                tintColor={included ? completedGreen : tint}/>
                                                </View>
                                                <Text style={[styles.categoryLabel, {color: tint}]}>
                                                    {t(category.label)}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
                {!saved.username && scope !== "none" && <>
                    <ModalText>{t("libraryShare.usernameHint")}</ModalText>
                    <ModalInput accessibilityLabel={t("libraryShare.username")} placeholder={t("libraryShare.username")}
                                value={username} onChangeText={setUsername} editable={!saving}
                                autoCapitalize="none" autoCorrect={false} spellCheck={false}/>
                </>}
                {error && <ModalText error>{t(error)}</ModalText>}
                <ModalButton label={t("common.saveChanges")} onPress={save} busy={saving}
                             disabled={scope === saved.share_scope}/>
                {url && <>
                    <View style={[styles.link, {backgroundColor: themeColors.background}]}>
                        <Text style={[styles.linkText, {color: themeColors.text}]}
                              numberOfLines={1} ellipsizeMode="middle">{url}</Text>
                        <Pressable accessibilityRole="button" accessibilityLabel={t("libraryShare.copyLink")}
                                   accessibilityHint={copied ? t("libraryShare.copiedLink") : undefined}
                                   onPress={copyLink}
                                   style={({pressed}) => [styles.copyButton, {opacity: pressed ? 0.6 : 1}]}>
                            <SymbolView name={copied ? "checkmark" : "document.on.document"} size={20}
                                        tintColor={themeColors.accent}/>
                        </Pressable>
                    </View>
                    <ModalButton label={t("libraryShare.shareLink")} onPress={shareLink} secondary/>
                </>}
            </>}
            <ModalButton label={t("mfa.done")} onPress={() => router.back()} secondary disabled={saving}/>
        </AccountModal>
    );
}

const styles = StyleSheet.create({
    heading: {gap: 4},
    title: {fontSize: 24, fontWeight: "700"},
    hint: {fontSize: 13},
    options: {gap: 8},
    option: {borderWidth: 1, borderRadius: 12, padding: 12, gap: 12},
    optionTitle: {flexDirection: "row", alignItems: "center", gap: 8},
    label: {fontSize: 16, fontWeight: "600", flex: 1},
    categories: {flexDirection: "row", gap: 4},
    category: {flex: 1, alignItems: "center", gap: 4},
    categoryIcons: {flexDirection: "row", alignItems: "center", gap: 5},
    categoryLabel: {fontSize: 12, textAlign: "center"},
    link: {flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 12, borderRadius: 12},
    linkText: {flex: 1, fontSize: 15},
    copyButton: {width: 44, height: 44, alignItems: "center", justifyContent: "center"},
});
