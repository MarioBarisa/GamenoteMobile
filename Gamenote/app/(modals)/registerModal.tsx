import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {useRouter} from "expo-router";
import {Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import {SymbolView} from "expo-symbols";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import {useState} from "react";
import {useTranslation} from "react-i18next";

interface RegisterFormData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface ValidationErrors {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

export default function RegisterModal() {
    const {t: tr} = useTranslation();
    const {theme} = useTheme();
    const t = colors[theme];
    const router = useRouter();

    const [form, setForm] = useState<RegisterFormData>({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});

    const updateField = (field: keyof RegisterFormData, value: string) => {
        setForm(prev => ({...prev, [field]: value}));
        // kada korisnik ide ispraviti clear ovo da mu ne smeta
        if (errors[field]) {
            setErrors(prev => ({...prev, [field]: undefined}));
        }
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string): boolean => {
        //min 8 len
        if (password.length < 8) {
            return false;
        }

        // MORA IMATI ILI:
        // 1. broj
        // 2. mix viskoih i malih slova
        const hasNumber = /\d/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);

        return hasNumber || (hasUppercase && hasLowercase);
    };

    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {};

        // provjer username
        if (!form.username.trim()) {
            newErrors.username = tr('register.usernameEmpty');
        }

        // provjera email-a
        if (!form.email.trim()) {
            newErrors.email = tr('register.emailRequired');
        } else if (!validateEmail(form.email)) {
            newErrors.email = tr('register.emailInvalid');
        }

        // validacija passworda
        if (!form.password) {
            newErrors.password = tr('register.passwordRequired');
        } else if (!validatePassword(form.password)) {
            newErrors.password = tr('register.passwordLength');
        }

        // potvrda passworda
        if (!form.confirmPassword) {
            newErrors.confirmPassword = tr('register.confirmRequired');
        } else if (form.password !== form.confirmPassword) {
            newErrors.confirmPassword = tr('register.passwordsMismatch');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = () => {
        if (!validateForm()) {
            return;
        }

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        Alert.alert(
            tr('register.accountCreated'),
            tr('register.welcomeMsg', {username: form.username}),
            [
                {
                    text: 'OK',
                    onPress: () => router.back()
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

                <View style={styles.formGroup}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('register.usernameLabel')}</Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: t.text,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                                borderColor: errors.username ? '#ff3b30' : 'transparent',
                                borderWidth: errors.username ? 1 : 0,
                            },
                        ]}
                        value={form.username}
                        onChangeText={v => updateField('username', v)}
                        placeholder={tr('register.usernamePlaceholder')}
                        placeholderTextColor={t.secondaryText}
                    />
                    {errors.username && (
                        <Text style={[styles.errorText, {color: '#ff3b30'}]}>
                            {errors.username}
                        </Text>
                    )}
                </View>

                {/* Email */}
                <View style={styles.formGroup}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('register.emailLabel')}</Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: t.text,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                                borderColor: errors.email ? '#ff3b30' : 'transparent',
                                borderWidth: errors.email ? 1 : 0,
                            },
                        ]}
                        value={form.email}
                        onChangeText={v => updateField('email', v)}
                        placeholder={tr('register.emailPlaceholder')}
                        placeholderTextColor={t.secondaryText}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    {errors.email && (
                        <Text style={[styles.errorText, {color: '#ff3b30'}]}>
                            {errors.email}
                        </Text>
                    )}
                </View>

                {/* Lozinka */}
                <View style={styles.formGroup}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('register.passwordLabel')}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    flex: 1,
                                    color: t.text,
                                    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                                    borderColor: errors.password ? '#ff3b30' : 'transparent',
                                    borderWidth: errors.password ? 1 : 0,
                                },
                            ]}
                            value={form.password}
                            onChangeText={v => updateField('password', v)}
                            placeholder={tr('register.passwordPlaceholder')}
                            placeholderTextColor={t.secondaryText}
                            secureTextEntry={!showPassword}
                        />
                        <Pressable
                            onPress={() => setShowPassword(!showPassword)}
                            hitSlop={8}
                        >
                            <SymbolView
                                name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                                style={{width: 20, height: 20}}
                                tintColor={t.accent}
                            />
                        </Pressable>
                    </View>
                    {errors.password && (
                        <Text style={[styles.errorText, {color: '#ff3b30'}]}>
                            {errors.password}
                        </Text>
                    )}
                    <Text style={[styles.helperText, {color: t.secondaryText}]}>
                        {tr('register.passwordHelper')}
                    </Text>
                </View>

                {/* Potvrda lozinke */}
                <View style={styles.formGroup}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('register.confirmLabel')}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    flex: 1,
                                    color: t.text,
                                    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                                    borderColor: errors.confirmPassword ? '#ff3b30' : 'transparent',
                                    borderWidth: errors.confirmPassword ? 1 : 0,
                                },
                            ]}
                            value={form.confirmPassword}
                            onChangeText={v => updateField('confirmPassword', v)}
                            placeholder={tr('register.confirmPlaceholder')}
                            placeholderTextColor={t.secondaryText}
                            secureTextEntry={!showConfirmPassword}
                        />
                        <Pressable
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            hitSlop={8}
                        >
                            <SymbolView
                                name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                                style={{width: 20, height: 20}}
                                tintColor={t.accent}
                            />
                        </Pressable>
                    </View>
                    {errors.confirmPassword && (
                        <Text style={[styles.errorText, {color: '#ff3b30'}]}>
                            {errors.confirmPassword}
                        </Text>
                    )}
                </View>
                <Pressable
                    style={({pressed}) => [{
                        backgroundColor: t.accent,
                        margin: 4, padding: 12,
                        borderRadius: 32,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        opacity: pressed ? 0.6 : 1
                    }]}
                    accessibilityLabel={tr('register.registerButton')}
                    onPress={handleRegister}
                >
                    <SymbolView
                        name={"person.crop.circle.badge.plus"}
                        style={{width: 28, height: 28}}
                        tintColor={"#ffffff"}
                    />
                    <Text style={{color: "#ffffff", fontWeight: "600", fontSize: 20}}>
                        {tr('register.registerButton')}
                    </Text>
                </Pressable>
                <View style={{flexDirection: "row", gap: 8, alignItems: "center"}}>
                    <SymbolView
                        name={"info.circle.fill"}
                        style={{width: 18, height: 18}}
                        tintColor={"#ffffff"}
                    />
                    <Text style={{color: t.secondaryText}}>
                        {tr('register.termsPrefix')}{" "}
                        <Text
                            style={{textDecorationLine: "underline", color: t.accent}}
                            onPress={() => WebBrowser.openBrowserAsync("http://gamenote.eu/tos")}
                        >
                            {tr('register.termsLink')}
                        </Text>
                        .
                    </Text>
                </View>
                <Pressable
                    onPress={() => router.back()}
                    accessibilityLabel={tr("common.cancel")}
                    style={[styles.cancelButton, {backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'}]}
                >
                    <Text style={{color: t.text, fontWeight: '600', fontSize: 14}}>{tr("common.cancel")}</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    section: {
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 32,
        gap: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    formGroup: {
        gap: 6,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
    },
    input: {
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    helperText: {
        fontSize: 12,
        fontWeight: '400',
        marginTop: 4,
        lineHeight: 16,
    },
    cancelButton: {
        padding: 14,
        borderRadius: 24,
        alignItems: 'center',
    },
});

