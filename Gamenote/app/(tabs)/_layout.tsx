import {NativeTabs} from "expo-router/unstable-native-tabs";
import {router, useSegments} from "expo-router";
import {Platform} from "react-native";
import * as Haptics from "expo-haptics";
import {useSettings} from "@/context/settings";
import {useEffect, useRef} from "react";
import {useAuth} from "@/context/auth";
import {useTranslation} from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = '@onboarding_complete';

// noinspection JSUnusedGlobalSymbols
export default function TabsLayout() {
    const {t} = useTranslation();

    // Apple SF icons online list https://hotpot.ai/free-icons
    const {loggedIn} = useAuth();
    const segments = useSegments();
    const tabSegment = segments?.[1];
    const previousTabRef = useRef(tabSegment);
    const {vibrationsEnabled} = useSettings();

    useEffect(() => {
        if (loggedIn) return;
        AsyncStorage.getItem(ONBOARDING_KEY).then(seen => {
            if (!seen) {
                const timer = setTimeout(() => {
                    router.push("/(modals)/onboardingModal");
                    AsyncStorage.setItem(ONBOARDING_KEY, 'true');
                }, 300);
                return () => clearTimeout(timer);
            }
        });
    }, [loggedIn]);

    useEffect(() => {
        if (vibrationsEnabled && tabSegment && tabSegment !== previousTabRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            previousTabRef.current = tabSegment;
        }
    }, [tabSegment, vibrationsEnabled]);

    const minimizeBehavior = Platform.OS === 'ios' && Number(Platform.Version) >= 26 // PROVJERA ZA iOS <26 jer tamo nema ovog API
        ? "onScrollDown"
        : undefined;

    return (
        <NativeTabs minimizeBehavior={minimizeBehavior}>
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
                 {!loggedIn && <NativeTabs.Trigger.Badge>!</NativeTabs.Trigger.Badge>}
                <NativeTabs.Trigger.Label>{t("tabs.profile")}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{default: "person", selected: "person.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

        </NativeTabs>
    );
}
