import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {useRouter} from "expo-router";
import {Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Image} from "react-native";
import {SymbolView} from "expo-symbols";
import * as Haptics from "expo-haptics";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/auth";

export default function ManageAccountModal() {
    const {t: tr} = useTranslation();
    const {theme} = useTheme();
    const t = colors[theme];
    const router = useRouter();
    const {user, username, avatarUrl, updateUsername, updatePassword, updateAvatar, deleteAccount} = useAuth();

    const [newUsername, setNewUsername] = useState(username);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarInputUrl, setAvatarInputUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSave = async () => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        setIsSaving(true);
        const results: string[] = [];

        if (avatarInputUrl.trim()) {
            const r = await updateAvatar(avatarInputUrl.trim());
            if (r.success) {
                results.push(tr('profile.manageAccountAvatarSaved'));
                setAvatarInputUrl('');
            }
        }

        if (newUsername.trim() && newUsername.trim() !== username) {
            const r = await updateUsername(newUsername.trim());
            if (r.success) {
                results.push(tr('profile.manageAccountUsernameSaved'));
            }
        }

        if (newPassword && newPassword === confirmPassword && newPassword.length >= 8) {
            const r = await updatePassword(newPassword);
            if (r.success) {
                results.push(tr('profile.manageAccountPasswordSaved'));
                setNewPassword('');
                setConfirmPassword('');
            }
        }

        setIsSaving(false);

        if (results.length > 0) {
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
                        if (Platform.OS === 'ios') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        }
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
            contentContainerStyle={{gap: 10, padding: 8}}
            style={{backgroundColor: t.backgroundModal}}
            contentInsetAdjustmentBehavior="automatic"
            automaticallyAdjustContentInsets={true}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
        >
            <View style={[styles.section, {alignItems: 'center'}]}>
                <Image
                    source={{uri: currentAvatar}}
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                        backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                    }}
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

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: t.text}]}>
                    {tr('register.passwordLabel')}
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
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder={tr('profile.manageAccountPasswordPlaceholder')}
                        placeholderTextColor={t.secondaryText}
                        secureTextEntry
                    />
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: t.text,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                            },
                        ]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder={tr('profile.manageAccountPasswordConfirmLabel')}
                        placeholderTextColor={t.secondaryText}
                        secureTextEntry
                    />
                </View>
            </View>

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
                disabled={isSaving}
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
                    disabled={isDeleting}
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
