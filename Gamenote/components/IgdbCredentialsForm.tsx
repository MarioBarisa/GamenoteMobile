import {useState} from "react";
import {Linking, Pressable, Text, TextInput} from "react-native";
import {useTranslation} from "react-i18next";
import {ModalButton, ModalInput, ModalText} from "@/components/AccountModal";
import {useLocalMode} from "@/context/localMode";
import {useTheme} from "@/context/theme";
import {saveIgdbCredentials} from "@/services/igdbApi";

export default function IgdbCredentialsForm({onSaved}: {onSaved: () => void}) {
    const {t} = useTranslation();
    const {themeColors: c} = useTheme();
    const {refreshIgdbStatus} = useLocalMode();
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    async function save() {
        setBusy(true);
        setError(false);
        try {
            await saveIgdbCredentials(clientId, clientSecret);
            await refreshIgdbStatus();
            setClientId("");
            setClientSecret("");
            onSaved();
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }

    return <>
        <Text style={{fontSize: 13, color: c.secondaryText}}>{t("onboarding.localMode.credentialsDescription")}</Text>
        <Pressable accessibilityRole="link" style={{minHeight: 44, justifyContent: "center"}}
                   onPress={() => Linking.openURL("https://dev.twitch.tv/console/apps").catch(() => setError(true))}>
            <Text style={{color: c.accent, fontWeight: "600"}}>{t("onboarding.localMode.developerConsole")}</Text>
        </Pressable>
        <ModalInput value={clientId} onChangeText={setClientId} editable={!busy} autoCapitalize="none" autoCorrect={false}
                    accessibilityLabel={t("onboarding.localMode.clientId")} placeholder={t("onboarding.localMode.clientId")}/>
        <TextInput value={clientSecret} onChangeText={setClientSecret} editable={!busy} autoCapitalize="none" autoCorrect={false}
                   secureTextEntry textContentType="none" autoComplete="off" placeholderTextColor={c.secondaryText}
                   accessibilityLabel={t("onboarding.localMode.clientSecret")} placeholder={t("onboarding.localMode.clientSecret")}
                   style={{borderRadius: 10, padding: 12, minHeight: 44, fontSize: 16, color: c.text, backgroundColor: c.background}}/>
        {error && <ModalText error>{t("onboarding.localMode.saveError")}</ModalText>}
        <ModalButton label={t("onboarding.localMode.save")} onPress={save} busy={busy}
                     disabled={!clientId.trim() || !clientSecret.trim()}/>
    </>;
}
