import {useState} from "react";
import {ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View} from "react-native";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/auth";
import {useLocalMode} from "@/context/localMode";
import {useTheme} from "@/context/theme";
import {AccountModal, ModalButton, ModalInput, ModalText} from "@/components/AccountModal";
import TotpCodeInput from "@/components/TotpCodeInput";
import {useTotpKeyboardScroll} from "@/hooks/useTotpKeyboardScroll";
import {isInvalidTotp} from "@/services/mfa";

export default function MfaSignInModal() {
    const {t} = useTranslation();
    const {themeColors} = useTheme();
    const {phase, totpFactors, cancelSignIn, verifySignIn, recoverSignIn, refreshSecurity} = useAuth();
    const {localModeEnabled, switchSource} = useLocalMode();
    const [selectedFactor, setSelectedFactor] = useState("");
    const [code, setCode] = useState("");
    const [useRecovery, setUseRecovery] = useState(false);
    const {scrollProps, fieldProps} = useTotpKeyboardScroll(phase === "mfa" && !useRecovery);
    const [retryRecovery, setRetryRecovery] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const factor = totpFactors.find(item => item.id === selectedFactor) ?? totpFactors[0];
    const canRecover = /^[0-9a-f]{32}$/i.test(code.replace(/[\s-]/g, ""));

    const submit = async () => {
        if (busy) return;
        Keyboard.dismiss();
        setError("");
        setBusy(true);
        try {
            if (useRecovery) {
                await recoverSignIn(code);
                setUseRecovery(false);
                setRetryRecovery(false);
            } else if (factor) {
                await verifySignIn(factor.id, code);
            }
        } catch (failure) {
            if (failure instanceof Error && failure.message === "recoveryRefresh") setRetryRecovery(true);
            const wrongRecovery = useRecovery && failure instanceof Error && failure.message === "code";
            setError(wrongRecovery || isInvalidTotp(failure) ? "mfa.invalidCode" : "mfa.unavailable");
        } finally {
            setCode("");
            setBusy(false);
        }
    };

    const cancel = async () => {
        setCode("");
        setBusy(true);
        setError("");
        try {
            await cancelSignIn();
        } catch {
            setError("mfa.unavailable");
        } finally {
            setBusy(false);
        }
    };

    const openLocalLibrary = async () => {
        Keyboard.dismiss();
        setBusy(true);
        setError("");
        try {
            await switchSource();
        } catch {
            setError("screens.localMode.storageError");
        } finally {
            setBusy(false);
        }
    };

    return (
        <AccountModal adjustForKeyboard={useRecovery} scrollProps={scrollProps}>
            {phase === "checking" && <ActivityIndicator color={themeColors.accent} size="large"/>}
            {phase === "error" && <>
                <ModalText error>{t("mfa.unavailable")}</ModalText>
                <ModalButton label={t("mfa.retry")} disabled={busy} onPress={() => {
                    refreshSecurity().catch(() => setError("mfa.unavailable"));
                }}/>
            </>}
            {phase === "mfa" && <>
                <ModalText>{t(retryRecovery ? "mfa.recoveryRefresh" : useRecovery ? "mfa.recoveryHint" : "mfa.signInHint")}</ModalText>
                {!useRecovery && totpFactors.length > 1 && (
                    <View style={styles.factors}>
                        {totpFactors.map((item, index) => (
                            <Pressable key={item.id} disabled={busy} accessibilityRole="radio"
                                       accessibilityState={{checked: item.id === factor?.id}}
                                       onPress={() => {
                                           setSelectedFactor(item.id);
                                           setCode("");
                                       }}>
                                <Text style={{color: item.id === factor?.id ? themeColors.accent : themeColors.text}}>
                                    {item.friendly_name || t("mfa.factor", {number: index + 1})}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
                {useRecovery ? !retryRecovery && (
                    <ModalInput accessibilityLabel={t("mfa.recoveryCode")} placeholder={t("mfa.recoveryCode")}
                                value={code} onChangeText={setCode} textContentType="none" autoComplete="off" autoCapitalize="none"
                                autoCorrect={false} spellCheck={false} editable={!busy}/>
                ) : <TotpCodeInput {...fieldProps} autoFocus value={code} onChange={setCode} disabled={busy}/>}
                <ModalButton label={t(retryRecovery ? "mfa.retry" : "mfa.verify")}
                             onPress={submit} busy={busy}
                             disabled={useRecovery ? !canRecover && !retryRecovery : code.length !== 6}/>
                {!retryRecovery && <ModalButton secondary label={t(useRecovery ? "mfa.useTotp" : "mfa.useRecovery")}
                                                onPress={() => {
                                                    setCode("");
                                                    setError("");
                                                    setUseRecovery(!useRecovery);
                                                }} disabled={busy}/>}
            </>}
            {error && <ModalText error>{t(error)}</ModalText>}
            {localModeEnabled && <ModalButton secondary label={t("screens.localMode.openLibrary")}
                                              onPress={openLocalLibrary} disabled={busy}/>}
            <ModalButton secondary label={t("common.cancel")} onPress={cancel} disabled={busy}/>
        </AccountModal>
    );
}

const styles = StyleSheet.create({
    factors: {flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12},
});
