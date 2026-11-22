import {useCallback} from "react";
import {ActivityIndicator, View} from "react-native";
import {useFocusEffect, useRouter} from "expo-router";
import {useAuth} from "@/context/auth";
import {useLocalMode} from "@/context/localMode";
import {useTheme} from "@/context/theme";

export default function Index() {
    const {phase, openRecoveredProfile, openProfileAfterSignIn} = useAuth();
    const {returnToCloudProfile} = useLocalMode();
    const {themeColors} = useTheme();
    const router = useRouter();

    useFocusEffect(useCallback(() => {
        if (phase === "mfa" || phase === "error") {
            router.push("/(modals)/mfaSignInModal");
        } else if (phase === "ready" || phase === "guest") {
            router.replace(phase === "ready" && !openRecoveredProfile && !openProfileAfterSignIn && !returnToCloudProfile
                ? "/(tabs)/home" : "/(tabs)/profile");
        }
    }, [phase, openRecoveredProfile, openProfileAfterSignIn, returnToCloudProfile, router]));

    return (
        <View style={{flex: 1, backgroundColor: themeColors.background, justifyContent: "center", alignItems: "center"}}>
            {phase === "checking" && <ActivityIndicator color={themeColors.accent} size="large"/>}
        </View>
    );
}
