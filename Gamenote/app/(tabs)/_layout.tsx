import {Icon, Label, NativeTabs, Badge} from "expo-router/unstable-native-tabs";
import {router, useSegments} from "expo-router";
import * as Haptics from "expo-haptics";
import {useSettings} from "@/context/settings";
import {useEffect, useRef} from "react";
import {useAuth} from "@/context/auth";

const DEV_IGNORE_REDIRECT_PROFILE = true;
let onboardingShown = false;

// noinspection JSUnusedGlobalSymbols
export default function TabsLayout() {

    // Apple SF icons online list https://hotpot.ai/free-icons
    const {loggedIn} = useAuth();
    const segments = useSegments();
    const tabSegment = segments?.[1];
    const previousTabRef = useRef(tabSegment);
    const {vibrationsEnabled} = useSettings();

    useEffect(() => {
        if (DEV_IGNORE_REDIRECT_PROFILE && !onboardingShown) {
            onboardingShown = true;
            const timer = setTimeout(() => {
                router.push("/(modals)/onboardingModal");
            }, 300);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (vibrationsEnabled && tabSegment && tabSegment !== previousTabRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            previousTabRef.current = tabSegment;
        }
    }, [tabSegment, vibrationsEnabled]);

    return (
        <NativeTabs minimizeBehavior="onScrollDown">
            <NativeTabs.Trigger name="home">
                <Label>Početna</Label>
                <Icon
                    sf={{default: "house", selected: "house.fill"}}
                    drawable="ic_menu_view"
                />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="favorites">
                <Label>Moje igre</Label>
                <Icon sf={{default: "bookmark", selected: "bookmark.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="search" role="search">
                <Label>Pretraži</Label>
                <Icon sf="magnifyingglass" drawable="ic_menu_search"/>
            </NativeTabs.Trigger>


            <NativeTabs.Trigger name="groups">
                <Label>Grupe</Label>
                <Icon sf={{default: "rectangle.stack", selected: "rectangle.stack.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="profile">
                 {!loggedIn && <Badge>!</Badge>}
                <Label>Profil</Label>
                <Icon sf={{default: "person", selected: "person.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

        </NativeTabs>
    );
}
