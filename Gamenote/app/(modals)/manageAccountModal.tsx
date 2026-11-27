import {useTheme} from "@/context/theme";
import {screenContent} from "@/constants/layout";
import {Stack, useRouter} from "expo-router";
import {Image} from "expo-image";
import {Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import {SymbolView} from "expo-symbols";
import * as Haptics from "expo-haptics";
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/auth";
import {useSettings} from "@/context/settings";
import PasswordInput from "@/components/PasswordInput";
import {ModalText} from "@/components/AccountModal";
import {ACCOUNT_SECURED_COLOR} from "@/constants/theme";

export default function ManageAccountModal() {
    const {t: tr} = useTranslation();
    const {theme, themeColors: t} = useTheme();
    const router = useRouter();
    const {vibrationsEnabled} = useSettings();
    const {user, username, avatarUrl, updateUsername, updatePassword, updateAvatar, deleteAccount, totpFactors} = useAuth();

    const [newUsername, setNewUsername] = useState(username);
    const [newPassword, setNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarInputUrl, setAvatarInputUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const passwordAttempt = useRef(0);
    const activeTotp = totpFactors.length > 0;

    useEffect(() => () => {
        passwordAttempt.current++;
    }, []);

    const savePassword = async (attempt: number) => {
        const cancelled = () => passwordAttempt.current !== attempt;
        if (cancelled()) return false;
        if (!currentPassword) {
            setPasswordError("mfa.currentPassword");
            return false;
        }

        Keyboard.dismiss();
        setCurrentPassword("");
        try {
            const result = await updatePassword(newPassword, currentPassword, cancelled);
            if (cancelled()) return false;
            if (!result.success) {
                setPasswordError("mfa.passwordSaveError");
                return false;
            }
            setNewPassword("");
            setConfirmPassword("");
            return true;
        } catch (error) {
            if (!cancelled()) {
                const wrongPassword = typeof error === "object" && error !== null && "code" in error
                    && error.code === "invalid_credentials";
                setPasswordError(wrongPassword ? "mfa.wrongPassword" : "mfa.passwordSaveError");
            }
            return false;
        }
    };

    const handleSave = async () => {
        if (isSaving || isDeleting) return;
        setIsSaving(true);
        setPasswordError("");
        const attempt = ++passwordAttempt.current;
        const results: string[] = [];
        try {
            if (avatarInputUrl.trim()) {
                const result = await updateAvatar(avatarInputUrl.trim());
                if (result.success) {
                    results.push(tr('profile.manageAccountAvatarSaved'));
                    setAvatarInputUrl('');
                }
            }
            if (newUsername.trim() && newUsername.trim() !== username) {
                const result = await updateUsername(newUsername.trim());
                if (result.success) results.push(tr('profile.manageAccountUsernameSaved'));
            }

            if (passwordAttempt.current !== attempt) return;
            if (newPassword || confirmPassword) {
                if (newPassword !== confirmPassword || newPassword.length < 8) {
                    setPasswordError("mfa.passwordRequirements");
                } else if (await savePassword(attempt)) {
                    results.push(tr('profile.manageAccountPasswordSaved'));
                }
            }
        } finally {
            if (passwordAttempt.current === attempt) setIsSaving(false);
        }

        if (passwordAttempt.current === attempt && results.length > 0) {
            if (vibrationsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            Alert.alert('', results.join('\n'));
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            tr('profile.manageAccountDeleteConfirmTitle'),
            tr('profile.manageAccountDeleteConfirmMsg'),
            [
                {text: tr('common.cancel'), style: 'cancel'},
                {
                    text: tr('profile.manageAccountDeleteLabel'),
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        const result = await deleteAccount();
                        setIsDeleting(false);

                        if (result.success) {
                            Alert.alert('', tr('profile.manageAccountDeleteSuccess'));
                            router.back();
                        } else {
                            Alert.alert('', result.error || '');
                        }
                    }
                }
            ]
        );
    };

    const currentAvatar = avatarUrl || `https://i.pravatar.cc/300?u=${encodeURIComponent(user?.email || 'default')}`;

    return (
        <ScrollView
            contentContainerStyle={[screenContent.form, {gap: 10, padding: 8}]}
            style={{backgroundColor: t.backgroundModal}}
            contentInsetAdjustmentBehavior="automatic"
            automaticallyAdjustContentInsets={true}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
        >
            <Stack.Screen options={{gestureEnabled: !isSaving && !isDeleting, headerBackVisible: !isSaving && !isDeleting}}/>
            <View style={[styles.section, {alignItems: 'center'}]}>
                <Image
                    source={{uri: currentAvatar}}
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                        backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                    }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={{duration: 200, effect: "cross-dissolve"}}
                />
                <TextInput
                    style={[
                        styles.input,
                        {width: '100%',
                            color: t.text,
                            backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                        },
                    ]}
                    value={avatarInputUrl}
                    onChangeText={setAvatarInputUrl}
                    placeholder={tr('profile.manageAccountAvatarUrlPlaceholder')}
                    placeholderTextColor={t.secondaryText}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: t.text}]}>
                    {tr('profile.manageAccountUsernameLabel')}
                </Text>
                <View style={styles.formGroup}>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: t.text,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                            },
                        ]}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder={tr('profile.manageAccountUsernamePlaceholder')}
                        placeholderTextColor={t.secondaryText}
                        autoCapitalize="none"
                    />
                </View>
            </View>

            <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(modals)/totpSettingsModal')}
                disabled={isSaving || isDeleting}
                style={({pressed}) => [styles.securityButton, {
                    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                    opacity: pressed ? 0.6 : 1,
                }]}
            >
                <SymbolView name={activeTotp ? "checkmark.shield.fill" : "shield"} size={20}
                            tintColor={activeTotp ? ACCOUNT_SECURED_COLOR : t.accent}/>
                <Text style={{color: activeTotp ? ACCOUNT_SECURED_COLOR : t.text, fontWeight: "700", fontSize: 16}}>
                    {tr("mfa.settings")}
                </Text>
                <SymbolView name="chevron.right" size={14} tintColor={t.secondaryText}/>
            </Pressable>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: t.text}]}>
                    {tr('register.passwordLabel')}
                </Text>
                <View style={styles.formGroup}>
                    <PasswordInput
                        style={[
                            styles.input,
                            {
                                color: t.text,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                            },
                        ]}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        editable={!isSaving && !isDeleting}
                        textContentType="newPassword"
                        autoComplete="new-password"
                        placeholder={tr('profile.manageAccountPasswordPlaceholder')}
                        placeholderTextColor={t.secondaryText}
                    />
                    <PasswordInput
                        style={[
                            styles.input,
                            {
                                color: t.text,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                            },
                        ]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        editable={!isSaving && !isDeleting}
                        textContentType="newPassword"
                        autoComplete="new-password"
                        placeholder={tr('profile.manageAccountPasswordConfirmLabel')}
                        placeholderTextColor={t.secondaryText}
                    />
                    {(newPassword || confirmPassword) ? (
                        <PasswordInput
                            style={[
                                styles.input,
                                {
                                    color: t.text,
                                    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                                },
                            ]}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            editable={!isSaving && !isDeleting}
                            textContentType="password"
                            autoComplete="password"
                            placeholder={tr("mfa.currentPassword")}
                            placeholderTextColor={t.secondaryText}
                        />
                    ) : null}
                </View>
            </View>

            {passwordError && (
                <View style={styles.section}>
                    <ModalText error>{tr(passwordError)}</ModalText>
                </View>
            )}

            <Pressable
                style={({pressed}) => [{
                    backgroundColor: t.accent,
                    marginHorizontal: 16,
                    padding: 14,
                    borderRadius: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                }]}
                onPress={handleSave}
                disabled={isSaving || isDeleting}
            >
                <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>
                    {isSaving ? '...' : tr('common.saveChanges')}
                </Text>
            </Pressable>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: t.destructive}]}>
                    {tr('profile.manageAccountDeleteLabel')}
                </Text>
                <Pressable
                    style={({pressed}) => [{
                        backgroundColor: t.destructive,
                        padding: 14,
                        borderRadius: 32,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        opacity: pressed ? 0.6 : 1,
                    }]}
                    onPress={handleDeleteAccount}
                    disabled={isDeleting || isSaving}
                >
                    <SymbolView
                        name={"trash.fill"}
                        style={{width: 20, height: 20}}
                        tintColor={"#ffffff"}
                    />
                    <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>
                        {isDeleting ? '...' : tr('profile.manageAccountDeleteLabel')}
                    </Text>
                </Pressable>
            </View>

            <Pressable
                onPress={() => router.back()}
                disabled={isSaving || isDeleting}
                accessibilityLabel={tr("common.cancel")}
                style={[styles.cancelButton, {backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'}]}
            >
                <Text style={{color: t.text, fontWeight: '600', fontSize: 14}}>{tr("common.cancel")}</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    section: {
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 16,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    securityButton: {
        marginHorizontal: 16,
        padding: 14,
        borderRadius: 24,
        gap: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    formGroup: {
        gap: 8,
    },
    input: {
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
    },
    cancelButton: {
        padding: 14,
        borderRadius: 24,
        alignItems: 'center',
        marginHorizontal: 16,
    },
});
