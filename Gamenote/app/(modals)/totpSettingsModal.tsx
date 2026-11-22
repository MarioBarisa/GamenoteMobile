import {useEffect, useRef, useState} from "react";
import {Keyboard, Linking, StyleSheet, Text, View} from "react-native";
import {Stack, useRouter} from "expo-router";
import type {AuthMFAEnrollTOTPResponse, Session} from "@supabase/supabase-js";
import {SvgXml} from "react-native-svg";
import {SymbolView} from "expo-symbols";
import {setStringAsync} from "expo-clipboard";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/auth";
import {useTheme} from "@/context/theme";
import {AccountModal, ModalButton, ModalInput, ModalText} from "@/components/AccountModal";
import TotpCodeInput from "@/components/TotpCodeInput";
import {useTotpKeyboardScroll} from "@/hooks/useTotpKeyboardScroll";
import {checkCurrentPassword, enrollTotp, isInvalidTotp, recoveryCodes, removeTotp, removeUnverifiedFactor, verifyTotp} from "@/services/mfa";
import {ACCOUNT_SECURED_COLOR} from "@/constants/theme";
import {totpQrMarkup} from "@/utils/totpCode";

type Enrollment = NonNullable<AuthMFAEnrollTOTPResponse["data"]>;
type Action = "enable" | "disable" | "codes";
type Step = "overview" | "password" | "setup" | "disable" | "codes" | "clear";

export default function TotpSettingsModal() {
    const {t} = useTranslation();
    const {themeColors} = useTheme();
    const {session, totpFactors, refreshSecurity} = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<Step>("overview");
    const {scrollProps, fieldProps} = useTotpKeyboardScroll(step === "setup");
    const [action, setAction] = useState<Action>("enable");
    const [factorId, setFactorId] = useState("");
    const [password, setPassword] = useState("");
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [code, setCode] = useState("");
    const [codes, setCodes] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const disposed = useRef(false);
    const inFlight = useRef(false);
    const draft = useRef<{session: Session; id: string} | null>(null);

    useEffect(() => {
        disposed.current = false;
        return () => {
            disposed.current = true;
            const unfinished = draft.current;
            if (unfinished && !inFlight.current) {
                removeUnverifiedFactor(unfinished.session, unfinished.id).catch(() => {});
            }
        };
    }, []);

    const run = async (work: (owner: Session) => Promise<void>) => {
        if (inFlight.current || !session) return;
        inFlight.current = true;
        setBusy(true);
        setError("");
        setNotice("");
        Keyboard.dismiss();
        try {
            await work(session);
        } catch (failure) {
            const wrongPassword = typeof failure === "object" && failure !== null && "code" in failure
                && failure.code === "invalid_credentials";
            const recoveryUnavailable = failure instanceof Error && failure.message === "recoveryUnavailable";
            setError(wrongPassword ? "mfa.wrongPassword" : isInvalidTotp(failure) ? "mfa.invalidCode"
                : recoveryUnavailable ? "mfa.recoveryUnavailable" : "mfa.unavailable");
        } finally {
            inFlight.current = false;
            setBusy(false);
            const unfinished = draft.current;
            if (disposed.current && unfinished) {
                await removeUnverifiedFactor(unfinished.session, unfinished.id).catch(() => {});
            }
        }
    };

    const copyText = async (value: string) => {
        try {
            if (!await setStringAsync(value)) throw new Error("clipboard");
            setError("");
            setNotice("mfa.copied");
        } catch {
            setError("mfa.copyError");
        }
    };

    const start = (nextAction: Action, id = "") => {
        setAction(nextAction);
        setFactorId(id);
        setError("");
        setNotice("");
        setStep("password");
    };

    const issueCodes = async (owner: Session, id: string) => {
        const result = await recoveryCodes(owner, {action: "issue", factorId: id});
        if (!result.codes?.length) throw new Error("unavailable");
        setCodes(result.codes);
    };

    const confirmPassword = () => run(async owner => {
        const currentPassword = password;
        setPassword("");
        await checkCurrentPassword(owner, currentPassword);
        if (disposed.current) return;
        if (action === "disable") {
            setStep("disable");
        } else if (action === "codes") {
            setStep("codes");
            await issueCodes(owner, factorId);
        } else {
            try {
                const result = await enrollTotp(owner, () => disposed.current);
                if (!result) return;
                draft.current = {session: owner, id: result.id};
                if (disposed.current) return;
                setEnrollment(result);
            } catch (error) {
                if (error instanceof Error && error.message === "factor") {
                    await refreshSecurity();
                    setStep("overview");
                }
                throw error;
            }
            setStep("setup");
        }
    });

    const activate = () => run(async owner => {
        if (!enrollment) return;
        const id = enrollment.id;
        setCode("");
        await verifyTotp(owner, id, code);
        draft.current = null;
        if (disposed.current) return;
        setEnrollment(null);
        setFactorId(id);
        setStep("codes");
        await issueCodes(owner, id);
    });

    const clearRecovery = async (owner: Session) => {
        await recoveryCodes(owner, {action: "clear", factorId});
        setStep("overview");
        setNotice("mfa.removed");
    };

    const disable = () => run(async owner => {
        await removeTotp(owner, factorId);
        setStep("clear");
        await refreshSecurity().catch(() => {});
        await clearRecovery(owner);
    });

    const closeStep = () => run(async () => {
        if (draft.current) {
            await removeUnverifiedFactor(draft.current.session, draft.current.id);
            draft.current = null;
        }
        setPassword("");
        setCode("");
        setCodes([]);
        setEnrollment(null);
        setStep("overview");
    });

    const secretTextStyle = [styles.secret, {color: themeColors.text}];
    const active = totpFactors.length > 0;
    return (
        <AccountModal adjustForKeyboard={false} scrollProps={scrollProps}>
            <Stack.Screen options={{gestureEnabled: step === "overview" && !busy}}/>
            {step === "overview" && <>
                <View style={styles.status}>
                    <SymbolView name={active ? "checkmark.shield.fill" : "shield"} size={24}
                                tintColor={active ? ACCOUNT_SECURED_COLOR : themeColors.secondaryText}/>
                    <ModalText>{t(active ? "mfa.active" : "mfa.inactive")}</ModalText>
                </View>
                {active ? totpFactors.map(factor => (
                    <View key={factor.id} style={styles.actions}>
                        {totpFactors.length > 1 && <ModalText>{factor.friendly_name ?? t("mfa.settings")}</ModalText>}
                        <ModalButton label={t("mfa.newCodes")} disabled={busy} onPress={() => start("codes", factor.id)}/>
                        <ModalButton secondary destructive label={t("mfa.disable")} disabled={busy}
                                     onPress={() => start("disable", factor.id)}/>
                    </View>
                )) : <ModalButton label={t("mfa.enable")} onPress={() => start("enable")} disabled={busy}/>}
            </>}
            {step === "password" && <>
                <ModalText>{t("mfa.currentPassword")}</ModalText>
                <ModalInput autoFocus secureTextEntry textContentType="password"
                            accessibilityLabel={t("mfa.currentPassword")} placeholder={t("profile.password")}
                            value={password} onChangeText={setPassword} editable={!busy}/>
                <ModalButton label={t("mfa.continue")} onPress={confirmPassword} disabled={!password && !busy} busy={busy}/>
            </>}
            {step === "setup" && enrollment && <>
                <ModalText>{t("mfa.setupHint")}</ModalText>
                <View style={styles.qrRow}>
                    <View style={styles.qr} accessible accessibilityLabel={t("mfa.qr")}>
                        <SvgXml xml={totpQrMarkup(enrollment.totp.qr_code)} width={168} height={168}
                                preserveAspectRatio="xMidYMid meet" onError={() => {}}
                                fallback={<ModalText>{t("mfa.copySeed")}</ModalText>}/>
                    </View>
                </View>
                <TotpCodeInput {...fieldProps} value={code} onChange={setCode} disabled={busy}/>
                <ModalButton label={t("mfa.verify")} onPress={activate} disabled={code.length !== 6 && !busy} busy={busy}/>
                <Text selectable style={secretTextStyle}>{enrollment.totp.secret}</Text>
                <ModalButton secondary label={t("mfa.copySeed")} disabled={busy} onPress={() => copyText(enrollment.totp.secret)}/>
                <ModalButton secondary label={t("mfa.openPasswords")} disabled={busy} onPress={() => {
                    Linking.openURL(`apple-${enrollment.totp.uri}`).catch(() => setError("mfa.passwordsUnavailable"));
                }}/>
            </>}
            {step === "disable" && <>
                <ModalText>{t("mfa.disableConfirmation")}</ModalText>
                <ModalButton destructive label={t("mfa.disable")} onPress={disable} busy={busy}/>
            </>}
            {step === "codes" && <>
                {codes.length ? <>
                    <ModalText>{t("mfa.saveCodes")}</ModalText>
                    <Text selectable style={secretTextStyle}>{codes.join("\n")}</Text>
                    <ModalButton label={t("mfa.copyCodes")} onPress={() => copyText(codes.join("\n"))}/>
                </> : <>
                    <ModalText>{t("mfa.issuePending")}</ModalText>
                    <ModalButton label={t("mfa.retry")} onPress={() => run(owner => issueCodes(owner, factorId))} busy={busy}/>
                </>}
            </>}
            {step === "clear" && <>
                <ModalText>{t("mfa.clearPending")}</ModalText>
                <ModalButton label={t("mfa.retry")} onPress={() => run(clearRecovery)} busy={busy}/>
            </>}
            {error && <ModalText error>{t(error)}</ModalText>}
            {notice && <ModalText>{t(notice)}</ModalText>}
            <ModalButton secondary
                         label={t(step === "overview" || step === "codes" || step === "clear" ? "mfa.done" : "common.cancel")}
                         onPress={step === "overview" ? () => router.back() : closeStep} disabled={busy}/>
        </AccountModal>
    );
}

const styles = StyleSheet.create({
    status: {flexDirection: "row", alignItems: "center", gap: 8},
    actions: {gap: 12},
    qrRow: {width: "100%", alignItems: "center"},
    qr: {width: 192, height: 192, backgroundColor: "white", borderRadius: 12, alignItems: "center", justifyContent: "center"},
    secret: {fontFamily: "Menlo", textAlign: "center", lineHeight: 25, fontSize: 15},
});
