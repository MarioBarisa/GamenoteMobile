import {NativeTabs} from "expo-router/native-tabs";
import {router, useNavigationContainerRef, useSegments} from "expo-router";
import {StackActions} from "expo-router/react-navigation";
import {Platform, View} from "react-native";
import * as Haptics from "expo-haptics";
import {useSettings} from "@/context/settings";
import {useTheme} from "@/context/theme";
import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {useAuth} from "@/context/auth";
import {useTranslation} from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = '@onboarding_complete';
const iosVersion = Platform.OS === "ios" ? parseInt(String(Platform.Version), 10) : 0;
const minimizeBehavior = iosVersion >= 26 ? "onScrollDown" : undefined;

// noinspection JSUnusedGlobalSymbols
export default function TabsLayout() {
    const {t} = useTranslation();

    // Apple SF icons online list https://hotpot.ai/free-icons
    const {loggedIn} = useAuth();
    const segments = useSegments();
    const tabSegment = segments[0] === "(tabs)" ? segments[1] : undefined;
    const previousTabRef = useRef(tabSegment);
    const {vibrationsEnabled, activeSource} = useSettings();
    const {accent} = useTheme();
    const [hasLayout, setHasLayout] = useState(false);
    const navigation = useNavigationContainerRef();
    const previousSource = useRef(activeSource);

    useLayoutEffect(() => {
        if (previousSource.current === activeSource) return;
        previousSource.current = activeSource;
        const tabs = navigation.getRootState()?.routes.find(route => route.name === "(tabs)")?.state;
        for (const tab of tabs?.routes ?? []) {
            const stack = tab.state;
            if (stack?.key && stack.routes[stack.index ?? 0]?.name !== "index") {
                navigation.dispatch({...StackActions.popTo("index"), target: stack.key});
            }
        }
    }, [activeSource, navigation]);

    useEffect(() => {
        if (loggedIn || activeSource === "local") return;
        let active = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        AsyncStorage.getItem(ONBOARDING_KEY).then(seen => {
            if (!active || seen) return;
            timer = setTimeout(() => {
                router.push("/(modals)/onboardingModal");
                AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            }, 300);
        });
        return () => { active = false; clearTimeout(timer); };
    }, [loggedIn, activeSource]);

    useEffect(() => {
        if (vibrationsEnabled && tabSegment && tabSegment !== previousTabRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            previousTabRef.current = tabSegment;
        }
    }, [tabSegment, vibrationsEnabled]);

    const tabs = (
        <NativeTabs minimizeBehavior={minimizeBehavior} tintColor={accent}>
            <NativeTabs.Trigger name="home">
                <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    sf={{default: "house", selected: "house.fill"}}
                    drawable="ic_menu_view"
                />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="favorites">
                <NativeTabs.Trigger.Label>{t("tabs.favorites")}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{default: "bookmark", selected: "bookmark.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="search" role="search">
                <NativeTabs.Trigger.Label>{t("tabs.search")}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="magnifyingglass" drawable="ic_menu_search"/>
            </NativeTabs.Trigger>


            <NativeTabs.Trigger name="groups">
                <NativeTabs.Trigger.Label>{t("tabs.groups")}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{default: "rectangle.stack", selected: "rectangle.stack.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="profile">
                 {!loggedIn && activeSource === "cloud" && <NativeTabs.Trigger.Badge>!</NativeTabs.Trigger.Badge>}
                <NativeTabs.Trigger.Label>{t("tabs.profile")}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{default: "person", selected: "person.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

        </NativeTabs>
    );

    if (iosVersion < 27) return tabs;
    return (
        <View style={{flex: 1}} onLayout={hasLayout ? undefined : ({nativeEvent: {layout}}) => {
            if (layout.width > 0 && layout.height > 0) setHasLayout(true);
        }}>
            {hasLayout && tabs}
        </View>
    );
}
