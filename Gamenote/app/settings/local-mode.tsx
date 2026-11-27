import {useState, type ReactNode} from "react";
import {screenContent} from "@/constants/layout";
import {ScreenScrollView, ScreenViewport} from "@/components/ScreenViewport";
import {ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View} from "react-native";
import {Image} from "expo-image";
import {SymbolView} from "expo-symbols";
import {useTranslation} from "react-i18next";
import {ModalButton, ModalInput, ModalText} from "@/components/AccountModal";
import IgdbCredentialsForm from "@/components/IgdbCredentialsForm";
import PlatformIcon from "@/components/PlatformIcon";
import SelectMenu from "@/components/SelectMenu";
import {useLocalMode} from "@/context/localMode";
import {useTheme} from "@/context/theme";
import {httpUrl, LOCAL_PLATFORMS, loadLocalData, localDocumentUri, localImageUrl, setLocalPlatforms, setLocalProfile,
    type LocalProfile} from "@/services/localData";

const COLORS: Record<string, string> = {blue: "#3784E9", green: "#20985C", violet: "#A765DD", orange: "#D77918", pink: "#DF5690", gray: "#86868B"};

function Section({title, children}: {title: string; children: ReactNode}) {
    const {theme, themeColors: c} = useTheme();
    return <View style={[styles.card, {backgroundColor: theme === "dark" ? "rgba(44,44,46,0.8)" : "rgba(255,255,255,0.9)"}]}>
        <Text style={[styles.sectionTitle, {color: c.secondaryText}]}>{title}</Text>
        {children}
    </View>;
}

function Description({children}: {children: ReactNode}) {
    const {themeColors: c} = useTheme();
    return <Text style={{color: c.secondaryText, fontSize: 13}}>{children}</Text>;
}

function ProfileFields({profile}: {profile: LocalProfile}) {
    const {t} = useTranslation();
    const [name, setName] = useState(profile.name);
    const [url, setUrl] = useState(profile.profileUrl);
    const [error, setError] = useState<string>();
    const [saving, setSaving] = useState(false);
    const preview = localImageUrl(url.trim());

    async function save() {
        if (url.trim() && !localImageUrl(url.trim())) {
            setError("screens.localMode.invalidUrl");
            return;
        }
        setSaving(true);
        setError(undefined);
        try {
            await setLocalProfile({name, profileUrl: url.trim()});
        } catch {
            setError("screens.localMode.storageError");
        } finally {
            setSaving(false);
        }
    }

    return <>
        {preview && <Image source={{uri: preview}} style={styles.avatar} contentFit="cover" cachePolicy="memory"/>}
        <ModalInput placeholder={t("screens.localMode.name")} accessibilityLabel={t("screens.localMode.name")}
                    value={name} onChangeText={setName} maxLength={60} editable={!saving}/>
        <ModalInput placeholder={t("screens.localMode.avatarUrl")} accessibilityLabel={t("screens.localMode.avatarUrl")}
                    value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url"
                    editable={!saving}/>
        {error && <ModalText error>{t(error)}</ModalText>}
        <ModalButton label={t("screens.localMode.saveProfile")} busy={saving} onPress={save}
                     disabled={name.trim() === profile.name && (httpUrl(url.trim())?.href ?? url.trim()) === profile.profileUrl}/>
    </>;
}

export default function LocalModeSettings() {
    const {t, i18n} = useTranslation();
    const {themeColors: c} = useTheme();
    const {document, storageError, storageSize, mirrorEnabled, mirrorBusy, mirrorError, knownCloudUserId,
        canChangeMirror, setMirrorEnabled, igdbConfigured, eraseLocalProfile, resetRevision} = useLocalMode();
    const [platform, setPlatform] = useState("");
    const [color, setColor] = useState("blue");
    const [platformError, setPlatformError] = useState<string>();
    const [showCredentials, setShowCredentials] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const colors = Object.keys(COLORS).map(value => ({value, label: t(`screens.localMode.colors.${value}`)}));

    function updatePlatforms(change: (platforms: string[]) => string[], custom?: {name: string; value: string}) {
        setPlatformError(undefined);
        return setLocalPlatforms(change, custom).then(() => true).catch(error => {
            setPlatformError(error instanceof Error && error.message === "platformExists"
                ? "screens.localMode.platformExists" : "screens.localMode.storageError");
            return false;
        });
    }

    function addPlatform() {
        const name = platform.trim();
        if (!name) return;
        void updatePlatforms(platforms => {
            if ([...LOCAL_PLATFORMS, ...platforms].some(entry => entry.toLowerCase() === name.toLowerCase())) {
                throw new Error("platformExists");
            }
            return [...platforms, name];
        }, {name, value: COLORS[color]}).then(result => { if (result) setPlatform(""); });
    }

    async function eraseProfile() {
        setDeleting(true);
        try {
            await eraseLocalProfile();
            setPlatform("");
            setPlatformError(undefined);
        } catch {
            Alert.alert(t("screens.localMode.deleteProfileError"));
        } finally {
            setDeleting(false);
        }
    }

    function confirmDelete() {
        Alert.alert(t("screens.localMode.deleteProfile"), t("screens.localMode.deleteProfileConfirmation"), [
            {text: t("common.cancel"), style: "cancel"},
            {text: t("common.delete"), style: "destructive", onPress: eraseProfile},
        ]);
    }

    const deleteButton = <ModalButton label={t("screens.localMode.deleteProfile")} secondary destructive
                                      busy={deleting} disabled={mirrorBusy} onPress={confirmDelete}/>;

    if (!document) return <ScreenViewport style={styles.center} backgroundColor={c.background}>
        {storageError ? <>
            <ModalText error>{t("screens.localMode.storageError")}</ModalText>
            <ModalButton label={t("screens.localMode.retry")} onPress={() => { loadLocalData().catch(() => {}); }}/>
            {deleteButton}
        </> : <ActivityIndicator color={c.accent}/>}
    </ScreenViewport>;

    const size = new Intl.NumberFormat(i18n.language, {maximumFractionDigits: 1}).format(storageSize / 1024);
    return <ScreenScrollView backgroundColor={c.background} contentContainerStyle={[screenContent.form, styles.container]} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
        <Section title={t("screens.localMode.profile")}>
            <ProfileFields key={JSON.stringify([resetRevision, document.profile])} profile={document.profile}/>
        </Section>
        <Section title={t("screens.localMode.platforms")}>
            {LOCAL_PLATFORMS.map(name => <View key={name} style={styles.row}>
                <PlatformIcon platform={name} size={21}/>
                <Text style={[styles.label, {color: c.text}]}>{name === "Other" ? t("screens.localMode.otherPlatform") : name}</Text>
                <Switch accessibilityLabel={name === "Other" ? t("screens.localMode.otherPlatform") : name}
                        value={document.platforms.includes(name)} trackColor={{true: c.accent}}
                        onValueChange={value => { void updatePlatforms(list => value ? [...list, name] : list.filter(entry => entry !== name)); }}/>
            </View>)}
            {document.platforms.filter(name => !LOCAL_PLATFORMS.includes(name)).map(name => {
                const selected = Object.keys(COLORS).find(key => COLORS[key] === document.platformColors?.[name]) ?? "blue";
                return <View key={name} style={styles.row}>
                    <PlatformIcon platform={name} colorOverride={document.platformColors?.[name]} fallback size={21}/>
                    <Text style={[styles.label, {color: c.text}]}>{name}</Text>
                    <SelectMenu label={t(`screens.localMode.colors.${selected}`)} options={colors} selected={selected}
                                onSelect={value => { void updatePlatforms(list => list, {name, value: COLORS[value]}); }}/>
                    <Pressable accessibilityRole="button" accessibilityLabel={t("screens.localMode.removePlatform", {name})}
                               style={styles.iconButton} onPress={() => { void updatePlatforms(list => list.filter(entry => entry !== name)); }}>
                        <SymbolView name="trash" size={18} tintColor={c.destructive}/>
                    </Pressable>
                </View>;
            })}
            <View style={styles.row}>
                <ModalInput placeholder={t("screens.localMode.customPlatform")} accessibilityLabel={t("screens.localMode.customPlatform")}
                            value={platform} onChangeText={setPlatform} maxLength={40}
                            style={[styles.customInput, {color: c.text, backgroundColor: c.background}]}/>
                <SelectMenu label={t(`screens.localMode.colors.${color}`)} options={colors} selected={color} onSelect={setColor}/>
            </View>
            {platformError && <ModalText error>{t(platformError)}</ModalText>}
            <ModalButton secondary label={t("screens.localMode.addPlatform")} onPress={addPlatform} disabled={!platform.trim()}/>
        </Section>
        {knownCloudUserId && <Section title={t("screens.localMode.mirror")}>
            <View style={styles.row}>
                <Text style={[styles.label, {color: c.text}]}>{t("screens.localMode.mirrorSwitch")}</Text>
                <Switch accessibilityLabel={t("screens.localMode.mirrorSwitch")} value={mirrorEnabled}
                        disabled={deleting || mirrorBusy || !canChangeMirror} trackColor={{true: c.accent}} onValueChange={setMirrorEnabled}/>
            </View>
            <Description>{t(canChangeMirror ? "screens.localMode.mirrorDescription" : "screens.localMode.mirrorPaused")}</Description>
            {mirrorBusy && <ActivityIndicator color={c.accent}/>}
            {mirrorError && <ModalText error>{t("screens.localMode.mirrorError")}</ModalText>}
        </Section>}
        <Section title={t("screens.localMode.igdb")}>
            {igdbConfigured === null ? <ActivityIndicator color={c.accent}/> :
                <Description>{t(igdbConfigured ? "screens.localMode.configured" : "screens.localMode.unconfigured")}</Description>}
            {showCredentials ? <IgdbCredentialsForm onSaved={() => setShowCredentials(false)}/> :
                <ModalButton secondary label={t(igdbConfigured ? "screens.localMode.editCredentials" : "screens.localMode.addCredentials")}
                             onPress={() => setShowCredentials(true)}/>}
        </Section>
        <Section title={t("screens.localMode.storage")}>
            <Description>{t("screens.localMode.gameCount", {count: document.games.length})}</Description>
            <Description>{t("screens.localMode.storageSize", {size})}</Description>
            <Description>{t("screens.localMode.backup")}</Description>
            <ModalButton secondary label={t("screens.localMode.showLocation")} onPress={() => Alert.alert(
                t("screens.localMode.showLocation"), localDocumentUri().replace(/^file:\/\//, ""),
            )}/>
            {deleteButton}
        </Section>
    </ScreenScrollView>;
}

const styles = StyleSheet.create({
    container: {padding: 16, gap: 24},
    center: {flex: 1, justifyContent: "center", padding: 24, gap: 16},
    card: {borderRadius: 24, padding: 16, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(120,120,128,0.2)"},
    sectionTitle: {fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4},
    row: {minHeight: 44, flexDirection: "row", gap: 10, alignItems: "center"},
    label: {flex: 1, fontSize: 16},
    avatar: {width: 64, height: 64, borderRadius: 32, alignSelf: "center"},
    iconButton: {width: 44, height: 44, alignItems: "center", justifyContent: "center"},
    customInput: {flex: 1, minHeight: 44, padding: 12, borderRadius: 10, fontSize: 16},
});
