import {Icon, Label, NativeTabs, Badge} from "expo-router/unstable-native-tabs";
import {router, useSegments} from "expo-router";
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

    return (
        <NativeTabs minimizeBehavior="onScrollDown">
            <NativeTabs.Trigger name="home">
                <Label>{t("tabs.home")}</Label>
                <Icon
                    sf={{default: "house", selected: "house.fill"}}
                    drawable="ic_menu_view"
                />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="favorites">
                <Label>{t("tabs.favorites")}</Label>
                <Icon sf={{default: "bookmark", selected: "bookmark.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="search" role="search">
                <Label>{t("tabs.search")}</Label>
                <Icon sf="magnifyingglass" drawable="ic_menu_search"/>
            </NativeTabs.Trigger>


            <NativeTabs.Trigger name="groups">
                <Label>{t("tabs.groups")}</Label>
                <Icon sf={{default: "rectangle.stack", selected: "rectangle.stack.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="profile">
                 {!loggedIn && <Badge>!</Badge>}
                <Label>{t("tabs.profile")}</Label>
                <Icon sf={{default: "person", selected: "person.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

        </NativeTabs>
    );
}
