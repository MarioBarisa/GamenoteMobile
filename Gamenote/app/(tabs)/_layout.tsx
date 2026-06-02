import {Icon, Label, NativeTabs} from "expo-router/unstable-native-tabs";
import {useSegments} from "expo-router";
import * as Haptics from "expo-haptics";
import {useSettings} from "@/context/settings";
import {useEffect, useRef} from "react";

// noinspection JSUnusedGlobalSymbols
export default function TabsLayout() {

    // Apple SF icons online list https://hotpot.ai/free-icons

    const segments = useSegments();
    const tabSegment = segments?.[1];
    const previousTabRef = useRef(tabSegment);
    const {vibrationsEnabled} = useSettings();

    useEffect(() => {
        if (vibrationsEnabled && tabSegment && tabSegment !== previousTabRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            previousTabRef.current = tabSegment;
        }
    }, [tabSegment, vibrationsEnabled]);

    return (
        <NativeTabs>
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
                <Label>Profil</Label>
                <Icon sf={{default: "person", selected: "person.fill"}} drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

        </NativeTabs>

    );
}
