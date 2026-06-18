import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {useRouter} from "expo-router";
import {Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
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
    const {username, updateUsername, updatePassword, deleteAccount} = useAuth();

    const [newUsername, setNewUsername] = useState(username);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleUpdateUsername = async () => {
        if (!newUsername.trim()) {
            Alert.alert('', tr('register.usernameEmpty'));
            return;
        }

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        setIsUpdatingUsername(true);
        const result = await updateUsername(newUsername.trim());
        setIsUpdatingUsername(false);

        if (result.success) {
            Alert.alert('', tr('profile.manageAccountUsernameSaved'));
        } else {
            Alert.alert('', result.error || '');
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPassword) {
            Alert.alert('', tr('register.passwordRequired'));
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('', tr('register.passwordLength'));
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('', tr('register.passwordsMismatch'));
            return;
        }

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        setIsUpdatingPassword(true);
        const result = await updatePassword(newPassword);
        setIsUpdatingPassword(false);

        if (result.success) {
            setNewPassword('');
            setConfirmPassword('');
            Alert.alert('', tr('profile.manageAccountPasswordSaved'));
        } else {
            Alert.alert('', result.error || '');
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

    return (
        <ScrollView
            contentContainerStyle={{gap: 10, padding: 8}}
            style={{backgroundColor: t.backgroundModal}}
            contentInsetAdjustmentBehavior="automatic"
            automaticallyAdjustContentInsets={true}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
        >
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
                    <Pressable
                        style={({pressed}) => [{
                            backgroundColor: t.accent,
                            padding: 12,
                            borderRadius: 32,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.6 : 1,
                        }]}
                        onPress={handleUpdateUsername}
                        disabled={isUpdatingUsername}
                    >
                        <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
                            {isUpdatingUsername ? '...' : tr('common.save')}
                        </Text>
                    </Pressable>
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
                    <Pressable
                        style={({pressed}) => [{
                            backgroundColor: t.accent,
                            padding: 12,
                            borderRadius: 32,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.6 : 1,
                        }]}
                        onPress={handleUpdatePassword}
                        disabled={isUpdatingPassword}
                    >
                        <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
                            {isUpdatingPassword ? '...' : tr('common.save')}
                        </Text>
                    </Pressable>
                </View>
            </View>

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
