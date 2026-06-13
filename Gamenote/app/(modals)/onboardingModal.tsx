import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {router} from "expo-router";
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {SymbolView} from "expo-symbols";
import {useResponsive} from "@/utils/useResponsive";

interface FeatureItem {
    icon: string;
    title: string;
    description: string;
}

const FEATURES: FeatureItem[] = [
    {
        icon: "bookmark.fill",
        title: "Prati svoju kolekciju",
        description: "Dodaj, organiziraj i prati sve svoje igre na jednom mjestu",
    },
    {
        icon: "star.fill",
        title: "Ocjenjuj i recenziraj",
        description: "Daj ocjene, bilježi recenzije i prati napredak kroz igre",
    },
    {
        icon: "list.clipboard.fill",
        title: "Upravljaj backlogom",
        description: "Planiraj što ćeš igrati i nikad ne zaboravi naslov",
    },
    {
        icon: "chart.line.uptrend.xyaxis",
        title: "Statistike i uvid",
        description: "Vidi svoje gaming navike i vrijeme provedeno u igrama",
    },
];

export default function OnboardingModal() {
    const {theme} = useTheme();
    const t = colors[theme];
    const {scale} = useResponsive();

    const handleContinue = () => {
        router.replace("/(tabs)/profile");
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            style={{backgroundColor: t.onboarding}} //#b8c1c1
            contentInsetAdjustmentBehavior="automatic"
            automaticallyAdjustContentInsets={true}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
        >
            <View style={styles.topSection}>
                <Image
                    source={require("../../assets/gamenote/gamenote.png")}
                    style={[styles.logo, {width: scale(240), height: scale(240)}]}
                    resizeMode="contain"
                />
                <Text style={[styles.title, {color: t.text, fontSize: scale(20)}]}>
                    Dobrodošao u Gamenote!
                </Text>
                <Text style={[styles.subtitle, {color: t.secondaryText, fontSize: scale(15)}]}>
                    Tvoj osobni vodič kroz svijet videoigara
                </Text>
            </View>

            <View style={styles.featuresSection}>
                {FEATURES.map((item, index) => (
                    <View key={index} style={styles.featureRow}>
                        <View style={[styles.iconContainer, {backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'}]}>
                            <SymbolView
                                name={item.icon as any}
                                style={{width: scale(24), height: scale(24)}}
                                tintColor={t.accent}
                            />
                        </View>
                        <View style={styles.featureTextContainer}>
                            <Text style={[styles.featureTitle, {color: t.text, fontSize: scale(16)}]}>
                                {item.title}
                            </Text>
                            <Text style={[styles.featureDescription, {color: t.secondaryText, fontSize: scale(14)}]}>
                                {item.description}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.bottomSection}>
                <Pressable
                    style={({pressed}) => [styles.continueButton, {
                        backgroundColor: t.accent,
                        opacity: pressed ? 0.6 : 1,
                    }]}
                    onPress={handleContinue}
                >
                    <Text style={[styles.continueText, {fontSize: scale(17)}]}>
                        Nastavi
                    </Text>
                </Pressable>


                <Text style={[styles.footer, {color: t.secondaryText, fontSize: scale(12)}]}>
                    {`Gamenote Mobile v1.0 - gamenote.eu\n©Mario Bariša 2026 - barisa.me`}
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
        padding: 8,
    },
    topSection: {
        alignItems: "center",
        paddingVertical: 2,
        gap: 2,
    },
    logo: {
        marginBottom: 0,
    },
    title: {
        fontWeight: "700",
        textAlign: "center",
    },
    subtitle: {
        fontWeight: "400",
        textAlign: "center",
        lineHeight: 22,
    },
    featuresSection: {
        gap: 16,
        paddingVertical: 20,
        paddingHorizontal: 8,
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    featureTextContainer: {
        flex: 1,
        gap: 2,
    },
    featureTitle: {
        fontWeight: "600",
    },
    featureDescription: {
        fontWeight: "400",
        lineHeight: 20,
    },
    bottomSection: {
        gap: 16,
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    continueButton: {
        paddingVertical: 14,
        borderRadius: 32,
        alignItems: "center",
    },
    continueText: {
        color: "#ffffff",
        fontWeight: "600",
    },
    footer: {
        fontWeight: "400",
        textAlign: "center",
        paddingBottom: 8,
    },
});
